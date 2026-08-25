import { createHash, randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getWhatsmeowWebhookSecret } from "@/lib/whatsmeow/config";
import {
  sendWhatsmeowMediaDirect,
  sendWhatsmeowPollDirect,
  sendWhatsmeowTextDirect,
  markWhatsappLinePaused,
} from "@/lib/whatsmeow/client";
import {
  isWhatsappBanLikeError,
  isWhatsappPermanentSendError,
  isWhatsappTransientDisconnect,
  WHATSAPP_BAN_PAUSE_MS,
  WHATSAPP_DISCONNECT_PAUSE_MS,
} from "@/lib/whatsmeow/anti-ban";

export const WHATSAPP_OUTBOUND_INTERVAL_MS = 15_000;

export const OUTBOUND_PRIORITY = Object.freeze({
  DEFAULT: 0,
  POLL: 0,
});

type QueueKind = "text" | "poll" | "media";

type QueuePayload = {
  text?: string;
  name?: string;
  options?: string[];
  maxSelections?: number;
  max_selections?: number;
  caption?: string;
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
  type?: string;
};

type QueueRow = {
  id: string;
  agent_code: string;
  dest: string;
  kind: QueueKind;
  payload: QueuePayload;
  attempts: number;
  max_attempts: number;
  meta?: Record<string, unknown> | null;
};

export type EnqueueResult =
  | {
      success: true;
      queued: true;
      queueId: string | null;
      messageId: null;
      duplicate?: boolean;
    }
  | { success: false; error: string; missingTable?: boolean; rlsBlocked?: boolean };

function isRlsDenied(error: { code?: string; message?: string } | null) {
  return /row-level security policy/i.test(String(error?.message || ""));
}

function isMissingQueueRelationError(error: { code?: string; message?: string } | null) {
  if (isRlsDenied(error)) return false;
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    /permission denied|does not exist|schema cache|could not find the table/i.test(message)
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

export async function cancelPendingOutboundPolls(to: string) {
  const dest = String(to || "").trim();
  if (!dest) return 0;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_outbound_queue")
      .update({
        status: "failed",
        last_error: "stale_poll",
        claimed_at: null,
        claimed_by: null,
      })
      .eq("dest", dest)
      .eq("kind", "poll")
      .eq("status", "pending")
      .select("id");
    if (error) {
      console.warn("[whatsapp-queue] cancel polls", error.message);
      return 0;
    }
    return data?.length || 0;
  } catch (err) {
    console.warn("[whatsapp-queue] cancel polls", err);
    return 0;
  }
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
  delayMs = 0,
  unique = false,
  dedupKey: customDedup,
}: {
  agentCode: string;
  to: string;
  kind: QueueKind;
  payload: QueuePayload;
  priority?: number;
  meta?: Record<string, unknown>;
  maxAttempts?: number;
  wake?: boolean;
  delayMs?: number;
  unique?: boolean;
  dedupKey?: string;
}): Promise<EnqueueResult> {
  const dest = String(to || "").trim();
  const code = String(agentCode || "").trim();
  const messageKind: QueueKind = kind === "poll" ? "poll" : kind === "media" ? "media" : "text";

  if (!code || !dest) return { success: false, error: "agentCode y to son requeridos" };
  if (messageKind === "text" && !String(payload?.text || "").trim()) {
    return { success: false, error: "text vacío" };
  }
  if (messageKind === "media" && !String(payload?.mediaUrl || "").trim()) {
    return { success: false, error: "mediaUrl vacío" };
  }
  if (messageKind === "poll") {
    const opts = Array.isArray(payload?.options) ? payload.options.filter(Boolean) : [];
    if (opts.length < 2) return { success: false, error: "poll requiere al menos 2 options" };
  }

  const dedupKey = unique
    ? String(customDedup || `u:${randomUUID()}`).slice(0, 80)
    : buildOutboundDedupKey({ kind: messageKind, dest, payload });
  const jitter = 400 + Math.floor(Math.random() * 1600);
  const waitMs = Math.max(0, Math.trunc(delayMs) || 0) + (delayMs > 0 ? jitter : 0);

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
        available_at: new Date(Date.now() + waitMs).toISOString(),
        dedup_key: dedupKey,
      })
      .select("id")
      .single();

    if (error) {
      if (isRlsDenied(error)) {
        return {
          success: false,
          error: error.message,
          rlsBlocked: true,
        };
      }
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
      maxMessages: 3,
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
  const readyBefore = new Date(Date.now() + WHATSAPP_OUTBOUND_INTERVAL_MS + 2000).toISOString();
  const { data, error } = await supabase
    .from("whatsapp_outbound_queue")
    .select("id")
    .eq("status", "pending")
    .lte("available_at", readyBefore)
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

async function markRetryOrFailed(
  row: QueueRow,
  errorMessage: string,
  { forceFailed = false, pauseMs = 0 }: { forceFailed?: boolean; pauseMs?: number } = {}
) {
  const attempts = Number(row.attempts || 0);
  const maxAttempts = Number(row.max_attempts || 5);
  const permanent = forceFailed || attempts >= maxAttempts;
  const backoffMs =
    pauseMs > 0
      ? pauseMs
      : Math.min(5 * 60_000, WHATSAPP_OUTBOUND_INTERVAL_MS * Math.max(1, attempts));
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

async function pauseWhatsappLine(pauseMs: number) {
  markWhatsappLinePaused(pauseMs);
  const nowIso = new Date().toISOString();
  try {
    const supabase = createServiceClient();
    await supabase.from("whatsapp_send_throttle").upsert(
      {
        id: 1,
        last_sent_at: nowIso,
        interval_ms: Math.max(60_000, Math.trunc(pauseMs) || WHATSAPP_BAN_PAUSE_MS),
        updated_at: nowIso,
      },
      { onConflict: "id" }
    );
  } catch {
    // si la tabla no está migrada, queda la pausa en memoria de este isolate
  }
}

async function restoreLineInterval() {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("whatsapp_send_throttle")
      .update({
        interval_ms: WHATSAPP_OUTBOUND_INTERVAL_MS,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .gt("interval_ms", WHATSAPP_OUTBOUND_INTERVAL_MS + 2000);
  } catch {
    // no-op
  }
}

async function sendClaimedRow(row: QueueRow) {
  if (row.kind === "poll") {
    return sendWhatsmeowPollDirect(row.agent_code, row.dest, {
      name: String(row.payload?.name || "Elegí una opción"),
      options: Array.isArray(row.payload?.options) ? row.payload.options : [],
      maxSelections: row.payload?.maxSelections ?? row.payload?.max_selections ?? 1,
    });
  }
  if (row.kind === "media") {
    const url = String(row.payload?.mediaUrl || "").trim();
    if (!url) return { success: false as const, error: "mediaUrl vacío" };
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return { success: false as const, error: `media fetch ${res.status}` };
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 8) return { success: false as const, error: "archivo vacío" };
      return sendWhatsmeowMediaDirect(row.agent_code, row.dest, {
        mediaBase64: buf.toString("base64"),
        caption: String(row.payload?.caption || row.payload?.text || ""),
        type: String(row.payload?.type || ""),
        mimetype: String(row.payload?.mimetype || res.headers.get("content-type") || ""),
        filename: String(row.payload?.filename || ""),
      });
    } catch (err) {
      return {
        success: false as const,
        error: err instanceof Error ? err.message : "media fetch failed",
      };
    }
  }
  return sendWhatsmeowTextDirect(row.agent_code, row.dest, String(row.payload?.text || ""));
}

function queueMeta(row: QueueRow) {
  return row.meta && typeof row.meta === "object" ? row.meta : {};
}

async function afterQueueAttempt(
  row: QueueRow,
  status: "sent" | "failed",
  messageId?: string | null
) {
  const meta = queueMeta(row);
  const body = String(row.payload?.caption || row.payload?.text || "");
  const messageType = row.kind === "media" ? String(row.payload?.type || "document") : "text";
  try {
    const { markCrmMessageFromQueue, saveCrmWhatsappMessage } = await import(
      "@/lib/whatsmeow/crm-chat"
    );
    if (String(meta.source || "") === "crm") {
      const marked = await markCrmMessageFromQueue({
        queueId: row.id,
        waMessageId: messageId,
        status,
      });
      if (!marked.updated && status === "sent") {
        await saveCrmWhatsappMessage({
          phone: row.dest,
          direction: "outbound",
          body,
          messageType,
          mediaUrl: row.payload?.mediaUrl || null,
          mediaMime: row.payload?.mimetype || null,
          fileName: row.payload?.filename || null,
          waMessageId: messageId || `queue:${row.id}`,
          fromMe: true,
          source: "crm",
          deliveryStatus: "sent",
          queueId: row.id,
        });
      }
      return;
    }
    if (status === "sent" && (row.kind === "text" || row.kind === "media")) {
      await saveCrmWhatsappMessage({
        phone: row.dest,
        direction: "outbound",
        body,
        messageType,
        mediaUrl: row.payload?.mediaUrl || null,
        mediaMime: row.payload?.mimetype || null,
        fileName: row.payload?.filename || null,
        fromMe: true,
        waMessageId: messageId || `queue:${row.id}`,
        source: "bot",
      });
    }
  } catch {
    // el inbox CRM es opcional hasta aplicar el SQL
  }
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
    await restoreLineInterval();
    await markSent(row.id, result.messageId);
    await afterQueueAttempt(row, "sent", result.messageId);
    return { claimed: true as const, sent: true as const, queueId: row.id, messageId: result.messageId };
  }

  const failError = result.error || "send_failed";
  if (isWhatsappBanLikeError(failError)) {
    await pauseWhatsappLine(WHATSAPP_BAN_PAUSE_MS);
    const fail = await markRetryOrFailed(row, failError, {
      forceFailed: true,
      pauseMs: WHATSAPP_BAN_PAUSE_MS,
    });
    if (fail.permanent) await afterQueueAttempt(row, "failed");
    return {
      claimed: true as const,
      sent: false as const,
      queueId: row.id,
      error: failError,
      permanentFailure: fail.permanent,
      pausedMs: WHATSAPP_BAN_PAUSE_MS,
    };
  }
  if (isWhatsappPermanentSendError(failError)) {
    const fail = await markRetryOrFailed(row, failError, { forceFailed: true });
    if (fail.permanent) await afterQueueAttempt(row, "failed");
    return {
      claimed: true as const,
      sent: false as const,
      queueId: row.id,
      error: failError,
      permanentFailure: fail.permanent,
    };
  }
  if (isWhatsappTransientDisconnect(failError)) {
    await pauseWhatsappLine(WHATSAPP_DISCONNECT_PAUSE_MS);
    const fail = await markRetryOrFailed(row, failError, { pauseMs: WHATSAPP_DISCONNECT_PAUSE_MS });
    if (fail.permanent) await afterQueueAttempt(row, "failed");
    return {
      claimed: true as const,
      sent: false as const,
      queueId: row.id,
      error: failError,
      permanentFailure: fail.permanent,
      pausedMs: WHATSAPP_DISCONNECT_PAUSE_MS,
    };
  }

  const fail = await markRetryOrFailed(row, failError);
  if (fail.permanent) await afterQueueAttempt(row, "failed");
  return {
    claimed: true as const,
    sent: false as const,
    queueId: row.id,
    error: failError,
    permanentFailure: fail.permanent,
  };
}

export async function processWhatsappOutboundBatch({
  claimer = "worker",
  maxMessages = 3,
  deadlineMs = 55_000,
} = {}) {
  const started = Date.now();
  const results: Awaited<ReturnType<typeof processOneWhatsappOutbound>>[] = [];
  const limit = Math.max(1, Math.min(3, Math.trunc(maxMessages) || 3));

  for (let i = 0; i < limit; i += 1) {
    if (Date.now() - started > deadlineMs) break;

    const one = await processOneWhatsappOutbound({ claimer });
    results.push(one);

    if ("missingTable" in one && one.missingTable) break;
    if ("pausedMs" in one && one.pausedMs) break;

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

function header(request: Request, name: string) {
  return String(request.headers.get(name) || "").trim();
}

function secretsEqual(provided: string, expected: string) {
  const a = String(provided || "").trim();
  const b = String(expected || "").trim();
  if (!a || !b || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function isVercelCronRequest(request: Request) {
  const ua = header(request, "user-agent").toLowerCase();
  if (ua.includes("vercel-cron")) return true;
  if (header(request, "x-vercel-cron") === "1") return true;
  if (header(request, "x-vercel-cron-auth-token")) return true;
  if (header(request, "x-vercel-cron-schedule")) return true;
  return false;
}

export function queueWorkerAuthOk(request: Request) {
  if (isVercelCronRequest(request)) return true;

  const cron = String(process.env.CRON_SECRET || "").trim().replace(/[\r\n]/g, "");
  const webhook = getWhatsmeowWebhookSecret();
  const auth = header(request, "authorization");
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = header(request, "x-webhook-secret") || header(request, "x-cron-secret");
  if (cron && (secretsEqual(bearer, cron) || secretsEqual(headerSecret, cron))) return true;
  if (webhook && (secretsEqual(bearer, webhook) || secretsEqual(headerSecret, webhook))) {
    return true;
  }
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") || url.searchParams.get("cron_secret") || "";
  if (cron && secretsEqual(querySecret, cron)) return true;
  if (webhook && secretsEqual(querySecret, webhook)) return true;
  return !cron && !webhook;
}
