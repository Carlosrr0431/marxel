import { createServiceClient } from "@/lib/supabase/server";
import type { Seguimiento } from "@/lib/crm/types";
import { formatDate } from "@/lib/crm/types";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
import { PageHeader, Avatar, EmptyState } from "@/components/crm/ui";
import { isOverdue, relativeTime } from "@/lib/crm/utils";
import Link from "next/link";

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const params = await searchParams;
  const estado = params.estado || "pendiente";
  const supabase = createServiceClient();

  let query = supabase
    .from("seguimientos")
    .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
    .order("programado_para", { ascending: true });

  if (estado !== "todos") query = query.eq("estado", estado);

  const { data } = await query.limit(100);
  const items = (data || []) as Seguimiento[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Seguimientos"
        description="WhatsApp iniciales, recontactos y documentación — con snooze +24h."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "pendiente", label: "Pendientes" },
          { value: "hecho", label: "Hechos" },
          { value: "cancelado", label: "Cancelados" },
          { value: "todos", label: "Todos" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/crm/seguimientos?estado=${tab.value}`}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              estado === tab.value
                ? "bg-navy text-white"
                : "border border-line bg-white text-navy hover:bg-mist"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {items.length ? (
        <ul className="space-y-3">
          {items.map((s) => {
            const persona = s.leads || s.afiliados;
            const overdue = s.estado === "pendiente" && isOverdue(s.programado_para);
            const href = s.lead_id
              ? `/crm/leads/${s.lead_id}`
              : s.afiliado_id
                ? `/crm/afiliados/${s.afiliado_id}`
                : "#";

            return (
              <li
                key={s.id}
                className={`crm-card p-4 ${overdue ? "border-rose-200 bg-rose-50/40" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <Avatar name={persona?.nombre || "?"} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy">{s.titulo}</p>
                        {overdue ? (
                          <span className="crm-badge bg-rose-100 text-rose-700">Vencido</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {s.tipo} · {formatDate(s.programado_para)} ·{" "}
                        {relativeTime(s.programado_para)} · prioridad {s.prioridad}
                      </p>
                      {persona ? (
                        <Link
                          href={href}
                          className="mt-1 inline-block text-sm font-medium text-teal hover:underline"
                        >
                          {persona.nombre} · {persona.celular}
                        </Link>
                      ) : null}
                      {s.descripcion ? (
                        <p className="mt-2 text-sm text-muted">{s.descripcion}</p>
                      ) : null}
                    </div>
                  </div>
                  {s.estado === "pendiente" ? (
                    <SeguimientoActions
                      id={s.id}
                      leadId={s.lead_id}
                      afiliadoId={s.afiliado_id}
                      celular={persona?.celular}
                      nombre={persona?.nombre}
                      showSnooze
                    />
                  ) : (
                    <span className="crm-badge bg-mist text-muted">{s.estado}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Agenda vacía"
          description="No hay seguimientos en este filtro."
          actionHref="/crm/inbox"
          actionLabel="Ir al inbox"
        />
      )}
    </div>
  );
}
