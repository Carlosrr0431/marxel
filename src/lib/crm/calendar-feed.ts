import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL } from "@/lib/seo";
import type { SeguimientoTipo } from "@/lib/crm/types";

const TIPO_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  email: "Email",
  reunion: "Reunión",
  documentacion: "Documentación",
  cotizacion: "Cotización",
  otro: "Seguimiento",
};

export function calendarFeedToken() {
  const explicit = process.env.CALENDAR_ICS_TOKEN?.trim();
  if (explicit) return explicit;
  const password = process.env.CRM_PASSWORD || "marxel";
  return createHmac("sha256", password).update("marxel-calendar-ics").digest("hex").slice(0, 40);
}

export function calendarFeedUrl() {
  return `${SITE_URL}/api/crm/calendar.ics?token=${calendarFeedToken()}`;
}

export function calendarTokenMatches(token: string) {
  const expected = calendarFeedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type FeedEvent = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: SeguimientoTipo | string;
  estado: string;
  programado_para: string;
  lead_id: string | null;
  afiliado_id: string | null;
  persona?: string | null;
  celular?: string | null;
};

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendarIcs(events: FeedEvent[]) {
  const now = icsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MARXEN//CRM//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:MARXEN CRM",
    "X-WR-TIMEZONE:America/Argentina/Salta",
  ];

  for (const event of events) {
    const start = new Date(event.programado_para);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const kind = TIPO_LABEL[event.tipo] || "Seguimiento";
    const who = event.persona ? ` · ${event.persona}` : "";
    const href = event.lead_id
      ? `${SITE_URL}/crm/leads/${event.lead_id}`
      : event.afiliado_id
        ? `${SITE_URL}/crm/afiliados/${event.afiliado_id}`
        : `${SITE_URL}/crm/calendario`;
    const detail = [
      event.descripcion || "",
      event.celular ? `Celular: ${event.celular}` : "",
      `Estado: ${event.estado}`,
      href,
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:seguimiento-${event.id}@marxen.com.ar`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(start.toISOString())}`,
      `DTEND:${icsDate(end.toISOString())}`,
      `SUMMARY:${icsEscape(`${kind}: ${event.titulo}${who}`)}`,
      `DESCRIPTION:${icsEscape(detail)}`,
      `URL:${href}`,
      event.estado === "hecho" ? "STATUS:COMPLETED" : "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
