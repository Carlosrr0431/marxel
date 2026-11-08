import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/crm/ui";
import { whatsappLink } from "@/lib/crm/types";
import { relativeTime } from "@/lib/crm/utils";
import { createServiceClient } from "@/lib/supabase/server";

type Visit = {
  id: string;
  nombre: string | null;
  celular: string | null;
  patente: string | null;
  page_path: string | null;
  lead_id: string | null;
  created_at: string;
  referrer?: string | null;
  utm_source?: string | null;
  pages?: string | null;
  recorrido?: string | null;
  landing_path?: string | null;
  last_seen_at?: string | null;
  visitas_count?: number | null;
};

function sourceOf(visit: Visit) {
  if (visit.utm_source) return visit.utm_source;
  if (!visit.referrer) return "Entrada directa";
  try {
    return new URL(visit.referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Otro sitio";
  }
}

function visitLabel(count: number | null | undefined) {
  const total = count && count > 0 ? count : 1;
  return total === 1 ? "1 visita" : `${total} visitas`;
}

export default async function VisitasPage() {
  const supabase = createServiceClient();
  const full = await supabase
    .from("cookie_visitas")
    .select("id, nombre, celular, patente, page_path, lead_id, created_at, referrer, utm_source, pages, landing_path, last_seen_at, visitas_count, recorrido")
    .eq("consentimiento", "aceptado")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(80);
  const basic = full.error
    ? await supabase
        .from("cookie_visitas")
        .select("id, nombre, celular, patente, page_path, lead_id, created_at")
        .eq("consentimiento", "aceptado")
        .order("created_at", { ascending: false })
        .limit(80)
    : null;
  const data = full.error ? basic?.data : full.data;
  const error = full.error ? basic?.error : null;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sitio web"
          title="Visitas"
          description="De dónde llegaron, qué miraron y cuántas veces volvieron."
        />
        <EmptyState
          title="Falta crear la tabla"
          description="Corré supabase/cookie_visitas.sql en el editor SQL de Supabase y recargá esta pantalla."
        />
      </div>
    );
  }

  const visits = ((data || []) as Visit[]).filter((visit) => visit.celular || visit.nombre);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sitio web"
        title="Visitas"
        description="De dónde llegaron, qué miraron y cuántas veces volvieron."
      />
      {visits.length ? (
        <div className="grid gap-3">
          {visits.map((visit) => {
            const name = visit.nombre || "Visita del sitio";
            return (
              <article key={visit.id} className="crm-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {visit.lead_id ? (
                      <Link href={`/crm/leads/${visit.lead_id}`} className="font-display text-lg font-semibold text-navy hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <p className="font-display text-lg font-semibold text-navy">{name}</p>
                    )}
                    <p className="mt-1 text-sm text-muted">
                      {visit.celular || "Sin WhatsApp"}
                      {visit.patente ? ` · ${visit.patente}` : ""}
                      {` · ${visitLabel(visit.visitas_count)} · ${sourceOf(visit)} · ${relativeTime(visit.last_seen_at || visit.created_at)}`}
                    </p>
                    {visit.recorrido || visit.pages || visit.page_path ? (
                      <p className="mt-1 text-sm text-muted">{visit.recorrido || `Miró ${visit.pages || visit.page_path}`}</p>
                    ) : null}
                  </div>
                </div>
                {visit.celular ? (
                  <div className="mt-4">
                    <a
                      href={whatsappLink(visit.celular, "Hola, te escribe Marcos de MARXEN. Vi que estuviste mirando una cotización.")}
                      target="_blank"
                      rel="noreferrer"
                      className="crm-btn crm-btn-primary"
                    >
                      WhatsApp
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay contactos"
          description="Cuando alguien deje su WhatsApp en el sitio, aparece acá."
        />
      )}
    </div>
  );
}
