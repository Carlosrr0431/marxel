import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getWhatsmeowWebhookSecret } from "@/lib/whatsmeow/config";
import {
  sendWhatsmeowPollDirect,
  sendWhatsmeowTextDirect,
} from "@/lib/whatsmeow/client";

export const WHATSAPP_OUTBOUND_INTERVAL_MS = Math.max(
  1000,
  Math.round(Number(process.env.WHATSAPP_OUTBOUND_INTERVAL_MS || 15_000) || 15_000)
);

export const OUTBOUND_PRIORITY = Object.freeze({
  DEFAULT: 0,
  POLL: 0,
});

type QueueKind = "text" | "poll";

type QueuePayload = {
  text?: string;
  name?: string;
  options?: string[];
  maxSelections?: number;
  max_selections?: number;
};

type QueueRow = {
  id: string;
  agent_code: string;
  dest: string;
  kind: QueueKind;
  payload: QueuePayload;
  attempts: number;
  max_attempts: number;
};

export type EnqueueResult =
  | {
      success: true;
      queued: true;
      queueId: string | null;
      messageId: null;
      duplicate?: boolean;
    }
  | { success: false; error: string; missingTable?: boolean };

function isMissingQueueRelationError(error: { code?: string; message?: string } | null) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    /whatsapp_outbound_queue|claim_whatsapp_outbound|whatsapp_send_throttle|dedup_key/i.test(
      message
    )
  );
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return (
    String(error?.code || "") === "23505" ||
    /duplicate key|unique constraint/i.test(String(error?.message || ""))
  );
}

export function isWhatsappOutboundQueueEnabled() {
  const flag = String(process.env.WHATSAPP_OUTBOUND_QUEUE_ENABLED || "true").toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

function digitsOrRaw(value: string) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  return digits || raw;
}

export function buildOutboundDedupKey({
  kind,
  dest,
  payload,
}: {
  kind: QueueKind;
  dest: string;
  payload?: QueuePayload;
}) {
  const destNorm = digitsOrRaw(dest);
  if (kind === "poll") {
    const name = String(payload?.name || "").trim().toLowerCase();
    const opts = (Array.isArray(payload?.options) ? payload.options : [])
      .map((o) => String(o || "").trim().toLowerCase())
      .filter(Boolean)
      .join("|");
    return createHash("sha256").update(`poll:${destNorm}:${name}:${opts}`).digest("hex").slice(0, 40);
  }
  const text = String(payload?.text || "").trim();
  return createHash("sha256").update(`text:${destNorm}:${text}`).digest("hex").slice(0, 40);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findPendingByDedup(agentCode: string, dedupKey: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("whatsapp_outbound_queue")
    .select("id")
    .eq("agent_code", agentCode)
    .eq("dedup_key", dedupKey)
    .in("status", ["pending", "sending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function enqueueWhatsappOutbound({
  agentCode,
  to,
  kind,
  payload,
  priority = OUTBOUND_PRIORITY.DEFAULT,
  meta = {},
  maxAttempts = 5,
  wake = true,
}: {
  agentCode: string;
  to: string;
  kind: QueueKind;
  payload: QueuePayload;
  priority?: number;
  meta?: Record<string, unknown>;
  maxAttempts?: number;
  wake?: boolean;
}): Promise<EnqueueResult> {
  const dest = String(to || "").trim();
  const code = String(agentCode || "").trim();
  const messageKind: QueueKind = kind === "poll" ? "poll" : "text";

  if (!code || !dest) return { success: false, error: "agentCode y to son requeridos" };
  if (messageKind === "text" && !String(payload?.text || "").trim()) {
    return { success: false, error: "text vacío" };
  }
  if (messageKind === "poll") {
    const opts = Array.isArray(payload?.options) ? payload.options.filter(Boolean) : [];
    if (opts.length < 2) return { success: false, error: "poll requiere al menos 2 options" };
  }

  const dedupKey = buildOutboundDedupKey({ kind: messageKind, dest, payload });

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_outbound_queue")
      .insert({
        agent_code: code,
        dest,
        kind: messageKind,
        payload: payload || {},
        priority: Number.isFinite(priority) ? Math.trunc(priority) : 0,
        max_attempts: Math.max(1, Math.trunc(maxAttempts) || 5),
        meta: meta && typeof meta === "object" ? meta : {},
        status: "pending",
        available_at: new Date().toISOString(),
        dedup_key: dedupKey,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingQueueRelationError(error)) {
        return { success: false, error: error.message, missingTable: true };
      }
      if (isUniqueViolation(error)) {
        const existingId = await findPendingByDedup(code, dedupKey);
        if (wake) triggerWhatsappQueueWorker();
        return {
          success: true,
          queued: true,
          duplicate: true,
          queueId: existingId,
          messageId: null,
        };
      }
      return { success: false, error: error.message || "enqueue_failed" };
    }

    if (wake) triggerWhatsappQueueWorker();
    return {
      success: true,
      queued: true,
      queueId: data?.id ? String(data.id) : null,
      messageId: null,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "enqueue_failed" };
  }
}

export function triggerWhatsappQueueWorker() {
  const run = () =>
    processWhatsappOutboundBatch({
      claimer: "wake",
      maxMessages: 4,
      deadlineMs: 55_000,
    }).catch((err) => {
      console.warn("[whatsapp-queue]", err instanceof Error ? err.message : err);
    });

  import("next/server")
    .then(({ after }) => {
      try {
        after(run);
      } catch {
        void run();
      }
    })
    .catch(() => {
      void run();
    });
}

async function hasPendingOutbound() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_outbound_queue")
    .select("id")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

async function markSent(id: string, messageId: string | null) {
  const supabase = createServiceClient();
  await supabase
    .from("whatsapp_outbound_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      message_id: messageId,
      last_error: null,
      claimed_at: null,
      claimed_by: null,
    })
    .eq("id", id);
}

async function markRetryOrFailed(row: QueueRow, errorMessage: string) {
  const attempts = Number(row.attempts || 0);
  const maxAttempts = Number(row.max_attempts || 5);
  const permanent = attempts >= maxAttempts;
  const backoffMs = Math.min(5 * 60_000, WHATSAPP_OUTBOUND_INTERVAL_MS * Math.max(1, attempts));
  const supabase = createServiceClient();
  await supabase
    .from("whatsapp_outbound_queue")
    .update({
      status: permanent ? "failed" : "pending",
      last_error: String(errorMessage || "send_failed").slice(0, 500),
      available_at: permanent
        ? new Date().toISOString()
        : new Date(Date.now() + backoffMs).toISOString(),
      claimed_at: null,
      claimed_by: null,
    })
    .eq("id", row.id);
  return { permanent };
}

async function sendClaimedRow(row: QueueRow) {
  if (row.kind === "poll") {
    return sendWhatsmeowPollDirect(row.agent_code, row.dest, {
      name: String(row.payload?.name || "Elegí una opción"),
      options: Array.isArray(row.payload?.options) ? row.payload.options : [],
      maxSelections: row.payload?.maxSelections ?? row.payload?.max_selections ?? 1,
    });
  }
  return sendWhatsmeowTextDirect(row.agent_code, row.dest, String(row.payload?.text || ""));
}

export async function processOneWhatsappOutbound({ claimer = "worker" } = {}) {
  const supabase = createServiceClient();
  try {
    await supabase.rpc("release_stale_whatsapp_outbound", { p_stale_after_seconds: 120 });
  } catch {
    // la función puede no existir hasta migrar el SQL
  }

  const { data, error } = await supabase.rpc("claim_whatsapp_outbound_message", {
    p_claimer: String(claimer || "worker").slice(0, 120),
  });

  if (error) {
    if (isMissingQueueRelationError(error)) {
      return { claimed: false as const, missingTable: true, error: error.message };
    }
    return { claimed: false as const, error: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as QueueRow | null;
  if (!row?.id) {
    return { claimed: false as const, skipped: "empty_or_throttled" as const };
  }

  const result = await sendClaimedRow(row);
  if (result.success) {
    await markSent(row.id, result.messageId);
    return { claimed: true as const, sent: true as const, queueId: row.id, messageId: result.messageId };
  }

  const fail = await markRetryOrFailed(row, result.error);
  return {
    claimed: true as const,
    sent: false as const,
    queueId: row.id,
    error: result.error,
    permanentFailure: fail.permanent,
  };
}

export async function processWhatsappOutboundBatch({
  claimer = "worker",
  maxMessages = 4,
  deadlineMs = 55_000,
} = {}) {
  const started = Date.now();
  const results: Awaited<ReturnType<typeof processOneWhatsappOutbound>>[] = [];
  const limit = Math.max(1, Math.min(8, Math.trunc(maxMessages) || 4));

  for (let i = 0; i < limit; i += 1) {
    if (Date.now() - started > deadlineMs) break;

    const one = await processOneWhatsappOutbound({ claimer });
    results.push(one);

    if ("missingTable" in one && one.missingTable) break;

    if (one.claimed && one.sent) {
      const more = await hasPendingOutbound();
      if (!more) break;
      const wait = WHATSAPP_OUTBOUND_INTERVAL_MS;
      if (Date.now() - started + wait > deadlineMs) break;
      await sleep(wait);
      continue;
    }

    if (!one.claimed && "skipped" in one) {
      const more = await hasPendingOutbound();
      if (!more) break;
      const wait = Math.min(WHATSAPP_OUTBOUND_INTERVAL_MS, deadlineMs - (Date.now() - started));
      if (wait < 500) break;
      await sleep(wait);
    }
  }

  return {
    processed: results.length,
    sent: results.filter((row) => row.claimed && row.sent).length,
    results,
  };
}

export function queueWorkerAuthOk(request: Request) {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const cron = String(process.env.CRON_SECRET || "").trim();
  const webhook = getWhatsmeowWebhookSecret();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const headerSecret =
    request.headers.get("x-webhook-secret") || request.headers.get("x-cron-secret") || "";
  if (cron && (bearer === cron || headerSecret === cron)) return true;
  if (webhook && (bearer === webhook || headerSecret === webhook)) return true;
  const url = new URL(request.url);
  if (cron && url.searchParams.get("secret") === cron) return true;
  if (webhook && url.searchParams.get("secret") === webhook) return true;
  return !cron && !webhook;
}
