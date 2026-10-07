"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

type Stage = "auto" | "cliente" | "emision";

const STAGES: { id: Stage; label: string }[] = [
  { id: "auto", label: "1. Auto" },
  { id: "cliente", label: "2. Cliente" },
  { id: "emision", label: "3. Emisión" },
];

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const YEARS = Array.from({ length: 26 }, (_, index) => String(new Date().getFullYear() - index));

type EmitForm = {
  nombre: string;
  apellido: string;
  apellido2: string;
  fecnac: string;
  sexo: string;
  tipoDoc: string;
  nroDoc: string;
  cuit: string;
  estadoCivil: string;
  condicionFiscal: string;
  calle: string;
  numero: string;
  piso: string;
  depto: string;
  cp: string;
  codProvincia: string;
  codMunicipio: string;
  email: string;
  telefono: string;
  patente: string;
  chasis: string;
  motor: string;
  codPlanCobertura: string;
  codConducto: string;
  nroTarjeta: string;
};

const EMPTY_EMIT: EmitForm = {
  nombre: "",
  apellido: "",
  apellido2: "",
  fecnac: "",
  sexo: "",
  tipoDoc: "96",
  nroDoc: "",
  cuit: "",
  estadoCivil: "",
  condicionFiscal: "1",
  calle: "",
  numero: "",
  piso: "",
  depto: "",
  cp: "",
  codProvincia: "",
  codMunicipio: "",
  email: "",
  telefono: "",
  patente: "",
  chasis: "",
  motor: "",
  codPlanCobertura: "",
  codConducto: "",
  nroTarjeta: "",
};

type Result = { ok?: boolean; status?: number; data?: unknown; error?: string };

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object").map((item) => item as Record<string, unknown>) : [];
}

function text(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return "";
}

function moneyOf(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? money.format(amount) : "";
}

function quoteId(data: unknown) {
  const root = asRecord(data);
  const header = asRecord(root.encabezado);
  const parsed = Number(header.idCotizacion ?? root.idCotizacion ?? root.idcotizacion);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function plansOf(data: unknown) {
  const riesgo = asList(asRecord(data).riesgo)[0];
  const vehiculo = asRecord(asRecord(asRecord(riesgo).entidad).vehiculo);
  return asList(vehiculo.planCobertura);
}

function humanError(result: Result | null) {
  if (!result || result.ok !== false) return "";
  const data = asRecord(result.data);
  const message = String(data.message || data.Message || result.error || "");
  if (/SMG_API/.test(message)) return "Swiss Medical no está configurado. Avisale a quien administra el sitio.";
  if (/error interno/i.test(message)) return "Swiss Medical no pudo completar la búsqueda. Probá con otras letras de la marca o con otro año.";
  return message || "No se pudo completar la consulta.";
}

async function callSmg(action: string, input: Record<string, unknown> = {}) {
  const response = await fetch("/api/crm/smg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
  const data = (await response.json()) as Result;
  if (response.status === 401) throw new Error("La sesión del CRM venció. Volvé a entrar.");
  if (data.error && data.ok === false && data.status === undefined) throw new Error(data.error);
  return data;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export default function SmgPage() {
  const [stage, setStage] = useState<Stage>("auto");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [productCode, setProductCode] = useState("10");
  const [locality, setLocality] = useState("Salta");
  const [postal, setPostal] = useState("4400");
  const [places, setPlaces] = useState<Record<string, unknown>[]>([]);
  const [place, setPlace] = useState<Record<string, unknown> | null>(null);
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [quote, setQuote] = useState<unknown>(null);
  const [emit, setEmit] = useState<EmitForm>(EMPTY_EMIT);

  const products = asList(catalog?.producto ?? catalog?.productos);
  const payments = asList(asRecord(catalog?.parametro).formadepago).flatMap((form) => {
    const conducts = asList(form.conducto);
    if (!conducts.length) {
      const id = text(form, ["codconducto", "codformadepago"]);
      return id ? [{ id, label: text(form, ["descripcion", "nombre"]) || "Forma de pago" }] : [];
    }
    return conducts
      .map((conduct) => ({
        id: text(conduct, ["codconducto"]),
        label: [text(form, ["descripcion", "nombre"]), text(conduct, ["descripcion", "nombre"])].filter(Boolean).join(" · "),
      }))
      .filter((option) => option.id);
  });
  const plans = plansOf(quote);
  const chosenPlan = plans.find((plan) => text(plan, ["codPlanCobertura"]) === emit.codPlanCobertura);

  const checks = useMemo(
    () => [
      { label: "Elegiste localidad y auto, y ya hay una cotización", done: quoteId(quote) > 0 },
      { label: "Elegiste una cobertura", done: Boolean(emit.codPlanCobertura) },
      { label: "Nombre, apellido, nacimiento y sexo", done: Boolean(emit.nombre && emit.apellido && emit.fecnac && emit.sexo) },
      { label: "Documento y CUIT", done: Boolean(emit.nroDoc && emit.cuit) },
      { label: "Domicilio completo", done: Boolean(emit.calle && emit.numero && emit.cp && emit.codProvincia && emit.codMunicipio) },
      { label: "Email y teléfono", done: Boolean(emit.email && emit.telefono) },
      { label: "Patente, chasis y motor", done: Boolean(emit.patente && emit.chasis && emit.motor) },
      { label: "Forma de pago", done: Boolean(emit.codConducto) },
    ],
    [emit, quote],
  );
  const readyToEmit = checks.every((item) => item.done);

  useEffect(() => {
    void callSmg("productos", { codAgente: "14682" })
      .then((data) => {
        if (data.data) setCatalog(asRecord(data.data));
      })
      .catch(() => setError("No se pudo cargar la lista de productos."));
  }, []);

  function bind(key: keyof EmitForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setEmit((prev) => ({ ...prev, [key]: value }));
    };
  }

  function choosePlace(next: Record<string, unknown>) {
    setPlace(next);
    setEmit((prev) => ({
      ...prev,
      codProvincia: text(next, ["codProvincia"]),
      codMunicipio: text(next, ["codLocalidad"]),
      cp: text(next, ["codPostal"]) || prev.cp,
    }));
  }

  async function searchPlaces() {
    setBusy("lugares");
    setError("");
    try {
      const data = await callSmg("ubicaciones", { txtLocalidad: locality, codPostal: postal });
      setResult(data);
      const list = asList(asRecord(data.data).ubicaciones);
      setPlaces(list);
      if (list.length === 1) choosePlace(list[0]);
      if (!data.ok) setError(humanError(data));
      if (data.ok && !list.length) setError("No apareció ninguna localidad con esos datos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar la localidad.");
    } finally {
      setBusy("");
    }
  }

  async function searchVehicles() {
    if (!place) {
      setError("Primero elegí la localidad.");
      return;
    }
    setBusy("autos");
    setError("");
    try {
      const data = await callSmg("vehiculos", {
        codProducto: productCode,
        codProvincia: text(place, ["codProvincia"]),
        codLocalidad: text(place, ["codLocalidad"]),
        txtModelo: brand,
        anio: year,
      });
      setResult(data);
      const list = asList(asRecord(data.data).vehiculo ?? asRecord(data.data).vehiculos);
      setVehicles(list);
      setVehicle(null);
      if (!data.ok) setError(humanError(data));
      else if (!list.length) setError("No hay autos con esa marca y ese año. Probá con las primeras letras, por ejemplo FIAT.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar el auto.");
    } finally {
      setBusy("");
    }
  }

  async function quoteVehicle() {
    if (!place || !vehicle) {
      setError("Elegí la localidad y el auto.");
      return;
    }
    setBusy("cotizar");
    setError("");
    try {
      const data = await callSmg("cotizar", {
        codProducto: productCode,
        codProvincia: text(place, ["codProvincia"]),
        codMunicipio: text(place, ["codLocalidad"]),
        anio: year,
        codMarca: text(vehicle, ["codMarca"]),
        marca: text(vehicle, ["marca", "txtMarca"]),
        codModelo: text(vehicle, ["codModelo"]),
        modelo: text(vehicle, ["modelo", "txtModelo", "descripcion"]),
      });
      setResult(data);
      if (data.ok) {
        setQuote(data.data);
        setEmit((prev) => ({ ...prev, codPlanCobertura: "" }));
      } else {
        setError(humanError(data) || "No se pudo cotizar.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cotizar.");
    } finally {
      setBusy("");
    }
  }

  async function emitPolicy() {
    if (!readyToEmit) return;
    setBusy("emitir");
    setError("");
    try {
      const data = await callSmg("emitir", { ...emit, quote });
      setResult(data);
      if (!data.ok) setError(humanError(data) || "Swiss Medical no aceptó la emisión de prueba.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la emisión.");
    } finally {
      setBusy("");
    }
  }

  const placeName = place ? `${text(place, ["txtLocalidad"])} · ${text(place, ["txtProvincia"])}` : "";
  const vehicleName = vehicle
    ? `${text(vehicle, ["marca", "txtMarca"])} ${text(vehicle, ["modelo", "txtModelo", "descripcion"])} ${year}`.trim()
    : "";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-navy">Cotizador Swiss Medical</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Cotizá un auto, cargá los datos del cliente y pedí la emisión. Es una prueba: no genera una póliza real.
        </p>
      </header>

      <div className="sc-tabs" role="tablist">
        {STAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={stage === item.id}
            className={`sc-tab ${stage === item.id ? "is-on" : ""}`}
            onClick={() => setStage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="crm-card px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {stage === "auto" ? (
        <section className="crm-card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Producto">
            <select className="crm-input" value={productCode} onChange={(event) => setProductCode(event.target.value)}>
              {products.length ? null : <option value="10">Plan normal</option>}
              {products.map((product) => (
                <option key={text(product, ["codproducto", "codProducto"])} value={text(product, ["codproducto", "codProducto"])}>
                  {text(product, ["descripcion", "nombre"])}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Año del auto">
            <select className="crm-input" value={year} onChange={(event) => setYear(event.target.value)}>
              {YEARS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Localidad">
            <input className="crm-input" value={locality} onChange={(event) => setLocality(event.target.value)} />
          </Field>
          <Field label="Código postal">
            <input className="crm-input" value={postal} onChange={(event) => setPostal(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <button type="button" className="crm-btn crm-btn-primary" disabled={busy === "lugares"} onClick={() => void searchPlaces()}>
              {busy === "lugares" ? "Buscando…" : "Buscar localidad"}
            </button>
          </div>
          {places.length ? (
            <div className="flex flex-col gap-2 sm:col-span-2">
              {places.slice(0, 8).map((item) => {
                const selected = place === item;
                return (
                  <button
                    key={text(item, ["codUbicacion", "codLocalidad"]) + text(item, ["codPostal"])}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left text-sm ${selected ? "border-teal bg-white" : "border-transparent bg-mist"}`}
                    onClick={() => choosePlace(item)}
                  >
                    {text(item, ["txtLocalidad"])}, {text(item, ["txtProvincia"])} · CP {text(item, ["codPostal"])}
                  </button>
                );
              })}
            </div>
          ) : null}
          <Field label="Marca o modelo">
            <input className="crm-input" value={brand} placeholder="FIAT" onChange={(event) => setBrand(event.target.value)} />
          </Field>
          <div className="flex items-end">
            <button type="button" className="crm-btn crm-btn-primary" disabled={busy === "autos" || !brand.trim()} onClick={() => void searchVehicles()}>
              {busy === "autos" ? "Buscando…" : "Buscar auto"}
            </button>
          </div>
          {vehicles.length ? (
            <div className="flex max-h-64 flex-col gap-2 overflow-auto sm:col-span-2">
              {vehicles.slice(0, 20).map((item) => {
                const selected = vehicle === item;
                const name = `${text(item, ["marca", "txtMarca"])} ${text(item, ["modelo", "txtModelo", "descripcion"])}`.trim();
                return (
                  <button
                    key={text(item, ["codMarca"]) + text(item, ["codModelo"]) + name}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left text-sm ${selected ? "border-teal bg-white" : "border-transparent bg-mist"}`}
                    onClick={() => setVehicle(item)}
                  >
                    {name || "Auto"}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <button type="button" className="crm-btn crm-btn-primary" disabled={busy === "cotizar" || !vehicle || !place} onClick={() => void quoteVehicle()}>
              {busy === "cotizar" ? "Cotizando…" : "Ver precios"}
            </button>
          </div>
          {plans.length ? (
            <div className="grid gap-2 sm:col-span-2">
              {plans.map((plan) => {
                const id = text(plan, ["codPlanCobertura"]);
                const selected = emit.codPlanCobertura === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left ${selected ? "border-teal bg-white" : "border-transparent bg-mist"}`}
                    onClick={() => setEmit((prev) => ({ ...prev, codPlanCobertura: id }))}
                  >
                    <span className="block text-sm font-semibold text-navy">{text(plan, ["planCobertura", "descripcion"]) || "Cobertura"}</span>
                    <span className="text-sm text-muted">
                      {[moneyOf(plan.importePremio) && `${moneyOf(plan.importePremio)} premio`, moneyOf(plan.importeCuota) && `${moneyOf(plan.importeCuota)} por cuota`]
                        .filter(Boolean)
                        .join(" · ") || "Sin precio informado"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {stage === "cliente" ? (
        <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
          <p className="text-sm text-muted sm:col-span-2">
            {placeName ? `Localidad: ${placeName}.` : "Elegí la localidad en el paso del auto."}{" "}
            {vehicleName ? `Auto: ${vehicleName}.` : ""}
          </p>
          <h2 className="text-sm font-semibold text-navy sm:col-span-2">Quién contrata</h2>
          <Field label="Nombre"><input className="crm-input" value={emit.nombre} onChange={bind("nombre")} /></Field>
          <Field label="Apellido"><input className="crm-input" value={emit.apellido} onChange={bind("apellido")} /></Field>
          <Field label="Segundo apellido"><input className="crm-input" value={emit.apellido2} onChange={bind("apellido2")} /></Field>
          <Field label="Fecha de nacimiento"><input className="crm-input" type="date" value={emit.fecnac} onChange={bind("fecnac")} /></Field>
          <Field label="Sexo">
            <select className="crm-input" value={emit.sexo} onChange={bind("sexo")}>
              <option value="">Elegir</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Documento">
            <select className="crm-input" value={emit.tipoDoc} onChange={bind("tipoDoc")}>
              <option value="96">CUIT / CUIL</option>
              <option value="1">DNI</option>
            </select>
          </Field>
          <Field label="Número de documento"><input className="crm-input" value={emit.nroDoc} onChange={bind("nroDoc")} /></Field>
          <Field label="CUIT / CUIL"><input className="crm-input" value={emit.cuit} onChange={bind("cuit")} placeholder="20-00000000-0" /></Field>
          <Field label="Estado civil">
            <select className="crm-input" value={emit.estadoCivil} onChange={bind("estadoCivil")}>
              <option value="">Sin informar</option>
              <option value="1">Soltero</option>
              <option value="2">Casado</option>
              <option value="3">Divorciado</option>
              <option value="4">Viudo</option>
            </select>
          </Field>
          <Field label="Condición fiscal">
            <select className="crm-input" value={emit.condicionFiscal} onChange={bind("condicionFiscal")}>
              <option value="1">Consumidor final</option>
              <option value="2">Responsable inscripto</option>
              <option value="3">Monotributo</option>
              <option value="4">Exento</option>
            </select>
          </Field>
          <h2 className="text-sm font-semibold text-navy sm:col-span-2">Dónde vive</h2>
          <Field label="Calle"><input className="crm-input" value={emit.calle} onChange={bind("calle")} /></Field>
          <Field label="Número"><input className="crm-input" value={emit.numero} onChange={bind("numero")} /></Field>
          <Field label="Piso"><input className="crm-input" value={emit.piso} onChange={bind("piso")} /></Field>
          <Field label="Departamento"><input className="crm-input" value={emit.depto} onChange={bind("depto")} /></Field>
          <Field label="Código postal"><input className="crm-input" value={emit.cp} onChange={bind("cp")} /></Field>
          <h2 className="text-sm font-semibold text-navy sm:col-span-2">Contacto y auto</h2>
          <Field label="Email"><input className="crm-input" type="email" value={emit.email} onChange={bind("email")} /></Field>
          <Field label="Teléfono"><input className="crm-input" value={emit.telefono} onChange={bind("telefono")} /></Field>
          <Field label="Patente"><input className="crm-input" value={emit.patente} onChange={bind("patente")} /></Field>
          <Field label="Chasis"><input className="crm-input" value={emit.chasis} onChange={bind("chasis")} /></Field>
          <Field label="Motor"><input className="crm-input" value={emit.motor} onChange={bind("motor")} /></Field>
          <Field label="Cómo paga">
            <select className="crm-input" value={emit.codConducto} onChange={bind("codConducto")}>
              <option value="">Elegir</option>
              {payments.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Número de tarjeta">
            <input className="crm-input" value={emit.nroTarjeta} onChange={bind("nroTarjeta")} placeholder="Solo si paga con tarjeta" />
          </Field>
          <div className="sm:col-span-2">
            <button type="button" className="crm-btn crm-btn-primary" onClick={() => setStage("emision")}>
              Revisar emisión
            </button>
          </div>
        </section>
      ) : null}

      {stage === "emision" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Resumen</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-muted">Auto</dt><dd className="text-navy">{vehicleName || "Sin elegir"}</dd></div>
              <div><dt className="text-muted">Localidad</dt><dd className="text-navy">{placeName || "Sin elegir"}</dd></div>
              <div><dt className="text-muted">Cliente</dt><dd className="text-navy">{[emit.nombre, emit.apellido].filter(Boolean).join(" ") || "Sin cargar"}</dd></div>
              <div>
                <dt className="text-muted">Cobertura</dt>
                <dd className="text-navy">
                  {chosenPlan
                    ? `${text(chosenPlan, ["planCobertura", "descripcion"])} · ${moneyOf(chosenPlan.importeCuota) || moneyOf(chosenPlan.importePremio) || "sin precio"}`
                    : "Sin elegir"}
                </dd>
              </div>
            </dl>
            <button type="button" className="crm-btn crm-btn-primary mt-5" disabled={Boolean(busy) || !readyToEmit} onClick={() => void emitPolicy()}>
              {busy === "emitir" ? "Enviando…" : readyToEmit ? "Pedir emisión de prueba" : "Faltan datos"}
            </button>
            <p className="mt-3 text-xs text-muted">Esta prueba no crea una póliza vigente. Las fotos del auto las tiene que aceptar Swiss Medical para una solicitud definitiva.</p>
          </div>
          <div className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Para poder emitir</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {checks.map((item) => (
                <li key={item.label} className={item.done ? "text-navy" : "text-muted"}>
                  {item.done ? "Listo" : "Falta"} · {item.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">Detalle técnico</summary>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-navy">
          {result ? JSON.stringify(result.data ?? result, null, 2) : "Todavía no hay una respuesta."}
        </pre>
      </details>
    </div>
  );
}
