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
};

export default async function VisitasPage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cookie_visitas")
    .select("id, nombre, celular, patente, page_path, lead_id, created_at")
    .eq("consentimiento", "aceptado")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sitio web"
          title="Visitas"
          description="Quienes dejaron el WhatsApp o el nombre en el sitio."
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
        description="Quienes dejaron el WhatsApp o el nombre en el sitio."
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
                      {visit.page_path ? ` · ${visit.page_path}` : ""} · {relativeTime(visit.created_at)}
                    </p>
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
