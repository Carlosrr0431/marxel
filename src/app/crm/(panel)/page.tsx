import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { CrmStats, Lead, Seguimiento } from "@/lib/crm/types";
import { formatDate, LEAD_ESTADOS } from "@/lib/crm/types";

export default async function CrmDashboardPage() {
  const supabase = createServiceClient();

  const [
    { data: statsRow },
    { data: recentLeads },
    { data: dueFollowups },
    { data: byEstado },
  ] = await Promise.all([
    supabase.from("crm_stats").select("*").maybeSingle(),
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("seguimientos")
      .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
      .eq("estado", "pendiente")
      .lte("programado_para", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("programado_para", { ascending: true })
      .limit(8),
    supabase.from("leads").select("estado"),
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            Panel
          </p>
          <h1 className="font-display text-3xl font-semibold text-navy">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Leads, afiliados y seguimientos en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/crm/leads/nuevo"
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            + Nuevo lead
          </Link>
          <Link
            href="/crm/seguimientos"
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy"
          >
            Ver seguimientos
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Leads abiertos" value={stats.leads_abiertos} hint={`${stats.leads_nuevos} nuevos`} />
        <Stat label="Leads esta semana" value={stats.leads_semana} hint={`${stats.total_leads} totales`} />
        <Stat label="Afiliados activos" value={stats.afiliados_activos} hint={`${stats.total_afiliados} totales`} />
        <Stat
          label="Seguimientos"
          value={stats.seguimientos_pendientes}
          hint={`${stats.seguimientos_vencidos} vencidos`}
          alert={stats.seguimientos_vencidos > 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">
              Pipeline rápido
            </h2>
            <Link href="/crm/pipeline" className="text-sm font-medium text-teal hover:underline">
              Ver kanban →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {LEAD_ESTADOS.map((e) => (
              <div key={e.value} className="rounded-xl bg-[#f7fafc] px-3 py-3 text-center">
                <p className="text-2xl font-semibold text-navy">
                  {pipelineCount[e.value] || 0}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted">{e.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Conversiones este mes:{" "}
            <span className="font-semibold text-navy">{stats.conversiones_mes}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy">
            Agenda de hoy / 24 hs
          </h2>
          <ul className="mt-4 space-y-3">
            {(dueFollowups as Seguimiento[] | null)?.length ? (
              (dueFollowups as Seguimiento[]).map((s) => {
                const persona = s.leads || s.afiliados;
                const overdue = new Date(s.programado_para) < new Date();
                return (
                  <li
                    key={s.id}
                    className="rounded-xl border border-line px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-navy">{s.titulo}</p>
                        <p className="text-xs text-muted">
                          {persona?.nombre || "Sin contacto"} · {formatDate(s.programado_para)}
                        </p>
                      </div>
                      {overdue ? (
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                          Vencido
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-muted">No hay seguimientos próximos.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">
            Últimos leads
          </h2>
          <Link href="/crm/leads" className="text-sm font-medium text-teal hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Nombre</th>
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {(recentLeads as Lead[] | null)?.map((lead) => {
                const estado = LEAD_ESTADOS.find((e) => e.value === lead.estado);
                return (
                  <tr key={lead.id} className="border-b border-line/70">
                    <td className="py-3">
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="font-medium text-navy hover:underline"
                      >
                        {lead.nombre}
                      </Link>
                      <p className="text-xs text-muted">{lead.celular}</p>
                    </td>
                    <td className="py-3 capitalize text-muted">{lead.producto}</td>
                    <td className="py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${estado?.color}`}>
                        {estado?.label}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{formatDate(lead.created_at)}</td>
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
  alert,
}: {
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        alert ? "border-rose-200" : "border-line"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
      <p className={`mt-1 text-xs ${alert ? "font-medium text-rose-600" : "text-muted"}`}>
        {hint}
      </p>
    </div>
  );
}
