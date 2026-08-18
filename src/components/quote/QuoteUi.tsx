"use client";

import { type FormEvent, type ReactNode } from "react";
import { site } from "@/lib/content";

export type Option = { id: string; label: string };

export type Location = {
  locationId: number;
  description: string;
  state: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};

export type Plan = {
  key: string;
  title: string;
  description: string;
  mostChosen?: boolean;
  monthly: number | null;
  original?: number | null;
  discount?: number;
};

export const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function money(n: number) {
  return `$ ${moneyFmt.format(n)}`;
}

export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export async function resolvePostal(postalCode: string): Promise<Location[]> {
  const data = await fetchJson(
    `/api/sc-quote?${new URLSearchParams({ product: "location", postalCode })}`
  );
  return (data.locations || []) as Location[];
}

export function pickLocation(list: Location[]) {
  return list.find((l) => l.description.toUpperCase() === "SALTA") || list[0];
}

export function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 8;
}

export async function runPostalLookup(postalCode: string, currentId: string) {
  if (!/^\d{4}$/.test(postalCode.trim())) {
    return { ok: false as const, error: "Ingresá un código postal de 4 dígitos." };
  }
  if (currentId) return { ok: true as const, needPick: false };
  const locations = await resolvePostal(postalCode.trim());
  if (locations.length === 0) {
    return { ok: false as const, error: "No encontramos esa localidad. Revisá el código postal." };
  }
  return {
    ok: true as const,
    needPick: locations.length > 1,
    locations,
    locationId: String(pickLocation(locations).locationId),
  };
}

export async function submitQuote(body: unknown) {
  return fetchJson("/api/sc-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function notifyLead(nombre: string, celular: string, interes: string, notas: string) {
  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre,
      celular,
      interes,
      notas,
      page_path: window.location.pathname,
    }),
  }).catch(() => {});
}

export function openWhatsApp(lines: string[]) {
  window.open(
    `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.filter(Boolean).join("\n"))}`,
    "_blank"
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 text-sm font-semibold text-navy underline-offset-4 hover:underline"
    >
      ← Volver
    </button>
  );
}

export function Required({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>;
}

export function FieldError({ error }: { error: string }) {
  if (!error) return null;
  return <p className="mt-2 text-sm text-red-600">{error}</p>;
}

export function StepForm({
  title,
  subtitle,
  summary,
  loading,
  error,
  submitLabel = "Continuar",
  onSubmit,
  children,
}: {
  title?: string;
  subtitle?: string;
  summary?: string;
  loading: boolean;
  error: string;
  submitLabel?: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md">
      {title ? (
        <h2 className="font-display text-[1.65rem] font-semibold leading-tight text-navy sm:text-3xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? <p className="mt-3 text-base text-muted">{subtitle}</p> : null}
      {summary ? <p className="mt-2 text-sm text-navy/70">{summary}</p> : null}
      <div className={title ? "mt-6" : "mt-2"}>{children}</div>
      <FieldError error={error} />
      <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full disabled:opacity-60">
        {loading ? "Cargando…" : submitLabel}
      </button>
    </form>
  );
}

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-sm font-semibold text-navy">{title}</p>
      {children}
    </div>
  );
}

export function Label({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-2 block text-sm font-semibold text-navy">{title}</span>
      {children}
    </label>
  );
}

export function ChoiceList({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
            value === opt.id
              ? "border-navy bg-navy text-white"
              : "border-line bg-white text-navy hover:border-navy/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PostalFields({
  postalCode,
  locationId,
  locations,
  onPostalChange,
  onLocationChange,
}: {
  postalCode: string;
  locationId: string;
  locations: Location[];
  onPostalChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}) {
  return (
    <>
      <Label title="Código postal">
        <input
          className="field"
          inputMode="numeric"
          maxLength={4}
          value={postalCode}
          onChange={(e) => onPostalChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </Label>
      {locations.length > 1 ? (
        <Label title="Localidad">
          <select className="field" value={locationId} onChange={(e) => onLocationChange(e.target.value)}>
            {locations.map((l) => (
              <option key={l.locationId} value={String(l.locationId)}>
                {l.description}
              </option>
            ))}
          </select>
        </Label>
      ) : null}
    </>
  );
}

export function ContactFields({
  nombre,
  celular,
  touched,
  onNombre,
  onCelular,
}: {
  nombre: string;
  celular: string;
  touched: boolean;
  onNombre: (value: string) => void;
  onCelular: (value: string) => void;
}) {
  return (
    <>
      <Label title="Nombre">
        <input className="field" value={nombre} onChange={(e) => onNombre(e.target.value)} />
      </Label>
      <Required show={touched && !nombre.trim()} />
      <Label title="WhatsApp">
        <input className="field" inputMode="tel" value={celular} onChange={(e) => onCelular(e.target.value)} />
      </Label>
      <Required show={touched && !isPhone(celular)} />
    </>
  );
}

export function PlansView({
  title = "¡Elegí tu plan!",
  subtitle = "Compará y elegí el plan que mejor se adapte a vos.",
  meta,
  plans,
  cta = "Quiero este plan",
  busy = false,
  onSelect,
}: {
  title?: string;
  subtitle?: string;
  meta: { label: string; value: string }[];
  plans: Plan[];
  cta?: string;
  busy?: boolean;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight text-navy sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-base text-muted">{subtitle}</p>
        </div>
        <dl className="text-sm text-navy/80 sm:max-w-sm sm:text-right">
          {meta.map((row) => (
            <div key={row.label}>
              <dt className="inline font-semibold">{row.label}: </dt>
              <dd className="inline">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={`mt-8 grid gap-4 ${plans.length > 1 ? "md:grid-cols-3" : "max-w-md"}`}>
        {plans.map((plan) => (
          <article
            key={plan.key}
            className="relative flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-[0_10px_30px_rgba(10,53,92,0.08)]"
          >
            {plan.mostChosen ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2ea44f] px-3 py-1 text-xs font-semibold text-white">
                Más elegido
              </span>
            ) : null}
            <h3 className="font-display text-lg font-semibold text-navy">{plan.title}</h3>
            {plan.original && plan.monthly && plan.original > plan.monthly ? (
              <p className="mt-3 text-sm font-semibold text-sky line-through">
                {money(plan.original)}*/mes
              </p>
            ) : null}
            {plan.monthly ? (
              <p className="mt-1 text-3xl font-bold tracking-tight text-sky">
                {money(plan.monthly)}{" "}
                <span className="text-base font-semibold text-navy/70">/ mes</span>
              </p>
            ) : (
              <p className="mt-3 text-lg font-semibold text-navy">Cotización a medida</p>
            )}
            {plan.discount && plan.discount > 0 ? (
              <p className="mt-2 text-sm font-semibold text-[#2ea44f]">
                tarifa con {plan.discount}% OFF aplicado
              </p>
            ) : null}
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{plan.description}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(plan)}
              className="btn btn-primary mt-6 w-full disabled:opacity-60"
            >
              {busy ? "Enviando…" : cta}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
