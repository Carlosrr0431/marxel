"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { GoPlan, GoQuoteResult } from "@/lib/go-assistance";
import { GO_DESTINOS } from "@/lib/go-destinos";
import { site } from "@/lib/content";

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(n: number) {
  return `ARS ${moneyFmt.format(n)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayIso() {
  return toIso(new Date());
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 8;
}

function nombreFromEmail(email: string) {
  const local = email.split("@")[0] || "Viajero";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("54")) return `+${digits}`;
  if (digits.startsWith("9")) return `+54 ${digits}`;
  return `+54 9 ${digits}`;
}

async function fetchQuote(body: unknown) {
  const res = await fetch("/api/go-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo cotizar");
  return data as GoQuoteResult;
}

export function GoAssistanceQuote() {
  const minDate = useMemo(todayIso, []);
  const [destinationId, setDestinationId] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [dateFrom, setDateFrom] = useState(minDate);
  const [dateTo, setDateTo] = useState(addDaysIso(minDate, 7));
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<GoQuoteResult | null>(null);
  const [plan, setPlan] = useState<GoPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const destination = GO_DESTINOS.find((item) => String(item.id) === destinationId);
  const valid =
    Boolean(destination) &&
    dateFrom &&
    dateTo &&
    dateTo >= dateFrom &&
    isPhone(phone) &&
    isEmail(email);

  async function onQuote(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (!valid || !destination) {
      setError("Completá destino, fechas, WhatsApp y email.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchQuote({
        destinationId: destination.id,
        dateFrom,
        dateTo,
        passengers,
        email: email.trim(),
        phone: normalizePhone(phone),
      });
      setQuote(result);
      setPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cotizar.");
    } finally {
      setLoading(false);
    }
  }

  function recotizar() {
    setQuote(null);
    setPlan(null);
    setError("");
  }

  async function onSelect(next: GoPlan) {
    if (!quote) return;
    setBusy(true);
    setError("");
    const nombre = nombreFromEmail(quote.email);
    const notas = [
      `Cotización Go Assistance #${quote.quoteId}`,
      `Plan: ${next.name}`,
      `Destino: ${quote.destinationName}`,
      `Pasajeros: ${quote.passengers}`,
      `Fechas: ${formatDate(dateFrom)} - ${formatDate(dateTo)} (${quote.days} días)`,
      `Total: ${money(next.totalArs)}`,
      next.installments > 1
        ? `${next.installments} cuotas sin interés de ${money(next.installmentArs)}`
        : null,
      next.discountPct ? `${next.discountPct}% OFF` : null,
      `Token: ${quote.token}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          celular: quote.phone,
          email: quote.email,
          interes: "Asistencia al viajero",
          notas,
          page_path: window.location.pathname,
        }),
      });
    } catch {
      /* el WhatsApp sigue igual si el CRM falla */
    }

    const lines = [
      `Hola MARXEN, quiero asistencia al viajero.`,
      `Plan: ${next.name}`,
      `Destino: ${quote.destinationName}`,
      `Pasajeros: ${quote.passengers}`,
      `Fechas: ${formatDate(dateFrom)} - ${formatDate(dateTo)}`,
      `Precio: ${money(next.totalArs)}`,
      next.installments > 1
        ? `${next.installments} cuotas sin interés de ${money(next.installmentArs)}`
        : null,
      `Email: ${quote.email}`,
      `WhatsApp: ${quote.phone}`,
    ].filter(Boolean);

    window.open(
      `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
    setPlan(next);
    setBusy(false);
  }

  if (plan && quote) {
    return (
      <section id="cotizar-viajero" className="go-quote">
        <div className="go-quote__hero">
          <div className="container-mx py-14 text-center sm:py-16">
            <p className="eyebrow text-white/70">Listo</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Recibimos tu pedido de {plan.name}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80">
              Guardamos la cotización y abrimos WhatsApp. Si no se abrió, escribinos al {site.phone}.
            </p>
            <button type="button" className="btn btn-primary mt-8" onClick={recotizar}>
              Cotizar otro viaje
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (quote) {
    return (
      <section id="cotizar-viajero" className="go-quote">
        <div className="go-quote__hero">
          <div className="container-mx py-10 sm:py-12">
            <p className="text-center font-display text-2xl font-semibold text-white sm:text-3xl">
              Seleccioná tu asistencia
            </p>
            <ol className="go-quote__steps">
              <li>1 Cotizar</li>
              <li className="is-active">2 Seleccionar plan</li>
              <li>3 Coordinar</li>
            </ol>
            <div className="go-quote__summary">
              <p className="go-quote__summary-title">Detalles de tu cotización</p>
              <ul>
                <li>
                  <span>Destino</span>
                  {quote.destinationName}
                </li>
                <li>
                  <span>Pasajeros</span>
                  {quote.passengers} {quote.passengers === 1 ? "pasajero" : "pasajeros"}
                </li>
                <li>
                  <span>Fechas</span>
                  {formatDate(dateFrom)} - {formatDate(dateTo)}
                </li>
                <li>
                  <span>Email</span>
                  {quote.email}
                </li>
                <li>
                  <span>WhatsApp</span>
                  {quote.phone}
                </li>
              </ul>
              <button type="button" className="go-quote__requote" onClick={recotizar}>
                Recotizar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-cloud">
          <div className="container-mx py-10 sm:py-12">
            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
            <div className="go-quote__plans">
              {quote.plans.map((item) => (
                <article key={item.id} className="go-quote__plan">
                  <h3>{item.name}</h3>
                  {item.discountPct > 0 ? (
                    <p className="go-quote__off">{item.discountPct}% OFF</p>
                  ) : null}
                  {item.installments > 1 ? (
                    <p className="go-quote__cuotas">
                      {item.installments} cuotas sin interés de
                    </p>
                  ) : (
                    <p className="go-quote__cuotas">Precio total</p>
                  )}
                  <p className="go-quote__price">
                    {money(item.installments > 1 ? item.installmentArs : item.totalArs)}
                  </p>
                  {item.originalArs ? (
                    <p className="go-quote__before">{money(item.originalArs)}</p>
                  ) : null}
                  <ul className="go-quote__cover">
                    {item.coverageMedical ? <li>Asistencia médica {item.coverageMedical}</li> : null}
                    {item.coverageLuggage ? <li>Equipaje {item.coverageLuggage}</li> : null}
                    <li>Total del viaje {money(item.totalArs)}</li>
                  </ul>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn btn-primary mt-5 w-full disabled:opacity-60"
                    onClick={() => onSelect(item)}
                  >
                    {busy ? "Enviando…" : "Quiero este plan"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="cotizar-viajero" className="go-quote">
      <div className="go-quote__hero">
        <div className="container-mx py-12 sm:py-16">
          <p className="eyebrow text-white/70">Go Assistance</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
            Cotizá tu asistencia al viajero
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Destino, pasajeros, fechas y contacto. Precios reales de Go Assistance, en cuotas y con el descuento vigente.
          </p>

          <form onSubmit={onQuote} className="go-quote__bar">
            <label>
              <span>Destino</span>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
              >
                <option value="">¿A dónde viajás?</option>
                {GO_DESTINOS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="go-quote__pax">
              <span>Pasajeros</span>
              <div>
                <button
                  type="button"
                  aria-label="Quitar pasajero"
                  onClick={() => setPassengers((n) => Math.max(1, n - 1))}
                >
                  −
                </button>
                <strong>{passengers}</strong>
                <button
                  type="button"
                  aria-label="Agregar pasajero"
                  onClick={() => setPassengers((n) => Math.min(10, n + 1))}
                >
                  +
                </button>
              </div>
            </label>

            <label>
              <span>Salida</span>
              <input
                type="date"
                min={minDate}
                value={dateFrom}
                onChange={(e) => {
                  const next = e.target.value;
                  setDateFrom(next);
                  if (dateTo < next) setDateTo(next);
                }}
                required
              />
            </label>

            <label>
              <span>Regreso</span>
              <input
                type="date"
                min={dateFrom || minDate}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
              />
            </label>

            <label>
              <span>WhatsApp</span>
              <input
                type="tel"
                inputMode="tel"
                placeholder="+54 9 387 634-8199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="tunombre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <button type="submit" disabled={loading} className="go-quote__submit">
              {loading ? "Cotizando…" : "Cotizar"}
            </button>
          </form>

          {touched && !valid ? (
            <p className="mt-3 text-sm text-white/85">Completá destino, fechas, WhatsApp y email.</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
          <p className="mt-4 text-sm text-white/75">
            Aprovechá las <strong className="text-white">cuotas sin interés</strong> y el{" "}
            <strong className="text-white">descuento vigente</strong> en productos seleccionados.
          </p>
        </div>
      </div>
    </section>
  );
}
