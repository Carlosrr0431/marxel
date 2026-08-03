import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead, Seguimiento } from "@/lib/crm/types";
import { PageHeader, Avatar, EmptyState } from "@/components/crm/ui";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
import { formatDate, whatsappLink } from "@/lib/crm/types";
import { relativeTime, prioridadColor } from "@/lib/crm/utils";

export default async function InboxPage() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const [{ data: overdueSegs }, { data: newLeads }, { data: hotLeads }] = await Promise.all([
    supabase
      .from("seguimientos")
      .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
      .eq("estado", "pendiente")
      .lte("programado_para", now)
      .order("programado_para", { ascending: true })
      .limit(30),
    supabase
      .from("leads")
      .select("*")
      .eq("estado", "nuevo")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("leads")
      .select("*")
      .gte("puntaje", 60)
      .not("estado", "in", "(ganado,perdido)")
      .order("puntaje", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Foco"
        title="Inbox del día"
        description="Todo lo vencido, leads nuevos y oportunidades calientes — en un solo lugar."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-navy">
            Seguimientos vencidos
          </h2>
          {(overdueSegs as Seguimiento[] | null)?.length ? (
            (overdueSegs as Seguimiento[]).map((s) => {
              const persona = s.leads || s.afiliados;
              return (
                <article key={s.id} className="crm-card border-rose-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <Avatar name={persona?.nombre || "?"} />
                      <div>
                        <p className="font-semibold text-navy">{s.titulo}</p>
                        <p className="text-sm text-muted">
                          {persona?.nombre} · {formatDate(s.programado_para)}
                        </p>
                        {s.descripcion ? (
                          <p className="mt-1 text-xs text-muted">{s.descripcion}</p>
                        ) : null}
                      </div>
                    </div>
                    <SeguimientoActions
                      id={s.id}
                      leadId={s.lead_id}
                      afiliadoId={s.afiliado_id}
                      celular={persona?.celular}
                      nombre={persona?.nombre}
                      showSnooze
                    />
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              title="Inbox limpio"
              description="No hay seguimientos vencidos. Buen trabajo."
            />
          )}
        </section>

        <div className="space-y-5">
          <section className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Leads nuevos</h2>
            <ul className="mt-4 space-y-3">
              {(newLeads as Lead[] | null)?.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <Avatar name={l.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold text-navy hover:underline">
                      {l.nombre}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {l.plan_interes || l.producto} · {relativeTime(l.created_at)}
                    </p>
                  </div>
                  <Link
                    href={whatsappLink(l.celular, `Hola ${l.nombre}, te escribo de Marxel.`)}
                    target="_blank"
                    className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    WA
                  </Link>
                </li>
              ))}
              {!newLeads?.length ? (
                <li className="text-sm text-muted">Sin leads nuevos.</li>
              ) : null}
            </ul>
          </section>

          <section className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              Oportunidades calientes
            </h2>
            <p className="mt-1 text-xs text-muted">Score ≥ 60, aún abiertos</p>
            <ul className="mt-4 space-y-3">
              {(hotLeads as Lead[] | null)?.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <Link href={`/crm/leads/${l.id}`} className="font-medium text-navy hover:underline">
                    {l.nombre}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className={`crm-badge ${prioridadColor(l.prioridad)}`}>
                      {l.prioridad}
                    </span>
                    <span className="font-display text-sm font-bold text-teal">{l.puntaje}</span>
                  </div>
                </li>
              ))}
              {!hotLeads?.length ? (
                <li className="text-sm text-muted">Todavía no hay leads calientes.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
