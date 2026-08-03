import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/crm/types";
import { formatDate, LEAD_ESTADOS, PRODUCTOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; producto?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (params.estado) query = query.eq("estado", params.estado);
  if (params.producto) query = query.eq("producto", params.producto);
  if (params.q) {
    query = query.or(
      `nombre.ilike.%${params.q}%,celular.ilike.%${params.q}%,email.ilike.%${params.q}%`
    );
  }

  const { data: leads } = await query.limit(100);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            Prospectos en seguimiento comercial (aún no afiliados).
          </p>
        </div>
        <Link
          href="/crm/leads/nuevo"
          className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          + Nuevo lead
        </Link>
      </header>

      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Buscar nombre, celular, email…"
          className="rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm sm:col-span-2"
        />
        <select
          name="estado"
          defaultValue={params.estado || ""}
          className="rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {LEAD_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            name="producto"
            defaultValue={params.producto || ""}
            className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
          >
            <option value="">Todos</option>
            {PRODUCTOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-navy px-4 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Origen</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Próximo contacto</th>
                <th className="px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {(leads as Lead[] | null)?.map((lead) => (
                <tr key={lead.id} className="border-t border-line/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="font-semibold text-navy hover:underline"
                    >
                      {lead.nombre}
                    </Link>
                    <p className="text-xs text-muted">{lead.celular}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">
                    {lead.producto}
                    {lead.plan_interes ? (
                      <span className="block text-xs">{lead.plan_interes}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">{lead.origen}</td>
                  <td className="px-4 py-3">
                    <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(lead.proximo_contacto_at)}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
              {!leads?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No hay leads. Creá uno o esperá cotizaciones desde la web.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
