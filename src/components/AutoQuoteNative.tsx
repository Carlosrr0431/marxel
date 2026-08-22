"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { classifyArPlate, normalizeArPlate } from "@/lib/ar-plate";
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
  quoteId: number;
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

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isDni(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 8;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isVin(value: string) {
  return digitsOnly(value).length === 10;
}

function isEngineNumber(value: string) {
  return digitsOnly(value).length >= 6;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export function AutoQuoteNative({
  onBack,
  onSwitchToMoto,
}: {
  onBack: () => void;
  onSwitchToMoto?: (plate: string) => void;
}) {
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
  const [hasGnc, setHasGnc] = useState("no");
  const [hasTracker, setHasTracker] = useState("no");
  const [age, setAge] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dni, setDni] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [gender, setGender] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [touched, setTouched] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  const year = parseYear(yearId);
  const is0km = yearId.endsWith("-0km");
  const plate = normalizeArPlate(licensePlate);
  const plateKind = classifyArPlate(plate);
  const brand = brands.find((b) => b.id === brandId) || null;
  const model = models.find((m) => m.id === modelId) || null;
  const version = versions.find((v) => String(v.id) === versionId) || null;
  const location = locations.find((l) => String(l.locationId) === locationId) || null;
  const ageNum = Number(age);

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

  useEffect(() => {
    const digits = dni.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 8) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "dni", dni: digits })}`)
      .then((data) => {
        if (cancelled || !data.person) return;
        const full = `${data.person.firstName || ""} ${data.person.lastName || ""}`.trim();
        if (full) setNombre(full);
        if (data.person.gender) {
          const g = String(data.person.gender).toLowerCase();
          setGender(g.startsWith("f") || g.includes("femen") || g.includes("mujer") ? "Female" : "Male");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dni]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!is0km && plateKind === "moto") {
      if (onSwitchToMoto) {
        onSwitchToMoto(plate);
        return;
      }
      setError("Esta patente es de moto. Cotizala en el cotizador de motos.");
      return;
    }
    if (!is0km && plateKind !== "auto") {
      setError("Ingresá una patente de auto válida, o elegí año 0km.");
      return;
    }
    if (
      !yearId ||
      !brand ||
      !model ||
      !version ||
      !location ||
      !nombre.trim() ||
      !isPhone(celular) ||
      !isEmail(email) ||
      ageNum < 18 ||
      ageNum > 99
    ) {
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
          email: email.trim(),
          age: ageNum,
          hasGnc: hasGnc === "si",
          hasTracker: hasTracker === "si",
          licensePlate: plate,
        }),
      })) as QuoteResult;
      setQuote(data);
      setPlan(null);
      setDone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cotizar. Probá de nuevo.");
    } finally {
      setQuoting(false);
    }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    if (!quote || !plan || !location) return;
    setTouched(true);
    if (!isDni(dni) || !isEmail(email) || !consent || !gender) {
      setError("Completá DNI, género, email y la autorización para continuar.");
      return;
    }
    if (!is0km && plateKind !== "auto") {
      setError("Ingresá la patente del auto.");
      return;
    }
    if (!isVin(vin)) {
      setError("El número de chasis tiene que tener 10 dígitos.");
      return;
    }
    if (!isEngineNumber(engineNumber)) {
      setError("El número de motor tiene que tener al menos 6 dígitos.");
      return;
    }
    setRegistering(true);
    setError("");
    try {
      const saved = await fetchJson("/api/sc-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          opportunityId: quote.opportunityId,
          quoteId: plan.quoteId,
          dni,
          nombre: nombre.trim(),
          email: email.trim(),
          celular: celular.trim(),
          age: ageNum,
          gender,
          location,
          is0km,
          licensePlate: plate,
          vin: digitsOnly(vin),
          engineNumber: digitsOnly(engineNumber),
        }),
      });
      const notas = [
        `Cotización auto San Cristóbal #${quote.opportunityId}`,
        `Plan: ${plan.title} ${money(plan.monthly)} / mes`,
        `Vehículo: ${quote.carDescription}`,
        `DNI: ${dni.replace(/\D/g, "")}`,
        `Email: ${email.trim()}`,
        plate ? `Patente: ${plate}` : "0km sin patente",
        vin ? `Chasis: ${vin}` : "",
        engineNumber ? `Motor: ${engineNumber}` : "",
        `GNC: ${hasGnc === "si" ? "Sí" : "No"} · Rastreador: ${hasTracker === "si" ? "Sí" : "No"}`,
      ]
        .filter(Boolean)
        .join("\n");
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: saved.nombre || nombre.trim(),
          celular: celular.trim(),
          email: email.trim(),
          dni: dni.replace(/\D/g, ""),
          edad: ageNum,
          localidad: location.description,
          interes: "Seguro de auto",
          notas,
          page_path: window.location.pathname,
        }),
      }).catch(() => {});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos registrar la cotización.");
    } finally {
      setRegistering(false);
    }
  }

  function openWhatsApp() {
    if (!quote || !plan) return;
    const lines = [
      `Hola MARXEN, soy ${nombre.trim()}.`,
      `Quiero el plan ${plan.title} para ${quote.carDescription}.`,
      `Monto asegurado: ${money(quote.statedAmount)}`,
      `Código: ${quote.opportunityId}`,
      `DNI: ${dni.replace(/\D/g, "")}`,
      `Email: ${email.trim()}`,
      plate ? `Patente: ${plate}` : null,
      `Precio: ${money(plan.monthly)} / mes`,
    ].filter(Boolean);
    window.open(
      `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
  }

  function goBack() {
    setError("");
    setTouched(false);
    if (done || plan) {
      setDone(false);
      setPlan(null);
      return;
    }
    if (quote) {
      setQuote(null);
      return;
    }
    onBack();
  }

  return (
    <div>
      <button
        type="button"
        onClick={goBack}
        className="mb-6 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        ← {quote ? (plan ? "Volver a planes" : "Editar datos") : "Volver"}
      </button>

      {quote && plan && done ? (
        <SuccessView quote={quote} plan={plan} onWhatsApp={openWhatsApp} />
      ) : quote && plan ? (
        <form onSubmit={onRegister} className="mx-auto max-w-lg">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
            ¡Falta muy poco para tener tu seguro!
          </h2>
          <p className="mt-3 text-base text-muted">
            Completá DNI y datos del auto para que el productor reciba la cotización en San Cristóbal.
          </p>
          <p className="mt-4 text-sm text-navy/80">
            <span className="font-semibold">{plan.title}</span> · {quote.carDescription}
          </p>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-navy/70">Datos personales</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Número de DNI" invalid={touched && !isDni(dni)}>
              <input
                className="field"
                inputMode="numeric"
                maxLength={8}
                placeholder="40150135"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </Field>
            <Field label="Nombre y apellido" invalid={touched && !nombre.trim()}>
              <input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            <Field label="Género" invalid={touched && !gender}>
              <select className="field" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Seleccioná</option>
                <option value="Male">Masculino</option>
                <option value="Female">Femenino</option>
              </select>
            </Field>
            <Field label="Email" invalid={touched && !isEmail(email)}>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="WhatsApp" invalid={touched && !isPhone(celular)}>
              <input className="field" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
            </Field>
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-navy/70">Datos del auto</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {is0km ? (
              <p className="sm:col-span-2 text-sm text-muted">Es 0km: no hace falta patente.</p>
            ) : (
              <Field label="Patente" invalid={touched && plateKind !== "auto"}>
                <input
                  className="field"
                  placeholder="AB123CD"
                  autoComplete="off"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(normalizeArPlate(e.target.value))}
                />
              </Field>
            )}
            <Field label="N° de chasis" invalid={touched && !isVin(vin)}>
              <input
                className="field"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 dígitos"
                value={vin}
                onChange={(e) => setVin(digitsOnly(e.target.value).slice(0, 10))}
              />
            </Field>
            <Field label="N° de motor" invalid={touched && !isEngineNumber(engineNumber)}>
              <input
                className="field"
                inputMode="numeric"
                placeholder="Mínimo 6 dígitos"
                value={engineNumber}
                onChange={(e) => setEngineNumber(digitsOnly(e.target.value))}
              />
            </Field>
          </div>

          <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Autorizo a ser contactado y que los datos ingresados sean utilizados por San Cristóbal y MARXEN para
              cotizar y emitir el seguro.
            </span>
          </label>
          {touched && !consent ? <p className="mt-2 text-sm font-medium text-red-600">Requerido</p> : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={registering} className="btn btn-primary mt-6 w-full disabled:opacity-60">
            {registering ? "Registrando en San Cristóbal…" : "Enviar cotización al productor"}
          </button>
        </form>
      ) : quote ? (
        <PlansView quote={quote} plate={is0km ? "" : plate} onSelect={setPlan} />
      ) : (
        <form onSubmit={onSubmit} className="mx-auto max-w-lg">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
            ¡Asegurá tu auto con hasta 37% Off!
          </h2>
          <p className="mt-3 text-base text-muted">
            Ingresá la patente, completá el auto y cotizamos en San Cristóbal. Los planes salen al toque.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {is0km ? (
              <p className="sm:col-span-2 text-sm text-muted">Es 0km: no hace falta patente.</p>
            ) : (
              <Field label="Patente" invalid={touched && plateKind !== "auto" && plateKind !== "moto"}>
                <input
                  className="field"
                  placeholder="AB123CD"
                  autoComplete="off"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(normalizeArPlate(e.target.value))}
                />
              </Field>
            )}

            {plateKind === "moto" ? (
              <div className="sm:col-span-2 rounded-xl border border-sky/20 bg-sky/5 p-4">
                <p className="text-sm text-navy">
                  La patente <span className="font-semibold">{plate}</span> es de motovehículo. San Cristóbal
                  cotiza motos en otro formulario.
                </p>
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  onClick={() => onSwitchToMoto?.(plate)}
                >
                  Cotizar esta moto
                </button>
              </div>
            ) : null}

            {plateKind === "moto" ? null : (
              <>
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

            <Field label="GNC" invalid={false}>
              <select className="field" value={hasGnc} onChange={(e) => setHasGnc(e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </Field>

            <Field label="Rastreador" invalid={false}>
              <select className="field" value={hasTracker} onChange={(e) => setHasTracker(e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí</option>
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

            <Field label="Edad" invalid={touched && (ageNum < 18 || ageNum > 99)}>
              <input
                className="field"
                inputMode="numeric"
                maxLength={2}
                placeholder="34"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </Field>

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

            <Field label="Email" invalid={touched && !isEmail(email)}>
              <input
                className="field"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
              </>
            )}
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          {plateKind === "moto" ? null : (
            <button type="submit" disabled={quoting} className="btn btn-primary mt-6 w-full disabled:opacity-60">
              {quoting ? "Cotizando…" : "Ver planes"}
            </button>
          )}
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
  plate,
  onSelect,
}: {
  quote: QuoteResult;
  plate?: string;
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
          {plate ? (
            <div>
              <dt className="inline font-semibold">Patente: </dt>
              <dd className="inline">{plate}</dd>
            </div>
          ) : null}
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
        {quote.plans.map((item) => (
          <article
            key={item.key}
            className="relative flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-[0_10px_30px_rgba(10,53,92,0.08)]"
          >
            {item.mostChosen ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2ea44f] px-3 py-1 text-xs font-semibold text-white">
                Más elegido
              </span>
            ) : null}
            <h3 className="font-display text-lg font-semibold text-navy">{item.title}</h3>
            {item.original && item.original > item.monthly ? (
              <p className="mt-3 text-sm font-semibold text-sky line-through">{money(item.original)}*/mes</p>
            ) : null}
            <p className="mt-1 text-3xl font-bold tracking-tight text-sky">
              {money(item.monthly)} <span className="text-base font-semibold text-navy/70"> / mes</span>
            </p>
            {item.discount > 0 ? (
              <p className="mt-2 text-sm font-semibold text-[#2ea44f]">
                tarifa con {item.discount}% OFF aplicado
              </p>
            ) : null}
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{item.description}</p>
            <button type="button" onClick={() => onSelect(item)} className="btn btn-primary mt-6 w-full">
              Quiero este plan
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function SuccessView({
  quote,
  plan,
  onWhatsApp,
}: {
  quote: QuoteResult;
  plan: Plan;
  onWhatsApp: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-black/5 bg-white p-8 text-center shadow-[0_10px_30px_rgba(10,53,92,0.08)]">
      <h2 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-navy sm:text-3xl">
        Cotización enviada al productor
      </h2>
      <p className="mt-3 text-base text-muted">
        Ya quedó registrada en San Cristóbal con tu DNI. Un asesor de MARXEN te contacta para emitir.
      </p>
      <p className="mt-4 text-sm text-navy/80">
        {plan.title} · {quote.carDescription}
        <br />
        Código {quote.opportunityId}
      </p>
      <button type="button" onClick={onWhatsApp} className="btn btn-primary mt-6 w-full">
        Seguir por WhatsApp
      </button>
    </div>
  );
}
