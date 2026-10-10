import Link from "next/link";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { EmptyState, PageHeader } from "@/components/crm/ui";
import { LEAD_ESTADOS, whatsappLink, type LeadEstado } from "@/lib/crm/types";
import { relativeTime } from "@/lib/crm/utils";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

const whenFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type FormLead = {
  id: string;
  nombre: string;
  celular: string;
  notas_iniciales: string | null;
  page_path: string | null;
  estado: LeadEstado;
  created_at: string;
  updated_at: string;
};

type FormNote = {
  lead_id: string;
  detalle: string | null;
  created_at: string;
};

function displayPhone(phone: string) {
  const digits = normalizeArPhone(phone);
  if (digits.startsWith("549") && digits.length >= 12) return `+54 9 ${digits.slice(3)}`;
  return phone || "Sin teléfono";
}

function pageLabel(path: string | null) {
  if (path === "/contacto") return "Contacto";
  if (path === "/formulario") return "Formulario";
  return "Sitio web";
}

function estadoOf(value: string) {
  return LEAD_ESTADOS.find((item) => item.value === value);
}

const issuers = [
  {
    href: "/crm/sancristobal",
    name: "San Cristóbal",
    logo: "/companias/sancristobal.svg",
  },
  {
    href: "/crm/smg",
    name: "Swiss Medical",
    logo: "/companias/smg.svg",
  },
];

export default async function FormularioPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leads")
    .select("id, nombre, celular, notas_iniciales, page_path, estado, created_at, updated_at")
    .or("origen_detalle.eq.formulario,tags.cs.{formulario}")
    .order("updated_at", { ascending: false })
    .limit(80);
  const leads = (data || []) as FormLead[];
  const ids = leads.map((lead) => lead.id);
  const { data: notes } = ids.length
    ? await supabase
        .from("actividades")
        .select("lead_id, detalle, created_at")
        .in("lead_id", ids)
        .eq("titulo", "Consulta del formulario")
        .order("created_at", { ascending: false })
    : { data: [] as FormNote[] };
  const byLead = new Map<string, FormNote[]>();
  for (const note of (notes || []) as FormNote[]) {
    const list = byLead.get(note.lead_id) || [];
    list.push(note);
    byLead.set(note.lead_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sitio web"
        title="Formulario"
        description="Teléfono y mensaje de quienes pidieron que los contacten desde el sitio."
      />

      <section className="grid gap-3 sm:grid-cols-2">
        {issuers.map((company) => (
          <Link
            key={company.href}
            href={company.href}
            className="crm-card crm-card-hover flex flex-col gap-4 p-5"
          >
            <span className="flex h-20 items-center justify-center rounded-2xl bg-mist px-6">
              <img src={company.logo} alt="" className="h-9 w-full max-w-[11rem] object-contain" />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-navy">{company.name}</span>
              <span className="mt-1 block text-sm text-muted">Hacé clic para pasar a la emisión de la póliza.</span>
            </span>
            <span className="text-sm font-semibold text-teal">Emitir</span>
          </Link>
        ))}
      </section>

      {leads.length ? (
        <div className="grid gap-3">
          {leads.map((lead) => {
            const estado = estadoOf(lead.estado);
            const stored = byLead.get(lead.id) || [];
            const messages = stored.length
              ? stored.map((note) => ({ text: note.detalle || "", at: note.created_at }))
              : String(lead.notas_iniciales || "")
                  .split(/\n\n/)
                  .map((text) => text.trim())
                  .filter(Boolean)
                  .map((text) => ({ text, at: lead.updated_at }));
            const shown = messages.length
              ? messages
              : [{ text: "Pidió que lo contacten desde el formulario.", at: lead.created_at }];
            const name = lead.nombre && lead.nombre !== "Contacto web" ? lead.nombre : displayPhone(lead.celular);

            return (
              <article key={lead.id} className="crm-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/crm/leads/${lead.id}`} className="font-display text-lg font-semibold text-navy hover:underline">
                      {name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {displayPhone(lead.celular)} · {pageLabel(lead.page_path)} · {relativeTime(lead.updated_at)}
                    </p>
                  </div>
                  {estado ? <span className={`crm-badge ${estado.color}`}>{estado.label}</span> : null}
                </div>

                <div className="mt-4 grid gap-2">
                  {shown.map((message) => (
                    <p key={`${message.at}-${message.text.slice(0, 24)}`} className="rounded-2xl bg-mist px-4 py-3 text-sm text-navy">
                      {message.text}
                      <span className="mt-1 block text-xs text-muted">
                        {whenFormatter.format(new Date(message.at))}
                      </span>
                    </p>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <LeadEstadoSelect leadId={lead.id} value={lead.estado} />
                  <a
                    href={whatsappLink(lead.celular, "Hola, te escribe Marcos de MARXEN por la consulta que dejaste en la web.")}
                    target="_blank"
                    rel="noreferrer"
                    className="crm-btn crm-btn-primary"
                  >
                    WhatsApp
                  </a>
                  <Link href={`/crm/leads/${lead.id}`} className="crm-btn">
                    Ver ficha
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay consultas"
          description="Cuando alguien deje su teléfono en el sitio, aparece acá con el mensaje."
        />
      )}
    </div>
  );
}
