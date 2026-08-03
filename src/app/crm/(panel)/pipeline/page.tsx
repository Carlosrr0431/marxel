import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/crm/types";
import { LEAD_ESTADOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";

export default async function PipelinePage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .not("estado", "in", "(ganado,perdido)")
    .order("prioridad", { ascending: false })
    .order("created_at", { ascending: false });

  const leads = (data || []) as Lead[];
  const columns = LEAD_ESTADOS.filter(
    (e) => e.value !== "ganado" && e.value !== "perdido"
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy">Pipeline</h1>
        <p className="mt-1 text-sm text-muted">
          Vista kanban de leads abiertos. Cambiá el estado desde cada tarjeta.
        </p>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = leads.filter((l) => l.estado === col.value);
          return (
            <section
              key={col.value}
              className="w-[280px] shrink-0 rounded-2xl border border-line bg-white"
            >
              <div className="flex items-center justify-between border-b border-line px-3 py-3">
                <h2 className="text-sm font-semibold text-navy">{col.label}</h2>
                <span className="rounded-md bg-mist px-2 py-0.5 text-xs font-medium text-muted">
                  {items.length}
                </span>
              </div>
              <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-3">
                {items.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-xl border border-line bg-[#f8fbfd] p-3"
                  >
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="font-semibold text-navy hover:underline"
                    >
                      {lead.nombre}
                    </Link>
                    <p className="mt-1 text-xs capitalize text-muted">
                      {lead.producto}
                      {lead.plan_interes ? ` · ${lead.plan_interes}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">{lead.celular}</p>
                    <div className="mt-2">
                      <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                    </div>
                  </li>
                ))}
                {!items.length ? (
                  <li className="px-1 py-6 text-center text-xs text-muted">
                    Vacío
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
