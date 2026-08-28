const BREVO_API = "https://api.brevo.com/v3";
const VERSION_CHUNK = 80;
const WEBHOOK_URL = "https://www.marxen.com.ar/webhookMail";
const WEBHOOK_EVENTS = [
  "request",
  "delivered",
  "hardBounce",
  "softBounce",
  "blocked",
  "spam",
  "invalid",
  "deferred",
  "click",
  "opened",
  "uniqueOpened",
  "unsubscribed",
  "error",
];

let webhookPromise: Promise<void> | null = null;

export type BrevoSendInput = {
  subject: string;
  html: string;
  recipients: { email: string; name: string }[];
  greetings: string[];
  tags?: string[];
};

function getConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "comercial@marxen.com.ar").trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || "Marxen").trim();
  const replyTo = String(process.env.BREVO_REPLY_TO || senderEmail).trim();
  return { apiKey, senderEmail, senderName, replyTo };
}

export function explainBrevoError(payload: unknown, status: number) {
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const message = String(rec.message || rec.error || "").trim();
  const code = String(rec.code || "");
  if (status === 401 && /unrecognised ip|authorised_ips|authorized_ips/i.test(message)) {
    return "Brevo bloqueó la IP de este servidor. En https://app.brevo.com/security/authorised_ips desactivá la restricción de IPs (o agregá las de Vercel). Sin eso no se puede enviar.";
  }
  if (status === 401) return "Brevo rechazó la API key. Revisá BREVO_API_KEY.";
  if (/sender/i.test(message) && /not valid|invalid|verified|authenticat/i.test(message)) {
    return "El remitente no está verificado en Brevo. Usá comercial@marxen.com.ar (o el mail verificado de BREVO_SENDER_EMAIL).";
  }
  return message || `Error Brevo HTTP ${status}${code ? ` (${code})` : ""}`;
}

async function brevoFetch(path: string, init?: RequestInit) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    return { ok: false as const, status: 0, data: { message: "Falta BREVO_API_KEY." } };
  }
  const response = await fetch(`${BREVO_API}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function brevoAccountStatus() {
  const { apiKey, senderEmail, senderName } = getConfig();
  if (!apiKey) {
    return { ok: false, error: "Falta BREVO_API_KEY en el entorno.", senderEmail, senderName };
  }
  const result = await brevoFetch("/account");
  if (!result.ok) {
    return {
      ok: false,
      error: explainBrevoError(result.data, result.status),
      senderEmail,
      senderName,
    };
  }
  return { ok: true, error: "", senderEmail, senderName };
}

export async function sendBrevoCampaign(input: BrevoSendInput) {
  const cfg = getConfig();
  if (!cfg.apiKey) throw new Error("Falta BREVO_API_KEY en el entorno.");
  if (!input.recipients.length) throw new Error("No hay destinatarios.");

  const messageIds: string[] = [];
  for (let i = 0; i < input.recipients.length; i += VERSION_CHUNK) {
    const slice = input.recipients.slice(i, i + VERSION_CHUNK);
    const greetings = input.greetings.slice(i, i + VERSION_CHUNK);
    const tags = input.tags?.filter(Boolean).length
      ? input.tags.filter(Boolean)
      : ["crm-mailing"];
    const body = {
      sender: { email: cfg.senderEmail, name: cfg.senderName },
      replyTo: { email: cfg.replyTo, name: cfg.senderName },
      subject: input.subject,
      htmlContent: input.html,
      tags,
      messageVersions: slice.map((recipient, idx) => ({
        to: [{ email: recipient.email, name: (recipient.name || recipient.email).slice(0, 70) }],
        params: { greeting: greetings[idx] || "Hola," },
      })),
    };

    const result = await brevoFetch("/smtp/email", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!result.ok) {
      throw new Error(explainBrevoError(result.data, result.status));
    }
    const ids = Array.isArray((result.data as { messageIds?: string[] }).messageIds)
      ? (result.data as { messageIds: string[] }).messageIds
      : [];
    const single = String((result.data as { messageId?: string }).messageId || "");
    if (ids.length) messageIds.push(...ids);
    else if (single) messageIds.push(single);
  }

  return { sent: input.recipients.length, messageIds };
}

export function mailingWebhookUrl() {
  const secret = String(process.env.BREVO_WEBHOOK_SECRET || "").trim();
  if (!secret) return WEBHOOK_URL;
  return `${WEBHOOK_URL}?secret=${encodeURIComponent(secret)}`;
}

function webhookList(data: unknown): Array<{ id?: number; url?: string; events?: string[] }> {
  if (Array.isArray(data)) return data as Array<{ id?: number; url?: string; events?: string[] }>;
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  if (Array.isArray(rec.webhooks)) {
    return rec.webhooks as Array<{ id?: number; url?: string; events?: string[] }>;
  }
  return [];
}

export async function ensureTransactionalWebhook() {
  if (webhookPromise) return webhookPromise;
  webhookPromise = (async () => {
    const url = mailingWebhookUrl();
    const listed = await brevoFetch("/webhooks?type=transactional");
    const current = webhookList(listed.data).find((item) =>
      String(item.url || "").startsWith(WEBHOOK_URL)
    );
    if (current?.id && current.url === url) return;
    if (current?.id) {
      await brevoFetch(`/webhooks/${current.id}`, {
        method: "PUT",
        body: JSON.stringify({
          url,
          description: "Marxen CRM mailing",
          events: WEBHOOK_EVENTS,
        }),
      });
      return;
    }
    await brevoFetch("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url,
        description: "Marxen CRM mailing",
        events: WEBHOOK_EVENTS,
        type: "transactional",
      }),
    });
  })().catch((err) => {
    webhookPromise = null;
    throw err;
  });
  return webhookPromise;
}

export async function fetchTransactionalEvents(input: {
  tag?: string;
  email?: string;
  messageId?: string;
  startDate?: string;
}) {
  const params = new URLSearchParams();
  params.set("limit", "100");
  params.set("sort", "desc");
  if (input.startDate) {
    params.set("startDate", input.startDate);
    params.set("endDate", new Date().toISOString().slice(0, 10));
  } else {
    params.set("days", "10");
  }
  if (input.email) params.set("email", input.email);
  if (input.messageId) params.set("messageId", input.messageId);
  if (input.tag) params.set("tags", JSON.stringify([input.tag]));
  const result = await brevoFetch(`/smtp/statistics/events?${params.toString()}`);
  const rec = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};
  return Array.isArray(rec.events) ? (rec.events as Record<string, unknown>[]) : [];
}
