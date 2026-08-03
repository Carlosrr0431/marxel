import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { CrmStats, Lead, Seguimiento } from "@/lib/crm/types";
import { LEAD_ESTADOS } from "@/lib/crm/types";
import { PageHeader, Avatar, EmptyState } from "@/components/crm/ui";
import { relativeTime, productoLabel, prioridadColor } from "@/lib/crm/utils";

export default async function CrmDashboardPage() {
  const supabase = createServiceClient();

  const [
    { data: statsRow },
    { data: recentLeads },
    { data: dueFollowups },
    { data: byEstado },
    { data: byProducto },
    { data: activities },
  ] = await Promise.all([
    supabase.from("crm_stats").select("*").maybeSingle(),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("seguimientos")
      .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
      .eq("estado", "pendiente")
      .lte("programado_para", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("programado_para", { ascending: true })
      .limit(6),
    supabase.from("leads").select("estado"),
    supabase.from("leads").select("producto"),
    supabase
      .from("actividades")
      .select("*, leads(nombre)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = (statsRow || {
    total_leads: 0,
    leads_nuevos: 0,
    leads_abiertos: 0,
    leads_semana: 0,
    total_afiliados: 0,
    afiliados_activos: 0,
    seguimientos_pendientes: 0,
    seguimientos_vencidos: 0,
    conversiones_mes: 0,
  }) as CrmStats;

  const pipelineCount = LEAD_ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e.value] = (byEstado || []).filter((l) => l.estado === e.value).length;
    return acc;
  }, {});

  const totalPipeline = Object.values(pipelineCount).reduce((a, b) => a + b, 0) || 1;
  const conversionRate =
    totalPipeline > 0
      ? Math.round(((pipelineCount.ganado || 0) / totalPipeline) * 100)
      : 0;

  const productos = ["salud", "seguros", "viajero", "general"] as const;
  const productoCounts = productos.map((p) => ({
    key: p,
    count: (byProducto || []).filter((x) => x.producto === p).length,
  }));
  const maxProd = Math.max(...productoCounts.map((p) => p.count), 1);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hoy"
        title="Centro de operaciones"
        description="Priorizá contactos, mirá el embudo y convertí leads en afiliados."
        actions={
          <>
            <Link href="/crm/inbox" className="crm-btn crm-btn-teal">
              Abrir inbox
            </Link>
            <Link href="/crm/leads/nuevo" className="crm-btn crm-btn-primary">
              + Nuevo lead
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Leads abiertos"
          value={stats.leads_abiertos}
          hint={`${stats.leads_nuevos} nuevos sin tocar`}
          tone="navy"
        />
        <Stat
          label="Inbox / vencidos"
          value={stats.seguimientos_vencidos}
          hint={`${stats.seguimientos_pendientes} pendientes`}
          tone={stats.seguimientos_vencidos > 0 ? "rose" : "teal"}
        />
        <Stat
          label="Afiliados activos"
          value={stats.afiliados_activos}
          hint={`${stats.total_afiliados} en total`}
          tone="teal"
        />
        <Stat
          label="Conv. del mes"
          value={stats.conversiones_mes}
          hint={`${conversionRate}% tasa global`}
          tone="gold"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="crm-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">Embudo comercial</h2>
            <Link href="/crm/pipeline" className="text-sm font-semibold text-teal hover:underline">
              Kanban →
            </Link>
          </div>
          <div className="space-y-3">
            {LEAD_ESTADOS.map((e) => {
              const n = pipelineCount[e.value] || 0;
              const pct = Math.round((n / totalPipeline) * 100);
              return (
                <div key={e.value}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-navy">{e.label}</span>
                    <span className="text-muted">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="crm-progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="crm-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-navy">Por producto</h2>
          <ul className="mt-5 space-y-4">
            {productoCounts.map((p) => (
              <li key={p.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium capitalize text-navy">
                    {productoLabel(p.key)}
                  </span>
                  <span className="text-muted">{p.count}</span>
                </div>
                <div className="crm-progress">
                  <span style={{ width: `${(p.count / maxProd) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted">
            Esta semana entraron <strong className="text-navy">{stats.leads_semana}</strong> leads.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="crm-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">Agenda 24 hs</h2>
            <Link href="/crm/seguimientos" className="text-sm font-semibold text-teal hover:underline">
              Ver agenda →
            </Link>
          </div>
          {(dueFollowups as Seguimiento[] | null)?.length ? (
            <ul className="space-y-3">
              {(dueFollowups as Seguimiento[]).map((s) => {
                const persona = s.leads || s.afiliados;
                const overdue = new Date(s.programado_para) < new Date();
                return (
                  <li
                    key={s.id}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                      overdue ? "border-rose-200 bg-rose-50/50" : "border-line bg-[#f8fbfd]"
                    }`}
                  >
                    <Avatar name={persona?.nombre || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{s.titulo}</p>
                      <p className="text-xs text-muted">
                        {persona?.nombre || "Sin contacto"} · {relativeTime(s.programado_para)}
                      </p>
                    </div>
                    {overdue ? (
                      <span className="crm-badge bg-rose-100 text-rose-700">Vencido</span>
                    ) : (
                      <span className="crm-badge bg-aqua text-teal">Hoy</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Sin urgencias"
              description="No hay seguimientos para las próximas 24 horas."
              actionHref="/crm/seguimientos"
              actionLabel="Ver agenda"
            />
          )}
        </div>

        <div className="crm-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">Actividad reciente</h2>
          </div>
          <ul className="space-y-3">
            {(activities || []).map((a) => (
              <li key={a.id} className="border-l-2 border-teal/40 pl-3">
                <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                <p className="text-xs text-muted">
                  {(a.leads as { nombre?: string } | null)?.nombre || "Sistema"} ·{" "}
                  {relativeTime(a.created_at)}
                </p>
              </li>
            ))}
            {!activities?.length ? (
              <li className="text-sm text-muted">Todavía no hay actividad registrada.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="crm-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-navy">Últimos leads</h2>
          <Link href="/crm/leads" className="text-sm font-semibold text-teal hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Persona</th>
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Prioridad</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {(recentLeads as Lead[] | null)?.map((lead) => {
                const estado = LEAD_ESTADOS.find((e) => e.value === lead.estado);
                return (
                  <tr key={lead.id} className="border-t border-line/70 hover:bg-mist/40">
                    <td className="px-5 py-3">
                      <Link href={`/crm/leads/${lead.id}`} className="flex items-center gap-3">
                        <Avatar name={lead.nombre} size="sm" />
                        <span>
                          <span className="font-semibold text-navy">{lead.nombre}</span>
                          <span className="block text-xs text-muted">{lead.celular}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{productoLabel(lead.producto)}</td>
                    <td className="px-5 py-3">
                      <span className={`crm-badge ${prioridadColor(lead.prioridad)}`}>
                        {lead.prioridad}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`crm-badge ${estado?.color}`}>{estado?.label}</span>
                    </td>
                    <td className="px-5 py-3 text-muted">{relativeTime(lead.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "navy" | "teal" | "rose" | "gold";
}) {
  const tones = {
    navy: "from-navy/10 to-sky/10",
    teal: "from-teal/10 to-aqua",
    rose: "from-rose-100 to-orange-50",
    gold: "from-amber-50 to-yellow-50",
  };
  return (
    <div className={`crm-card crm-card-hover bg-gradient-to-br ${tones[tone]} p-5`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
