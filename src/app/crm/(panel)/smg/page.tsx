"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

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
  tipoDoc: "1",
  nroDoc: "",
  cuit: "",
  estadoCivil: "",
  condicionFiscal: "5",
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

function titleCase(value: string) {
  const lower = value.toLocaleLowerCase("es-AR");
  return lower ? lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1) : "";
}

function catalogChoices(catalog: Record<string, unknown> | null, key: string, codeKeys: string[]) {
  const seen = new Set<string>();
  const options: { id: string; label: string }[] = [];
  for (const row of asList(asRecord(catalog?.parametro)[key])) {
    if (key === "condicionfiscal" && text(row, ["codprovincia"]) !== "0") continue;
    const id = text(row, codeKeys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label: titleCase(text(row, ["descripcion", "nombre"])) || id });
  }
  return options;
}

function insuredSum(model: Record<string, unknown>, year: string) {
  const years = asList(model.anio);
  const row = years.find((item) => text(item, ["codigoAnio", "descripcion"]) === year) || years[0];
  const sums = asList(asRecord(row).sumaAsegurada);
  const mid = sums.find((item) => Number(asRecord(item).key) === 0) || sums[0];
  return text(asRecord(mid), ["descripcion"]);
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function CandidateList({
  items,
  onPick,
}: {
  items: { key: string; title: string; detail?: string; row: Record<string, unknown> }[];
  onPick: (row: Record<string, unknown>) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-auto rounded-2xl border border-teal bg-white p-1">
      {items.map((item) => (
        <button key={item.key} type="button" className="rounded-xl bg-mist px-3 py-2 text-left" onClick={() => onPick(item.row)}>
          <span className="block text-sm font-medium text-navy">{item.title}</span>
          {item.detail ? <span className="block text-xs text-muted">{item.detail}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${selected ? "border-teal bg-navy text-white" : "border-transparent bg-mist text-navy"}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
  const [brands, setBrands] = useState<Record<string, unknown>[]>([]);
  const [chosenBrand, setChosenBrand] = useState<Record<string, unknown> | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [codUso, setCodUso] = useState("1");
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const placeSearch = useRef(0);
  const brandSearch = useRef(0);
  const [quote, setQuote] = useState<unknown>(null);
  const [emit, setEmit] = useState<EmitForm>(EMPTY_EMIT);

  const products = asList(catalog?.producto ?? catalog?.productos);
  const productOptions = products.length
    ? products
        .map((product) => ({
          id: text(product, ["codproducto", "codProducto"]),
          label: titleCase(text(product, ["descripcion", "nombre"])) || "Producto",
        }))
        .filter((option) => option.id)
    : [{ id: "10", label: "Plan normal" }];
  const sexOptions = catalogChoices(catalog, "sexo", ["codsexo"]);
  const documentOptions = catalogChoices(catalog, "tipodocumento", ["codtipodocumento"]);
  const maritalOptions = catalogChoices(catalog, "estadocivil", ["codestadocivil"]);
  const fiscalOptions = catalogChoices(catalog, "condicionfiscal", ["codcondicionfiscal"]);
  const models = asList(chosenBrand?.modelo).filter((model) => {
    const query = modelQuery.trim().toLocaleUpperCase("es-AR");
    return !query || text(model, ["descripcion"]).toLocaleUpperCase("es-AR").includes(query);
  });
  const usos = asList(vehicle?.usos);
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

  useEffect(() => {
    if (locality.trim().length < 3 && postal.trim().length < 4) {
      setPlaces([]);
      return;
    }
    const ticket = placeSearch.current + 1;
    placeSearch.current = ticket;
    const timer = setTimeout(() => {
      void (async () => {
        setBusy("lugares");
        try {
          const data = await callSmg("ubicaciones", { txtLocalidad: locality, codPostal: postal });
          if (placeSearch.current !== ticket) return;
          setResult(data);
          const list = asList(asRecord(data.data).ubicaciones);
          setPlaces(list);
          const typed = locality.trim().toLocaleLowerCase("es-AR");
          const typedPostal = postal.trim();
          const exactPlace = list.filter(
            (item) =>
              text(item, ["txtLocalidad"]).toLocaleLowerCase("es-AR") === typed &&
              (!typedPostal || text(item, ["codPostal"]) === typedPostal),
          );
          if (exactPlace.length === 1) choosePlace(exactPlace[0]);
          if (!data.ok) setError(humanError(data));
          else if (!list.length) setError("No apareció ninguna localidad con esos datos.");
          else setError("");
        } catch (err) {
          if (placeSearch.current === ticket) setError(err instanceof Error ? err.message : "No se pudo buscar la localidad.");
        } finally {
          if (placeSearch.current === ticket) setBusy("");
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [locality, postal]);

  useEffect(() => {
    const query = brand.trim();
    if (!place || query.length < 2) {
      setBrands([]);
      return;
    }
    const ticket = brandSearch.current + 1;
    brandSearch.current = ticket;
    const timer = setTimeout(() => {
      void (async () => {
        setBusy("autos");
        setError("");
        try {
          const data = await callSmg("vehiculos", {
            codProducto: productCode,
            codProvincia: text(place, ["codProvincia"]),
            codLocalidad: text(place, ["codLocalidad"]),
            txtModelo: query,
            anio: year,
          });
          if (brandSearch.current !== ticket) return;
          setResult(data);
          const list = asList(asRecord(asRecord(data.data).datos).marca);
          setBrands(list);
          const exact = list.filter((item) => text(item, ["descripcion"]).toLocaleUpperCase("es-AR") === query.toLocaleUpperCase("es-AR"));
          setChosenBrand((prev) => {
            if (prev) return list.find((item) => text(item, ["descripcion"]) === text(prev, ["descripcion"])) || null;
            return exact.length === 1 ? exact[0] : null;
          });
          if (!data.ok) setError(humanError(data));
          else if (!list.length) setError("No hay marcas con esas letras. Probá con FIAT, FORD o VW.");
        } catch (err) {
          if (brandSearch.current === ticket) setError(err instanceof Error ? err.message : "No se pudo buscar la marca.");
        } finally {
          if (brandSearch.current === ticket) setBusy("");
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [brand, year, productCode, place]);

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

  function chooseBrand(next: Record<string, unknown>) {
    setChosenBrand(next);
    setBrand(text(next, ["descripcion"]));
    setModelQuery("");
    setVehicle(null);
    setQuote(null);
  }

  function chooseModel(model: Record<string, unknown>) {
    if (!chosenBrand) return;
    const nextUsos = asList(model.uso);
    const uso = nextUsos.find((item) => text(item, ["codigoUso"]) === codUso) || nextUsos[0];
    if (uso) setCodUso(text(uso, ["codigoUso"]));
    setVehicle({
      codMarca: text(model, ["codigoMarca"]),
      marca: text(chosenBrand, ["descripcion"]),
      codModelo: text(model, ["codigoModelo"]),
      modelo: text(model, ["descripcion"]),
      suma: insuredSum(model, year),
      usos: nextUsos,
    });
    setModelQuery(text(model, ["descripcion"]));
    setQuote(null);
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
        marca: text(vehicle, ["marca"]),
        codModelo: text(vehicle, ["codModelo"]),
        modelo: text(vehicle, ["modelo"]),
        codUso,
        txtUso: text(usos.find((item) => text(item, ["codigoUso"]) === codUso) || {}, ["descripcion"]) || "PARTICULAR",
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
          Escribí y elegí de la lista. No hace falta saber códigos. Es una prueba: no genera una póliza real.
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
        <section className="crm-card grid gap-5 p-5">
          <Field label="Producto">
            <Pills
              options={productOptions}
              value={productCode}
              onChange={(id) => {
                setProductCode(id);
                setVehicle(null);
                setQuote(null);
              }}
            />
          </Field>
          <Field label="Año">
            <Pills
              options={YEARS.map((item) => ({ id: item, label: item }))}
              value={year}
              onChange={(id) => {
                setYear(id);
                setVehicle(null);
                setQuote(null);
              }}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="Localidad" hint={busy === "lugares" ? "Buscando localidades…" : "Aparecen opciones mientras escribís."}>
              <input
                className="crm-input"
                value={locality}
                placeholder="Salta"
                onChange={(event) => {
                  setLocality(event.target.value);
                  setPlace(null);
                  setChosenBrand(null);
                  setVehicle(null);
                  setQuote(null);
                }}
              />
            </Field>
            <Field label="Código postal">
              <input
                className="crm-input"
                value={postal}
                inputMode="numeric"
                onChange={(event) => {
                  setPostal(event.target.value);
                  setPlace(null);
                  setChosenBrand(null);
                  setVehicle(null);
                  setQuote(null);
                }}
              />
            </Field>
          </div>
          {place ? (
            <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-navy">
              {text(place, ["txtLocalidad"])}, {text(place, ["txtProvincia"])} · CP {text(place, ["codPostal"])}
            </p>
          ) : (
            <CandidateList
              items={places.slice(0, 8).map((item) => ({
                key: text(item, ["codUbicacion", "codLocalidad"]) + text(item, ["codPostal"]),
                title: `${text(item, ["txtLocalidad"])}, ${text(item, ["txtProvincia"])}`,
                detail: `CP ${text(item, ["codPostal"])}`,
                row: item,
              }))}
              onPick={(row) => choosePlace(row)}
            />
          )}
          <Field
            label="Marca"
            hint={place ? (busy === "autos" ? "Buscando marcas…" : "Escribí al menos dos letras, por ejemplo FI o VW.") : "Primero elegí la localidad."}
          >
            <input
              className="crm-input"
              value={brand}
              placeholder="FIAT"
              disabled={!place}
              onChange={(event) => {
                setBrand(event.target.value);
                setChosenBrand(null);
                setVehicle(null);
                setModelQuery("");
                setQuote(null);
              }}
            />
          </Field>
          {chosenBrand ? (
            <p className="text-sm text-navy">Marca elegida: {titleCase(text(chosenBrand, ["descripcion"]))}</p>
          ) : (
            <CandidateList
              items={brands.slice(0, 12).map((item) => ({
                key: text(item, ["descripcion"]),
                title: titleCase(text(item, ["descripcion"])),
                detail: `${asList(item.modelo).length} modelos`,
                row: item,
              }))}
              onPick={(row) => chooseBrand(row)}
            />
          )}
          {chosenBrand ? (
            <Field label="Modelo" hint="Filtrá por nombre. La suma es la de tabla para ese año.">
              <input
                className="crm-input"
                value={modelQuery}
                placeholder="Cronos, Hilux, Amarok"
                onChange={(event) => {
                  setModelQuery(event.target.value);
                  setVehicle(null);
                  setQuote(null);
                }}
              />
            </Field>
          ) : null}
          {chosenBrand && !vehicle && asList(chosenBrand.modelo).length > 12 && models.length > 12 ? (
            <p className="text-xs text-muted">Hay {asList(chosenBrand.modelo).length} modelos. Seguí escribiendo para ver el que buscás.</p>
          ) : null}
          {chosenBrand && !vehicle ? (
            <CandidateList
              items={models.slice(0, 12).map((item) => ({
                key: text(item, ["codigoModelo"]) + text(item, ["descripcion"]),
                title: titleCase(text(item, ["descripcion"])),
                detail: [text(item, ["origen"]), insuredSum(item, year)].filter(Boolean).join(" · "),
                row: item,
              }))}
              onPick={(row) => chooseModel(row)}
            />
          ) : null}
          {vehicle ? (
            <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-navy">
              {titleCase(text(vehicle, ["marca"]))} {titleCase(text(vehicle, ["modelo"]))}
              {text(vehicle, ["suma"]) ? ` · suma ${text(vehicle, ["suma"])}` : ""}
            </p>
          ) : null}
          {usos.length ? (
            <Field label="Uso">
              <Pills
                options={usos.map((item) => ({
                  id: text(item, ["codigoUso"]),
                  label: titleCase(text(item, ["descripcion"])),
                }))}
                value={codUso}
                onChange={setCodUso}
              />
            </Field>
          ) : null}
          <div>
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
                      {moneyOf(plan.importeCuota)
                        ? `${moneyOf(plan.importeCuota)} por mes`
                        : moneyOf(plan.importePremio)
                          ? `${moneyOf(plan.importePremio)} premio`
                          : "Sin precio informado"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {emit.codPlanCobertura ? (
            <div>
              <button type="button" className="crm-btn crm-btn-primary" onClick={() => setStage("cliente")}>
                Cargar el cliente
              </button>
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
              {(sexOptions.length ? sexOptions : [{ id: "F", label: "Femenino" }, { id: "M", label: "Masculino" }]).map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Documento">
            <select className="crm-input" value={emit.tipoDoc} onChange={bind("tipoDoc")}>
              {(documentOptions.length ? documentOptions : [{ id: "1", label: "Dni" }, { id: "2", label: "Cuit" }, { id: "10", label: "Cuil" }]).map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Número de documento"><input className="crm-input" value={emit.nroDoc} onChange={bind("nroDoc")} /></Field>
          <Field label="CUIT / CUIL"><input className="crm-input" value={emit.cuit} onChange={bind("cuit")} placeholder="20-00000000-0" /></Field>
          <Field label="Estado civil">
            <select className="crm-input" value={emit.estadoCivil} onChange={bind("estadoCivil")}>
              <option value="">Sin informar</option>
              {(maritalOptions.length
                ? maritalOptions
                : [
                    { id: "1", label: "Soltero" },
                    { id: "2", label: "Casado" },
                    { id: "3", label: "Viudo" },
                    { id: "4", label: "Divorciado" },
                  ]
              ).map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Condición fiscal">
            <select className="crm-input" value={emit.condicionFiscal} onChange={bind("condicionFiscal")}>
              {(fiscalOptions.length
                ? fiscalOptions
                : [
                    { id: "5", label: "Consumidor final" },
                    { id: "1", label: "Inscripto" },
                    { id: "6", label: "Monotributista" },
                    { id: "3", label: "Exento" },
                  ]
              ).map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
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
                    ? `${text(chosenPlan, ["planCobertura", "descripcion"])} · ${moneyOf(chosenPlan.importeCuota) ? `${moneyOf(chosenPlan.importeCuota)} por mes` : moneyOf(chosenPlan.importePremio) || "sin precio"}`
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
