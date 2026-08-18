import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/crm/types";
import { LEAD_ESTADOS, MODALIDADES, PRODUCTOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { PageHeader, Avatar, EmptyState, ProductoPill, ChatbotBadge } from "@/components/crm/ui";
import { LeadsBulkBar } from "@/components/crm/LeadsBulkBar";
import { prioridadColor, relativeTime, scoreLead } from "@/lib/crm/utils";
import { isChatbotLead } from "@/lib/crm/chatbot-brief";

const QUICK = [
  { href: "/crm/leads?origen=chatbot", label: "Chatbot" },
  { href: "/crm/leads?tag=caliente", label: "Calientes" },
  { href: "/crm/leads?producto=salud", label: "Salud" },
  { href: "/crm/leads?producto=seguros", label: "Seguros" },
  { href: "/crm/leads?producto=viajero", label: "Viajero" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    producto?: string;
    tag?: string;
    origen?: string;
    modalidad?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (params.estado) query = query.eq("estado", params.estado);
  if (params.producto) query = query.eq("producto", params.producto);
  if (params.modalidad) query = query.eq("modalidad", params.modalidad);
  if (params.origen === "chatbot") query = query.eq("origen_detalle", "chatbot");
  if (params.q) {
    query = query.or(
      `nombre.ilike.%${params.q}%,celular.ilike.%${params.q}%,email.ilike.%${params.q}%,localidad.ilike.%${params.q}%`
    );
  }
  if (params.tag) query = query.contains("tags", [params.tag]);

  const { data: leadsRaw } = await query.limit(120);
  const leads = ((leadsRaw || []) as Lead[]).map((l) => ({
    ...l,
    puntaje: l.puntaje || scoreLead(l),
  }));

  const fromChatbot = params.origen === "chatbot";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={fromChatbot ? "Asistente" : "Prospectos"}
        title={fromChatbot ? "Leads del chatbot" : "Leads"}
        description={
          fromChatbot
            ? "Calificados por el asistente: producto, localidad y datos para cotizar."
            : "Gestioná el pipeline comercial antes de la conversión a afiliado."
        }
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

      <div className="flex flex-wrap gap-2">
        {QUICK.map((chip) => {
          const active =
            (chip.label === "Chatbot" && fromChatbot) ||
            (params.tag === "caliente" && chip.label === "Calientes") ||
            (params.producto && chip.href.endsWith(`producto=${params.producto}`));
          return (
            <Link
              key={chip.href}
              href={chip.href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-navy hover:bg-mist"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
        {params.estado || params.producto || params.tag || params.origen || params.q || params.modalidad ? (
          <Link href="/crm/leads" className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-navy">
            Limpiar
          </Link>
        ) : null}
      </div>

      <form className="crm-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Buscar nombre, celular, localidad…"
          className="crm-input lg:col-span-2"
        />
        <select name="estado" defaultValue={params.estado || ""} className="crm-input">
          <option value="">Todos los estados</option>
          {LEAD_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <select name="producto" defaultValue={params.producto || ""} className="crm-input">
          <option value="">Producto</option>
          {PRODUCTOS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select name="origen" defaultValue={params.origen || ""} className="crm-input">
          <option value="">Origen</option>
          <option value="chatbot">Chatbot</option>
        </select>
        <div className="flex gap-2">
          <select name="modalidad" defaultValue={params.modalidad || ""} className="crm-input">
            <option value="">Modalidad</option>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
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
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#f7fafc] text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Localidad</th>
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
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Link
                                  href={`/crm/leads/${lead.id}`}
                                  className="font-semibold text-navy hover:underline"
                                >
                                  {lead.nombre}
                                </Link>
                                {isChatbotLead(lead) ? <ChatbotBadge /> : null}
                              </div>
                              <p className="text-xs text-muted">{lead.celular}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-display text-base font-bold text-teal">
                            {lead.puntaje}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ProductoPill producto={lead.producto} />
                          {lead.plan_interes ? (
                            <span className="mt-1 block text-xs text-muted">{lead.plan_interes}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted">{lead.localidad || "—"}</td>
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
          description="Cuando alguien cotice en la web o use el chatbot, aparece acá. También podés cargar uno manual."
          actionHref="/crm/leads/nuevo"
          actionLabel="Crear lead"
        />
      )}
    </div>
  );
}
