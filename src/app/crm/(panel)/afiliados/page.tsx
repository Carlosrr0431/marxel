import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Afiliado } from "@/lib/crm/types";
import { AFILIADO_ESTADOS, formatMoney } from "@/lib/crm/types";
import { PageHeader, Avatar, EmptyState } from "@/components/crm/ui";
import { relativeTime } from "@/lib/crm/utils";

export default async function AfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  let query = supabase.from("afiliados").select("*").order("created_at", { ascending: false });

  if (params.estado) query = query.eq("estado", params.estado);
  if (params.q) {
    query = query.or(
      `nombre.ilike.%${params.q}%,celular.ilike.%${params.q}%,dni.ilike.%${params.q}%`
    );
  }

  const { data } = await query.limit(100);
  const afiliados = (data || []) as Afiliado[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clientes"
        title="Afiliados"
        description="Altas, planes, documentación y seguimiento post-venta."
        actions={
          <Link href="/api/crm/export?type=afiliados" className="crm-btn crm-btn-ghost">
            Exportar CSV
          </Link>
        }
      />

      <form className="crm-card flex flex-col gap-3 p-4 sm:flex-row">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Buscar nombre, DNI, celular…"
          className="crm-input flex-1"
        />
        <select name="estado" defaultValue={params.estado || ""} className="crm-input sm:max-w-[200px]">
          <option value="">Todos</option>
          {AFILIADO_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <button type="submit" className="crm-btn crm-btn-primary">
          Filtrar
        </button>
      </form>

      {afiliados.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {afiliados.map((a) => {
            const estado = AFILIADO_ESTADOS.find((e) => e.value === a.estado);
            return (
              <Link
                key={a.id}
                href={`/crm/afiliados/${a.id}`}
                className="crm-card crm-card-hover block p-5"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={a.nombre} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{a.nombre}</p>
                    <p className="text-xs text-muted">{a.celular}</p>
                  </div>
                  <span className={`crm-badge ${estado?.color}`}>{estado?.label}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-navy">Plan</p>
                    <p>{a.plan || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Cuota</p>
                    <p>{formatMoney(a.cuota_estimada)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Modalidad</p>
                    <p className="capitalize">{a.modalidad.replaceAll("_", " ")}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Alta</p>
                    <p>{relativeTime(a.created_at)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-muted">Docs</span>
                    <span className="font-medium text-navy">
                      {a.docs_completos ? "Completos" : "Pendientes"}
                    </span>
                  </div>
                  <div className="crm-progress">
                    <span style={{ width: a.docs_completos ? "100%" : "35%" }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Sin afiliados"
          description="Convertí un lead ganado para crear la ficha de afiliado."
          actionHref="/crm/leads"
          actionLabel="Ver leads"
        />
      )}
    </div>
  );
}
