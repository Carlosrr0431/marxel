const RAMO_AUTOS = 4;
const DEFAULT_AGENT = 14682;

type CachedToken = { value: string; exp: number };

let cached: CachedToken | null = null;

export type SmgResult = { status: number; data: unknown };

export function smgConfigured() {
  return Boolean(process.env.SMG_API_KEY && process.env.SMG_API_USERNAME && process.env.SMG_API_PASSWORD);
}

export function smgAgentCode() {
  const parsed = Number(process.env.SMG_COD_AGENTE || DEFAULT_AGENT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AGENT;
}

function baseUrl() {
  return (process.env.SMG_API_BASE || "https://mobile.swissmedical.com.ar/cl/api-smg").replace(/\/$/, "");
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function tokenExpiry(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now() + 10 * 60 * 1000;
}

function loginError(detail: string) {
  if (/id_canal/i.test(detail)) {
    return "Swiss Medical no tiene habilitado el canal de esta API. Hay que pedirles que activen el acceso de MARXEN para cotizar.";
  }
  if (/error inesperado/i.test(detail)) {
    return "Swiss Medical rechazó el login en el ambiente de pruebas. El usuario es el de Oficina Virtual, pero el servicio de pruebas responde con un error interno.";
  }
  return detail || "Swiss Medical rechazó el login";
}

async function login() {
  if (!smgConfigured()) {
    throw new Error("Faltan SMG_API_KEY, SMG_API_USERNAME y SMG_API_PASSWORD");
  }
  if (cached && cached.exp > Date.now() + 30_000) return cached.value;

  const response = await fetch(`${baseUrl()}/v0/auth-login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: process.env.SMG_API_KEY,
      username: process.env.SMG_API_USERNAME,
      password: process.env.SMG_API_PASSWORD,
      device: {
        bloqueado: true,
        recordar: true,
        deviceid: "mobile-seguros-device-id",
        messagingid: "EsteEsElIDDeMensajeria",
        devicename: "Juauei 0.8 Mate",
      },
    }),
  });
  const data = asRecord(parseJson(await response.text()));
  const nested = asRecord(data.data);
  const token = typeof data.token === "string" ? data.token : "";
  if (!response.ok || !token) {
    const detail = String(nested.errMessage || data.message || "").trim();
    throw new Error(loginError(detail));
  }
  cached = { value: token, exp: tokenExpiry(data.exp) };
  return token;
}

export async function smgLoginInfo() {
  await login();
  return {
    ambiente: /mobileqa/i.test(baseUrl()) ? "QA" : "produccion",
    base: baseUrl(),
    usuario: process.env.SMG_API_USERNAME,
    codAgente: smgAgentCode(),
    token: true,
    expira: cached ? new Date(cached.exp).toISOString() : null,
  };
}

async function smgRequest(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string | number> },
  retry = true,
): Promise<SmgResult> {
  const token = await login();
  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== "" && value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 401 && retry) {
    cached = null;
    return smgRequest(path, options, false);
  }
  return { status: response.status, data: parseJson(await response.text()) };
}

export function smgProductos(codAgente = smgAgentCode()) {
  return smgRequest("/V1/ov/SegurosV3/op/ObtenerProducto", {
    body: { codRamo: RAMO_AUTOS, codAgente },
  });
}

export function smgMunicipios(codprovincia: number) {
  return smgRequest("/V1/ov/SegurosV3/ref/ObtenerMunicipios", {
    method: "GET",
    query: { codprovincia },
  });
}

export function smgVehiculos(input: {
  codAgente?: number;
  codProducto: number;
  codProvincia: number;
  codLocalidad: number;
  txtModelo: string;
  anio: number;
}) {
  return smgRequest("/V1/ov/SegurosV3/op/ObtenerVehiculo", {
    body: {
      codRamo: RAMO_AUTOS,
      codAgente: input.codAgente || smgAgentCode(),
      codProducto: input.codProducto,
      codProvincia: input.codProvincia,
      codLocalidad: input.codLocalidad,
      txtModelo: input.txtModelo,
      anio: input.anio,
    },
  });
}

export function smgUbicaciones(input: { txtLocalidad?: string; codPostal?: number }) {
  return smgRequest("/V1/ov/SegurosV3/parametros/Ubicaciones", {
    body: { txtLocalidad: input.txtLocalidad || "", codPostal: input.codPostal || 0 },
  });
}

export function smgPlanes(txtPlanCobertura = "") {
  return smgRequest("/V1/ov/SegurosV3/parametros/PlanesCobertura", {
    body: { codRamo: RAMO_AUTOS, txtPlanCobertura },
  });
}

export function smgAsegurado(query: Record<string, string>) {
  return smgRequest("/V1/ov/SegurosV3/ref/ObtenerAsegurado", { method: "GET", query });
}

export function smgConductos(codAseg: string) {
  return smgRequest("/V1/ov/SegurosV3/ref/ObtenerConductosAseg", {
    method: "GET",
    query: { codAseg },
  });
}

export function smgCotizar(body: unknown) {
  return smgRequest("/V1/ov/SegurosV3/op/Cotizar", { body });
}

export function smgArchivos(input: { idCotizacion: number; nombre: string; datosBase64: string }) {
  return smgRequest("/V1/ov/SegurosV3/op/Cotizacion/Archivos", {
    body: {
      codRamo: RAMO_AUTOS,
      idCotizacion: input.idCotizacion,
      archivoItem: [
        {
          idItem: 1,
          archivo: [{ txtNombre: input.nombre, datosBase64: input.datosBase64 }],
        },
      ],
    },
  });
}

export function smgRecuperarSolicitud(nroSolicitud: number) {
  return smgRequest("/V1/ov/SegurosV3/operaciones/RecuperarSolicitud", {
    body: { codRamo: RAMO_AUTOS, nroSolicitud },
  });
}

export function smgCertificado(nroSolicitud: number) {
  return smgRequest("/V1/ov/SegurosV3/op/RecuperarCertificadoCobertura", {
    body: { codRamo: RAMO_AUTOS, nroSolicitud },
  });
}

function numberOf(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildQuoteBody(input: Record<string, unknown>, emitir = false) {
  const desde = String(input.vigenciaDesde || new Date().toISOString());
  const hastaDate = new Date(desde);
  hastaDate.setFullYear(hastaDate.getFullYear() + 1);
  const hasta = String(input.vigenciaHasta || hastaDate.toISOString());
  return {
    encabezado: {
      accion: { codaccion: "NN", nombre: "NUEVO NEGOCIO" },
      emitir,
      codagente: numberOf(input.codAgente, smgAgentCode()),
      fechavigdesde: desde,
      fechavighasta: hasta,
      codproducto: numberOf(input.codProducto),
      codvigencia: 1,
      // 6 = refacturación mensual. El 3 de la guía es cuatrimestral y pone en importeCuota el premio de 4 meses.
      codperiodo: numberOf(input.codPeriodo, 6),
      codmoneda: 0,
      txtReferencia: String(input.referencia || ""),
      txtObservaciones: String(input.observaciones || ""),
      idCotizacion: numberOf(input.idCotizacion),
      codramo: RAMO_AUTOS,
      codAjustePrima: numberOf(input.codAjustePrima, 16),
    },
    planDePago: {
      // 30 + cuota 129 = cobranza en convenio, un pago del mes, sin interés.
      codplandepago: numberOf(input.codPlanPago, 30),
      codconducto: numberOf(input.codConducto),
      nroctatarj: String(input.nroTarjeta || ""),
      codcuota: numberOf(input.codCuota, 129),
      codmoneda: 0,
    },
    riesgo: [
      {
        aseguradoigualtomador: true,
        beneficiarioigualtomador: true,
        beneficiarioigualasegurado: true,
        codEstadoItem: 1,
        direccion: {
          codpais: 1,
          codprovincia: numberOf(input.codProvincia),
          codmunicipio: numberOf(input.codMunicipio),
        },
        entidad: {
          vehiculo: {
            codMarca: numberOf(input.codMarca),
            marca: String(input.marca || ""),
            codModelo: numberOf(input.codModelo),
            modelo: String(input.modelo || ""),
            anio: numberOf(input.anio),
            codUso: numberOf(input.codUso, 1),
            txtUso: String(input.txtUso || "PARTICULAR"),
            codClausulaAjuste: numberOf(input.codClausulaAjuste, 1),
            codTipoRecuperador: 0,
            codRecuperador: 0,
            sn0Km: Boolean(input.ceroKm),
            snAuxilioMecanico: true,
            codAjustePrima: numberOf(input.codAjustePrima, 16),
            txtTipoPlanCobertura: String(input.tipoPlan || "ALL"),
            txtPatente: String(input.patente || ""),
            txtChasis: String(input.chasis || ""),
            txtMotor: String(input.motor || ""),
            codPlanCobertura: numberOf(input.codPlanCobertura),
            accesorio: [],
          },
        },
      },
    ],
  };
}

export function withEmission(quote: unknown, extras: Record<string, unknown>) {
  const source = asRecord(quote);
  const next = structuredClone(source.encabezado ? source : asRecord(source.data));
  const header = asRecord(next.encabezado);
  header.emitir = true;
  next.encabezado = header;
  const payment = asRecord(next.planDePago);
  if (extras.codConducto) payment.codconducto = numberOf(extras.codConducto);
  if (extras.nroTarjeta) payment.nroctatarj = String(extras.nroTarjeta);
  next.planDePago = payment;
  next.tomador = {
    nombre: String(extras.nombre || ""),
    apellido1: String(extras.apellido || ""),
    apellido2: String(extras.apellido2 || ""),
    cuitcuil: String(extras.cuit || ""),
    fecnac: /^\d{4}-\d{2}-\d{2}$/.test(String(extras.fecnac || ""))
      ? `${extras.fecnac}T12:00:00-03:00`
      : String(extras.fecnac || ""),
    codsexo: String(extras.sexo || ""),
    nacionalidad: 1,
    codtipopersona: "F",
    codtipodocumento: numberOf(extras.tipoDoc, 96),
    nrodoc: String(extras.nroDoc || ""),
    nrodocbusqueda: String(extras.nroDoc || ""),
    codestadocivil: numberOf(extras.estadoCivil),
    codcondicionfiscal: numberOf(extras.condicionFiscal, 1),
    personaexpuestapoliticamente: false,
    sujetoobligado: false,
    leyfatca: false,
    ningunadelasanteriores: true,
    direccion: [
      {
        codpais: 1,
        codprovincia: numberOf(extras.codProvincia),
        codmunicipio: numberOf(extras.codMunicipio),
        calle: String(extras.calle || ""),
        numero: String(extras.numero || ""),
        piso: String(extras.piso || ""),
        depto: String(extras.depto || ""),
        codpostal: String(extras.cp || ""),
        codtipodireccion: 1,
      },
    ],
    contacto: [
      { codtipocontacto: 1, valor: String(extras.email || "") },
      { codtipocontacto: 4, valor: String(extras.telefono || "") },
    ].filter((item) => item.valor),
  };
  const riesgos = Array.isArray(next.riesgo) ? next.riesgo : [];
  const riesgo = asRecord(riesgos[0]);
  const entidad = asRecord(riesgo.entidad);
  const vehiculo = asRecord(entidad.vehiculo);
  if (extras.patente) vehiculo.txtPatente = String(extras.patente);
  if (extras.chasis) vehiculo.txtChasis = String(extras.chasis);
  if (extras.motor) vehiculo.txtMotor = String(extras.motor);
  if (extras.codPlanCobertura) vehiculo.codPlanCobertura = numberOf(extras.codPlanCobertura);
  entidad.vehiculo = vehiculo;
  riesgo.entidad = entidad;
  if (riesgos.length) riesgos[0] = riesgo;
  next.riesgo = riesgos;
  return next;
}
