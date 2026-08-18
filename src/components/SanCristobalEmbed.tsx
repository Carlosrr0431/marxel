"use client";

import { useState } from "react";

export const SAN_CRISTOBAL_PAS_URL =
  "https://www.sancristobal.com.ar/pas/marxen-seguros";

type SanCristobalEmbedProps = {
  /** Altura mínima del iframe (desktop) */
  minHeight?: number;
};

/**
 * Embebe el Sitio Seguro de San Cristóbal (PAS MARXEN).
 * El contenido y los links se actualizan en vivo desde sancristobal.com.ar.
 */
export function SanCristobalEmbed({ minHeight = 1100 }: SanCristobalEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line/80 bg-white shadow-[0_16px_48px_rgba(5,30,54,0.08)]">
      <div className="flex flex-col gap-3 border-b border-line/70 bg-mist/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Cotización online
          </p>
          <p className="mt-0.5 text-sm font-medium text-navy">
            San Cristóbal Seguros · Sitio MARXEN
          </p>
        </div>
        <a
          href={SAN_CRISTOBAL_PAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-navy transition hover:border-sky/40 hover:bg-aqua"
        >
          Abrir en pantalla completa
          <span aria-hidden>↗</span>
        </a>
      </div>

      <div className="relative w-full bg-[#f4f5f7]" style={{ minHeight }}>
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f5f7] px-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
            <p className="text-sm text-muted">Cargando cotizador San Cristóbal…</p>
          </div>
        ) : null}

        <iframe
          src={SAN_CRISTOBAL_PAS_URL}
          title="Cotizá seguros San Cristóbal con MARXEN"
          className="relative z-0 w-full border-0"
          style={{ height: minHeight, minHeight }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-write; payment"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <p className="border-t border-line/60 px-4 py-3 text-[11px] leading-relaxed text-muted sm:px-5">
        Cotizá Auto, Hogar, Moto, Accidentes Personales e Integral de Comercio
        directamente en el sitio oficial de San Cristóbal. Los precios y coberturas
        se actualizan en tiempo real.
      </p>
    </div>
  );
}
