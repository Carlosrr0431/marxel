import {
  getWhatsmeowAgentCode,
  getWhatsmeowApiBase,
  getWhatsmeowApiKey,
  getWhatsmeowWebhookSecret,
  normalizeArPhone,
} from "@/lib/whatsmeow/config";

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

export async function fetchWhatsmeowStatus(agentCode = getWhatsmeowAgentCode()) {
  if (!agentCode) return null;
  const result = await whatsmeowFetch(
    `/api/status?agent_code=${encodeURIComponent(agentCode)}`
  );
  if (!result.ok || result.data?.success === false) return null;
  return nestedData(result);
}

export async function fetchWhatsmeowQr(agentCode = getWhatsmeowAgentCode()) {
  if (!agentCode) return null;
  const result = await whatsmeowFetch(
    `/api/session/qr?agent_code=${encodeURIComponent(agentCode)}`
  );
  if (!result.ok || result.data?.success === false) return null;
  const data = nestedData(result);
  return String(data?.qr_image || data?.qr_code || "") || null;
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

async function resolveJid(agentCode: string, to: string) {
  const raw = String(to || "").trim();
  if (!raw) return "";
  if (isJid(raw)) return raw;
  const phone = normalizeArPhone(raw);
  if (!phone) return "";
  try {
    const result = await whatsmeowFetch(
      `/api/check-number?agent_code=${encodeURIComponent(agentCode)}&phone=${encodeURIComponent(phone)}`
    );
    const data = nestedData(result);
    const jid = data?.jid ? String(data.jid) : "";
    if (result.ok && result.data?.success !== false && data?.registered && jid) return jid;
  } catch {
    // fallback al teléfono
  }
  return phone;
}

export async function sendWhatsmeowText(agentCode: string, to: string, text: string) {
  const message = String(text || "").trim();
  if (!agentCode || !to || !message) {
    return { success: false as const, error: "agentCode, to y text son requeridos" };
  }
  const dest = await resolveJid(agentCode, to);
  if (!dest) return { success: false as const, error: "number is not registered on WhatsApp" };
  const phone = isJid(to) ? dest : normalizeArPhone(to) || dest;
  const result = await whatsmeowFetch("/api/messages/send", {
    method: "POST",
    body: { agent_code: agentCode, phone, message },
  });
  if (!result.ok || result.data?.success === false) {
    return {
      success: false as const,
      error:
        String(result.data?.message || result.data?.error || result.text).slice(0, 200) ||
        `HTTP ${result.status}`,
    };
  }
  return { success: true as const, messageId: extractMessageId(result.data) };
}

export async function sendWhatsmeowPoll(
  agentCode: string,
  to: string,
  { name, options, maxSelections = 1 }: { name: string; options: string[]; maxSelections?: number }
) {
  const opts = (options || []).map((o) => String(o || "").trim()).filter(Boolean).slice(0, 8);
  if (!agentCode || !to || opts.length < 2) {
    return { success: false as const, error: "Se necesitan al menos 2 opciones" };
  }
  const dest = await resolveJid(agentCode, to);
  if (!dest) return { success: false as const, error: "number is not registered on WhatsApp" };
  const number = isJid(to) ? dest : normalizeArPhone(to) || dest;
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
    return {
      success: false as const,
      error:
        String(result.data?.message || result.data?.error || result.text).slice(0, 200) ||
        `HTTP ${result.status}`,
    };
  }
  return { success: true as const, messageId: extractMessageId(result.data) };
}
