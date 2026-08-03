import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/crm/types";
import { LEAD_ESTADOS, PRODUCTOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { PageHeader, Avatar, EmptyState } from "@/components/crm/ui";
import { LeadsBulkBar } from "@/components/crm/LeadsBulkBar";
import { prioridadColor, productoLabel, relativeTime, scoreLead } from "@/lib/crm/utils";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; producto?: string; tag?: string }>;
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
  if (params.tag) query = query.contains("tags", [params.tag]);

  const { data: leadsRaw } = await query.limit(120);
  const leads = ((leadsRaw || []) as Lead[]).map((l) => ({
    ...l,
    puntaje: l.puntaje || scoreLead(l),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prospectos"
        title="Leads"
        description="Gestioná el pipeline comercial antes de la conversión a afiliado."
        actions={
          <>
            <Link href="/api/crm/export?type=leads" className="crm-btn crm-btn-ghost">
              Exportar
            </Link>
            <Link href="/crm/leads/nuevo" className="crm-btn crm-btn-primary">
              + Nuevo lead
            </Link>
          </>
        }
      />

      <form className="crm-card grid gap-3 p-4 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Buscar nombre, celular, email…"
          className="crm-input sm:col-span-2"
        />
        <select name="estado" defaultValue={params.estado || ""} className="crm-input">
          <option value="">Todos los estados</option>
          {LEAD_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="producto" defaultValue={params.producto || ""} className="crm-input">
            <option value="">Producto</option>
            {PRODUCTOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button type="submit" className="crm-btn crm-btn-primary shrink-0">
            Filtrar
          </button>
        </div>
      </form>

      {leads.length ? (
        <LeadsBulkBar leads={leads.map((l) => ({ id: l.id, nombre: l.nombre }))}>
          <div className="crm-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#f7fafc] text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Prioridad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    return (
                      <tr key={lead.id} className="border-t border-line/80 hover:bg-mist/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              name="lead_ids"
                              value={lead.id}
                              className="lead-check h-4 w-4 rounded border-line"
                              form="bulk-form"
                            />
                            <Avatar name={lead.nombre} size="sm" />
                            <div>
                              <Link
                                href={`/crm/leads/${lead.id}`}
                                className="font-semibold text-navy hover:underline"
                              >
                                {lead.nombre}
                              </Link>
                              <p className="text-xs text-muted">{lead.celular}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-display text-base font-bold text-teal">
                            {lead.puntaje}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {productoLabel(lead.producto)}
                          {lead.plan_interes ? (
                            <span className="block text-xs">{lead.plan_interes}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`crm-badge ${prioridadColor(lead.prioridad)}`}>
                            {lead.prioridad}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(lead.tags || []).slice(0, 3).map((t) => (
                              <Link
                                key={t}
                                href={`/crm/leads?tag=${encodeURIComponent(t)}`}
                                className="crm-badge bg-mist text-navy"
                              >
                                #{t}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{relativeTime(lead.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </LeadsBulkBar>
      ) : (
        <EmptyState
          title="Sin leads todavía"
          description="Cuando alguien cotice en la web, aparece acá. También podés cargar uno manual."
          actionHref="/crm/leads/nuevo"
          actionLabel="Crear lead"
        />
      )}
    </div>
  );
}
