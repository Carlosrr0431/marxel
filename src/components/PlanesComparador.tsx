"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  categoriasCobertura,
  diferenciasClave,
  planesDetalle,
  type PlanId,
} from "@/lib/planes-prevencion";

type Vista = "comparar" | PlanId;

export function PlanesComparador() {
  const [vista, setVista] = useState<Vista>("comparar");
  const [categoria, setCategoria] = useState(categoriasCobertura[0].id);

  const cat = useMemo(
    () => categoriasCobertura.find((c) => c.id === categoria) || categoriasCobertura[0],
    [categoria]
  );

  return (
    <div className="space-y-8">
      {/* Selector de vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-sm">
          {(
            [
              ["comparar", "Comparar"],
              ["A2", "Plan A2"],
              ["A4", "Plan A4"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVista(id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                vista === id
                  ? "bg-navy text-white shadow"
                  : "text-muted hover:text-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Datos según folletos oficiales de Prevención Salud. Condiciones sujetas a auditoría.
        </p>
      </div>

      {vista === "comparar" ? (
        <CompararView
          categoria={categoria}
          setCategoria={setCategoria}
          cat={cat}
        />
      ) : (
        <PlanDetalleView planId={vista} />
      )}
    </div>
  );
}

function CompararView({
  categoria,
  setCategoria,
  cat,
}: {
  categoria: string;
  setCategoria: (id: string) => void;
  cat: (typeof categoriasCobertura)[number];
}) {
  return (
    <div className="space-y-6">
      {/* Cards resumen */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PlanSummaryCard planId="A2" />
        <PlanSummaryCard planId="A4" featured />
      </div>

      {/* Diferencias clave */}
      <div className="rounded-2xl border border-teal/25 bg-gradient-to-br from-aqua/50 to-mist p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">
          ¿Cuándo conviene subir a A4?
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {diferenciasClave.map((d) => (
            <div key={d.titulo} className="rounded-xl bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold text-navy">{d.titulo}</p>
              <p className="mt-1 text-sm text-muted">{d.texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chips de categoría */}
      <div className="flex flex-wrap gap-2">
        {categoriasCobertura.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoria(c.id)}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
              categoria === c.id
                ? "bg-navy text-white"
                : "border border-line bg-white text-navy hover:border-sky/40"
            }`}
          >
            <span className="mr-1.5 opacity-70">{c.icono}</span>
            {c.titulo}
          </button>
        ))}
      </div>

      {/* Tabla comparativa */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(10,61,107,0.05)]">
        <div className="hidden grid-cols-[1.15fr_1fr_1fr] border-b border-line bg-[#f7fafc] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-muted sm:grid">
          <span>{cat.titulo}</span>
          <span className="text-center text-blue">Plan A2</span>
          <span className="text-center text-teal">Plan A4</span>
        </div>
        <p className="border-b border-line bg-[#f7fafc] px-4 py-3 text-sm font-semibold text-navy sm:hidden">
          {cat.icono} {cat.titulo}
        </p>
        <ul>
          {cat.filas.map((fila) => (
            <li
              key={fila.label}
              className="grid grid-cols-1 gap-2.5 border-b border-line/70 px-4 py-4 last:border-b-0 sm:grid-cols-[1.15fr_1fr_1fr] sm:gap-3 sm:px-5"
            >
              <div>
                <p className="text-sm font-semibold text-navy">{fila.label}</p>
                {fila.nota ? (
                  <p className="mt-1 text-[11px] leading-snug text-muted">{fila.nota}</p>
                ) : null}
              </div>
              <ValorCell
                value={fila.valores.a2}
                highlight={fila.valores.mejor === "a2"}
                equal={fila.valores.mejor === "igual"}
                label="A2"
              />
              <ValorCell
                value={fila.valores.a4}
                highlight={fila.valores.mejor === "a4"}
                equal={fila.valores.mejor === "igual"}
                label="A4"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/cotizar?interes=Prevención%20Salud%20Plan%20A2"
          className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:border-sky/40"
        >
          Cotizar Plan A2
        </Link>
        <Link
          href="/cotizar?interes=Prevención%20Salud%20Plan%20A4"
          className="inline-flex items-center justify-center rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep"
        >
          Cotizar Plan A4
        </Link>
      </div>
    </div>
  );
}

function ValorCell({
  value,
  highlight,
  equal,
  label,
}: {
  value: string;
  highlight?: boolean;
  equal?: boolean;
  label: string;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed sm:text-center ${
        highlight
          ? "bg-aqua/70 font-medium text-navy ring-1 ring-teal/30"
          : equal
            ? "bg-mist/60 text-ink/85"
            : "bg-[#f8fbfd] text-muted"
      }`}
    >
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted sm:hidden">
        {label}
      </span>
      {value}
      {highlight ? (
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-teal">
          Mejor cobertura
        </span>
      ) : null}
    </div>
  );
}

function PlanSummaryCard({
  planId,
  featured,
}: {
  planId: PlanId;
  featured?: boolean;
}) {
  const plan = planesDetalle[planId];
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        featured
          ? "border-teal/40 bg-gradient-to-br from-white to-aqua/40 shadow-[0_16px_40px_rgba(26,155,150,0.12)]"
          : "border-line bg-white"
      }`}
    >
      {featured ? (
        <span className="absolute right-4 top-4 rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Más completo
        </span>
      ) : null}
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">
        {plan.linea}
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-navy">
        {plan.nombre}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{plan.tagline}</p>
      <ul className="mt-5 space-y-2">
        {plan.highlights.map((h) => (
          <li key={h} className="flex gap-2 text-sm text-ink/90">
            <span className="text-teal">✓</span>
            {h}
          </li>
        ))}
      </ul>
      <Link
        href={`/cotizar?interes=${encodeURIComponent(`Prevención Salud Plan ${planId}`)}`}
        className={`mt-6 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold ${
          featured
            ? "bg-navy text-white hover:bg-navy-deep"
            : "border border-line text-navy hover:bg-mist"
        }`}
      >
        Cotizar {plan.nombre}
      </Link>
    </article>
  );
}

function PlanDetalleView({ planId }: { planId: PlanId }) {
  const plan = planesDetalle[planId];
  const other: PlanId = planId === "A2" ? "A4" : "A2";

  return (
    <div className="space-y-6">
      <div
        className={`overflow-hidden rounded-[1.75rem] border p-6 sm:p-8 ${
          planId === "A4"
            ? "border-teal/30 bg-gradient-to-br from-navy via-blue to-teal text-white"
            : "border-line bg-gradient-to-br from-navy to-blue text-white"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
          {plan.linea}
        </p>
        <h3 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {plan.nombre}
        </h3>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
          {plan.resumen}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {plan.highlights.map((h) => (
            <span
              key={h}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {categoriasCobertura.map((c) => (
          <details
            key={c.id}
            open={c.id === "resumen" || c.id === "odontologia"}
            className="group overflow-hidden rounded-2xl border border-line bg-white"
          >
            <summary className="cursor-pointer list-none px-5 py-4 font-display text-lg font-semibold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="mr-2 text-teal">{c.icono}</span>
                  {c.titulo}
                </span>
                <span className="text-sm font-medium text-muted transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <div className="border-t border-line px-5 pb-5 pt-2">
              <ul className="divide-y divide-line/70">
                {c.filas.map((fila) => {
                  const valor = planId === "A2" ? fila.valores.a2 : fila.valores.a4;
                  const otroValor = planId === "A2" ? fila.valores.a4 : fila.valores.a2;
                  const esMejor =
                    (planId === "A4" && fila.valores.mejor === "a4") ||
                    (planId === "A2" && fila.valores.mejor === "a2");
                  return (
                    <li key={fila.label} className="py-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div>
                          <p className="text-sm font-semibold text-navy">{fila.label}</p>
                          {fila.nota ? (
                            <p className="mt-0.5 text-[11px] text-muted">{fila.nota}</p>
                          ) : null}
                        </div>
                        <div className="sm:max-w-md sm:text-right">
                          <p
                            className={`text-sm ${
                              esMejor ? "font-semibold text-teal" : "text-ink/85"
                            }`}
                          >
                            {valor}
                          </p>
                          {fila.valores.mejor !== "igual" && !esMejor ? (
                            <p className="mt-0.5 text-[11px] text-muted">
                              En {other}: {otroValor}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/cotizar?interes=${encodeURIComponent(`Prevención Salud Plan ${planId}`)}`}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-navy px-5 py-3.5 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          Cotizar {plan.nombre}
        </Link>
        <Link
          href="https://www.prevencionsalud.com.ar/cartilla-medica"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-line bg-white px-5 py-3.5 text-sm font-semibold text-navy"
        >
          Ver cartilla médica
        </Link>
      </div>
    </div>
  );
}
