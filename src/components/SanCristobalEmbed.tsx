"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export const SAN_CRISTOBAL_PAS_BASE =
  "https://www.sancristobal.com.ar/pas/marxen-seguros";

type ProductKey = "auto" | "hogar" | "moto" | "ap" | "comercio";

type Product = {
  key: ProductKey;
  title: string;
  text: string;
  icon: "car" | "home" | "bike" | "heart" | "briefcase";
  /** Ruta del cotizador en el Sitio Seguro (misma pestaña vía iframe) */
  path: string;
};

const PRODUCTS: Product[] = [
  {
    key: "auto",
    title: "Auto",
    text: "Asegurá tu auto y manejá tranquilo",
    icon: "car",
    path: "/cotizar",
  },
  {
    key: "hogar",
    title: "Hogar",
    text: "Tu casa siempre protegida con San Cristóbal Seguros",
    icon: "home",
    path: "/seguro-hogar",
  },
  {
    key: "moto",
    title: "Moto",
    text: "Protegete a vos y a tu moto en todo momento",
    icon: "bike",
    path: "/cotizar",
  },
  {
    key: "ap",
    title: "Accidentes Personales",
    text: "Trabajá tranquilo, seguro prestacional para independientes",
    icon: "heart",
    path: "/seguro-accidentes-personales/cotizar",
  },
  {
    key: "comercio",
    title: "Integral de Comercio",
    text: "Asegurá tu mercadería y tu lugar de trabajo",
    icon: "briefcase",
    path: "/seguro-integral-de-comercio",
  },
];

function productUrl(path: string) {
  return `${SAN_CRISTOBAL_PAS_BASE}${path}`;
}

/**
 * Selector de ramos + cotizador embebido.
 * Al elegir un producto se actualiza el mismo panel (sin nueva pestaña).
 */
export function SanCristobalEmbed() {
  const [active, setActive] = useState<Product | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [active?.key]);

  if (active) {
    const src = productUrl(active.path);
    return (
      <div className="sc-panel">
        <div className="sc-panel__bar">
          <button
            type="button"
            className="sc-panel__back"
            onClick={() => setActive(null)}
          >
            ← Volver a seguros
          </button>
          <p className="sc-panel__bar-title">
            Cotizando · {active.title}
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-panel__external"
          >
            Pantalla completa ↗
          </a>
        </div>

        <div className="sc-panel__frame-wrap">
          {!loaded ? (
            <div className="sc-panel__loading">
              <div className="sc-panel__spinner" />
              <p>Cargando cotizador de {active.title}…</p>
            </div>
          ) : null}
          <iframe
            key={src}
            src={src}
            title={`Cotizar ${active.title} — San Cristóbal / MARXEN`}
            className="sc-panel__iframe"
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
    <div className="sc-catalog">
      <div className="sc-catalog__head">
        <p className="eyebrow">Cotización online</p>
        <h2 className="sc-catalog__title">Conocé más sobre nuestros seguros</h2>
        <p className="sc-catalog__sub">
          Elegí un ramo. El cotizador de San Cristóbal se abre acá mismo, sin
          salir de MARXEN.
        </p>
      </div>

      <ul className="sc-catalog__grid">
        {PRODUCTS.map((p) => (
          <li key={p.key}>
            <button
              type="button"
              className="sc-product"
              onClick={() => setActive(p)}
            >
              <span className="sc-product__icon">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
              <span className="sc-product__body">
                <span className="sc-product__title">{p.title}</span>
                <span className="sc-product__text">{p.text}</span>
              </span>
              <span className="sc-product__cta">Cotizar →</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="sc-catalog__note">
        Precios y coberturas se actualizan en vivo desde San Cristóbal Seguros.
      </p>
    </div>
  );
}
