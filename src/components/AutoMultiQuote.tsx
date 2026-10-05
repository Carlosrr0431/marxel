"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { companias, site } from "@/lib/content";
import { CompanyMark } from "./CompanyMark";

const YEARS = Array.from({ length: 32 }, (_, i) => String(2026 - i));

export function AutoMultiQuote() {
  const [mode, setMode] = useState<"patente" | "datos">("patente");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const popup = window.open("about:blank", "_blank");
    const data = new FormData(e.currentTarget);
    const nombre = String(data.get("nombre") || "").trim();
    const celular = String(data.get("celular") || "").trim();
    const patente = String(data.get("patente") || "").trim().toUpperCase();
    const anio = String(data.get("anio") || "");
    const marca = String(data.get("marca") || "").trim();
    const modelo = String(data.get("modelo") || "").trim();
    const cp = String(data.get("cp") || "").trim();
    const vehiculo =
      mode === "patente"
        ? `Patente ${patente} · CP ${cp}`
        : `${anio} ${marca} ${modelo} · CP ${cp}`;
    const notas = `Multi cotizador de autos\n${vehiculo}\nCompañías: ${companias.map((c) => c.name).join(", ")}`;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          celular,
          provincia: "Salta",
          localidad: "Salta",
          interes: "Seguro de auto",
          notas,
          page_path: window.location.pathname,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar la cotización");
      }
    } catch (err) {
      popup?.close();
      setError(err instanceof Error ? err.message : "Error al enviar");
      setLoading(false);
      return;
    }

    const waUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
      [`Hola Marcos, soy ${nombre}.`, `Quiero cotizar el auto: ${vehiculo}.`, `Celular: ${celular}.`].join("\n")
    )}`;
    if (popup) popup.location.href = waUrl;
    else window.location.href = waUrl;
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="auto-quote">
        <p className="font-display text-xl font-semibold text-navy">Pedido recibido</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Marcos compara tu auto con estas compañías y te escribe al WhatsApp.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {companias.map((company) => (
            <CompanyMark key={company.slug} company={company} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form className="auto-quote" onSubmit={onSubmit}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Multi cotizador de autos</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-navy">Compará tu seguro de auto</h2>
      <p className="mt-1 text-sm text-muted">Un solo pedido. Marcos lo cotiza en las compañías.</p>

      <div className="auto-quote__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "patente"} onClick={() => setMode("patente")}>
          Tengo patente
        </button>
        <button type="button" role="tab" aria-selected={mode === "datos"} onClick={() => setMode("datos")}>
          No tengo patente
        </button>
      </div>

      {mode === "patente" ? (
        <label>
          <span>Patente</span>
          <input name="patente" required placeholder="AA 123 BB" autoComplete="off" />
        </label>
      ) : (
        <div className="auto-quote__grid">
          <label>
            <span>Año</span>
            <select name="anio" required defaultValue="2020">
              {YEARS.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Marca</span>
            <input name="marca" required placeholder="Ej. Toyota" />
          </label>
          <label className="sm:col-span-2">
            <span>Modelo</span>
            <input name="modelo" required placeholder="Ej. Corolla" />
          </label>
        </div>
      )}

      <label>
        <span>Código postal</span>
        <input name="cp" required inputMode="numeric" pattern="[0-9]{4}" placeholder="4400" />
      </label>
      <label>
        <span>Nombre</span>
        <input name="nombre" required placeholder="Tu nombre" />
      </label>
      <label>
        <span>Celular</span>
        <input name="celular" type="tel" required placeholder="Tu celular" />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Enviando…" : "Cotizar mi auto"}
      </button>
      <Link className="auto-quote__phone" href="/contacto">
        Contactar para más información
      </Link>
    </form>
  );
}
