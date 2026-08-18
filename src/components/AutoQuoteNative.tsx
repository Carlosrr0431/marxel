"use client";

import { useMemo, useState, type FormEvent } from "react";
import { site } from "@/lib/content";

type Option = { id: string; label: string };
type Step = "year" | "brand" | "model" | "version" | "postal" | "contact" | "plans";

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

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

async function fetchOptions(
  kind: "brands" | "models",
  params: Record<string, string>
) {
  const qs = new URLSearchParams({ kind, ...params });
  const data = await fetchJson(`/api/sc-auto?${qs}`);
  const list = (kind === "brands" ? data.brands : data.models) || [];
  return (list as { id: number | string; description: string }[]).map((item) => ({
    id: String(item.id),
    label: item.description,
  }));
}

export function AutoQuoteNative({ onBack }: { onBack: () => void }) {
  const years = useMemo(yearOptions, []);
  const [step, setStep] = useState<Step>("year");
  const [yearId, setYearId] = useState("");
  const [brand, setBrand] = useState<Option | null>(null);
  const [model, setModel] = useState<Option | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const year = parseYear(yearId);
  const is0km = yearId.endsWith("-0km");
  const yearLabel = years.find((y) => y.id === yearId)?.label || year;
  const summary = [yearLabel, brand?.label, model?.label, version?.description]
    .filter(Boolean)
    .join(" · ");

  async function onYearSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!yearId) return;
    setLoading(true);
    setError("");
    try {
      const next = await fetchOptions("brands", { year });
      if (next.length === 0) {
        setError("No encontramos marcas para ese año.");
        return;
      }
      setBrands(next);
      setStep("brand");
      setTouched(false);
    } catch {
      setError("No pudimos cargar las marcas. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onBrandSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!brandId) return;
    setLoading(true);
    setError("");
    try {
      setBrand(brands.find((b) => b.id === brandId) || null);
      const next = await fetchOptions("models", { year, brandId });
      if (next.length === 0) {
        setError("No encontramos modelos para esa marca.");
        return;
      }
      setModels(next);
      setStep("model");
      setTouched(false);
    } catch {
      setError("No pudimos cargar los modelos. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onModelSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!modelId) return;
    setLoading(true);
    setError("");
    try {
      setModel(models.find((m) => m.id === modelId) || null);
      const data = await fetchJson(
        `/api/sc-auto?${new URLSearchParams({ kind: "versions", year, brandId, modelId })}`
      );
      const next = (data.versions || []) as Version[];
      if (next.length === 0) {
        setError("No encontramos versiones para ese modelo.");
        return;
      }
      setVersions(next);
      setStep("version");
      setTouched(false);
    } catch {
      setError("No pudimos cargar las versiones. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function onVersionSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!versionId) return;
    setVersion(versions.find((v) => String(v.id) === versionId) || null);
    setStep("postal");
    setTouched(false);
  }

  async function onPostalSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!/^\d{4}$/.test(postalCode.trim())) {
      setError("Ingresá un código postal de 4 dígitos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!locationId) {
        const data = await fetchJson(
          `/api/sc-auto?${new URLSearchParams({ kind: "location", postalCode: postalCode.trim() })}`
        );
        const next = (data.locations || []) as Location[];
        if (next.length === 0) {
          setError("No encontramos esa localidad. Revisá el código postal.");
          return;
        }
        setLocations(next);
        const capital =
          next.find((l) => l.description.toUpperCase() === "SALTA") || next[0];
        setLocationId(String(capital.locationId));
        if (next.length > 1) {
          setTouched(false);
          return;
        }
      }
      setStep("contact");
      setTouched(false);
    } catch {
      setError("No pudimos validar el código postal.");
    } finally {
      setLoading(false);
    }
  }

  async function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nombre.trim() || !celular.trim() || !brand || !model || !version) return;
    const location = locations.find((l) => String(l.locationId) === locationId);
    if (!location) {
      setError("Seleccioná la localidad.");
      return;
    }
    setLoading(true);
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
      setStep("plans");
      setTouched(false);
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
      setLoading(false);
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
        onClick={onBack}
        className="mb-6 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        ← Volver
      </button>

      {step === "year" ? (
        <form onSubmit={onYearSubmit} className="mx-auto max-w-md">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
            ¡Asegurá tu auto con hasta 37% Off!
          </h2>
          <p className="mt-3 text-base text-muted">Ingresá los datos de tu auto</p>
          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-semibold text-navy">Año del auto</span>
            <select
              className="field"
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              onBlur={() => setTouched(true)}
            >
              <option value="">Seleccioná el año</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          {touched && !yearId ? (
            <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full">
            {loading ? "Cargando…" : "Continuar"}
          </button>
        </form>
      ) : null}

      {step === "brand" ? (
        <SelectStep
          title="Marca del auto"
          value={brandId}
          options={brands}
          invalid={touched && !brandId}
          loading={loading}
          error={error}
          onChange={setBrandId}
          onSubmit={onBrandSubmit}
        />
      ) : null}

      {step === "model" ? (
        <SelectStep
          title="Modelo del auto"
          value={modelId}
          options={models}
          invalid={touched && !modelId}
          loading={loading}
          error={error}
          onChange={setModelId}
          onSubmit={onModelSubmit}
        />
      ) : null}

      {step === "version" ? (
        <SelectStep
          title="Versión del auto"
          value={versionId}
          options={versions.map((v) => ({ id: String(v.id), label: v.description }))}
          invalid={touched && !versionId}
          loading={loading}
          error={error}
          onChange={setVersionId}
          onSubmit={onVersionSubmit}
        />
      ) : null}

      {step === "postal" ? (
        <form onSubmit={onPostalSubmit} className="mx-auto max-w-md">
          <p className="text-base text-muted">Ingresá los datos de tu auto</p>
          <p className="mt-2 text-sm text-navy/70">{summary}</p>
          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-navy">Código postal</span>
            <input
              className="field"
              inputMode="numeric"
              maxLength={4}
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                setLocationId("");
                setLocations([]);
              }}
            />
          </label>
          {locations.length > 1 ? (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-navy">Localidad</span>
              <select
                className="field"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l.locationId} value={String(l.locationId)}>
                    {l.description}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {touched && postalCode.length !== 4 ? (
            <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full">
            {loading ? "Cargando…" : "Continuar"}
          </button>
        </form>
      ) : null}

      {step === "contact" ? (
        <form onSubmit={onContactSubmit} className="mx-auto max-w-md">
          <h2 className="font-display text-2xl font-semibold text-navy">Tus datos para cotizar</h2>
          <p className="mt-2 text-sm text-muted">{summary}</p>
          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-navy">Nombre</span>
            <input
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </label>
          {touched && !nombre.trim() ? (
            <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>
          ) : null}
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-navy">WhatsApp</span>
            <input
              className="field"
              inputMode="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
          </label>
          {touched && !celular.trim() ? (
            <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full">
            {loading ? "Cotizando…" : "Ver planes"}
          </button>
        </form>
      ) : null}

      {step === "plans" && quote ? <PlansView quote={quote} onSelect={openWhatsApp} /> : null}
    </div>
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
          <p className="mt-2 text-base text-muted">
            Compará y elegí el plan que mejor se adapte a vos.
          </p>
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
              <p className="mt-3 text-sm font-semibold text-sky line-through">
                {money(plan.original)}*/mes
              </p>
            ) : null}
            <p className="mt-1 text-3xl font-bold tracking-tight text-sky">
              {money(plan.monthly)}{" "}
              <span className="text-base font-semibold text-navy/70">/ mes</span>
            </p>
            {plan.discount > 0 ? (
              <p className="mt-2 text-sm font-semibold text-[#2ea44f]">
                tarifa con {plan.discount}% OFF aplicado
              </p>
            ) : null}
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{plan.description}</p>
            <button
              type="button"
              onClick={() => onSelect(plan)}
              className="btn btn-primary mt-6 w-full"
            >
              Quiero este plan
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function SelectStep({
  title,
  value,
  options,
  invalid,
  loading,
  error,
  onChange,
  onSubmit,
}: {
  title: string;
  value: string;
  options: Option[];
  invalid: boolean;
  loading: boolean;
  error: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md">
      <p className="text-base text-muted">Ingresá los datos de tu auto</p>
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-navy">{title}</span>
        <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccioná una opción</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {invalid ? (
        <p className="mt-2 text-sm font-medium text-red-600">Este campo es requerido</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full">
        {loading ? "Cargando…" : "Continuar"}
      </button>
    </form>
  );
}
