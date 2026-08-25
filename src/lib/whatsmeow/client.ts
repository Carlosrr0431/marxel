/**
 * Cliente HTTP hacia whatsmeow-api.
 * Envío: dígitos o JID tal cual. No llamar check-number (IsOnWhatsApp) en cada
 * send: esa consulta es la que más bloqueos genera. El server resuelve JID con cache.
 */
import {
  getWhatsmeowAgentCode,
  getWhatsmeowApiBase,
  getWhatsmeowApiKey,
  getWhatsmeowWebhookSecret,
  normalizeArPhone,
  stripDeviceFromJid,
} from "@/lib/whatsmeow/config";
import {
  isWhatsappBanLikeError,
  WHATSAPP_BAN_PAUSE_MS,
} from "@/lib/whatsmeow/anti-ban";

type FetchResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  text: string;
};

async function whatsmeowFetch(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {}
): Promise<FetchResult> {
  const headers: Record<string, string> = {
    "X-API-Key": getWhatsmeowApiKey(),
    Accept: "application/json",
  };
  if (body != null) headers["Content-Type"] = "application/json";

  const response = await fetch(`${getWhatsmeowApiBase()}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = text ? { message: text } : null;
  }
  return { ok: response.ok, status: response.status, data, text };
}

function nestedData(result: FetchResult): Record<string, unknown> | null {
  const inner = result.data?.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return result.data;
}

export function extractWhatsmeowQr(data: Record<string, unknown> | null) {
  if (!data) return null;
  const inner =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data;
  const image = String(inner.qr_image || "").trim();
  if (image) return image;
  const code = String(inner.qr_code || inner.qr || "").trim();
  return code || null;
}

function extractMessageId(data: Record<string, unknown> | null) {
  const inner = data?.data;
  if (inner && typeof inner === "object") {
    const rec = inner as Record<string, unknown>;
    return String(rec.message_id || rec.id || "") || null;
  }
  return data?.message_id ? String(data.message_id) : null;
}

function isJid(value: string) {
  return value.includes("@lid") || value.includes("@s.whatsapp.net") || value.includes("@g.us");
}

/** Dígitos o JID tal cual. No llamar check-number: IsOnWhatsApp es lo que más penaliza Meta. */
function sendTarget(to: string) {
  const raw = String(to || "").trim();
  if (!raw) return "";
  if (isJid(raw)) return stripDeviceFromJid(raw);
  return normalizeArPhone(raw) || raw.replace(/\D/g, "");
}

function extractSendError(result: FetchResult) {
  return (
    String(result.data?.message || result.data?.error || result.text).slice(0, 200) ||
    `HTTP ${result.status}`
  );
}

function failSend(error: string) {
  if (isWhatsappBanLikeError(error)) markWhatsappLinePaused(WHATSAPP_BAN_PAUSE_MS);
  return { success: false as const, error };
}

export async function fetchWhatsmeowStatus(agentCode = getWhatsmeowAgentCode()) {
  if (!agentCode) return null;
  const result = await whatsmeowFetch(
    `/api/status?agent_code=${encodeURIComponent(agentCode)}`
  );
  if (!result.ok || result.data?.success === false) return null;
  return nestedData(result);
}

function pngFromDataUrl(value: string) {
  const match = value.trim().match(/^data:image\/(?:png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  try {
    return Buffer.from(match[1].replace(/\s/g, ""), "base64");
  } catch {
    return null;
  }
}

const DIRECT_GAP_MS = 15_000;

let lastDirectSendAt = 0;
let linePausedUntil = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function markWhatsappLinePaused(ms: number) {
  const wait = Math.max(0, Math.trunc(ms) || 0);
  if (wait <= 0) return;
  linePausedUntil = Math.max(linePausedUntil, Date.now() + wait);
}

export function isWhatsappLinePaused() {
  return Date.now() < linePausedUntil;
}

async function waitOutboundGap() {
  if (isWhatsappLinePaused()) {
    const wait = linePausedUntil - Date.now();
    if (wait > 0) await sleep(Math.min(wait, DIRECT_GAP_MS));
  }
  const wait = lastDirectSendAt + DIRECT_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
}

function markDirectSent() {
  lastDirectSendAt = Date.now();
}

export async function fetchWhatsmeowQr(agentCode = getWhatsmeowAgentCode()) {
  if (!agentCode) return null;
  const result = await whatsmeowFetch(
    `/api/session/qr?agent_code=${encodeURIComponent(agentCode)}`
  );
  if (!result.ok || result.data?.success === false) return null;
  return extractWhatsmeowQr(nestedData(result) || result.data);
}

export async function fetchWhatsmeowQrPng(agentCode = getWhatsmeowAgentCode()) {
  if (!agentCode || !getWhatsmeowApiKey()) return null;
  const response = await fetch(
    `${getWhatsmeowApiBase()}/api/session/qr?agent_code=${encodeURIComponent(agentCode)}&format=image`,
    {
      headers: { "X-API-Key": getWhatsmeowApiKey(), Accept: "image/png" },
      cache: "no-store",
    }
  );
  const ctype = response.headers.get("content-type") || "";
  if (response.ok && ctype.includes("image")) {
    const buf = Buffer.from(await response.arrayBuffer());
    return buf.length > 80 ? buf : null;
  }
  const qr = await fetchWhatsmeowQr(agentCode);
  if (qr?.startsWith("data:image")) return pngFromDataUrl(qr);
  return null;
}

export async function connectWhatsmeowSession(agentCode: string, webhookUrl: string) {
  return whatsmeowFetch("/api/session/connect", {
    method: "POST",
    body: { agent_code: agentCode, webhook_url: webhookUrl || undefined },
  });
}

export async function configureWhatsmeowWebhook(
  agentCode: string,
  webhookUrl: string,
  webhookSecret = getWhatsmeowWebhookSecret()
) {
  return whatsmeowFetch("/api/webhook/config", {
    method: "POST",
    body: {
      agent_code: agentCode,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret || undefined,
    },
  });
}

export async function disconnectWhatsmeowSession(agentCode = getWhatsmeowAgentCode()) {
  return whatsmeowFetch("/api/session/disconnect", {
    method: "POST",
    body: { agent_code: agentCode },
  });
}

export async function logoutWhatsmeowSession(agentCode = getWhatsmeowAgentCode()) {
  return whatsmeowFetch("/api/session/logout", {
    method: "POST",
    body: { agent_code: agentCode },
  });
}

function inferMediaSendType(mimetype: string, fallback = "document") {
  const mime = String(mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return fallback;
}

export async function sendWhatsmeowMediaDirect(
  agentCode: string,
  to: string,
  {
    mediaBase64,
    caption = "",
    type,
    mimetype = "",
    filename = "",
  }: {
    mediaBase64: string;
    caption?: string;
    type?: string;
    mimetype?: string;
    filename?: string;
  }
) {
  if (!agentCode || !to || !mediaBase64) {
    return { success: false as const, error: "agentCode, to y media son requeridos" };
  }
  if (isWhatsappLinePaused()) {
    return { success: false as const, error: "linea en pausa anti-bloqueo" };
  }
  const phone = sendTarget(to);
  if (!phone) return { success: false as const, error: "destinatario inválido" };
  const raw = String(mediaBase64).replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!raw) return { success: false as const, error: "archivo vacío" };
  const mediaType = String(type || inferMediaSendType(mimetype)).toLowerCase();
  const payload = {
    agent_code: agentCode,
    phone,
    media: raw,
    caption: String(caption || "").trim(),
    type: mediaType,
    mimetype: mimetype || "",
    filename: filename || "",
  };
  let result = await whatsmeowFetch("/api/messages/send-media", {
    method: "POST",
    body: payload,
  });
  if ((!result.ok || result.data?.success === false) && mediaType === "image") {
    result = await whatsmeowFetch("/api/messages/send-image", {
      method: "POST",
      body: {
        agent_code: agentCode,
        phone,
        image: raw,
        caption: payload.caption,
      },
    });
  }
  if (!result.ok || result.data?.success === false) {
    return failSend(extractSendError(result));
  }
  return { success: true as const, messageId: extractMessageId(result.data) };
}

export async function sendWhatsmeowTextDirect(agentCode: string, to: string, text: string) {
  const message = String(text || "").trim();
  if (!agentCode || !to || !message) {
    return { success: false as const, error: "agentCode, to y text son requeridos" };
  }
  if (isWhatsappLinePaused()) {
    return { success: false as const, error: "linea en pausa anti-bloqueo" };
  }
  const phone = sendTarget(to);
  if (!phone) return { success: false as const, error: "destinatario inválido" };
  const result = await whatsmeowFetch("/api/messages/send", {
    method: "POST",
    body: { agent_code: agentCode, phone, message },
  });
  if (!result.ok || result.data?.success === false) {
    return failSend(extractSendError(result));
  }
  return { success: true as const, messageId: extractMessageId(result.data) };
}

export async function sendWhatsmeowText(
  agentCode: string,
  to: string,
  text: string,
  {
    bypassQueue = false,
    wake = true,
    delayMs = 0,
  }: { bypassQueue?: boolean; wake?: boolean; delayMs?: number } = {}
) {
  const message = String(text || "").trim();
  if (!agentCode || !to || !message) {
    return { success: false as const, error: "agentCode, to y text son requeridos" };
  }

  if (!bypassQueue) {
    try {
      const { enqueueWhatsappOutbound, isWhatsappOutboundQueueEnabled } = await import(
        "@/lib/whatsmeow/outbound-queue"
      );
      if (isWhatsappOutboundQueueEnabled()) {
        const queued = await enqueueWhatsappOutbound({
          agentCode,
          to,
          kind: "text",
          payload: { text: message },
          wake,
          delayMs,
        });
        if (queued.success) return queued;
        if (!queued.missingTable) return queued;
        console.warn("[whatsmeow] cola ausente; envío directo", queued.error);
      }
    } catch (err) {
      console.warn("[whatsmeow] cola falló; envío directo", err instanceof Error ? err.message : err);
    }
  }

  if (delayMs > 0) await sleep(delayMs);
  await waitOutboundGap();
  const sent = await sendWhatsmeowTextDirect(agentCode, to, message);
  markDirectSent();
  return sent;
}

export async function sendWhatsmeowPollDirect(
  agentCode: string,
  to: string,
  { name, options, maxSelections = 1 }: { name: string; options: string[]; maxSelections?: number }
) {
  const opts = (options || []).map((o) => String(o || "").trim()).filter(Boolean).slice(0, 8);
  if (!agentCode || !to || opts.length < 2) {
    return { success: false as const, error: "Se necesitan al menos 2 opciones" };
  }
  if (isWhatsappLinePaused()) {
    return { success: false as const, error: "linea en pausa anti-bloqueo" };
  }
  const number = sendTarget(to);
  if (!number) return { success: false as const, error: "destinatario inválido" };
  const result = await whatsmeowFetch(
    `/v2/message/sendPoll/${encodeURIComponent(agentCode)}`,
    {
      method: "POST",
      body: {
        agent_code: agentCode,
        number,
        name: name || "Elegí una opción",
        options: opts,
        max_selections: maxSelections > 0 ? maxSelections : 1,
      },
    }
  );
  if (!result.ok || result.data?.success === false) {
    return failSend(extractSendError(result));
  }
  return { success: true as const, messageId: extractMessageId(result.data) };
}

export async function sendWhatsmeowPoll(
  agentCode: string,
  to: string,
  { name, options, maxSelections = 1 }: { name: string; options: string[]; maxSelections?: number },
  {
    bypassQueue = false,
    wake = true,
    delayMs = 0,
  }: { bypassQueue?: boolean; wake?: boolean; delayMs?: number } = {}
) {
  const opts = (options || []).map((o) => String(o || "").trim()).filter(Boolean).slice(0, 8);
  if (!agentCode || !to || opts.length < 2) {
    return { success: false as const, error: "Se necesitan al menos 2 opciones" };
  }

  if (!bypassQueue) {
    try {
      const { enqueueWhatsappOutbound, isWhatsappOutboundQueueEnabled } = await import(
        "@/lib/whatsmeow/outbound-queue"
      );
      if (isWhatsappOutboundQueueEnabled()) {
        const queued = await enqueueWhatsappOutbound({
          agentCode,
          to,
          kind: "poll",
          payload: {
            name: name || "Elegí una opción",
            options: opts,
            maxSelections: maxSelections > 0 ? maxSelections : 1,
          },
          wake,
          delayMs,
        });
        if (queued.success) return queued;
        if (!queued.missingTable) return queued;
        console.warn("[whatsmeow] cola ausente; poll directo", queued.error);
      }
    } catch (err) {
      console.warn("[whatsmeow] cola falló; poll directo", err instanceof Error ? err.message : err);
    }
  }

  if (delayMs > 0) await sleep(delayMs);
  await waitOutboundGap();
  const sent = await sendWhatsmeowPollDirect(agentCode, to, { name, options: opts, maxSelections });
  markDirectSent();
  return sent;
}
