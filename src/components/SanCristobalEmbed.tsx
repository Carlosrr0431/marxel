"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { AutoQuoteNative } from "@/components/AutoQuoteNative";
import { HogarQuoteNative } from "@/components/HogarQuoteNative";
import { MotoQuoteNative } from "@/components/MotoQuoteNative";
import { ApQuoteNative } from "@/components/ApQuoteNative";
import { ComercioQuoteNative } from "@/components/ComercioQuoteNative";

type Product = {
  key: "auto" | "hogar" | "moto" | "ap" | "comercio";
  title: string;
  text: string;
  icon: "car" | "home" | "bike" | "heart" | "briefcase";
};

const PRODUCTS: Product[] = [
  {
    key: "auto",
    title: "Auto",
    text: "Asegurá tu auto y manejá tranquilo.",
    icon: "car",
  },
  {
    key: "hogar",
    title: "Hogar",
    text: "Tu casa siempre protegida.",
    icon: "home",
  },
  {
    key: "moto",
    title: "Moto",
    text: "Protegete a vos y a tu moto en todo momento.",
    icon: "bike",
  },
  {
    key: "ap",
    title: "Accidentes Personales",
    text: "Respaldo prestacional para independientes.",
    icon: "heart",
  },
  {
    key: "comercio",
    title: "Integral de Comercio",
    text: "Asegurá tu mercadería y tu lugar de trabajo.",
    icon: "briefcase",
  },
];

export function SanCristobalEmbed() {
  const [active, setActive] = useState<Product["key"] | null>(null);
  const onBack = () => setActive(null);

  if (active === "auto") return <AutoQuoteNative onBack={onBack} />;
  if (active === "hogar") return <HogarQuoteNative onBack={onBack} />;
  if (active === "moto") return <MotoQuoteNative onBack={onBack} />;
  if (active === "ap") return <ApQuoteNative onBack={onBack} />;
  if (active === "comercio") return <ComercioQuoteNative onBack={onBack} />;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <li key={p.key} className={p.key === "comercio" ? "sm:col-span-2 lg:col-span-1" : ""}>
          <button type="button" className="seguro-card group h-full w-full text-left" onClick={() => setActive(p.key)}>
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
