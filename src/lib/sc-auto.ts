import { classifyArPlate, normalizeArPlate } from "@/lib/ar-plate";
import { fetchClasificVehicle, type ClasificVehicle } from "@/lib/clasific";

const SC_API = "https://api.sancristobal.com.ar/marketing-marketing/api";
const PRODUCER_URL = "marxen-seguros";
const CARD_DISCOUNT = -7;

const PLANS = [
  {
    key: "A",
    codes: ["CA7_A", "A", "Estandard", "Base"],
    title: "Terceros Básico",
    description: "Responsabilidad Civil no incluye Grúa.",
    mostChosen: false,
    franchise: false,
  },
  {
    key: "CM",
    codes: ["CA7_CM", "CM", "Mas"],
    title: "Terceros Completo",
    description:
      "Seguro contra terceros completo, además te cubre granizo, cerradura, cristales y ruedas.",
    mostChosen: true,
    franchise: false,
  },
  {
    key: "D",
    codes: ["CA7_D", "D", "Full"],
    title: "Todo Riesgo con franquicia",
    description: "Todo riesgo. Cubrimos los daños parciales superiores a la franquicia que elijas.",
    mostChosen: false,
    franchise: true,
  },
] as const;

export class AutoQuoteError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export type AutoCatalogItem = { id: number; description: string };

export type AutoVersion = {
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

export type AutoLocation = {
  locationId: number;
  description: string;
  state?: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};

export type AutoPlan = {
  key: string;
  title: string;
  description: string;
  mostChosen: boolean;
  monthly: number;
  original: number | null;
  discount: number;
  quoteId: number;
};

export type AutoQuoteResult = {
  opportunityId?: number;
  statedAmount: number;
  carDescription: string;
  appliedDiscount: number;
  plans: AutoPlan[];
};

export type QuoteAutoInput = {
  year: number;
  is0km: boolean;
  brand: AutoCatalogItem;
  model: AutoCatalogItem;
  version: AutoVersion;
  location: AutoLocation;
  nombre: string;
  celular: string;
  email?: string;
  age?: number;
  hasGnc?: boolean;
  hasTracker?: boolean;
  licensePlate?: string;
  source?: "web" | "chat";
};

export type AutoPerson = {
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  taxStatuses?: unknown[];
};

export type RegisterAutoQuoteInput = {
  opportunityId: number;
  quoteId: number;
  dni: string;
  nombre: string;
  email: string;
  celular: string;
  age: number;
  gender?: string;
  location: AutoLocation;
  is0km: boolean;
  licensePlate?: string;
  vin?: string;
  engineNumber?: string;
};

type QuoteRow = {
  id?: number;
  monthlyCost: number;
  product?: { code?: string; franchiseType?: string | null; franchiseValue?: number | null };
};

type ProducerCache = {
  at: number;
  cuit: string;
  code: string;
  isCampaignEnabled: boolean;
  commercialAlternative: number;
  affinityGroupId: number | null;
};

let producerCache: ProducerCache | null = null;

async function scGet(path: string, revalidate: number | false = 3600) {
  const res = await fetch(
    `${SC_API}${path}`,
    revalidate === false ? { cache: "no-store" } : { next: { revalidate } }
  );
  if (!res.ok) throw new AutoQuoteError("No se pudo consultar San Cristóbal", 502);
  return res.json();
}

async function scPost(path: string, body: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders || {}),
  };

  const res = await fetch(`${SC_API}${path}`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const rec = data as { error?: string[]; title?: string; detail?: string; message?: string } | null;
    const raw = rec?.error?.[0] || rec?.detail || rec?.message || rec?.title || `San Cristóbal ${res.status}`;
    const message =
      res.status === 401 || /unauthorized/i.test(raw)
        ? "San Cristóbal rechazó la autenticación. Revisá el DNI e intentá de nuevo."
        : raw;
    throw new AutoQuoteError(
      message,
      res.status === 401 ? 401 : res.status >= 400 && res.status < 500 ? 400 : 502
    );
  }
  return data;
}

function normalizeGender(value: string) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (raw.startsWith("f") || raw.includes("femen") || raw.includes("mujer") || raw === "female") {
    return "F";
  }
  return "M";
}

function splitName(nombre: string) {
  const parts = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function birthFromAge(age: number) {
  const year = new Date().getFullYear() - Math.max(18, Math.min(99, Math.round(age) || 35));
  return new Date(year, 0, 1).toISOString();
}

function firstContact(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    if (Array.isArray(row.contacts) && row.contacts[0]) {
      return row.contacts[0] as Record<string, unknown>;
    }
    if (row.firstName || row.lastName) return row;
    return null;
  }
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec.contacts) && rec.contacts[0]) {
      return rec.contacts[0] as Record<string, unknown>;
    }
  }
  return null;
}

function producerCode(branchOffice: number, number: number) {
  return `${String(branchOffice).padStart(2, "0")}-${String(number).padStart(6, "0")}`;
}

function asCampaignList(data: unknown) {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object" && Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: Record<string, unknown>[] }).value;
  }
  return [];
}

function asArray(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(rec[key])) return rec[key] as unknown[];
    }
  }
  return [];
}

async function getProducer() {
  const now = Date.now();
  if (producerCache && now - producerCache.at < 60 * 60 * 1000) return producerCache;

  const producer = await scGet(`/Microsites/MyDataByUrl/${PRODUCER_URL}`);
  const campaigns = asCampaignList(
    await scGet(`/DigitalCampaign/CurrentCampaignByCuit/${producer.cuit}`)
  );
  const auto = campaigns.find((c) => {
    const branch = c.branch as { name?: string } | undefined;
    return branch?.name === "Automotor" && Number(c.digitalCampaignId) > 0;
  });
  const campaignAlt = auto ? Number(auto.commercialAlternative) : 0;
  const commercialAlternative =
    auto && campaignAlt !== 0 ? campaignAlt : Number(producer.commercialAlternative) || 0;

  producerCache = {
    at: now,
    cuit: String(producer.cuit),
    code: producerCode(Number(producer.branchOffice), Number(producer.number)),
    isCampaignEnabled: Boolean(producer.isCampaignEnabled),
    commercialAlternative,
    affinityGroupId: auto?.affinityGroupId != null ? Number(auto.affinityGroupId) : null,
  };
  return producerCache;
}

function appliedDiscountPct(commercialAlternative: number) {
  if (commercialAlternative >= 0) return 0;
  return Math.round(100 * (1 - (1 + CARD_DISCOUNT / 100) * (1 + commercialAlternative / 100)));
}

function originalPrice(monthly: number, commercialAlternative: number) {
  if (commercialAlternative >= 0) return monthly;
  const factor = 1 + commercialAlternative / 100;
  return Math.round(monthly / factor);
}

function pickQuote(quotes: QuoteRow[], codes: readonly string[], franchise: boolean) {
  const matched = quotes.filter((q) => codes.includes(String(q.product?.code || "")));
  const pool = franchise
    ? matched
        .filter((q) => q.product?.franchiseType === "amount")
        .concat(matched.filter((q) => q.product?.franchiseType !== "amount"))
    : matched;
  if (pool.length === 0) return null;
  if (!franchise) return pool[0];
  const amount = pool.filter((q) => q.product?.franchiseType === "amount");
  const list = amount.length > 0 ? amount : pool;
  return list.reduce((best, q) => (q.monthlyCost < best.monthlyCost ? q : best));
}

function statedAmount(year: number, is0km: boolean, version: AutoVersion) {
  const current = new Date().getFullYear();
  const used = Number(version.used0KmPrice) || 0;
  const stated = Number(version.statedAmount) || 0;
  if (year === current) {
    if (is0km || used === 0) return stated;
    return used;
  }
  return stated;
}

export function parseArPhone(raw: string) {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length >= 10) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("11") && d.length >= 8) {
    return { area: 11, number: Number(d.slice(2)) };
  }
  if (d.length >= 10) {
    return { area: Number(d.slice(0, 3)), number: Number(d.slice(3)) };
  }
  if (d.length >= 7) {
    return { area: 387, number: Number(d) };
  }
  return null;
}

export async function fetchAutoCatalog(params: {
  kind: string | null;
  year: string;
  brandId: string;
  modelId: string;
  postalCode: string;
}): Promise<unknown> {
  const { kind, year, brandId, modelId, postalCode } = params;
  let target = "";
  let revalidate: number | false = 3600;

  if (kind === "brands" && year) {
    target = `/InfoAuto/brands-highlight-by-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A`;
  } else if (kind === "models" && year && brandId) {
    target = `/InfoAuto/model-by-brand-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A&brandId=${encodeURIComponent(brandId)}`;
  } else if (kind === "versions" && year && brandId && modelId) {
    const query = new URLSearchParams({
      year,
      brandId,
      modelId,
      portalCategory: "A",
    });
    target = `/InfoAuto/versions-by-brand-model-year-and-portal-category?${query}`;
  } else if (kind === "location" && postalCode) {
    target = `/location?criteria=${encodeURIComponent(postalCode)}`;
    revalidate = false;
  } else {
    throw new AutoQuoteError("Parámetros inválidos", 400);
  }

  return scGet(target, revalidate);
}

function asCatalogItems(data: unknown, keys: string[]): AutoCatalogItem[] {
  return asArray(data, keys)
    .map((row) => {
      const rec = row as Record<string, unknown>;
      return {
        id: Number(rec.id),
        description: String(rec.description || rec.name || "").trim(),
      };
    })
    .filter((item) => item.id && item.description);
}

export async function listAutoBrands(year: number): Promise<AutoCatalogItem[]> {
  const data = await fetchAutoCatalog({
    kind: "brands",
    year: String(year),
    brandId: "",
    modelId: "",
    postalCode: "",
  });
  return asCatalogItems(data, ["brands", "value"]);
}

export async function listAutoModels(year: number, brandId: number): Promise<AutoCatalogItem[]> {
  const data = await fetchAutoCatalog({
    kind: "models",
    year: String(year),
    brandId: String(brandId),
    modelId: "",
    postalCode: "",
  });
  return sortCatalog(asCatalogItems(data, ["models", "value"]));
}

export async function listAutoVersions(
  year: number,
  brandId: number,
  modelId: number
): Promise<AutoVersion[]> {
  const data = await fetchAutoCatalog({
    kind: "versions",
    year: String(year),
    brandId: String(brandId),
    modelId: String(modelId),
    postalCode: "",
  });
  return sortVersions(
    asArray(data, ["versions", "value"])
      .map((row) => row as AutoVersion)
      .filter((item) => Number(item?.id) > 0)
  );
}

export type PlateLookupResult = {
  plate: string;
  kind: "auto" | "moto";
  found: boolean;
  description?: string;
  year?: number;
  brand?: AutoCatalogItem;
  model?: AutoCatalogItem;
  version?: AutoVersion;
  brands?: AutoCatalogItem[];
  models?: AutoCatalogItem[];
  versions?: AutoVersion[];
  message?: string;
  alert?: "ok" | "info" | "error";
};

function foldKey(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function catalogTokens(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9.]+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length >= 2)
    .map((token) => foldKey(token))
    .filter(Boolean);
}

function sortCatalog(items: AutoCatalogItem[]): AutoCatalogItem[] {
  return [...items].sort((a, b) =>
    a.description.localeCompare(b.description, "es", { numeric: true })
  );
}

function sortVersions(items: AutoVersion[]): AutoVersion[] {
  return [...items].sort((a, b) =>
    String(a.description || "").localeCompare(String(b.description || ""), "es", { numeric: true })
  );
}

function versionHaystack(version: AutoVersion) {
  return foldKey(`${version.description} ${version.fullCarDescripcion || ""}`);
}

function versionLabel(version: AutoVersion) {
  return `${version.description} ${version.fullCarDescripcion || ""}`;
}

function parseEngineSize(text: string) {
  const match = String(text || "").match(/\b(\d[.,]\d)\b/);
  return match ? match[1].replace(",", ".") : null;
}

function versionHasEngine(version: AutoVersion, engine: string) {
  const [major, minor] = engine.split(".");
  if (!major || !minor) return false;
  return new RegExp(`(?:^|[^0-9])${major}[.,]${minor}(?=[^0-9]|$)`).test(versionLabel(version));
}

const EXCLUSIVE_TRIMS = new Set([
  "country",
  "gti",
  "tsi",
  "gld",
  "gls",
  "gli",
  "gtd",
  "high",
  "move",
  "take",
  "cross",
  "power",
  "trend",
  "comfortline",
  "highline",
  "track",
  "motion",
  "imotion",
  "mpi",
  "msi",
]);

function matchScore(candidate: string, query: string) {
  const a = foldKey(candidate);
  const b = foldKey(query);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.startsWith(a) || a.startsWith(b)) return 90;
  if (b.includes(a) || a.includes(b)) return 75;
  return 0;
}

function pickBest<T>(items: T[], query: string, label: (item: T) => string): T | null {
  let best: T | null = null;
  let bestScore = 0;
  let bestLen = 0;
  for (const item of items) {
    const name = label(item);
    const score = matchScore(name, query);
    const len = foldKey(name).length;
    if (score > bestScore || (score === bestScore && score > 0 && len > bestLen)) {
      best = item;
      bestScore = score;
      bestLen = len;
    }
  }
  return bestScore >= 75 ? best : null;
}

function pickModel(
  models: AutoCatalogItem[],
  clasificModel: string,
  make: string
): AutoCatalogItem | null {
  const tokens = catalogTokens(clasificModel);
  for (const token of tokens) {
    const hit = models.find((item) => foldKey(item.description) === token);
    if (hit) return hit;
  }
  return (
    pickBest(models, clasificModel, (item) => item.description) ||
    pickBest(models, `${make} ${clasificModel}`, (item) => item.description)
  );
}

function distinctiveHints(vehicle: ClasificVehicle, brand: AutoCatalogItem, model: AutoCatalogItem) {
  const ignore = new Set([
    ...catalogTokens(vehicle.make),
    ...catalogTokens(brand.description),
    ...catalogTokens(model.description),
    foldKey(String(vehicle.year)),
  ]);
  return catalogTokens(vehicle.model).filter((token) => {
    if (ignore.has(token)) return false;
    if (/^\d{3,}$/.test(token)) return false;
    return true;
  });
}

function filterVersionsForVehicle(
  versions: AutoVersion[],
  vehicle: ClasificVehicle,
  brand: AutoCatalogItem,
  model: AutoCatalogItem
): AutoVersion[] {
  if (!versions.length) return versions;

  const engine = parseEngineSize(`${vehicle.make} ${vehicle.model}`);
  let pool = versions;
  if (engine) {
    const byEngine = versions.filter((item) => versionHasEngine(item, engine));
    if (byEngine.length) pool = byEngine;
  }

  const hints = distinctiveHints(vehicle, brand, model);
  const letterHints = hints.filter((token) => /[a-z]/.test(token));
  const useful = letterHints.filter((token) =>
    pool.some((item) => versionHaystack(item).includes(token))
  );

  if (useful.length) {
    const byHints = pool.filter((item) =>
      useful.every((token) => versionHaystack(item).includes(token))
    );
    if (byHints.length) pool = byHints;
  }

  const queryFold = foldKey(vehicle.model);
  const tightened = pool.filter((item) => {
    const extras = catalogTokens(`${item.description} ${item.fullCarDescripcion || ""}`).filter(
      (token) => EXCLUSIVE_TRIMS.has(token)
    );
    return extras.every((token) => queryFold.includes(token));
  });
  if (tightened.length) pool = tightened;

  const queryTokens = catalogTokens(vehicle.model);
  return [...pool].sort((a, b) => {
    const scoreA = queryTokens.reduce(
      (sum, token) => sum + (versionHaystack(a).includes(token) ? 1 : 0),
      0
    );
    const scoreB = queryTokens.reduce(
      (sum, token) => sum + (versionHaystack(b).includes(token) ? 1 : 0),
      0
    );
    if (scoreB !== scoreA) return scoreB - scoreA;
    return String(a.description || "").localeCompare(String(b.description || ""), "es", {
      numeric: true,
    });
  });
}

export async function lookupAutoByPlate(rawPlate: string): Promise<PlateLookupResult> {
  const plate = normalizeArPlate(rawPlate);
  const kind = classifyArPlate(plate);
  if (kind !== "auto" && kind !== "moto") {
    throw new AutoQuoteError("Ingresá una patente válida", 400);
  }

  let vehicle;
  try {
    vehicle = await fetchClasificVehicle(plate);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo consultar la patente";
    if (/CLASIFICAR_API_KEY/.test(message)) {
      throw new AutoQuoteError("Falta configurar la API de Clasificar", 500);
    }
    throw new AutoQuoteError(message, 502);
  }

  if (!vehicle) {
    return {
      plate,
      kind,
      found: false,
      message: "No pudimos encontrar este auto. Ingresá los datos a mano: año, marca, modelo y versión.",
      alert: "error",
    };
  }

  const description = `${vehicle.make} ${vehicle.model} ${vehicle.year}`.trim();
  const type = foldKey(vehicle.vehicleType || "");
  const category = foldKey(vehicle.vehicleCategory || "");
  const isMoto =
    kind === "moto" ||
    type === "moto" ||
    type === "motovehiculo" ||
    category === "moto" ||
    category === "motovehiculo";
  if (isMoto) {
    return {
      plate,
      kind: "moto",
      found: true,
      description,
      year: vehicle.year,
      message: "Esta patente es de moto. Cotizala en el cotizador de motos.",
      alert: "info",
    };
  }

  const minYear = new Date().getFullYear() - 30;
  if (vehicle.year < minYear) {
    return {
      plate,
      kind: "auto",
      found: true,
      description,
      year: vehicle.year,
      message: `Este auto es de ${vehicle.year}. San Cristóbal no cotiza vehículos con más de 30 años: el límite actual es ${minYear}. No se puede cotizar online. Si el año no es ${vehicle.year}, ingresalo a mano más abajo.`,
      alert: "error",
    };
  }

  const brands = await listAutoBrands(vehicle.year);
  const brand = pickBest(brands, vehicle.make, (item) => item.description);
  if (!brand) {
    return {
      plate,
      kind: "auto",
      found: true,
      description,
      year: vehicle.year,
      brands,
      message: `Encontramos ${description}. Elegí marca, modelo y versión.`,
      alert: "info",
    };
  }

  const models = await listAutoModels(vehicle.year, brand.id);
  const model = pickModel(models, vehicle.model, vehicle.make);
  if (!model) {
    return {
      plate,
      kind: "auto",
      found: true,
      description,
      year: vehicle.year,
      brand,
      brands,
      models,
      message: `Encontramos ${description}. Elegí modelo y versión.`,
      alert: "info",
    };
  }

  const catalogVersions = await listAutoVersions(vehicle.year, brand.id, model.id);
  const versions = filterVersionsForVehicle(catalogVersions, vehicle, brand, model);
  const version =
    pickBest(
      versions,
      vehicle.model,
      (item) => `${item.description} ${item.fullCarDescripcion || ""}`
    ) || versions[0] || null;
  if (!version) {
    return {
      plate,
      kind: "auto",
      found: true,
      description,
      year: vehicle.year,
      brand,
      model,
      brands,
      models,
      versions,
      message: `Encontramos ${description}. Elegí la versión.`,
      alert: "info",
    };
  }

  return {
    plate,
    kind: "auto",
    found: true,
    description,
    year: vehicle.year,
    brand,
    model,
    version,
    brands,
    models,
    versions,
    message: description,
    alert: "ok",
  };
}

export async function listAutoLocations(postalCode: string): Promise<AutoLocation[]> {
  const data = await fetchAutoCatalog({
    kind: "location",
    year: "",
    brandId: "",
    modelId: "",
    postalCode,
  });
  return asArray(data, ["locations", "value"])
    .map((row) => {
      const rec = row as Record<string, unknown>;
      return {
        locationId: Number(rec.locationId),
        description: String(rec.description || "").trim(),
        state: rec.state != null ? String(rec.state) : undefined,
        stateKey: String(rec.stateKey || ""),
        zipCode: Number(rec.zipCode),
        synonymous: String(rec.synonymous || ""),
      };
    })
    .filter((item) => item.locationId && item.description);
}

export async function quoteAutoVehicle(input: QuoteAutoInput): Promise<AutoQuoteResult> {
  const year = Number(input.year);
  const brand = input.brand;
  const model = input.model;
  const version = input.version;
  const location = input.location;
  const nombre = String(input.nombre || "").trim();
  const celular = String(input.celular || "").trim();

  if (
    !year ||
    !brand?.id ||
    !model?.id ||
    !version?.id ||
    !location?.locationId ||
    !nombre ||
    !celular
  ) {
    throw new AutoQuoteError("Faltan datos para cotizar", 400);
  }

  if (!input.is0km && input.source !== "chat") {
    const plateKind = classifyArPlate(input.licensePlate || "");
    if (plateKind === "moto") {
      throw new AutoQuoteError("Esta patente es de moto. Cotizala en el cotizador de motos.", 400);
    }
    if (plateKind !== "auto") {
      throw new AutoQuoteError("Ingresá una patente de auto válida", 400);
    }
  }

  const phone = parseArPhone(celular);
  if (!phone) throw new AutoQuoteError("WhatsApp inválido", 400);

  const producer = await getProducer();
  const amount = statedAmount(year, Boolean(input.is0km), version);
  const names = splitName(nombre);
  const email =
    String(input.email || "").trim() || `cotiza.${phone.area}${phone.number}@marxel.com.ar`;
  const age = Number(input.age) > 0 ? Number(input.age) : 35;
  const fromChat = input.source === "chat";

  const payload = {
    isLanding: false,
    landingId: null,
    sourceId: "Sitio Seguro",
    subSourceId: fromChat ? "Chat" : "Web",
    token: null,
    affinityGroupId: producer.affinityGroupId,
    isCampaignEnabled: producer.isCampaignEnabled,
    contactData: {
      email,
      age,
      firstName: names.firstName,
      lastName: names.lastName,
      phoneAreaCode: phone.area,
      phoneNumber: phone.number,
    },
    producer: { cuit: producer.cuit, code: producer.code },
    branch: "Automotor",
    address: {
      postalCode: Number(location.zipCode),
      cityKey: location.synonymous,
      cityName: location.description,
      stateKey: location.stateKey,
      locationId: location.locationId,
    },
    trackingModule: {
      utmSource: "Sitio Seguro",
      utmMedium: "MARXEN",
      utmCampaign: fromChat ? "cotizador-chat" : "cotizador-web",
      gclid: null,
    },
    commercialAlternative: producer.commercialAlternative,
    riskData: {
      accessoriesStatedAmount: 0,
      carDescription: `${year} ${version.fullCarDescripcion || ""}`,
      category: version.category,
      fuelCode: version.fuelCode,
      hasGnc: Boolean(input.hasGnc),
      gpsProviderCode: input.hasTracker ? "LoJack" : null,
      gpsProviderDescription: input.hasTracker ? "Lo Jack (Car Security S.A.)" : null,
      infoAutoCode: version.infoAutoCode,
      is0km: Boolean(input.is0km),
      isImported: Boolean(version.isImported),
      locationId: location.locationId,
      makeDescription: brand.description,
      makeKey: Number(brand.id),
      modelDescription: model.description,
      modelKey: Number(model.id),
      referencePrice0km: Number(version.referencePrice0km) || 0,
      panoramicCrystalCeiling: Boolean(version.panoramicCrystalCeiling),
      statedAmount: amount,
      slidingCrystalCeiling: Boolean(version.slidingCrystalCeiling),
      versionKey: Number(version.id),
      versionDescription: version.description,
      year,
    },
  };

  const res = await fetch(`${SC_API}/Opportunity/vehicle-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new AutoQuoteError("No se pudo obtener la cotización", 502);

  const data = (await res.json()) as { opportunityId?: number; quotes?: QuoteRow[] };
  const quotes = (data.quotes || []).map((q) => ({
    ...q,
    monthlyCost: Math.round(Number(q.monthlyCost) || 0),
  }));
  const alt = producer.commercialAlternative;
  const discount = appliedDiscountPct(alt);

  const plans = PLANS.map((plan) => {
    const quote = pickQuote(quotes, plan.codes, plan.franchise);
    if (!quote) return null;
    const monthly = quote.monthlyCost;
    return {
      key: plan.key,
      title: plan.title,
      description: plan.description,
      mostChosen: plan.mostChosen,
      monthly,
      original: discount > 0 ? originalPrice(monthly, alt) : null,
      discount,
      quoteId: Number(quote.id) || 0,
    };
  }).filter(Boolean) as AutoPlan[];

  if (plans.length === 0) {
    throw new AutoQuoteError("No hay planes disponibles para este vehículo", 422);
  }

  if (data.opportunityId && plans.some((plan) => !plan.quoteId)) {
    try {
      const details = (await scGet(`/Quote/quote-details/${data.opportunityId}`, false)) as {
        quotes?: {
          id?: number;
          monthlyCost?: number;
          productKey?: string;
          franchiseType?: string | null;
        }[];
      };
      for (const plan of plans) {
        if (plan.quoteId) continue;
        const match = (details.quotes || []).find((row) => {
          const codes = PLANS.find((item) => item.key === plan.key)?.codes || [];
          return (codes as readonly string[]).includes(String(row.productKey || ""));
        });
        if (match?.id) plan.quoteId = Number(match.id);
      }
    } catch {
      // Si no hay ids, el registro posterior lo informa.
    }
  }

  return {
    opportunityId: data.opportunityId,
    statedAmount: amount,
    carDescription: `${year} ${version.fullCarDescripcion || ""}`.trim(),
    appliedDiscount: discount,
    plans,
  };
}

export async function lookupPersonByDni(dni: string): Promise<AutoPerson | null> {
  const taxId = String(dni || "").replace(/\D/g, "");
  if (taxId.length < 7 || taxId.length > 8) {
    throw new AutoQuoteError("DNI inválido", 400);
  }
  const res = await fetch(
    `${SC_API}/Account/contact-by-taxId?taxId=${encodeURIComponent(taxId)}&documentType=DNI`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new AutoQuoteError("No se pudo consultar el DNI", 502);
  const contact = firstContact(await res.json());
  if (!contact) return null;
  const firstName = String(contact.firstName || "").trim();
  const lastName = String(contact.lastName || "").trim();
  if (!firstName && !lastName) return null;
  return {
    firstName,
    lastName,
    gender: contact.gender != null ? String(contact.gender) : undefined,
    dateOfBirth: contact.dateOfBirth != null ? String(contact.dateOfBirth) : undefined,
    taxStatuses: Array.isArray(contact.taxStatuses) ? contact.taxStatuses : undefined,
  };
}

export async function registerAutoQuoteWithProducer(input: RegisterAutoQuoteInput) {
  const opportunityId = Number(input.opportunityId);
  const quoteId = Number(input.quoteId);
  const dni = String(input.dni || "").replace(/\D/g, "");
  const email = String(input.email || "").trim();
  const nombre = String(input.nombre || "").trim();
  const age = Number(input.age);
  const location = input.location;

  if (!opportunityId || !quoteId) {
    throw new AutoQuoteError("Falta la cotización seleccionada", 400);
  }
  if (dni.length < 7 || dni.length > 8) throw new AutoQuoteError("DNI inválido", 400);
  if (!email.includes("@")) throw new AutoQuoteError("Email inválido", 400);
  if (!nombre || !location?.locationId || age < 18) {
    throw new AutoQuoteError("Faltan datos para registrar la cotización", 400);
  }

  const phone = parseArPhone(input.celular);
  if (!phone) throw new AutoQuoteError("WhatsApp inválido", 400);

  const person = await lookupPersonByDni(dni).catch(() => null);
  const names = person?.firstName
    ? { firstName: person.firstName, lastName: person.lastName || person.firstName }
    : splitName(nombre);
  const gender = normalizeGender(person?.gender || input.gender || "Male");
  const producer = await getProducer();
  const licensePlate = normalizeArPlate(input.licensePlate || "");
  const plateKind = classifyArPlate(licensePlate);

  if (!input.is0km && plateKind === "moto") {
    throw new AutoQuoteError("Esta patente es de moto. Cotizala en el cotizador de motos.", 400);
  }
  if (!input.is0km && plateKind !== "auto") {
    throw new AutoQuoteError("Ingresá la patente del auto", 400);
  }
  if (String(input.vin || "").replace(/\D/g, "").length !== 10) {
    throw new AutoQuoteError("El número de chasis tiene que tener 10 dígitos", 400);
  }
  if (String(input.engineNumber || "").replace(/\D/g, "").length < 6) {
    throw new AutoQuoteError("El número de motor tiene que tener al menos 6 dígitos", 400);
  }

  const headers = { "x-id": dni };

  try {
    await scPost("/Quote/UpdateIsSelected", { quoteId, isSelected: true }, headers);
  } catch {
    // La cotización web igual se puede pasar al cotizador unificado.
  }

  await scPost(
    "/Quote",
    {
      opportunityId,
      quoteId,
      address: {
        locationId: location.locationId,
        cityKey: location.synonymous,
        cityName: location.description,
        stateKey: location.stateKey,
        postalCode: Number(location.zipCode),
      },
      insured: {
        documentNumber: dni,
        documentType: "DNI",
        firstName: names.firstName,
        lastName: names.lastName,
        gender,
        email,
        phoneAreaCode: phone.area,
        phoneNumber: phone.number,
        pep: { isPep: false },
        dateOfBirth: person?.dateOfBirth || birthFromAge(age),
        uifObligated: false,
        taxStatuses: person?.taxStatuses || [],
      },
    },
    headers
  );

  try {
    await scPost(
      "/Quote/quote-data",
      {
        opportunityId,
        producer: { cuit: producer.cuit, code: producer.code },
      },
      headers
    );
  } catch {
    // CreateQuote ya deja la oportunidad en el panel; el cotizador unificado pide otro token.
  }

  if (licensePlate) {
    try {
      await scPost(
        "/Quote/is-valid-license-plate",
        {
          country: "AR",
          licenseId: licensePlate,
          patentedAtArg: true,
          patentedAtArgSpecified: true,
          vehicleCategory: "A",
          vehicleYear: null,
        },
        headers
      );
    } catch {
      // La patente se informa igual; no bloquea el alta en el panel.
    }
  }

  return {
    ok: true,
    opportunityId,
    quoteId,
    dni,
    nombre: `${names.firstName} ${names.lastName}`.trim(),
  };
}
