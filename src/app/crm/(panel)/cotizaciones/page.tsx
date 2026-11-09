import Link from "next/link";
import { EmptyState, PageHeader, Avatar } from "@/components/crm/ui";
import { quoteMoney, quoteShareText, quoteStatusLabel } from "@/lib/crm/saved-quote";
import { listCotizaciones } from "@/lib/crm/saved-quotes";
import { whatsappLink } from "@/lib/crm/types";
import { relativeTime } from "@/lib/crm/utils";

const FILTERS = [
  { id: "", label: "Todas" },
  { id: "guardada", label: "Guardadas" },
  { id: "enviada", label: "Enviadas" },
  { id: "elegida", label: "Elegidas" },
  { id: "emitida", label: "Emitidas" },
];

function lowest(row: { premio_api: number | null; premio_sitio: number | null; premio_smg: number | null }) {
  const values = [row.premio_api, row.premio_sitio, row.premio_smg].filter((value): value is number => Boolean(value && value > 0));
  return values.length ? Math.min(...values) : 0;
}

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const q = String(params.q || "");
  const estado = String(params.estado || "");
  const { rows, missing } = await listCotizaciones(q, estado);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archivo"
        title="Cotizaciones"
        description="Cada cotización del CRM queda guardada. La abrís, la reenviás o la emitís sin cargar el auto de nuevo."
        actions={
          <Link href="/crm/cotizar" className="crm-btn crm-btn-primary">
            Nueva cotización
          </Link>
        }
      />
      <form action="/crm/cotizaciones" className="flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={q}
          className="crm-input"
          placeholder="Nombre, patente, DNI o WhatsApp"
        />
        {estado ? <input type="hidden" name="estado" value={estado} /> : null}
        <button type="submit" className="crm-btn crm-btn-primary">
          Buscar
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const href = item.id
            ? `/crm/cotizaciones?estado=${item.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : `/crm/cotizaciones${q ? `?q=${encodeURIComponent(q)}` : ""}`;
          const on = estado === item.id;
          return (
            <Link key={item.id || "todas"} href={href} className={`crm-btn ${on ? "crm-btn-primary" : "crm-btn-ghost"}`}>
              {item.label}
            </Link>
          );
        })}
      </div>
      {missing ? (
        <EmptyState
          title="Falta crear la tabla"
          description="Corré supabase/cotizaciones.sql en el editor SQL de Supabase y recargá esta pantalla."
        />
      ) : rows.length ? (
        <div className="grid gap-3">
          {rows.map((row) => {
            const best = lowest(row);
            return (
              <article key={row.id} className="crm-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar name={row.nombre} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold text-navy">{row.nombre}</p>
                      <span className="rounded-full bg-aqua px-2.5 py-1 text-[11px] font-bold text-teal">
                        {quoteStatusLabel(row.estado)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {row.vehiculo || "Auto"}
                      {row.patente ? ` · ${row.patente}` : ""}
                      {row.dni ? ` · DNI ${row.dni}` : ""}
                      {` · ${relativeTime(row.created_at)}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.premio_sitio ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.premio_sitio === best ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-navy"}`}>
                          Sitio {quoteMoney(row.premio_sitio)}
                        </span>
                      ) : null}
                      {row.premio_api ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.premio_api === best ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-navy"}`}>
                          API {quoteMoney(row.premio_api)}
                        </span>
                      ) : null}
                      {row.premio_smg ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.premio_smg === best ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-navy"}`}>
                          SMG {quoteMoney(row.premio_smg)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/crm/cotizar?id=${row.id}`} className="crm-btn crm-btn-primary">
                    Abrir
                  </Link>
                  {row.celular ? (
                    <a
                      href={whatsappLink(row.celular, quoteShareText(row))}
                      target="_blank"
                      rel="noreferrer"
                      className="crm-btn crm-btn-teal"
                    >
                      Reenviar
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={q || estado ? "No hay cotizaciones con esa búsqueda" : "Todavía no hay cotizaciones"}
          description="Cuando cotices un auto en el CRM, queda acá con los precios para abrirla después."
          actionHref="/crm/cotizar"
          actionLabel="Cotizar un auto"
        />
      )}
    </div>
  );
}
