const BASE = "https://cotizador.lacaja.com.ar/api/auto/";
const ORIGIN = "https://cotizador.lacaja.com.ar";

const PLAN_CODES = new Set([
  "921", "951", "942", "972", "642", "672", "963", "973", "964", "954", "967", "977", "969", "979",
]);

const POPULAR = ["Chevrolet", "Volkswagen", "Ford", "Renault", "Peugeot", "Fiat", "Toyota"];
const EXCLUDED = new Set([
  "MAZDA", "OPEL", "CORADIR", "JAGUAR", "ZANELLA", "LADA", "LEXUS", "PORSCHE", "GREAT WALL", "JETOUR", "FERRARI", "ROLLS ROYCE",
]);

export type CajaOption = { code: string; name: string };
export type CajaPlan = {
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

type RawItem = { codigo?: string | number; descripcion?: string };

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function asOptions(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const item = row as RawItem;
      const code = String(item.codigo ?? "").trim();
      const name = titleCase(String(item.descripcion || "").trim());
      return code && name ? { code, name } : null;
    })
    .filter((item): item is CajaOption => Boolean(item));
}

async function lacajaGet(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/seguro-auto`,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("La Caja no respondió el catálogo.");
  return response.json();
}

let brandCache: { at: number; items: CajaOption[] } | null = null;

export async function listCajaBrands() {
  if (brandCache && Date.now() - brandCache.at < 60 * 60 * 1000) return brandCache.items;
  const rows = asOptions(await lacajaGet("listas/marcas")).filter(
    (item) => !EXCLUDED.has(item.name.toUpperCase())
  );
  rows.sort((a, b) => {
    const left = POPULAR.indexOf(a.name);
    const right = POPULAR.indexOf(b.name);
    if (left !== -1 || right !== -1) {
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    }
    return a.name.localeCompare(b.name, "es");
  });
  brandCache = { at: Date.now(), items: rows };
  return rows;
}

export async function listCajaModels(code: string, year: string) {
  return asOptions(await lacajaGet(`listas/modelos?code=${encodeURIComponent(code)}&year=${encodeURIComponent(year)}`));
}

export async function listCajaVersions(code: string, year: string) {
  return asOptions(await lacajaGet(`listas/versiones?code=${encodeURIComponent(code)}&year=${encodeURIComponent(year)}`));
}

export async function listCajaLocations(postalCode: string) {
  return asOptions(await lacajaGet(`listas/localidades?codigoPostal=${encodeURIComponent(postalCode)}`));
}

export type CajaQuoteInput = {
  versionCode: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  gnc: boolean;
  locationCode: string;
  prefix: string;
  phone: string;
  email: string;
  startDate: string;
};

function pesos(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function planTitle(value: string) {
  return value.replace(/^\d+\s*-\s*/, "").trim();
}

function argentinaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function vigencia(startDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Elegí una fecha de inicio válida.");
  const start = new Date(`${startDate}T12:00:00-03:00`);
  const today = new Date(`${argentinaToday()}T12:00:00-03:00`);
  const days = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (days < 0 || days > 30) throw new Error("Elegí una fecha dentro de los 30 días.");
  const [year, month, day] = startDate.split("-");
  return `${day}/${month}/${year}`;
}

export async function quoteCajaAuto(input: CajaQuoteInput) {
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2006 || year > 2026) {
    throw new Error("El año del auto tiene que estar entre 2006 y 2026.");
  }
  if (!/^\d{3,8}$/.test(input.versionCode) || !/^\d{4,10}$/.test(input.locationCode)) {
    throw new Error("Faltan datos del auto o de la localidad.");
  }
  const prefix = input.prefix.replace(/\D/g, "");
  const phone = input.phone.replace(/\D/g, "");
  const email = input.email.trim().toLowerCase();
  if (prefix.length < 2 || prefix.length > 4 || phone.length < 6 || phone.length > 8) {
    throw new Error("Revisá el código de área y el teléfono.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Revisá el e-mail.");

  const csrf = await fetch(`${BASE}set-csrf`, {
    headers: { Origin: ORIGIN, Referer: `${ORIGIN}/seguro-auto` },
    cache: "no-store",
  });
  const pairs = csrf.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  const token = decodeURIComponent((pairs.find((pair) => pair.startsWith("CSRF-TOKEN=")) || "").slice(11));
  if (!token) throw new Error("La Caja no habilitó la cotización. Probá de nuevo.");

  const response = await fetch(`${BASE}cotizacion/cotizar-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/seguro-auto`,
      Cookie: pairs.join("; "),
      "X-XSRF-TOKEN": token,
    },
    body: JSON.stringify({
      productor: "5660",
      tipoDocumento: "",
      numeroDocumento: "",
      iva: "5",
      porcentajeAjuste: "10",
      cuotaIrregular: "N",
      modalidad: "EX0",
      patente: "",
      codigoMarca: input.versionCode,
      descMarca: input.brand.toUpperCase(),
      descModelo: input.model.toUpperCase(),
      descVersion: input.version.toUpperCase(),
      ceroKM: "N",
      gnc: input.gnc ? "501" : "N",
      fechaVigencia: vigencia(input.startDate),
      grupoAfinidad: "",
      generaCotizacion: "",
      apellido: "",
      nombres: "",
      prefijo: prefix,
      telefono: phone,
      uso: "1",
      roboContenido: "",
      accesorios: [],
      fechaNac: "",
      email,
      prefijo2: "",
      telefono2: "",
      prefijo3: "",
      telefono3: "",
      prefijo4: "",
      telefono4: "",
      chasis: "",
      motor: "",
      idBol: "",
      nombreCons: "",
      telCons: "",
      sucursal: "",
      administrador: "",
      vendedor: "",
      valorGnc: "",
      valorVeh: "",
      codInfoAuto: "",
      codigoPostal: input.locationCode,
      anio: String(year),
      winback: false,
      segmento: "",
      trafico: "",
      campania: "",
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || !Array.isArray(payload.planes)) {
    throw new Error("La Caja no pudo cotizar este auto.");
  }

  const promos = Array.isArray(payload.promo?.promociones) ? payload.promo.promociones : [];
  const plans: CajaPlan[] = [];
  for (const raw of payload.planes) {
    const code = String(raw.codigo || "");
    if (raw.esPlanAC || !PLAN_CODES.has(code) || plans.some((plan) => plan.code === code)) continue;
    const promo = promos.find(
      (item: { codPlan?: string | number; codCobro?: string }) =>
        String(item.codPlan) === code && item.codCobro === "TA"
    );
    const debit = pesos(raw.debito);
    const promoPrice = promo ? pesos(promo.premioCalculado) : 0;
    const monthly = promoPrice > 0 ? promoPrice : debit;
    plans.push({
      code,
      title: planTitle(String(raw.descripcion || raw.descripcionTipoPlan || "Plan")),
      type: String(raw.descripcionTipoPlan || ""),
      monthly,
      laterMonthly: promoPrice > 0 && promoPrice !== debit ? debit : null,
      promoMonths: promo?.cantPeriodos ? Number(promo.cantPeriodos) : null,
      promoPercent: promo?.porcBonif ? Number(promo.porcBonif) : null,
      franchise: raw.franquicia ? String(raw.franquicia) : null,
      recommended: Boolean(raw.recomendado),
    });
  }
  plans.sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.monthly - b.monthly);
  if (!plans.length) throw new Error("La Caja no tiene planes para este auto.");
  return { budget: String(payload.nroPresupuesto || ""), plans };
}
