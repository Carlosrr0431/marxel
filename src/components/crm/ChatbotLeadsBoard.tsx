import Link from "next/link";
import type { Lead } from "@/lib/crm/types";
import { LEAD_ESTADOS, PRODUCTOS } from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { Avatar, ProductoPill } from "@/components/crm/ui";
import { OpenCrmChatButton } from "@/components/crm/OpenCrmChatButton";
import { prioridadColor, relativeTime } from "@/lib/crm/utils";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

type Filters = {
  q?: string;
  estado?: string;
  producto?: string;
  modalidad?: string;
};

const PRODUCT_CHIPS = [
  { value: "", label: "Todos" },
  ...PRODUCTOS.map((p) => ({ value: p.value, label: p.label.split(" · ")[0] })),
];

function displayPhone(phone: string) {
  const n = normalizeArPhone(phone);
  if (n.startsWith("549") && n.length >= 12) {
    return `+54 9 ${n.slice(3)}`;
  }
  return phone || "—";
}

function hrefFor(next: Filters) {
  const params = new URLSearchParams();
  params.set("origen", "chatbot");
  if (next.q) params.set("q", next.q);
  if (next.estado) params.set("estado", next.estado);
  if (next.producto) params.set("producto", next.producto);
  if (next.modalidad) params.set("modalidad", next.modalidad);
  return `/crm/leads?${params.toString()}`;
}

export function ChatbotLeadsBoard({
  leads,
  existingPhones,
  filters,
}: {
  leads: Lead[];
  existingPhones: string[];
  filters: Filters;
}) {
  const known = new Set(existingPhones);
  const filtered = Boolean(filters.q || filters.estado || filters.producto || filters.modalidad);
  const urgent = leads.filter((l) => l.prioridad === "urgente" || l.puntaje >= 70).length;
  const withPhone = leads.filter((l) => Boolean(normalizeArPhone(l.celular))).length;
  const byProducto = {
    salud: leads.filter((l) => l.producto === "salud").length,
    seguros: leads.filter((l) => l.producto === "seguros").length,
    viajero: leads.filter((l) => l.producto === "viajero").length,
  };

  return (
    <div className="bot-board">
      <header className="bot-hero">
        <div className="bot-hero__copy">
          <p>Asistente web</p>
          <h1>Leads del chatbot</h1>
          <span>Creá el contacto y escribile directo desde Chats.</span>
        </div>
        <ul className="bot-stats">
          <li>
            <b>{leads.length}</b>
            <span>en cola</span>
          </li>
          <li>
            <b>{urgent}</b>
            <span>calientes</span>
          </li>
          <li>
            <b>{withPhone}</b>
            <span>con celular</span>
          </li>
          <li>
            <b>{byProducto.salud}</b>
            <span>salud</span>
          </li>
          <li>
            <b>{byProducto.seguros}</b>
            <span>seguros</span>
          </li>
          <li>
            <b>{byProducto.viajero}</b>
            <span>viajero</span>
          </li>
        </ul>
      </header>

      <form className="bot-toolbar" action="/crm/leads">
        <input type="hidden" name="origen" value="chatbot" />
        {filters.modalidad ? <input type="hidden" name="modalidad" value={filters.modalidad} /> : null}
        <label className="bot-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16.5L20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            defaultValue={filters.q || ""}
            placeholder="Buscar nombre, celular o localidad"
            aria-label="Buscar leads del chatbot"
          />
        </label>
        <nav className="bot-pills" aria-label="Producto">
          {PRODUCT_CHIPS.map((chip) => {
            const active = (filters.producto || "") === chip.value;
            return (
              <Link
                key={chip.label}
                href={hrefFor({ ...filters, producto: chip.value || undefined })}
                className={active ? "is-on" : ""}
              >
                {chip.label}
              </Link>
            );
          })}
        </nav>
        <select
          name="estado"
          defaultValue={filters.estado || ""}
          className="bot-select"
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          {LEAD_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <button type="submit" className="bot-apply">
          Buscar
        </button>
        {filtered ? (
          <Link href="/crm/leads?origen=chatbot" className="bot-clear">
            Limpiar
          </Link>
        ) : null}
      </form>

      {leads.length ? (
        <div className="bot-list">
          {leads.map((lead) => {
            const phone = normalizeArPhone(lead.celular);
            const existing = Boolean(phone && known.has(phone));
            return (
              <article key={lead.id} className="bot-row">
                <Avatar name={lead.nombre} size="sm" />
                <div className="bot-row__who">
                  <div className="bot-row__name">
                    <Link href={`/crm/leads/${lead.id}`}>{lead.nombre}</Link>
                    <span className={`crm-badge ${prioridadColor(lead.prioridad)}`}>
                      {lead.prioridad}
                    </span>
                  </div>
                  <p>
                    {displayPhone(lead.celular)}
                    {lead.localidad ? ` · ${lead.localidad}` : ""}
                  </p>
                </div>
                <div className="bot-row__meta">
                  <ProductoPill producto={lead.producto} />
                  {lead.plan_interes ? <span>{lead.plan_interes}</span> : null}
                </div>
                <div className="bot-row__score">
                  <b>{lead.puntaje}</b>
                  <span>score</span>
                </div>
                <div className="bot-row__state">
                  <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                  <time>{relativeTime(lead.created_at)}</time>
                </div>
                <div className="bot-row__actions">
                  <OpenCrmChatButton
                    leadId={lead.id}
                    phone={lead.celular}
                    name={lead.nombre}
                    existing={existing}
                  />
                  <Link href={`/crm/leads/${lead.id}`} className="bot-ghost">
                    Ficha
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bot-empty">
          <p>No hay leads del chatbot con esos filtros.</p>
          <span>Cuando alguien complete el asistente de la web, aparece acá.</span>
        </div>
      )}
    </div>
  );
}
