"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { site } from "@/lib/content";

type Option = { id: string; label: string };

type Version = {
  id: number;
  description: string;
  fullCarDescripcion?: string;
  statedAmount?: number;
  used0KmPrice?: number;
  referencePrice0km?: number;
  infoAutoCode?: number;
  category?: string;
  fuelCode?: string;
  isImported?: boolean;
  panoramicCrystalCeiling?: boolean;
  slidingCrystalCeiling?: boolean;
};

type Location = {
  locationId: number;
  description: string;
  state: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};

type Plan = {
  key: string;
  title: string;
  description: string;
  mostChosen: boolean;
  monthly: number;
  original: number | null;
  discount: number;
};

type QuoteResult = {
  opportunityId: number;
  statedAmount: number;
  carDescription: string;
  appliedDiscount: number;
  plans: Plan[];
};

const YEAR_LIMIT = 30;
const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(n: number) {
  return `$ ${moneyFmt.format(n)}`;
}

function yearOptions(): Option[] {
  const current = new Date().getFullYear();
  const min = current - YEAR_LIMIT;
  const years: Option[] = [{ id: `${current}-0km`, label: `${current} 0km` }];
  for (let y = current; y >= min; y--) {
    years.push({ id: String(y), label: String(y) });
  }
  return years;
}

function parseYear(yearId: string) {
  return yearId.replace(/-0km$/, "");
}

function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 8;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export function AutoQuoteNative({ onBack }: { onBack: () => void }) {
  const years = useMemo(yearOptions, []);
  const [yearId, setYearId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [touched, setTouched] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");

  const year = parseYear(yearId);
  const is0km = yearId.endsWith("-0km");
  const brand = brands.find((b) => b.id === brandId) || null;
  const model = models.find((m) => m.id === modelId) || null;
  const version = versions.find((v) => String(v.id) === versionId) || null;
  const location = locations.find((l) => String(l.locationId) === locationId) || null;

  useEffect(() => {
    if (!yearId) {
      setBrands([]);
      return;
    }
    let cancelled = false;
    setError("");
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "brands", year })}`)
      .then((data) => {
        if (cancelled) return;
        const next = ((data.brands || []) as { id: number | string; description: string }[]).map(
          (item) => ({ id: String(item.id), label: item.description })
        );
        setBrands(next);
        if (next.length === 1) setBrandId(next[0].id);
        if (next.length === 0) setError("No encontramos marcas para ese año.");
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar las marcas.");
      });
    return () => {
      cancelled = true;
    };
  }, [yearId, year]);

  useEffect(() => {
    if (!yearId || !brandId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setError("");
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "models", year, brandId })}`)
      .then((data) => {
        if (cancelled) return;
        const next = ((data.models || []) as { id: number | string; description: string }[]).map(
          (item) => ({ id: String(item.id), label: item.description })
        );
        setModels(next);
        if (next.length === 1) setModelId(next[0].id);
        if (next.length === 0) setError("No encontramos modelos para esa marca.");
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar los modelos.");
      });
    return () => {
      cancelled = true;
    };
  }, [yearId, year, brandId]);

  useEffect(() => {
    if (!yearId || !brandId || !modelId) {
      setVersions([]);
      return;
    }
    let cancelled = false;
    setError("");
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "versions", year, brandId, modelId })}`)
      .then((data) => {
        if (cancelled) return;
        const next = (data.versions || []) as Version[];
        setVersions(next);
        if (next.length === 1) setVersionId(String(next[0].id));
        if (next.length === 0) setError("No encontramos versiones para ese modelo.");
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar las versiones.");
      });
    return () => {
      cancelled = true;
    };
  }, [yearId, year, brandId, modelId]);

  useEffect(() => {
    if (postalCode.length !== 4) {
      setLocations([]);
      setLocationId("");
      return;
    }
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "location", postalCode })}`)
      .then((data) => {
        if (cancelled) return;
        const next = (data.locations || []) as Location[];
        setLocations(next);
        const capital = next.find((l) => l.description.toUpperCase() === "SALTA") || next[0];
        setLocationId(capital ? String(capital.locationId) : "");
        if (next.length === 0) setError("No encontramos esa localidad. Revisá el código postal.");
        else setError("");
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos validar el código postal.");
      });
    return () => {
      cancelled = true;
    };
  }, [postalCode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!yearId || !brand || !model || !version || !location || !nombre.trim() || !isPhone(celular)) {
      setError("Completá los datos para cotizar.");
      return;
    }
    setQuoting(true);
    setError("");
    try {
      const data = (await fetchJson("/api/sc-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(year),
          is0km,
          brand: { id: Number(brand.id), description: brand.label },
          model: { id: Number(model.id), description: model.label },
          version,
          location,
          nombre: nombre.trim(),
          celular: celular.trim(),
        }),
      })) as QuoteResult;
      setQuote(data);
      const notas = [
        `Cotización auto San Cristóbal #${data.opportunityId}`,
        `Vehículo: ${data.carDescription}`,
        `Monto asegurado: ${money(data.statedAmount)}`,
        ...data.plans.map((p) => `${p.title}: ${money(p.monthly)} / mes`),
      ].join("\n");
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          celular: celular.trim(),
          interes: "Seguro de auto",
          notas,
          page_path: window.location.pathname,
        }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cotizar. Probá de nuevo.");
    } finally {
      setQuoting(false);
    }
  }

  function openWhatsApp(plan?: Plan) {
    if (!quote) return;
    const lines = [
      `Hola MARXEN, soy ${nombre.trim()}.`,
      `Quiero cotizar auto: ${quote.carDescription}`,
      `Monto asegurado: ${money(quote.statedAmount)}`,
      `Código: ${quote.opportunityId}`,
      ...quote.plans.map((p) => `${p.title}: ${money(p.monthly)} / mes`),
    ];
    if (plan) lines.push(`Me interesa: ${plan.title}`);
    window.open(
      `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={quote ? () => setQuote(null) : onBack}
        className="mb-6 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        ← {quote ? "Editar datos" : "Volver"}
      </button>

      {quote ? (
        <PlansView quote={quote} onSelect={openWhatsApp} />
      ) : (
        <form onSubmit={onSubmit} className="mx-auto max-w-lg">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
            ¡Asegurá tu auto con hasta 37% Off!
          </h2>
          <p className="mt-3 text-base text-muted">Completá los datos y ves los planes al toque.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Año" invalid={touched && !yearId}>
              <select
                className="field"
                value={yearId}
                onChange={(e) => {
                  setYearId(e.target.value);
                  setBrandId("");
                  setModelId("");
                  setVersionId("");
                  setBrands([]);
                  setModels([]);
                  setVersions([]);
                }}
              >
                <option value="">Año</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Marca" invalid={touched && !brandId}>
              <select
                className="field"
                value={brandId}
                disabled={!brands.length}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setModelId("");
                  setVersionId("");
                  setModels([]);
                  setVersions([]);
                }}
              >
                <option value="">{yearId && !brands.length ? "Cargando…" : "Marca"}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Modelo" invalid={touched && !modelId}>
              <select
                className="field"
                value={modelId}
                disabled={!models.length}
                onChange={(e) => {
                  setModelId(e.target.value);
                  setVersionId("");
                  setVersions([]);
                }}
              >
                <option value="">{brandId && !models.length ? "Cargando…" : "Modelo"}</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Versión" invalid={touched && !versionId}>
              <select
                className="field"
                value={versionId}
                disabled={!versions.length}
                onChange={(e) => setVersionId(e.target.value)}
              >
                <option value="">{modelId && !versions.length ? "Cargando…" : "Versión"}</option>
                {versions.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.description}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Código postal" invalid={touched && postalCode.length !== 4}>
              <input
                className="field"
                inputMode="numeric"
                maxLength={4}
                placeholder="4400"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>

            {locations.length > 1 ? (
              <Field label="Localidad" invalid={touched && !locationId}>
                <select className="field" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map((l) => (
                    <option key={l.locationId} value={String(l.locationId)}>
                      {l.description}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Nombre" invalid={touched && !nombre.trim()}>
              <input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>

            <Field label="WhatsApp" invalid={touched && !isPhone(celular)}>
              <input
                className="field"
                inputMode="tel"
                placeholder="387 15..."
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
              />
            </Field>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={quoting} className="btn btn-primary mt-6 w-full disabled:opacity-60">
            {quoting ? "Cotizando…" : "Ver planes"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  invalid,
  children,
}: {
  label: string;
  invalid: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-navy">{label}</span>
      {children}
      {invalid ? <p className="mt-2 text-sm font-medium text-red-600">Requerido</p> : null}
    </label>
  );
}

function PlansView({
  quote,
  onSelect,
}: {
  quote: QuoteResult;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
            ¡Elegí tu plan!
          </h2>
          <p className="mt-2 text-base text-muted">Compará y elegí el plan que mejor se adapte a vos.</p>
        </div>
        <dl className="text-sm text-navy/80 sm:text-right">
          <div>
            <dt className="inline font-semibold">Modelo: </dt>
            <dd className="inline">{quote.carDescription}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Monto Asegurado: </dt>
            <dd className="inline">{money(quote.statedAmount)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Código de cotización: </dt>
            <dd className="inline">{quote.opportunityId}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {quote.plans.map((plan) => (
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
            {plan.original && plan.original > plan.monthly ? (
              <p className="mt-3 text-sm font-semibold text-sky line-through">{money(plan.original)}*/mes</p>
            ) : null}
            <p className="mt-1 text-3xl font-bold tracking-tight text-sky">
              {money(plan.monthly)} <span className="text-base font-semibold text-navy/70">/ mes</span>
            </p>
            {plan.discount > 0 ? (
              <p className="mt-2 text-sm font-semibold text-[#2ea44f]">
                tarifa con {plan.discount}% OFF aplicado
              </p>
            ) : null}
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{plan.description}</p>
            <button type="button" onClick={() => onSelect(plan)} className="btn btn-primary mt-6 w-full">
              Quiero este plan
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
