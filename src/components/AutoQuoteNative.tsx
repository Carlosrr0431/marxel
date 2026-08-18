"use client";

import { useMemo, useState, type FormEvent } from "react";
import { site } from "@/lib/content";

type Option = { id: string; label: string };
type Step = "year" | "brand" | "model" | "version" | "contact" | "done";

const YEAR_LIMIT = 30;

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

async function fetchOptions(
  kind: "brands" | "models" | "versions",
  params: Record<string, string>
) {
  const qs = new URLSearchParams({ kind, ...params });
  const res = await fetch(`/api/sc-auto?${qs}`);
  const data = await res.json();
  const list =
    (kind === "brands" ? data.brands : kind === "models" ? data.models : data.versions) || [];
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
  const [version, setVersion] = useState<Option | null>(null);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [versions, setVersions] = useState<Option[]>([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const year = parseYear(yearId);
  const yearLabel = years.find((y) => y.id === yearId)?.label || year;
  const summary = [yearLabel, brand?.label, model?.label, version?.label]
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
      const next = await fetchOptions("versions", { year, brandId, modelId });
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
    setVersion(versions.find((v) => v.id === versionId) || null);
    setStep("contact");
    setTouched(false);
  }

  async function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nombre.trim() || !celular.trim()) return;
    setLoading(true);
    const notas = `Cotización auto San Cristóbal\nVehículo: ${summary}`;
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          celular: celular.trim(),
          interes: "Seguro de auto",
          notas,
          page_path: window.location.pathname,
        }),
      });
    } catch {
      // igual abrimos WhatsApp
    }
    const msg = encodeURIComponent(
      `Hola MARXEN, soy ${nombre.trim()}.\nQuiero cotizar auto:\n${summary}\nCelular: ${celular.trim()}`
    );
    window.open(`https://wa.me/${site.whatsapp}?text=${msg}`, "_blank");
    setLoading(false);
    setStep("done");
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
          options={versions}
          invalid={touched && !versionId}
          loading={loading}
          error={error}
          onChange={setVersionId}
          onSubmit={onVersionSubmit}
        />
      ) : null}

      {step === "contact" ? (
        <form onSubmit={onContactSubmit} className="mx-auto max-w-md">
          <h2 className="font-display text-2xl font-semibold text-navy">
            Te enviamos la cotización
          </h2>
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
          <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full">
            {loading ? "Enviando…" : "Continuar"}
          </button>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="mx-auto max-w-md">
          <h2 className="font-display text-2xl font-semibold text-navy">Listo</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ya tenemos los datos de tu auto. Te contactamos por WhatsApp con la cotización.
          </p>
        </div>
      ) : null}
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
