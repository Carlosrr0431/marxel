import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/crm/types";
import { LEAD_ESTADOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { PageHeader, Avatar } from "@/components/crm/ui";
import { prioridadColor, productoLabel, scoreLead } from "@/lib/crm/utils";

export default async function PipelinePage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .not("estado", "in", "(ganado,perdido)")
    .order("puntaje", { ascending: false })
    .order("created_at", { ascending: false });

  const leads = ((data || []) as Lead[]).map((l) => ({
    ...l,
    puntaje: l.puntaje || scoreLead(l),
  }));
  const columns = LEAD_ESTADOS.filter(
    (e) => e.value !== "ganado" && e.value !== "perdido"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kanban"
        title="Pipeline visual"
        description="Arrastrá el estado desde cada tarjeta. Ordenado por score comercial."
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = leads.filter((l) => l.estado === col.value);
          return (
            <section
              key={col.value}
              className="w-[300px] shrink-0 rounded-2xl border border-line/80 bg-white/80 shadow-[0_8px_30px_rgba(7,31,53,0.04)] backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-line px-3.5 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-navy">{col.label}</h2>
                  <p className="text-[11px] text-muted">{items.length} leads</p>
                </div>
                <span className={`crm-badge ${col.color}`}>{items.length}</span>
              </div>
              <ul className="flex max-h-[72vh] flex-col gap-2.5 overflow-y-auto p-3">
                {items.map((lead) => (
                  <li
                    key={lead.id}
                    className="crm-card-hover rounded-xl border border-line bg-gradient-to-br from-white to-[#f7fbfd] p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar name={lead.nombre} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="font-semibold text-navy hover:underline"
                        >
                          {lead.nombre}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {productoLabel(lead.producto)}
                          {lead.plan_interes ? ` · ${lead.plan_interes}` : ""}
                        </p>
                      </div>
                      <span className="font-display text-sm font-bold text-teal">
                        {lead.puntaje}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`crm-badge ${prioridadColor(lead.prioridad)}`}>
                        {lead.prioridad}
                      </span>
                      <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                    </div>
                  </li>
                ))}
                {!items.length ? (
                  <li className="px-1 py-8 text-center text-xs text-muted">Sin leads</li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
