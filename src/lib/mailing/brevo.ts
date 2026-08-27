const BREVO_API = "https://api.brevo.com/v3";
const VERSION_CHUNK = 80;

export type BrevoSendInput = {
  subject: string;
  html: string;
  recipients: { email: string; name: string }[];
  greetings: string[];
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
    const body = {
      sender: { email: cfg.senderEmail, name: cfg.senderName },
      replyTo: { email: cfg.replyTo, name: cfg.senderName },
      subject: input.subject,
      htmlContent: input.html,
      tags: ["crm-mailing"],
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
    messageIds.push(...ids);
    if (single) messageIds.push(single);
  }

  return { sent: input.recipients.length, messageIds };
}
