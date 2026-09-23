import { createServiceClient } from "@/lib/supabase/server";
import { calendarFeedUrl } from "@/lib/crm/calendar-feed";
import { CrmCalendar, type CalendarEvent, type CalendarPerson } from "@/components/crm/CrmCalendar";
import type { Seguimiento } from "@/lib/crm/types";

export default async function CalendarioPage() {
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
      .limit(200),
    supabase
      .from("afiliados")
      .select("id,nombre,celular")
      .order("created_at", { ascending: false })
      .limit(120),
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
      href: row.lead_id
        ? `/crm/leads/${row.lead_id}`
        : row.afiliado_id
          ? `/crm/afiliados/${row.afiliado_id}`
          : "/crm/calendario",
      leadId: row.lead_id,
      afiliadoId: row.afiliado_id,
    };
  });

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

  return <CrmCalendar events={events} people={people} feedUrl={calendarFeedUrl()} />;
}
