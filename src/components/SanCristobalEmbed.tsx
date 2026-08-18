"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export const SAN_CRISTOBAL_PAS_BASE =
  "https://www.sancristobal.com.ar/pas/marxen-seguros";

type Product = {
  key: string;
  title: string;
  text: string;
  icon: "car" | "home" | "bike" | "heart" | "briefcase";
  path: string;
};

const PRODUCTS: Product[] = [
  {
    key: "auto",
    title: "Auto",
    text: "Asegurá tu auto y manejá tranquilo.",
    icon: "car",
    path: "/cotizar",
  },
  {
    key: "hogar",
    title: "Hogar",
    text: "Tu casa siempre protegida.",
    icon: "home",
    path: "/seguro-hogar",
  },
  {
    key: "moto",
    title: "Moto",
    text: "Protegete a vos y a tu moto en todo momento.",
    icon: "bike",
    path: "/cotizar",
  },
  {
    key: "ap",
    title: "Accidentes Personales",
    text: "Respaldo prestacional para independientes.",
    icon: "heart",
    path: "/seguro-accidentes-personales/cotizar",
  },
  {
    key: "comercio",
    title: "Integral de Comercio",
    text: "Asegurá tu mercadería y tu lugar de trabajo.",
    icon: "briefcase",
    path: "/seguro-integral-de-comercio",
  },
];

function productUrl(path: string) {
  return `${SAN_CRISTOBAL_PAS_BASE}${path}`;
}

export function SanCristobalEmbed() {
  const [active, setActive] = useState<Product | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [active?.key]);

  if (active) {
    const src = productUrl(active.path);

    return (
      <div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActive(null)}
            className="text-sm font-semibold text-navy underline-offset-4 hover:underline"
          >
            ← Volver
          </button>
          <span className="text-sm text-muted">·</span>
          <p className="font-display text-lg font-semibold text-navy">
            {active.title}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white">
          {!loaded ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cloud">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-navy/15 border-t-navy" />
              <p className="text-sm text-muted">Cargando cotizador…</p>
            </div>
          ) : null}
          <iframe
            key={src}
            src={src}
            title={`Cotizar ${active.title}`}
            className="block w-full border-0"
            style={{ height: "min(78svh, 44rem)" }}
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-write; payment"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <li key={p.key} className={p.key === "comercio" ? "sm:col-span-2 lg:col-span-1" : ""}>
          <button type="button" className="seguro-card group h-full w-full text-left" onClick={() => setActive(p)}>
            <span className="seguro-card__icon">
              <Icon name={p.icon} />
            </span>
            <h3 className="seguro-card__title">{p.title}</h3>
            <p className="seguro-card__text">{p.text}</p>
            <span className="seguro-card__arrow">Cotizar →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
