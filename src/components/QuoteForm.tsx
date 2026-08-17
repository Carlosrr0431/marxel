"use client";

import { useState, type FormEvent } from "react";
import { provincias, site } from "@/lib/content";

type QuoteFormProps = {
  defaultInterest?: string;
  compact?: boolean;
};

export function QuoteForm({ defaultInterest = "", compact = false }: QuoteFormProps) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const nombre = String(data.get("nombre") || "");
    const provincia = String(data.get("provincia") || "");
    const edad = String(data.get("edad") || "");
    const celular = String(data.get("celular") || "");
    const interes = String(data.get("interes") || "");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          provincia,
          edad,
          celular,
          interes,
          page_path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el lead");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
      setLoading(false);
      return;
    }

    const msg = encodeURIComponent(
      `Hola MARXEN, soy ${nombre}.\nProvincia: ${provincia}\nEdad: ${edad}\nInterés: ${interes || "Asesoramiento general"}\nCelular: ${celular}`
    );
    window.open(`https://wa.me/${site.whatsapp}?text=${msg}`, "_blank");
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="surface border-teal/20 bg-aqua/50 p-6 text-center sm:p-8">
        <p className="font-display text-xl font-semibold text-navy">
          ¡Listo! Te estamos contactando
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Guardamos tu consulta y abrimos WhatsApp. Si no se abrió, escribinos al{" "}
          {site.phone}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`surface ${compact ? "p-5" : "p-5 sm:p-8"}`}
    >
      {!compact ? (
        <div className="mb-6">
          <h2 className="font-display text-2xl font-semibold text-navy">
            Cotizá en minutos
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Completá tus datos. Sin compromiso.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Nombre y apellido
          </span>
          <input
            name="nombre"
            required
            autoComplete="name"
            placeholder="Ej. Ana Pérez"
            className="field"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Provincia</span>
          <select name="provincia" required defaultValue="" className="field">
            <option value="" disabled>
              Seleccioná
            </option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Edad</span>
          <input
            name="edad"
            type="number"
            min={18}
            max={99}
            required
            placeholder="30"
            className="field"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">Celular</span>
          <input
            name="celular"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Ej. 387 555-1234"
            className="field"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            ¿Qué te interesa?
          </span>
          <select name="interes" defaultValue={defaultInterest} className="field">
            <option value="">Asesoramiento general</option>
            <option value="Seguros">Seguros</option>
            <option value="Salud - Prepagas">Salud · Prepagas</option>
            <option value="Prevención Salud Plan A2">Plan A2 · Prevención Salud</option>
            <option value="Prevención Salud Plan A4">Plan A4 · Prevención Salud</option>
            <option value="Asistencia al viajero">Asistencia al viajero</option>
            <option value="Prevención Salud">Prevención Salud</option>
          </select>
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary mt-5 w-full disabled:opacity-70">
        {loading ? "Enviando…" : "Ver planes y cotizar"}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        Cotización orientativa. La formal la cerramos con tu asesor MARXEN.
      </p>
    </form>
  );
}
