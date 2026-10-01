import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getWhatsmeowAgentCode, normalizeArPhone } from "@/lib/whatsmeow/config";
import { enqueueWhatsappOutbound } from "@/lib/whatsmeow/outbound-queue";

const LEAD_MS = 30 * 60 * 1000;
const HORIZON_MS = 48 * 60 * 60 * 1000;
const TZ = "America/Argentina/Salta";
const DEFAULT_PHONE = "54 9 3875724473";

export type ReminderEvent = {
  /** Identifica al evento: "crm:<id>" o "google:<id>". */
  key: string;
  title: string;
  start: string;
  person?: string | null;
  note?: string | null;
  link?: string | null;
};

const dateTimeLabel = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function reminderPhone() {
  return normalizeArPhone(process.env.CALENDAR_REMINDER_WHATSAPP || DEFAULT_PHONE);
}

function buildText(event: ReminderEvent) {
  return [
    "⏰ *Evento en 30 minutos*",
    event.title,
    `🕒 ${dateTimeLabel.format(new Date(event.start))}`,
    event.person ? `👤 ${event.person}` : null,
    event.note ? `📝 ${event.note.slice(0, 300)}` : null,
    event.link ? `\n${event.link}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Deja en la cola de WhatsApp un aviso a Marcos 30 minutos antes de cada evento.
 * Es idempotente: la clave incluye el evento y su horario, así que correrlo
 * muchas veces no duplica avisos y, si el horario cambia, reemplaza el pendiente.
 */
export async function syncCalendarReminders(events: ReminderEvent[]) {
  const to = reminderPhone();
  if (!to) return;
  const agentCode = getWhatsmeowAgentCode();
  const supabase = createServiceClient();
  const now = Date.now();

  for (const event of events) {
    const startMs = new Date(event.start).getTime();
    if (!Number.isFinite(startMs) || startMs <= now || startMs - now > HORIZON_MS) continue;

    const dedupKey = `cal:${createHash("sha1").update(`${event.key}|${startMs}`).digest("hex").slice(0, 40)}`;
    const { data: existing } = await supabase
      .from("whatsapp_outbound_queue")
      .select("id")
      .eq("agent_code", agentCode)
      .eq("dedup_key", dedupKey)
      .limit(1)
      .maybeSingle();
    if (existing?.id) continue;

    await cancelCalendarReminders(event.key);

    const delayMs = Math.max(0, startMs - LEAD_MS - now);
    await enqueueWhatsappOutbound({
      agentCode,
      to,
      kind: "text",
      payload: { text: buildText(event) },
      unique: true,
      dedupKey,
      delayMs,
      wake: delayMs === 0,
      meta: { source: "calendar_reminder", calendarEventKey: event.key },
    });
  }
}

/** Cancela el aviso pendiente de un evento (al borrarlo, completarlo o moverlo). */
export async function cancelCalendarReminders(eventKey: string) {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("whatsapp_outbound_queue")
      .update({ status: "failed", last_error: "calendar_reminder_cancelled", claimed_at: null, claimed_by: null })
      .eq("status", "pending")
      .contains("meta", { source: "calendar_reminder", calendarEventKey: eventKey });
  } catch {
    // Sin la cola migrada no hay nada que cancelar.
  }
}
