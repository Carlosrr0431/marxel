import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Afiliado } from "@/lib/crm/types";
import { AFILIADO_ESTADOS, formatDate, formatMoney } from "@/lib/crm/types";

export default async function AfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  let query = supabase
    .from("afiliados")
    .select("*")
    .order("created_at", { ascending: false });

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
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy">
          Afiliados
        </h1>
        <p className="mt-1 text-sm text-muted">
          Clientes convertidos: altas, planes y seguimiento post-venta.
        </p>
      </header>

      <form className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Buscar nombre, DNI, celular…"
          className="flex-1 rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
        />
        <select
          name="estado"
          defaultValue={params.estado || ""}
          className="rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
        >
          <option value="">Todos</option>
          {AFILIADO_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Afiliado</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Modalidad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Cuota</th>
                <th className="px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {afiliados.map((a) => {
                const estado = AFILIADO_ESTADOS.find((e) => e.value === a.estado);
                return (
                  <tr key={a.id} className="border-t border-line/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm/afiliados/${a.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        {a.nombre}
                      </Link>
                      <p className="text-xs text-muted">{a.celular}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{a.plan || "—"}</td>
                    <td className="px-4 py-3 capitalize text-muted">
                      {a.modalidad.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${estado?.color}`}>
                        {estado?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatMoney(a.cuota_estimada)}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(a.created_at)}</td>
                  </tr>
                );
              })}
              {!afiliados.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Todavía no hay afiliados. Convertí un lead ganado.
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
