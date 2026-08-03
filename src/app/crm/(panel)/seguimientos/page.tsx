import { createServiceClient } from "@/lib/supabase/server";
import type { Seguimiento } from "@/lib/crm/types";
import { formatDate } from "@/lib/crm/types";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
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

  if (estado !== "todos") {
    query = query.eq("estado", estado);
  }

  const { data } = await query.limit(80);
  const items = (data || []) as Seguimiento[];
  const now = Date.now();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy">
          Seguimientos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Agenda de contactos: WhatsApp inicial, recontactos y documentación.
        </p>
      </header>

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
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              estado === tab.value
                ? "bg-navy text-white"
                : "border border-line bg-white text-navy"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <ul className="space-y-3">
        {items.map((s) => {
          const persona = s.leads || s.afiliados;
          const overdue =
            s.estado === "pendiente" && new Date(s.programado_para).getTime() < now;
          const href = s.lead_id
            ? `/crm/leads/${s.lead_id}`
            : s.afiliado_id
              ? `/crm/afiliados/${s.afiliado_id}`
              : "#";

          return (
            <li
              key={s.id}
              className={`rounded-2xl border bg-white p-4 ${
                overdue ? "border-rose-200" : "border-line"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{s.titulo}</p>
                    {overdue ? (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                        Vencido
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {s.tipo} · {formatDate(s.programado_para)} · prioridad {s.prioridad}
                  </p>
                  {persona ? (
                    <Link href={href} className="mt-1 inline-block text-sm font-medium text-teal hover:underline">
                      {persona.nombre} · {persona.celular}
                    </Link>
                  ) : null}
                  {s.descripcion ? (
                    <p className="mt-2 text-sm text-muted">{s.descripcion}</p>
                  ) : null}
                </div>
                {s.estado === "pendiente" ? (
                  <SeguimientoActions
                    id={s.id}
                    leadId={s.lead_id}
                    afiliadoId={s.afiliado_id}
                    celular={persona?.celular}
                    nombre={persona?.nombre}
                  />
                ) : (
                  <span className="text-xs font-medium uppercase text-muted">
                    {s.estado}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {!items.length ? (
          <li className="rounded-2xl border border-line bg-white px-4 py-10 text-center text-muted">
            No hay seguimientos en este filtro.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
