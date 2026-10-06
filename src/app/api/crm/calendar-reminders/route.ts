import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { queueWorkerAuthOk } from "@/lib/whatsmeow/outbound-queue";
import {
  reconcileCalendarReminders,
  slotKey,
  syncCalendarReminders,
  type ReminderEvent,
} from "@/lib/crm/calendar-reminders";
import { listGoogleEvents, readServerConnection } from "@/lib/crm/google-calendar";
import { SITE_URL } from "@/lib/seo";
import { stripEventMeta } from "@/lib/crm/event-meta";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 49 * 60 * 60 * 1000;
const CRM_LIMIT = 200;

type Row = {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  programado_para: string;
  lead_id: string | null;
  afiliado_id: string | null;
  leads?: { nombre?: string } | null;
  afiliados?: { nombre?: string } | null;
};

/** Cron: programa el aviso de WhatsApp de los seguimientos y eventos de Google que están por venir. */
export async function GET(request: Request) {
  if (!queueWorkerAuthOk(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_MS);

  const { data, error } = await supabase
    .from("seguimientos")
    .select("id,titulo,descripcion,estado,programado_para,lead_id,afiliado_id, leads(nombre), afiliados(nombre)")
    .neq("estado", "cancelado")
    .gt("programado_para", now.toISOString())
    .lte("programado_para", until.toISOString())
    .order("programado_para", { ascending: true })
    .limit(CRM_LIMIT);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Row[];
  const events: ReminderEvent[] = rows
    .filter((row) => row.estado === "pendiente")
    .map((row) => ({
      key: `crm:${row.id}`,
      title: row.titulo,
      start: row.programado_para,
      person: row.leads?.nombre || row.afiliados?.nombre || null,
      note: stripEventMeta(row.descripcion) || null,
      link: row.lead_id ? `${SITE_URL}/crm/leads/${row.lead_id}` : `${SITE_URL}/crm/calendario`,
    }));
  const crmCount = events.length;

  // Eventos de Google: se leen con la conexión guardada en el servidor.
  let google: "sin_conexion" | "ok" | "error" = "sin_conexion";
  let googleError = "";
  try {
    const connection = await readServerConnection();
    if (connection) {
      const items = await listGoogleEvents(now, until, { connection, strict: true });
      const crmSlots = new Set(rows.map((row) => slotKey(row.titulo, row.programado_para)));
      for (const item of items) {
        if (item.description.includes("[MARXEN:")) continue;
        if (crmSlots.has(slotKey(item.title, item.start))) continue;
        events.push({
          key: `google:${item.id}`,
          title: item.title,
          start: item.start,
          note: stripEventMeta(item.description) || null,
        });
      }
      google = "ok";
    }
  } catch (err) {
    google = "error";
    googleError = err instanceof Error ? err.message : "error";
  }

  await syncCalendarReminders(events);
  const cancelados = await reconcileCalendarReminders(new Set(events.map((event) => event.key)), {
    crm: rows.length < CRM_LIMIT,
    google: google === "ok",
  });

  return NextResponse.json({
    ok: true,
    seguimientos: crmCount,
    google,
    googleEventos: events.length - crmCount,
    cancelados,
    ...(googleError ? { googleError } : {}),
  });
}
