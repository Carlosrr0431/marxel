"use client";

import { useEffect, useMemo, useState } from "react";
import { site } from "@/lib/content";

type Option = { code: string; name: string };
type Plan = {
  code: string;
  title: string;
  type: string;
  monthly: number;
  laterMonthly: number | null;
  promoMonths: number | null;
  promoPercent: number | null;
  franchise: string | null;
  recommended: boolean;
};
type Screen = "car" | "contact" | "plans" | "person" | "pay" | "done";

const STEPS = ["Datos del auto", "Elegí un plan", "Datos personales", "Forma de pago", "Confirmación"];
const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function stepIndex(screen: Screen) {
  if (screen === "car" || screen === "contact") return 0;
  if (screen === "plans") return 1;
  if (screen === "person") return 2;
  if (screen === "pay") return 3;
  return 4;
}

async function cajaGet(params: Record<string, string>) {
  const response = await fetch(`/api/lacaja?${new URLSearchParams(params)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo consultar La Caja.");
  return data.items as Option[];
}

export function LaCajaAutoQuote() {
  const [screen, setScreen] = useState<Screen>("car");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [brands, setBrands] = useState<Option[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [brand, setBrand] = useState<Option | null>(null);
  const [models, setModels] = useState<Option[]>([]);
  const [model, setModel] = useState("");
  const [versions, setVersions] = useState<Option[]>([]);
  const [version, setVersion] = useState("");
  const [year, setYear] = useState("");
  const [gnc, setGnc] = useState<boolean | null>(null);
  const [particular, setParticular] = useState(false);
  const [postal, setPostal] = useState("4400");
  const [locations, setLocations] = useState<Option[]>([]);
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [prefix, setPrefix] = useState("387");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [budget, setBudget] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [pay, setPay] = useState<"debito" | "tarjeta">("debito");

  const years = useMemo(() => Array.from({ length: 2026 - 2006 + 1 }, (_, index) => String(2026 - index)), []);
  const brandMatches = useMemo(() => {
    const query = brandQuery.trim().toLowerCase();
    if (!query || brand) return [];
    return brands.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [brand, brandQuery, brands]);
  const popular = brands.slice(0, 7);
  const chosenModel = models.find((item) => item.code === model) || null;
  const chosenVersion = versions.find((item) => item.code === version) || null;
  const chosenLocation = locations.find((item) => item.code === location) || null;

  useEffect(() => {
    cajaGet({ type: "brands" }).then(setBrands).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!brand || year.length !== 4) {
      setModels([]);
      setModel("");
      return;
    }
    let alive = true;
    cajaGet({ type: "models", code: brand.code, year })
      .then((items) => {
        if (!alive) return;
        setModels(items);
        setModel("");
        setVersions([]);
        setVersion("");
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [brand, year]);

  useEffect(() => {
    if (!model || year.length !== 4) {
      setVersions([]);
      setVersion("");
      return;
    }
    let alive = true;
    cajaGet({ type: "versions", code: model, year })
      .then((items) => {
        if (!alive) return;
        setVersions(items);
        setVersion("");
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [model, year]);

  useEffect(() => {
    if (!/^\d{4}$/.test(postal)) {
      setLocations([]);
      setLocation("");
      return;
    }
    let alive = true;
    cajaGet({ type: "locations", cp: postal })
      .then((items) => {
        if (!alive) return;
        setLocations(items);
        setLocation(items[0]?.code || "");
        setError(items.length ? "" : "Ingresá un código postal válido.");
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [postal]);

  function pickBrand(item: Option) {
    setBrand(item);
    setBrandQuery(item.name);
    setError("");
  }

  async function quote() {
    if (!brand || !chosenModel || !chosenVersion) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lacaja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionCode: chosenVersion.code,
          brand: brand.name,
          model: chosenModel.name,
          version: chosenVersion.name,
          year,
          gnc,
          locationCode: location,
          prefix,
          phone,
          email,
          startDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La Caja no pudo cotizar.");
      setPlans(data.plans);
      setBudget(String(data.budget || ""));
      setScreen("plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La Caja no pudo cotizar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!brand || !chosenModel || !chosenVersion || !plan) return;
    setBusy(true);
    setError("");
    const nombre = `${firstName.trim()} ${lastName.trim()}`.trim();
    const notas = [
      "Cotización La Caja",
      `${year} ${brand.name} ${chosenModel.name} ${chosenVersion.name}`,
      `GNC: ${gnc ? "sí" : "no"}`,
      `CP ${postal} ${chosenLocation?.name || ""}`,
      `Plan ${plan.title} ${money.format(plan.monthly)} / mes`,
      budget ? `Presupuesto La Caja ${budget}` : "",
      `Pago elegido: ${pay === "debito" ? "débito por CBU" : "tarjeta de crédito"}`,
      street ? `Domicilio: ${street} ${streetNumber}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          celular: `${prefix}${phone}`,
          email,
          dni,
          localidad: chosenLocation?.name || postal,
          provincia: "Salta",
          interes: "seguro de auto La Caja",
          notas,
          page_path: "/cotizador-la-caja",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el pedido.");
      setScreen("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  const carReady = Boolean(year && brand && model && version && gnc !== null && particular);
  const contactReady = Boolean(location && email.includes("@") && prefix && phone.length >= 6 && startDate);
  const personReady = firstName.trim().length > 1 && lastName.trim().length > 1 && dni.replace(/\D/g, "").length >= 7;
  const current = stepIndex(screen);
  const whatsappText = plan && brand && chosenModel && chosenVersion
    ? `Hola MARXEN, quiero emitir el seguro de La Caja de mi ${year} ${brand.name} ${chosenModel.name} ${chosenVersion.name}. Plan ${plan.title}, ${money.format(plan.monthly)} por mes.`
    : "Hola MARXEN, quiero cotizar el seguro de auto de La Caja.";

  return (
    <section className="lacaja" id="cotizador-la-caja">
      <p className="lacaja__kicker">La Caja · en MARXEN</p>
      <h2>Contratá tu seguro de auto</h2>
      <ol className="lacaja__steps">
        {STEPS.map((label, index) => (
          <li key={label} className={index === current ? "is-on" : index < current ? "is-done" : ""}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {screen === "car" ? (
        <div className="lacaja__form">
          <label>
            Año del auto
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="">Entre 2006 y 2026</option>
              {years.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input
              value={brandQuery}
              placeholder="Buscar"
              onChange={(event) => {
                setBrandQuery(event.target.value);
                setBrand(null);
              }}
            />
          </label>
          {brandMatches.length > 0 ? (
            <ul className="lacaja__matches">
              {brandMatches.map((item) => (
                <li key={item.code}>
                  <button type="button" onClick={() => pickBrand(item)}>{item.name}</button>
                </li>
              ))}
            </ul>
          ) : null}
          {!brand && popular.length > 0 ? (
            <div className="lacaja__chips">
              {popular.map((item) => (
                <button key={item.code} type="button" onClick={() => pickBrand(item)}>{item.name}</button>
              ))}
            </div>
          ) : null}
          <label>
            Modelo
            <select value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length}>
              <option value="">{models.length ? "Elegí el modelo" : "Primero la marca y el año"}</option>
              {models.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Versión
            <select value={version} onChange={(event) => setVersion(event.target.value)} disabled={!versions.length}>
              <option value="">{versions.length ? "Elegí la versión" : "Primero el modelo"}</option>
              {versions.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>¿Tiene GNC?</legend>
            <div className="lacaja__choice">
              <button type="button" className={gnc === true ? "is-on" : ""} onClick={() => setGnc(true)}>Sí</button>
              <button type="button" className={gnc === false ? "is-on" : ""} onClick={() => setGnc(false)}>No</button>
            </div>
          </fieldset>
          <label className="lacaja__check">
            <input type="checkbox" checked={particular} onChange={(event) => setParticular(event.target.checked)} />
            <span>Mi auto es de uso particular. Funciona bien y está en buenas condiciones de chapa, pintura, cristales, ópticas y ruedas.</span>
          </label>
          <p className="lacaja__note">Al presionar Siguiente vas a cargar el código postal para ver los planes de La Caja.</p>
          <button type="button" className="lacaja__next" disabled={!carReady} onClick={() => { setError(""); setScreen("contact"); }}>
            Siguiente
          </button>
        </div>
      ) : null}

      {screen === "contact" ? (
        <div className="lacaja__form">
          <label>
            Código postal
            <input inputMode="numeric" maxLength={4} value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </label>
          <label>
            Localidad
            <select value={location} onChange={(event) => setLocation(event.target.value)} disabled={!locations.length}>
              <option value="">{locations.length ? "Seleccioná la localidad" : "Ingresá el código postal"}</option>
              {locations.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            E-mail
            <input type="email" value={email} placeholder="Ingresá tu e-mail" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <div className="lacaja__phone">
            <label>
              Código de área
              <input inputMode="numeric" value={prefix} onChange={(event) => setPrefix(event.target.value.replace(/\D/g, "").slice(0, 4))} />
            </label>
            <label>
              Teléfono de contacto
              <input inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 8))} />
            </label>
          </div>
          <label>
            Fecha de inicio del seguro
            <input type="date" value={startDate} min={todayIso()} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <p className="lacaja__note">Elegí una fecha dentro de los 30 días. El precio es el de débito automático, con IVA, para el día de hoy.</p>
          <div className="lacaja__actions">
            <button type="button" className="lacaja__back" onClick={() => setScreen("car")}>Volver</button>
            <button type="button" className="lacaja__next" disabled={!contactReady || busy} onClick={() => void quote()}>
              {busy ? "Buscando planes…" : "Ver planes"}
            </button>
          </div>
        </div>
      ) : null}

      {screen === "plans" ? (
        <div className="lacaja__plans">
          <p className="lacaja__note">
            {year} {brand?.name} {chosenModel?.name} {chosenVersion?.name}. Precio mensual con IVA para débito automático.
          </p>
          {plans.map((item) => (
            <article key={item.code} className={item.recommended ? "is-recommended" : ""}>
              {item.recommended ? <p className="lacaja__badge">Recomendado</p> : null}
              <h3>{item.title}</h3>
              <p className="lacaja__price">{money.format(item.monthly)} <small>/ mes</small></p>
              {item.promoMonths && item.promoPercent ? (
                <p className="lacaja__note">
                  {item.promoPercent}% off los primeros {item.promoMonths} meses
                  {item.laterMonthly ? `. Después ${money.format(item.laterMonthly)}` : ""}.
                </p>
              ) : null}
              {item.franchise ? <p className="lacaja__note">Franquicia: {item.franchise}</p> : null}
              <button
                type="button"
                className="lacaja__next"
                onClick={() => {
                  setPlan(item);
                  setScreen("person");
                }}
              >
                Elegir este plan
              </button>
            </article>
          ))}
          <button type="button" className="lacaja__back" onClick={() => setScreen("contact")}>Volver</button>
        </div>
      ) : null}

      {screen === "person" ? (
        <div className="lacaja__form">
          <p className="lacaja__note">{plan?.title} · {plan ? money.format(plan.monthly) : ""} / mes</p>
          <label>
            Nombre
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label>
            Apellido
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label>
            DNI
            <input inputMode="numeric" value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))} />
          </label>
          <div className="lacaja__phone">
            <label>
              Calle
              <input value={street} onChange={(event) => setStreet(event.target.value)} />
            </label>
            <label>
              Número
              <input value={streetNumber} onChange={(event) => setStreetNumber(event.target.value)} />
            </label>
          </div>
          <div className="lacaja__actions">
            <button type="button" className="lacaja__back" onClick={() => setScreen("plans")}>Volver</button>
            <button type="button" className="lacaja__next" disabled={!personReady} onClick={() => setScreen("pay")}>Siguiente</button>
          </div>
        </div>
      ) : null}

      {screen === "pay" ? (
        <div className="lacaja__form">
          <h3>Forma de pago</h3>
          <div className="lacaja__choice">
            <button type="button" className={pay === "debito" ? "is-on" : ""} onClick={() => setPay("debito")}>Débito por CBU</button>
            <button type="button" className={pay === "tarjeta" ? "is-on" : ""} onClick={() => setPay("tarjeta")}>Tarjeta de crédito</button>
          </div>
          <p className="lacaja__note">
            El precio publicado es para débito automático. La tarjeta o el CBU no se cargan en esta página: MARXEN toma el pedido y La Caja confirma la póliza.
          </p>
          <div className="lacaja__actions">
            <button type="button" className="lacaja__back" onClick={() => setScreen("person")}>Volver</button>
            <button type="button" className="lacaja__next" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </div>
      ) : null}

      {screen === "done" && plan ? (
        <div className="lacaja__form">
          <h3>Pedido recibido</h3>
          <p>
            {firstName}, dejamos tu {year} {brand?.name} {chosenModel?.name} con el plan {plan.title} a {money.format(plan.monthly)} por mes.
            Marcos te escribe para emitir la póliza en La Caja.
          </p>
          {budget ? <p className="lacaja__note">Número de cotización La Caja: {budget}</p> : null}
          <a
            className="lacaja__next"
            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </div>
      ) : null}

      {error ? <p className="lacaja__error">{error}</p> : null}
    </section>
  );
}
