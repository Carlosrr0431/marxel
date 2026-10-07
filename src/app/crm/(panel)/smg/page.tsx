"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type Step =
  | "conexion"
  | "productos"
  | "localidades"
  | "vehiculos"
  | "planes"
  | "ubicaciones"
  | "cotizar"
  | "recotizar"
  | "asegurado"
  | "conductos"
  | "archivos"
  | "emitir"
  | "recuperar";

const STEPS: { id: Step; label: string }[] = [
  { id: "conexion", label: "Conexión" },
  { id: "productos", label: "Productos" },
  { id: "localidades", label: "Localidades" },
  { id: "vehiculos", label: "Vehículos" },
  { id: "planes", label: "Planes" },
  { id: "ubicaciones", label: "Ubicaciones" },
  { id: "cotizar", label: "Cotizar" },
  { id: "recotizar", label: "Recotizar" },
  { id: "asegurado", label: "Asegurado" },
  { id: "conductos", label: "Conductos" },
  { id: "archivos", label: "Archivos" },
  { id: "emitir", label: "Emitir" },
  { id: "recuperar", label: "Recuperar" },
];

const PENDING = [
  {
    title: "Producción",
    detail: "Las credenciales y la URL son de QA. Emitir desde acá no genera una póliza vigente.",
  },
  {
    title: "Buscar asegurado",
    detail:
      "La colección oficial deja vacía la URL. El GET /ref/ObtenerAsegurado existe, pero responde error 500. El tomador hay que cargarlo a mano.",
  },
  {
    title: "Inspección aceptada",
    detail: "Guardar archivos está en la API, pero SMG tiene que aceptar las fotos del ítem antes de una solicitud real.",
  },
];

type Result = { ok?: boolean; status?: number; data?: unknown; error?: string };

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function labelOf(row: Record<string, unknown>) {
  return String(
    row.descripcion || row.nombre || row.txtProducto || row.txtPlanCobertura || row.modelo || row.municipio || row.txtLocalidad || "",
  );
}

function idOf(row: Record<string, unknown>) {
  return String(row.codproducto ?? row.codProducto ?? row.codigo ?? row.codmunicipio ?? row.codMunicipio ?? row.codMarca ?? row.id ?? "");
}

async function callSmg(action: string, input: Record<string, unknown> = {}) {
  const response = await fetch("/api/crm/smg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
  const data = (await response.json()) as Result;
  if (response.status === 401) throw new Error("Sesión del CRM vencida");
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

function quoteId(data: unknown) {
  const root = asRecord(data);
  const header = asRecord(root.encabezado);
  const value = header.idCotizacion ?? root.idCotizacion ?? root.idcotizacion;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function SmgPage() {
  const [step, setStep] = useState<Step>("conexion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [quote, setQuote] = useState<unknown>(null);
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [fileReady, setFileReady] = useState(false);
  const [emit, setEmit] = useState({
    nombre: "",
    apellido: "",
    cuit: "",
    nroDoc: "",
    calle: "",
    numero: "",
    cp: "",
    patente: "",
    chasis: "",
    motor: "",
    codPlanCobertura: "",
    codConducto: "",
  });

  const provinces = asList(asRecord(catalog?.parametro).provincia);
  const products = asList(catalog?.producto ?? catalog?.productos);
  const plans = asList(asRecord(asRecord(asList(asRecord(quote).riesgo)[0]?.entidad).vehiculo).planCobertura);

  const emitChecks = useMemo(
    () => [
      { label: "Cotización de QA con id", done: quoteId(quote) > 0 },
      { label: "Tomador: nombre, apellido, documento y CUIT", done: Boolean(emit.nombre && emit.apellido && emit.nroDoc && emit.cuit) },
      { label: "Domicilio: calle, número y código postal", done: Boolean(emit.calle && emit.numero && emit.cp) },
      { label: "Patente, chasis y motor", done: Boolean(emit.patente && emit.chasis && emit.motor) },
      { label: "Plan de cobertura elegido", done: Boolean(emit.codPlanCobertura) },
      { label: "Conducto de pago", done: Boolean(emit.codConducto) },
      { label: "Archivo enviado a la cotización", done: fileReady },
    ],
    [emit, fileReady, quote],
  );

  async function run(action: string, input: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const data = await callSmg(action, input);
      setResult(data);
      if (action === "productos" && data.data) setCatalog(asRecord(data.data));
      if ((action === "cotizar" || action === "recotizar") && data.ok) setQuote(data.data);
      if (action === "archivos" && data.ok) setFileReady(true);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(action: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const input = Object.fromEntries(form.entries());
      void run(action, input);
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal">QA</p>
        <h1 className="font-display text-2xl font-semibold text-navy">Swiss Medical · Autos</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Banco de pruebas del webservice. Cada paso llama a la API de QA con el código PAS 14682. La emisión queda marcada con lo que todavía falta.
        </p>
      </header>

      <div className="sc-tabs" role="tablist">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={step === item.id}
            className={`sc-tab ${step === item.id ? "is-on" : ""}`}
            onClick={() => setStep(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="crm-card px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="crm-card p-5">
          {step === "conexion" ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-navy">Login</h2>
              <p className="text-sm text-muted">Prueba el usuario de QA y guarda el token solo en el servidor.</p>
              <button type="button" className="crm-btn crm-btn-primary w-fit" disabled={busy} onClick={() => void run("login")}>
                Probar conexión
              </button>
            </div>
          ) : null}

          {step === "productos" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("productos")}>
              <h2 className="font-display text-lg font-semibold text-navy">Obtener productos</h2>
              <Field label="Código de agente">
                <input name="codAgente" defaultValue="14682" className="crm-input" />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
              {products.length ? (
                <ul className="mt-2 divide-y text-sm">
                  {products.map((row) => (
                    <li key={idOf(row) + labelOf(row)} className="py-1.5">
                      <span className="text-muted">{idOf(row)}</span> {labelOf(row)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </form>
          ) : null}

          {step === "localidades" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("municipios")}>
              <h2 className="font-display text-lg font-semibold text-navy">Municipios</h2>
              <Field label="Provincia">
                {provinces.length ? (
                  <select name="codProvincia" className="crm-input" defaultValue="">
                    <option value="">Elegir</option>
                    {provinces.map((row) => (
                      <option key={idOf(row) || labelOf(row)} value={String(row.codprovincia ?? row.codProvincia ?? row.codigo ?? "")}>
                        {labelOf(row)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name="codProvincia" className="crm-input" placeholder="Código. Cargá productos para ver la lista." />
                )}
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
            </form>
          ) : null}

          {step === "vehiculos" ? (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit("vehiculos")}>
              <h2 className="font-display text-lg font-semibold text-navy sm:col-span-2">Buscar vehículo</h2>
              <Field label="Texto del modelo">
                <input name="txtModelo" className="crm-input" placeholder="FIAT" required />
              </Field>
              <Field label="Año">
                <input name="anio" className="crm-input" inputMode="numeric" required />
              </Field>
              <Field label="Producto">
                <input name="codProducto" className="crm-input" inputMode="numeric" required />
              </Field>
              <Field label="Provincia">
                <input name="codProvincia" className="crm-input" inputMode="numeric" required />
              </Field>
              <Field label="Localidad">
                <input name="codLocalidad" className="crm-input" inputMode="numeric" required />
              </Field>
              <div className="sm:col-span-2">
                <button className="crm-btn crm-btn-primary" disabled={busy}>Buscar</button>
              </div>
            </form>
          ) : null}

          {step === "planes" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("planes")}>
              <h2 className="font-display text-lg font-semibold text-navy">Planes de cobertura</h2>
              <Field label="Filtro">
                <input name="txtPlanCobertura" className="crm-input" placeholder="Vacío para traer todos" />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
            </form>
          ) : null}

          {step === "ubicaciones" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("ubicaciones")}>
              <h2 className="font-display text-lg font-semibold text-navy">Ubicaciones</h2>
              <Field label="Localidad">
                <input name="txtLocalidad" className="crm-input" placeholder="Salta" />
              </Field>
              <Field label="Código postal">
                <input name="codPostal" className="crm-input" inputMode="numeric" placeholder="4400" />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
            </form>
          ) : null}

          {step === "cotizar" ? (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit("cotizar")}>
              <h2 className="font-display text-lg font-semibold text-navy sm:col-span-2">Cotizar</h2>
              <Field label="Producto"><input name="codProducto" className="crm-input" required /></Field>
              <Field label="Provincia"><input name="codProvincia" className="crm-input" required /></Field>
              <Field label="Municipio"><input name="codMunicipio" className="crm-input" required /></Field>
              <Field label="Año"><input name="anio" className="crm-input" required /></Field>
              <Field label="Cód. marca"><input name="codMarca" className="crm-input" required /></Field>
              <Field label="Marca"><input name="marca" className="crm-input" required /></Field>
              <Field label="Cód. modelo"><input name="codModelo" className="crm-input" required /></Field>
              <Field label="Modelo"><input name="modelo" className="crm-input" required /></Field>
              <Field label="Uso"><input name="txtUso" defaultValue="PARTICULAR" className="crm-input" /></Field>
              <Field label="Tipo de plan"><input name="tipoPlan" defaultValue="ALL" className="crm-input" /></Field>
              <div className="sm:col-span-2">
                <button className="crm-btn crm-btn-primary" disabled={busy}>Cotizar en QA</button>
              </div>
            </form>
          ) : null}

          {step === "recotizar" ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-navy">Recotizar</h2>
              <p className="text-sm text-muted">
                Reenvía la última cotización al mismo endpoint. {quoteId(quote) ? `Id ${quoteId(quote)}.` : "Primero cotizá."}
              </p>
              <button
                type="button"
                className="crm-btn crm-btn-primary w-fit"
                disabled={busy || !quote}
                onClick={() => void run("recotizar", { quote })}
              >
                Recotizar
              </button>
            </div>
          ) : null}

          {step === "asegurado" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("asegurado")}>
              <h2 className="font-display text-lg font-semibold text-navy">Obtener asegurado</h2>
              <p className="text-sm text-muted">Este paso está en la documentación, pero la colección no trae la URL ni los parámetros. La prueba usa el GET que responde la API.</p>
              <Field label="Tipo de documento">
                <input name="tipoDoc" defaultValue="96" className="crm-input" />
              </Field>
              <Field label="Número">
                <input name="nroDoc" className="crm-input" required />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
            </form>
          ) : null}

          {step === "conductos" ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit("conductos")}>
              <h2 className="font-display text-lg font-semibold text-navy">Conductos del asegurado</h2>
              <Field label="Código de asegurado">
                <input name="codAseg" className="crm-input" required />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Consultar</button>
            </form>
          ) : null}

          {step === "archivos" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const file = form.get("archivo");
                if (!(file instanceof File) || !file.size) {
                  setError("Elegí un archivo");
                  return;
                }
                if (file.size > 900_000) {
                  setError("El archivo tiene que pesar menos de 900 KB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const raw = String(reader.result || "");
                  const datosBase64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
                  void run("archivos", {
                    idCotizacion: String(form.get("idCotizacion") || ""),
                    nombre: file.name,
                    datosBase64,
                  });
                };
                reader.readAsDataURL(file);
              }}
            >
              <h2 className="font-display text-lg font-semibold text-navy">Guardar archivos</h2>
              <Field label="Id de cotización">
                <input name="idCotizacion" defaultValue={quoteId(quote) || ""} className="crm-input" required />
              </Field>
              <Field label="Archivo">
                <input name="archivo" type="file" className="crm-input" required />
              </Field>
              <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Enviar</button>
            </form>
          ) : null}

          {step === "emitir" ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const input = Object.fromEntries(new FormData(event.currentTarget).entries());
                setEmit({
                  nombre: String(input.nombre || ""),
                  apellido: String(input.apellido || ""),
                  cuit: String(input.cuit || ""),
                  nroDoc: String(input.nroDoc || ""),
                  calle: String(input.calle || ""),
                  numero: String(input.numero || ""),
                  cp: String(input.cp || ""),
                  patente: String(input.patente || ""),
                  chasis: String(input.chasis || ""),
                  motor: String(input.motor || ""),
                  codPlanCobertura: String(input.codPlanCobertura || ""),
                  codConducto: String(input.codConducto || ""),
                });
                void run("emitir", { ...input, quote });
              }}
            >
              <h2 className="font-display text-lg font-semibold text-navy sm:col-span-2">Probar emisión en QA</h2>
              <Field label="Nombre"><input name="nombre" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, nombre: event.target.value }))} /></Field>
              <Field label="Apellido"><input name="apellido" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, apellido: event.target.value }))} /></Field>
              <Field label="CUIT"><input name="cuit" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, cuit: event.target.value }))} /></Field>
              <Field label="Documento"><input name="nroDoc" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, nroDoc: event.target.value }))} /></Field>
              <Field label="Calle"><input name="calle" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, calle: event.target.value }))} /></Field>
              <Field label="Número"><input name="numero" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, numero: event.target.value }))} /></Field>
              <Field label="Código postal"><input name="cp" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, cp: event.target.value }))} /></Field>
              <Field label="Plan"><input name="codPlanCobertura" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, codPlanCobertura: event.target.value }))} /></Field>
              <Field label="Patente"><input name="patente" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, patente: event.target.value }))} /></Field>
              <Field label="Chasis"><input name="chasis" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, chasis: event.target.value }))} /></Field>
              <Field label="Motor"><input name="motor" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, motor: event.target.value }))} /></Field>
              <Field label="Conducto"><input name="codConducto" className="crm-input" onChange={(event) => setEmit((prev) => ({ ...prev, codConducto: event.target.value }))} /></Field>
              <div className="sm:col-span-2">
                <button className="crm-btn crm-btn-primary" disabled={busy || !quote}>Enviar emisión de prueba</button>
              </div>
              {plans.length ? (
                <ul className="text-sm sm:col-span-2">
                  {plans.map((plan) => (
                    <li key={String(plan.codPlanCobertura)}>
                      {String(plan.codPlanCobertura)} · {String(plan.planCobertura || plan.descripcion || "")} · premio {String(plan.importePremio ?? "—")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </form>
          ) : null}

          {step === "recuperar" ? (
            <div className="flex flex-col gap-6">
              <form className="flex flex-col gap-3" onSubmit={onSubmit("solicitud")}>
                <h2 className="font-display text-lg font-semibold text-navy">Recuperar solicitud</h2>
                <Field label="Número de solicitud">
                  <input name="nroSolicitud" className="crm-input" required />
                </Field>
                <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Recuperar</button>
              </form>
              <form className="flex flex-col gap-3" onSubmit={onSubmit("certificado")}>
                <h2 className="font-display text-lg font-semibold text-navy">Certificado de cobertura</h2>
                <Field label="Número de solicitud">
                  <input name="nroSolicitud" className="crm-input" required />
                </Field>
                <button className="crm-btn crm-btn-primary w-fit" disabled={busy}>Recuperar</button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          {step === "emitir" ? (
            <div className="crm-card p-5">
              <h2 className="font-display text-lg font-semibold text-navy">Qué falta para emitir</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {emitChecks.map((item) => (
                  <li key={item.label} className={item.done ? "text-navy" : "text-muted"}>
                    {item.done ? "Listo" : "Falta"} · {item.label}
                  </li>
                ))}
              </ul>
              <ul className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm">
                {PENDING.map((item) => (
                  <li key={item.title}>
                    <p className="font-medium text-navy">Pendiente · {item.title}</p>
                    <p className="text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Respuesta</h2>
            <p className="mt-1 text-xs text-muted">
              {result?.status ? `HTTP ${result.status}` : "Todavía no hay una llamada"}
              {busy ? " · consultando…" : ""}
            </p>
            <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap text-xs text-navy">
              {result ? JSON.stringify(result.data ?? result, null, 2) : "Ejecutá un paso para ver el JSON."}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
