import { GO_DESTINOS } from "@/lib/go-destinos";

const GO_API = "https://back.goassistance.com/webapi18/api";
const DEFAULT_WEBSERVICE =
  "c0xY1eq2yrWHiodN0LVwjDwZIgflsWdB/mH51PQQ4Q3xvG5RDxKYPQ==";
const PAIS_ORIGEN = 32;
const ADULT_AGE = 30;

export class GoQuoteError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export type GoPlan = {
  id: number;
  name: string;
  image: string | null;
  coverageMedical: string;
  coverageLuggage: string;
  totalArs: number;
  originalArs: number | null;
  discountPct: number;
  installments: number;
  installmentArs: number;
  currency: string;
};

export type GoQuoteResult = {
  token: string;
  quoteId: number;
  destinationId: number;
  destinationName: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  email: string;
  phone: string;
  passengers: number;
  plans: GoPlan[];
};

type GoProduct = {
  ProductoId: number;
  Producto: string;
  UrlIMG?: string | null;
  CoberturaEnfermedad?: string | null;
  CoberturaEquipaje?: string | null;
  CostoOrigen?: number;
  CostoBrutoOrigen?: number;
  Bonificacion?: number;
  CuotaInteres?: string[] | null;
  Moneda?: string | null;
};

type GoQuotePayload = {
  Token?: string;
  IdCotizacion?: number;
  IdRegionDestino?: number;
  NombreRegionDestino?: string;
  FechaDesde?: string;
  FechaHasta?: string;
  DiasDeViaje?: number;
  Email?: string;
  Telefono?: string;
  Edades?: number[];
  Productos?: GoProduct[];
  error?: string;
};

function webservice() {
  return process.env.GO_ASSISTANCE_WEBSERVICE?.trim() || DEFAULT_WEBSERVICE;
}

function agesPayload(count: number) {
  const ages = Array.from({ length: Math.max(1, Math.min(count, 10)) }, () => ADULT_AGE);
  return {
    Edad1: ages[0] || 0,
    Edad2: ages[1] || 0,
    Edad3: ages[2] || 0,
    Edad4: ages[3] || 0,
    Edad5: ages[4] || 0,
    EdadesAdicionales: ages.slice(5),
  };
}

function isoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T03:00:00.000Z`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new GoQuoteError("Revisá las fechas de viaje.", 400);
  }
  return parsed.toISOString();
}

function bestInstallments(cuotas: string[] | null | undefined) {
  let quantity = 1;
  for (const item of cuotas || []) {
    const [rawQty, rawTax] = String(item).split("-").map((part) => Number(part.trim()));
    if (rawQty > 0 && rawTax === 0 && rawQty > quantity) quantity = rawQty;
  }
  return quantity;
}

function mapPlan(product: GoProduct): GoPlan | null {
  const total = Number(product.CostoOrigen) || 0;
  if (!product.ProductoId || !product.Producto || total <= 0) return null;
  const original = Number(product.CostoBrutoOrigen) || 0;
  const installments = bestInstallments(product.CuotaInteres);
  return {
    id: product.ProductoId,
    name: product.Producto.trim(),
    image: product.UrlIMG || null,
    coverageMedical: product.CoberturaEnfermedad || "",
    coverageLuggage: product.CoberturaEquipaje || "",
    totalArs: Math.round(total),
    originalArs: original > total ? Math.round(original) : null,
    discountPct: Number(product.Bonificacion) || 0,
    installments,
    installmentArs: Math.round(total / installments),
    currency: "ARS",
  };
}

function toResult(data: GoQuotePayload, passengers: number): GoQuoteResult {
  const plans = (data.Productos || [])
    .map(mapPlan)
    .filter((plan): plan is GoPlan => Boolean(plan))
    .sort((a, b) => a.totalArs - b.totalArs);

  if (!data.Token || plans.length === 0) {
    throw new GoQuoteError("No encontramos planes para ese destino y fechas. Probá recotizar.");
  }

  return {
    token: data.Token,
    quoteId: Number(data.IdCotizacion) || 0,
    destinationId: Number(data.IdRegionDestino) || 0,
    destinationName: data.NombreRegionDestino || "",
    dateFrom: data.FechaDesde || "",
    dateTo: data.FechaHasta || "",
    days: Number(data.DiasDeViaje) || 0,
    email: data.Email || "",
    phone: data.Telefono || "",
    passengers,
    plans,
  };
}

async function goFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GO_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as GoQuotePayload;
  if (!res.ok) {
    throw new GoQuoteError(data.error || "Go Assistance no pudo cotizar.", res.status >= 400 ? res.status : 502);
  }
  return data;
}

export async function quoteGoTravel(input: {
  destinationId: number;
  dateFrom: string;
  dateTo: string;
  passengers: number;
  email: string;
  phone: string;
}): Promise<GoQuoteResult> {
  const destinationId = Number(input.destinationId);
  if (!GO_DESTINOS.some((item) => item.id === destinationId)) {
    throw new GoQuoteError("Elegí un destino de la lista.", 400);
  }

  const from = new Date(`${input.dateFrom}T12:00:00`);
  const to = new Date(`${input.dateTo}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    throw new GoQuoteError("La fecha de regreso tiene que ser posterior a la de salida.", 400);
  }

  const passengers = Math.max(1, Math.min(Number(input.passengers) || 1, 10));
  const email = input.email.trim();
  const phone = input.phone.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new GoQuoteError("Ingresá un email válido.", 400);
  }
  if (phone.replace(/\D/g, "").length < 8) {
    throw new GoQuoteError("Ingresá un WhatsApp válido.", 400);
  }

  const created = await goFetch("/CotizacionSeguroViajero", {
    method: "POST",
    body: JSON.stringify({
      PaisDesde: PAIS_ORIGEN,
      PaisHasta: destinationId,
      TipoViaje: "1",
      FechaDesde: isoDate(input.dateFrom),
      FechaHasta: isoDate(input.dateTo),
      ...agesPayload(passengers),
      Cultura: "es-ES",
      Email: email,
      Telefono: phone,
      WebService: webservice(),
      SemanaGestacion: "0",
      Source: "marxen",
      Campaign: "",
      Token: "",
    }),
  });

  if ((created.Productos || []).length > 0 && created.Token) {
    return toResult(created, passengers);
  }

  const token = created.Token;
  if (!token) {
    throw new GoQuoteError("Go Assistance no devolvió la cotización. Probá de nuevo.");
  }

  let listed = await goFetch(`/CotizacionSeguroViajero/Productos?token=${encodeURIComponent(token)}`);
  if ((listed.Productos || []).length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    listed = await goFetch(`/CotizacionSeguroViajero/Productos?token=${encodeURIComponent(token)}`);
  }

  return toResult(listed, passengers);
}
