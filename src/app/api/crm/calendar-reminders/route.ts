import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { queueWorkerAuthOk } from "@/lib/whatsmeow/outbound-queue";
import { syncCalendarReminders } from "@/lib/crm/calendar-reminders";
import { SITE_URL } from "@/lib/seo";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = {
  id: string;
  titulo: string;
  descripcion: string | null;
  programado_para: string;
  lead_id: string | null;
  afiliado_id: string | null;
  leads?: { nombre?: string } | null;
  afiliados?: { nombre?: string } | null;
};

/** Cron: programa el aviso de WhatsApp de los seguimientos que están por venir. */
export async function GET(request: Request) {
  if (!queueWorkerAuthOk(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const { data, error } = await supabase
    .from("seguimientos")
    .select("id,titulo,descripcion,programado_para,lead_id,afiliado_id, leads(nombre), afiliados(nombre)")
    .eq("estado", "pendiente")
    .gt("programado_para", now.toISOString())
    .lte("programado_para", new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString())
    .order("programado_para", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Row[];
  await syncCalendarReminders(
    rows.map((row) => ({
      key: `crm:${row.id}`,
      title: row.titulo,
      start: row.programado_para,
      person: row.leads?.nombre || row.afiliados?.nombre || null,
      note: row.descripcion,
      link: row.lead_id
        ? `${SITE_URL}/crm/leads/${row.lead_id}`
        : row.afiliado_id
          ? `${SITE_URL}/crm/afiliados/${row.afiliado_id}`
          : `${SITE_URL}/crm/calendario`,
    })),
  );

  return NextResponse.json({ ok: true, revisados: rows.length });
}
