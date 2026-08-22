"use client";

import { useState, type FormEvent } from "react";
import { provincias, site } from "@/lib/content";

type QuoteFormProps = {
  defaultInterest?: string;
  compact?: boolean;
};

const VIAJERO = "Asistencia al viajero";

function isViajeroInterest(interes: string) {
  return /viajero|viaje/i.test(interes);
}

export function QuoteForm({ defaultInterest = "", compact = false }: QuoteFormProps) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interes, setInteres] = useState(defaultInterest);
  const [fechaSalida, setFechaSalida] = useState("");
  const showViajero = isViajeroInterest(interes);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const nombre = String(data.get("nombre") || "");
    const provincia = String(data.get("provincia") || "");
    const edad = String(data.get("edad") || "");
    const celular = String(data.get("celular") || "");
    const interesValue = String(data.get("interes") || "");
    const destino = String(data.get("destino") || "").trim();
    const motivo = String(data.get("motivo") || "").trim();
    const salida = String(data.get("fecha_salida") || "").trim();
    const regreso = String(data.get("fecha_regreso") || "").trim();

    const notas = [
      `Cotización web: ${interesValue || "general"}`,
      destino ? `País de destino: ${destino}` : null,
      motivo ? `Motivo del viaje: ${motivo}` : null,
      salida || regreso
        ? `Fechas aproximadas: ${salida || "—"} a ${regreso || "—"}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          provincia,
          edad,
          celular,
          interes: interesValue,
          notas,
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

    const waLines = [
      `Hola MARXEN, soy ${nombre}.`,
      `Provincia: ${provincia}`,
      `Edad: ${edad}`,
      `Interés: ${interesValue || "Asesoramiento general"}`,
      destino ? `País de destino: ${destino}` : null,
      motivo ? `Motivo del viaje: ${motivo}` : null,
      salida || regreso
        ? `Fechas aproximadas: ${salida || "—"} a ${regreso || "—"}`
        : null,
      `Celular: ${celular}`,
    ].filter(Boolean);

    const msg = encodeURIComponent(waLines.join("\n"));
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
    <form onSubmit={onSubmit} className={`quote-card ${compact ? "p-5" : "p-5 sm:p-8"}`}>
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

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            ¿Qué te interesa?
          </span>
          <select
            name="interes"
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
            className="field"
          >
            <option value="">Asesoramiento general</option>
            <option value="Seguros">Seguros</option>
            <option value="Salud - Prepagas">Salud · Prepagas</option>
            <option value="Prevención Salud Plan A2">Plan A2 · Prevención Salud</option>
            <option value="Prevención Salud Plan A4">Plan A4 · Prevención Salud</option>
            <option value={VIAJERO}>Asistencia al viajero</option>
            <option value="Prevención Salud">Prevención Salud</option>
          </select>
        </label>

        {showViajero ? (
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              País de destino
            </span>
            <input
              name="destino"
              required
              autoComplete="country-name"
              placeholder="Ej. Brasil, España, Estados Unidos"
              className="field"
            />
          </label>
        ) : null}

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
            placeholder="Ej. 387 634-8199"
            className="field"
          />
        </label>

        {showViajero ? (
          <>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Motivo del viaje
              </span>
              <select name="motivo" required defaultValue="" className="field">
                <option value="" disabled>
                  Seleccioná
                </option>
                <option value="Placer">Placer</option>
                <option value="Trabajo">Trabajo</option>
                <option value="Estudio">Estudio</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Fecha de salida
              </span>
              <input
                name="fecha_salida"
                type="date"
                required
                className="field"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Fecha de regreso
              </span>
              <input
                name="fecha_regreso"
                type="date"
                required
                min={fechaSalida || undefined}
                className="field"
              />
            </label>
          </>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg mt-6 w-full disabled:opacity-70"
      >
        {loading ? "Enviando…" : "Ver planes y cotizar"}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        Cotización orientativa. La formal la cerramos con tu asesor MARXEN.
      </p>
    </form>
  );
}
