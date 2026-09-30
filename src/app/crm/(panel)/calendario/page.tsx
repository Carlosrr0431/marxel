import { createServiceClient } from "@/lib/supabase/server";
import { listGoogleEvents, readGoogleConnection } from "@/lib/crm/google-calendar";
import { CrmCalendar, type CalendarEvent, type CalendarPerson } from "@/components/crm/CrmCalendar";
import type { Seguimiento } from "@/lib/crm/types";
import { readCalendarNotify } from "@/lib/crm/calendar-notify";

function slotKey(title: string, start: string) {
  const date = new Date(start);
  return [
    title.trim().toLowerCase(),
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ].join("|");
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  const to = new Date();
  to.setMonth(to.getMonth() + 4);

  const [{ data: rows }, { data: leads }, { data: afiliados }] = await Promise.all([
    supabase
      .from("seguimientos")
      .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
      .neq("estado", "cancelado")
      .gte("programado_para", from.toISOString())
      .lte("programado_para", to.toISOString())
      .order("programado_para", { ascending: true })
      .limit(600),
    supabase
      .from("leads")
      .select("id,nombre,celular")
      .order("created_at", { ascending: false })
      .limit(800),
    supabase
      .from("afiliados")
      .select("id,nombre,celular")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const events: CalendarEvent[] = ((rows || []) as Seguimiento[]).map((row) => {
    const persona = row.leads || row.afiliados;
    return {
      id: row.id,
      title: row.titulo,
      start: row.programado_para,
      tipo: row.tipo,
      estado: row.estado,
      person: persona?.nombre || "Sin contacto",
      phone: persona?.celular || null,
      descripcion: row.descripcion,
      prioridad: row.prioridad,
      href: row.lead_id
        ? `/crm/leads/${row.lead_id}`
        : row.afiliado_id
          ? `/crm/afiliados/${row.afiliado_id}`
          : "/crm/calendario",
      leadId: row.lead_id,
      afiliadoId: row.afiliado_id,
    };
  });

  const googleAccount = await readGoogleConnection().catch(() => null);
  const googleItems = googleAccount ? await listGoogleEvents(from, to).catch(() => []) : [];
  const linkedIds = new Set(
    ((rows || []) as Array<Seguimiento & { google_event_id?: string | null }>)
      .map((row) => row.google_event_id)
      .filter(Boolean),
  );
  const crmSlots = new Set(
    events.map((event) => slotKey(event.title, event.start)),
  );
  for (const item of googleItems) {
    if (linkedIds.has(item.id)) continue;
    if (item.description.includes("[MARXEN:")) continue;
    if (crmSlots.has(slotKey(item.title, item.start))) continue;
    events.push({
      id: `google:${item.id}`,
      title: item.title,
      start: item.start,
      tipo: "otro",
      estado: "pendiente",
      person: googleAccount?.email || "Google",
      phone: null,
      descripcion: null,
      prioridad: "media",
      href: item.htmlLink,
      leadId: null,
      afiliadoId: null,
      source: "google",
    });
  }

  const people: CalendarPerson[] = [
    ...(leads || []).map((lead) => ({
      id: lead.id,
      kind: "lead" as const,
      nombre: lead.nombre,
      celular: lead.celular,
    })),
    ...(afiliados || []).map((row) => ({
      id: row.id,
      kind: "afiliado" as const,
      nombre: row.nombre,
      celular: row.celular,
    })),
  ];

  const notify = await readCalendarNotify();

  return (
    <CrmCalendar
      events={events}
      people={people}
      googleEmail={googleAccount?.email || null}
      googleStatus={params.google}
      notify={notify}
    />
  );
}
