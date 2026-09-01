export const EVENT_LABELS: Record<string, string> = {
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  opened: "Abierto",
  clicked: "Clic",
  proxy_open: "Apertura proxy",
  soft_bounce: "Soft bounce",
  hard_bounce: "Hard bounce",
  complaint: "Queja",
  unsubscribed: "Baja",
  list_added: "Añadido a lista",
  updated: "Contacto actualizado",
  deleted: "Contacto eliminado",
  deferred: "Diferido",
  blocked: "Bloqueado",
  invalid: "Email inválido",
  error: "Error",
};

const EVENT_MAP: Record<string, string> = {
  request: "sent",
  requests: "sent",
  sent: "sent",
  delivered: "delivered",
  opened: "opened",
  unique_opened: "opened",
  uniqueopened: "opened",
  click: "clicked",
  clicks: "clicked",
  clicked: "clicked",
  unique_click: "clicked",
  uniqueclick: "clicked",
  proxy_open: "proxy_open",
  unique_proxy_open: "proxy_open",
  proxyopen: "proxy_open",
  loadedbyproxy: "proxy_open",
  loaded_by_proxy: "proxy_open",
  soft_bounce: "soft_bounce",
  softbounce: "soft_bounce",
  soft_bounced: "soft_bounce",
  softbounces: "soft_bounce",
  hard_bounce: "hard_bounce",
  hardbounce: "hard_bounce",
  hard_bounced: "hard_bounce",
  hardbounces: "hard_bounce",
  bounces: "hard_bounce",
  spam: "complaint",
  complaint: "complaint",
  unsubscribed: "unsubscribed",
  unsubscribe: "unsubscribed",
  list_addition: "list_added",
  listaddition: "list_added",
  contact_updated: "updated",
  updated: "updated",
  contact_deleted: "deleted",
  deleted: "deleted",
  deferred: "deferred",
  blocked: "blocked",
  invalid_email: "invalid",
  invalid: "invalid",
  error: "error",
};

export function normalizeEventName(raw: unknown) {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return EVENT_MAP[key] || key || "unknown";
}

export function eventLabel(event: string) {
  return EVENT_LABELS[event] || event;
}

export type NormalizedBrevoEvent = {
  event: string;
  email: string;
  messageId: string;
  tags: string[];
  link: string;
  reason: string;
  userAgent: string;
  device: string;
  occurredAt: string;
  subject: string;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(value: unknown) {
  return String(value || "").trim();
}

function collectTags(raw: Record<string, unknown>) {
  const tags: string[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) push(item);
      return;
    }
    const text = str(value);
    if (!text) return;
    if (text.startsWith("[")) {
      try {
        push(JSON.parse(text));
        return;
      } catch {
        /* texto plano */
      }
    }
    for (const part of text.split(",")) {
      const item = part.trim();
      if (item) tags.push(item);
    }
  };
  push(raw.tags);
  push(raw.tag);
  return tags;
}

function occurredAt(raw: Record<string, unknown>) {
  const epoch = Number(raw.ts_epoch || 0);
  if (epoch > 1_000_000_000_000) return new Date(epoch).toISOString();
  if (epoch > 1_000_000_000) return new Date(epoch * 1000).toISOString();
  const ts = Number(raw.ts_event || raw.ts || 0);
  if (ts > 1_000_000_000) return new Date(ts * 1000).toISOString();
  const date = str(raw.date_event || raw.date);
  const parsed = date ? Date.parse(date.replace(" ", "T")) : NaN;
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

export function parseBrevoEvents(body: unknown): NormalizedBrevoEvent[] {
  const wrapped = asRecord(body);
  const nested = wrapped && Array.isArray(wrapped.events) ? wrapped.events : null;
  const items = Array.isArray(body) ? body : nested || [body];
  const out: NormalizedBrevoEvent[] = [];
  for (const item of items) {
    const raw = asRecord(item);
    if (!raw) continue;
    const event = normalizeEventName(raw.event || raw.msg_status);
    const email = str(raw.email || raw.to).toLowerCase();
    if (!event || event === "unknown") continue;
    if (!email && !str(raw["message-id"] || raw.messageId)) continue;
    out.push({
      event,
      email,
      messageId: str(raw["message-id"] || raw.message_id || raw.messageId),
      tags: collectTags(raw),
      link: str(raw.link || raw.url),
      reason: str(raw.reason || raw.description),
      userAgent: str(raw.user_agent),
      device: str(raw.device_used || raw.device),
      occurredAt: occurredAt(raw),
      subject: str(raw.subject || raw["campaign name"] || raw.campaign_name),
      raw,
    });
  }
  return out;
}

export function campaignTagFromId(id: string) {
  return `crm_${id.replace(/-/g, "")}`;
}

export function campaignIdFromTags(tags: string[]) {
  for (const tag of tags) {
    const match = /^crm_([a-f0-9]{32})$/i.exec(tag.trim());
    if (!match) continue;
    const hex = match[1];
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "";
}

export function dedupeKey(event: NormalizedBrevoEvent) {
  return [
    event.email || "-",
    event.event,
    event.messageId || "-",
    event.occurredAt,
    event.link || "-",
  ].join("|");
}
