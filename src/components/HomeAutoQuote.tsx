"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyArPlate, normalizeArPlate } from "@/lib/ar-plate";
import { QuoteCompare, type ComparePlan } from "@/components/QuoteCompare";

type Option = { id: string; label: string };
type Version = {
  id: number;
  description: string;
  fullCarDescripcion?: string;
  statedAmount?: number;
  infoAutoCode?: number;
  category?: string;
  fuelCode?: string;
  isImported?: boolean;
};
type Location = {
  locationId: number;
  description: string;
  state?: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};
type Offer = { id: string; title: string; monthly: number; description?: string; covers?: Record<string, string> | null };
type CompanyQuote = { plans: Offer[]; error?: string; opportunityId?: number };
type QuotePayload = { carDescription: string; statedAmount: number; sancristobal: CompanyQuote; smg: CompanyQuote };
type Choice = { company: "sancristobal" | "smg"; id: string; title: string; monthly: number };

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(value: number) {
  return `$ ${moneyFmt.format(value)}`;
}

function years() {
  const current = new Date().getFullYear();
  const list = [{ id: `${current}-0km`, label: `${current} 0km` }];
  for (let year = current; year >= current - 30; year -= 1) list.push({ id: String(year), label: String(year) });
  return list;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export function HomeAutoQuote({ variant = "hero" }: { variant?: "hero" | "crm" }) {
  const yearList = useMemo(years, []);
  const [plate, setPlate] = useState("");
  const [yearId, setYearId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [postal, setPostal] = useState("4400");
  const [location, setLocation] = useState<Location | null>(null);
  const [hasGnc, setHasGnc] = useState("no");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [age, setAge] = useState("");
  const [hint, setHint] = useState("");
  const [looking, setLooking] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [dni, setDni] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [vin, setVin] = useState("");
  const [engine, setEngine] = useState("");
  const [emitting, setEmitting] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [issued, setIssued] = useState("");
  const quotedTicket = useRef("");

  const normalized = normalizeArPlate(plate);
  const plateKind = classifyArPlate(normalized);
  const is0km = yearId.endsWith("-0km");
  const year = yearId.replace(/-0km$/, "");
  const brand = brands.find((item) => item.id === brandId) || null;
  const model = models.find((item) => item.id === modelId) || null;
  const version = versions.find((item) => String(item.id) === versionId) || null;

  useEffect(() => {
    if (postal.length !== 4) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "location", postalCode: postal })}`)
      .then((data) => {
        if (cancelled) return;
        const list = (data.locations || []) as Location[];
        setLocation(list.find((item) => item.description.toUpperCase() === "SALTA") || list[0] || null);
      })
      .catch(() => {
        if (!cancelled) setLocation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postal]);

  useEffect(() => {
    if (plateKind !== "auto") return;
    let cancelled = false;
    setLooking(true);
    const timer = window.setTimeout(() => {
      fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "plate", plate: normalized })}`)
        .then((data) => {
          if (cancelled) return;
          setHint(data.message || data.description || "");
          if (data.kind === "moto" || !data.found) return;
          const nextBrands = ((data.brands || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }));
          const nextModels = ((data.models || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }));
          setYearId(data.year ? String(data.year) : "");
          setBrands(nextBrands);
          setModels(nextModels);
          setVersions((data.versions || []) as Version[]);
          if (data.brand) setBrandId(String(data.brand.id));
          if (data.model) setModelId(String(data.model.id));
          if (data.version) setVersionId(String(data.version.id));
        })
        .catch((err) => {
          if (!cancelled) setHint(err instanceof Error ? err.message : "No pudimos leer la patente.");
        })
        .finally(() => {
          if (!cancelled) setLooking(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalized, plateKind]);

  useEffect(() => {
    if (!yearId || brands.length) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "brands", year })}`)
      .then((data) => {
        if (cancelled) return;
        setBrands(
          ((data.brands || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brands.length]);

  useEffect(() => {
    if (!yearId || !brandId) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "models", year, brandId })}`)
      .then((data) => {
        if (cancelled) return;
        setModels(
          ((data.models || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brandId]);

  useEffect(() => {
    if (!yearId || !brandId || !modelId) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "versions", year, brandId, modelId })}`)
      .then((data) => {
        if (cancelled) return;
        setVersions((data.versions || []) as Version[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brandId, modelId]);

  async function quoteNow() {
    setError("");
    if (!is0km && plateKind === "moto") {
      setError("Esta patente es de moto.");
      return;
    }
    if (!is0km && plateKind !== "auto") {
      setError("Ingresá una patente de auto válida.");
      return;
    }
    if (!yearId || !brand || !model || !version || !location) {
      setError("Elegí año, marca, modelo y versión.");
      return;
    }
    if (!nombre.trim() || celular.replace(/\D/g, "").length < 8 || Number(age) < 18) {
      setError("Completá nombre, WhatsApp y una edad mayor de 18.");
      return;
    }
    const ticket = `${normalized}|${version.id}|${postal}|${age}|${hasGnc}|${nombre.trim()}|${celular.trim()}`;
    quotedTicket.current = ticket;
    setQuoting(true);
    setIssued("");
    try {
      const data = await fetchJson("/api/auto-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(year),
          is0km,
          brand: { id: Number(brand.id), description: brand.label },
          model: { id: Number(model.id), description: model.label },
          version,
          location,
          postalCode: Number(postal),
          nombre: nombre.trim(),
          celular: celular.trim(),
          age: Number(age),
          hasGnc: hasGnc === "si",
          licensePlate: normalized,
          page_path: window.location.pathname,
          ticket,
        }),
      });
      setQuote(data as QuotePayload);
    } catch (err) {
      quotedTicket.current = "";
      setError(err instanceof Error ? err.message : "No pudimos cotizar.");
    } finally {
      setQuoting(false);
    }
  }

  async function emitPolicy() {
    if (!choice || !brand || !model || !version || !location) return;
    if (dni.length < 7 || !email.includes("@") || !gender || !street || !streetNumber || vin.length < 10 || engine.length < 6) {
      setError("Completá DNI, email, domicilio, chasis y motor para emitir.");
      return;
    }
    if (choice.company === "smg" && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("Para emitir en SMG falta la fecha de nacimiento.");
      return;
    }
    setEmitting(true);
    setError("");
    try {
      const data = await fetchJson("/api/auto-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "emit",
          company: choice.company,
          planId: choice.id,
          planTitle: choice.title,
          year: Number(year),
          is0km,
          brand: { id: Number(brand.id), description: brand.label },
          model: { id: Number(model.id), description: model.label },
          version,
          location,
          nombre: nombre.trim(),
          celular: celular.trim(),
          age: Number(age),
          hasGnc: hasGnc === "si",
          licensePlate: normalized,
          dni,
          gender,
          email: email.trim(),
          birthDate,
          street: street.trim(),
          streetNumber: streetNumber.trim(),
          vin,
          engineNumber: engine,
          page_path: window.location.pathname,
        }),
      });
      const note = String(data.note || "");
      const readable = note.startsWith("{") || note.startsWith("[") || note.length > 220
        ? "No se pudo emitir. El pedido quedó para el productor."
        : note;
      setIssued(data.policyNumber ? `Póliza ${data.policyNumber}` : readable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir.");
    } finally {
      setEmitting(false);
    }
  }

  const view = issued ? "done" : choice ? "emit" : quote ? "plans" : "form";
  const crmPlans = variant === "crm" && quote ? comparePlans(quote) : [];

  return (
    <div className={variant === "crm" ? "home-quote home-quote--crm" : "home-quote"}>
      <form
        className="quote-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (view === "emit") void emitPolicy();
          else void quoteNow();
        }}
      >
        {view === "form" ? (
          <>
        <p className="home-quote__kicker">San Cristóbal y SMG</p>
        <h2>Cotizá tu auto en un minuto</h2>
        <p className="home-quote__lede">La patente completa el auto y cotiza en las dos.</p>

        <label className="home-quote__plate">
          <span>Patente</span>
          <input
            className="field quote-plate"
            placeholder="AB123CD"
            autoComplete="off"
            spellCheck={false}
            value={plate}
            onChange={(event) => {
              setPlate(normalizeArPlate(event.target.value));
              setVersionId("");
              setQuote(null);
              setChoice(null);
              setIssued("");
              setHint("");
            }}
          />
        </label>
        {looking ? <p className="quote-lookup">Buscando el auto…</p> : null}
        {hint ? <p className={plateKind === "moto" ? "quote-alert" : "quote-found"}>{hint}</p> : null}

        <div className="home-quote__grid">
          <Select
            label="Año"
            value={yearId}
            onChange={(value) => {
              setYearId(value);
              setBrandId("");
              setModelId("");
              setVersionId("");
              setBrands([]);
              setModels([]);
              setVersions([]);
            }}
            placeholder="Elegí el año"
            options={yearList}
          />
          <Select
            label="Marca"
            value={brandId}
            onChange={(value) => {
              setBrandId(value);
              setModelId("");
              setVersionId("");
              setModels([]);
              setVersions([]);
            }}
            placeholder="Elegí la marca"
            options={brands}
          />
          <Select
            label="Modelo"
            value={modelId}
            onChange={(value) => {
              setModelId(value);
              setVersionId("");
              setVersions([]);
            }}
            placeholder="Elegí el modelo"
            options={models}
          />
          <Select
            label="Versión"
            value={versionId}
            onChange={setVersionId}
            placeholder="Elegí la versión"
            options={versions.map((item) => ({ id: String(item.id), label: item.fullCarDescripcion || item.description }))}
          />
        </div>

        <div className="home-quote__row home-quote__trio">
          <Pill label="GNC" value={hasGnc} onChange={setHasGnc} />
          <label>
            <span>CP</span>
            <input className="field" inputMode="numeric" maxLength={4} value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </label>
          <label>
            <span>Edad</span>
            <input className="field" inputMode="numeric" maxLength={2} placeholder="34" value={age} onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 2))} />
          </label>
        </div>
        <div className="home-quote__row">
          <label>
            <span>Nombre</span>
            <input className="field" value={nombre} placeholder="Tu nombre" onChange={(event) => setNombre(event.target.value)} />
          </label>
          <label>
            <span>WhatsApp</span>
            <input className="field" inputMode="tel" placeholder="387…" value={celular} onChange={(event) => setCelular(event.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary home-quote__submit" disabled={quoting}>
          {quoting ? "Cotizando…" : "Cotizar en San Cristóbal y SMG"}
        </button>
        {quoting ? <p className="quote-info">Cotizando en San Cristóbal y SMG…</p> : null}
          </>
        ) : null}

        {view === "plans" && quote && variant === "crm" ? (
          <div className="crm-quote-result">
            <div className="crm-quote-result__bar">
              <button type="button" className="home-quote__back" onClick={() => setQuote(null)}>
                Editar datos
              </button>
              <h2>{quote.carDescription || hint || plate}</h2>
              <p>Elegí un plan para emitir.</p>
            </div>
            {quote.sancristobal.error ? <p className="quote-alert">{quote.sancristobal.error}</p> : null}
            {quote.smg.error ? <p className="quote-alert">{quote.smg.error}</p> : null}
            {crmPlans.length > 0 ? (
              <QuoteCompare
                embedded
                focusKey=""
                plans={crmPlans}
                onClose={() => setQuote(null)}
                onPick={(plan) => {
                  const company = plan.key.startsWith("smg:") ? "smg" : "sancristobal";
                  setChoice({
                    company,
                    id: plan.key.slice(company.length + 1),
                    title: plan.title,
                    monthly: plan.monthly,
                  });
                }}
              />
            ) : (
              <p className="quote-alert">No hubo planes para comparar.</p>
            )}
          </div>
        ) : null}

        {view === "plans" && quote && variant !== "crm" ? (
          <>
            <button type="button" className="home-quote__back" onClick={() => setQuote(null)}>
              Editar datos
            </button>
            <h2>{quote.carDescription || hint || plate}</h2>
            <div className="home-quote__results">
              <CompanyPlans
                name="San Cristóbal"
                quote={quote.sancristobal}
                selected={choice}
                company="sancristobal"
                onSelect={setChoice}
                onDetail={setDetailKey}
              />
              <CompanyPlans
                name="SMG"
                quote={quote.smg}
                selected={choice}
                company="smg"
                onSelect={setChoice}
                onDetail={setDetailKey}
              />
            </div>
          </>
        ) : null}

        {view === "emit" && choice ? (
          <>
            <button type="button" className="home-quote__back" onClick={() => setChoice(null)}>
              Volver a los planes
            </button>
            <h2>Emitir {choice.title}</h2>
            <p className="home-quote__lede">
              {choice.company === "smg" ? "SMG" : "San Cristóbal"} · {money(choice.monthly)} / mes
            </p>
          <div className="home-quote__grid">
            <label>
              <span>DNI</span>
              <input className="field" inputMode="numeric" maxLength={8} value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))} />
            </label>
            <label>
              <span>Género</span>
              <select className="field field-select" value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Seleccioná</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span>Email</span>
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Nacimiento</span>
              <input className="field" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </label>
            <label>
              <span>Calle</span>
              <input className="field" value={street} onChange={(event) => setStreet(event.target.value)} />
            </label>
            <label>
              <span>Altura</span>
              <input className="field" value={streetNumber} onChange={(event) => setStreetNumber(event.target.value)} />
            </label>
            <label>
              <span>Chasis</span>
              <input className="field" maxLength={20} value={vin} onChange={(event) => setVin(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20).toUpperCase())} />
            </label>
            <label className="sm:col-span-2">
              <span>Motor</span>
              <input className="field" maxLength={20} value={engine} onChange={(event) => setEngine(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20).toUpperCase())} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary home-quote__submit" disabled={emitting}>
            {emitting ? "Emitiendo…" : "Emitir póliza"}
          </button>
          </>
        ) : null}

        {view === "done" ? (
          <>
            <button
              type="button"
              className="home-quote__back"
              onClick={() => {
                setIssued("");
                setChoice(null);
                setQuote(null);
              }}
            >
              Nueva cotización
            </button>
            <h2>{issued.startsWith("Póliza") ? "Póliza emitida" : "No se pudo emitir"}</h2>
            <p className={issued.startsWith("Póliza") ? "quote-found" : "quote-alert"}>{issued}</p>
          </>
        ) : null}

        {error && view !== "plans" ? <p className="quote-alert">{error}</p> : null}
      </form>
      {detailKey && quote ? (
        <QuoteCompare
          focusKey={detailKey}
          plans={comparePlans(quote)}
          onClose={() => setDetailKey(null)}
        />
      ) : null}
    </div>
  );
}

function comparePlans(quote: QuotePayload): ComparePlan[] {
  const columns = [
    { company: "sancristobal" as const, name: "San Cristóbal", logo: "/companias/sancristobal.svg", data: quote.sancristobal },
    { company: "smg" as const, name: "Swiss Medical", logo: "/companias/smg.svg", data: quote.smg },
  ];
  return columns.flatMap((column) =>
    column.data.plans.slice(0, 3).map((plan) => ({
      key: `${column.company}:${plan.id}`,
      company: column.name,
      logo: column.logo,
      title: plan.title,
      monthly: plan.monthly,
      covers: plan.covers,
    }))
  );
}

function Select({
  label,
  value,
  onChange,
  placeholder,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  wide?: boolean;
}) {
  return (
    <label className={wide ? "home-quote__wide" : undefined}>
      <span>{label}</span>
      <select className="field field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pill({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <span>{label}</span>
      <div className="quote-pills">
        <button type="button" className={`quote-pill${value === "no" ? " is-on" : ""}`} onClick={() => onChange("no")}>
          No
        </button>
        <button type="button" className={`quote-pill${value === "si" ? " is-on" : ""}`} onClick={() => onChange("si")}>
          Sí
        </button>
      </div>
    </div>
  );
}

function CompanyPlans({
  name,
  quote,
  selected,
  company,
  onSelect,
  onDetail,
}: {
  name: string;
  quote: CompanyQuote;
  selected: Choice | null;
  company: Choice["company"];
  onSelect: (choice: Choice) => void;
  onDetail: (key: string) => void;
}) {
  const logo = company === "smg" ? "/companias/smg.svg" : "/companias/sancristobal.svg";
  return (
    <section className="home-quote__company">
      <header>
        <img src={logo} alt={name} />
        <span>Hacé clic para emitir</span>
      </header>
      {quote.error ? <p>{quote.error}</p> : null}
      <ul>
        {quote.plans.slice(0, 3).map((plan) => {
          const on = selected?.company === company && selected.id === plan.id;
          const detailKey = `${company}:${plan.id}`;
          return (
            <li key={plan.id} className={on ? "home-quote__plan is-on" : "home-quote__plan"}>
              <button
                type="button"
                className="home-quote__plan-pick"
                onClick={() => onSelect({ company, id: plan.id, title: plan.title, monthly: plan.monthly })}
              >
                <strong>{plan.title}</strong>
                <b className="home-quote__price">{plan.monthly > 0 ? money(plan.monthly) : "Consultar"}</b>
                {plan.monthly > 0 ? <span>por mes</span> : null}
              </button>
              <button type="button" className="home-quote__detail" onClick={() => onDetail(detailKey)}>
                Ver detalle
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
