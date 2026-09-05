import { scB2bConfig, scB2bDownload, scB2bGet, withQuery, type ScB2bBinary } from "./client";

export const REPORT_PATHS = {
  "frente-poliza": "/api/Reportes/FrentePoliza",
  "frente-endoso": "/api/Reportes/FrenteEndoso",
  "frente-resumen": "/api/Reportes/FrenteResumen",
  "seguro-obligatorio": "/api/Reportes/SeguroObligatorio",
  "tarjeta-mercosur": "/api/Reportes/TarjetaMercosur",
  cupones: "/api/Reportes/CuponesDePoliza",
  constancia: "/api/Reportes/ConstanciaDeCobertura",
  "comprobante-pago": "/api/Reportes/ComprobanteDePago",
  denuncia: "/api/Reportes/DenunciaSiniestro",
  clausulas: "/api/Reportes/TextoClausulas",
  asistencia: "/api/Reportes/AssistanceByPolicy",
  certificado: "/api/Reportes/CertificadoDeCobertura",
  "cotizacion-personas": "/api/Reportes/CotizacionSeguroPersonas",
} as const;

export type ReportKind = keyof typeof REPORT_PATHS;

const TYPELIST_OK = /^[A-Za-z][A-Za-z0-9_-]{1,60}$/;

export function producerCode() {
  return scB2bConfig().producerCode;
}

export const SC_AUTO_PRODUCT = "CA7CommAuto";
export const SC_AUTO_POLICY_TYPE = "CA7_Car";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function previousDayIso(date = new Date(), timeZone = "America/Argentina/Salta") {
  const today = date.toLocaleDateString("en-CA", { timeZone });
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 24 * 60 * 60 * 1000).toISOString();
}

export function movementQueryDate(raw?: string) {
  if (!raw) return previousDayIso();
  const requested = new Date(raw);
  if (Number.isNaN(requested.getTime())) return previousDayIso();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Salta" });
  const requestedDay = requested.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Salta" });
  if (requestedDay >= today) return previousDayIso();
  return requested.toISOString();
}

export function taxIdFromProducerPayload(producers: unknown, info?: unknown) {
  const root = asRecord(producers);
  const list = Array.isArray(producers)
    ? producers
    : Array.isArray(root.Producers)
      ? (root.Producers as unknown[])
      : Array.isArray(root.producers)
        ? (root.producers as unknown[])
        : [];
  const first = asRecord(list[0]);
  const infoRoot = asRecord(info);
  const nested = asRecord(infoRoot.producerInfo || infoRoot.ProducerInfo || infoRoot);
  return String(first.TaxId || first.TaxID || nested.TaxID || nested.TaxId || "").trim();
}

export async function currentProducers() {
  return scB2bGet("/api/User/producers-current-user");
}

export async function producerInfo(code?: string) {
  return scB2bGet(withQuery("/api/Producer/GetInfo", { producerCode: code || producerCode() }));
}

export async function producerPortfolio(code = producerCode()) {
  return scB2bGet(withQuery("/api/Producer/portfolio-by-producer-code", { producerCode: code }));
}

export async function producerAffinity(productCode: string, policyTypeCode: string) {
  if (!productCode || !policyTypeCode) {
    throw new Error("Faltan producto y tipo de póliza para campañas");
  }
  return scB2bGet(
    withQuery("/api/Producer/GetAffinityGroupsByProducerCode", {
      producerCode: producerCode(),
      productCode,
      policyTypeCode,
    })
  );
}

export async function producerMovements(date: string, taxId: string) {
  if (!taxId) {
    throw new Error("Falta el CUIT del productor para movimientos");
  }
  return scB2bGet(
    withQuery("/api/Producer/movements-by-date", {
      producerCode: producerCode(),
      taxId,
      date: movementQueryDate(date),
    })
  );
}

export async function earnedCommissions(input: {
  taxId: string;
  yearMonth: string;
  currencyCode?: string;
  currentPage?: number;
  pageSize?: number;
}) {
  return scB2bGet(
    withQuery("/api/Producer/earned-commissions-paginated", {
      taxId: input.taxId,
      yearMonth: input.yearMonth,
      currencyCode: input.currencyCode || "ars",
      currentPage: input.currentPage || 1,
      pageSize: input.pageSize || 20,
    })
  );
}

export async function citiesByPostalCode(codigo: string) {
  return scB2bGet(withQuery("/api/Postal/CiudadesPorCodigoPostal", { codigo }));
}

export async function argentineProvinces() {
  return scB2bGet("/api/Postal/ProvinciasArgentinas");
}

export async function cuilsByDni(dni: string) {
  return scB2bGet(withQuery("/api/Padron/GetCuilsByDni", { dni }));
}

export async function typeList(name: string, extra?: Record<string, string>) {
  if (!TYPELIST_OK.test(name)) {
    throw new Error("Lista inválida");
  }
  const path = name === "BeneficiaryTypes" ? "/api/Typelist/BeneficiaryTypes" : `/api/TypeList/${name}`;
  return scB2bGet(withQuery(path, extra));
}

export async function policyByNumber(policyNumber: string, includePayments = false) {
  return scB2bGet(
    withQuery("/api/PolicyDetail/GetPolicyDetailByPolicyNumber", {
      policyNumber,
      includePayments,
    })
  );
}

export async function searchPolicy(policyNumber: string) {
  return scB2bGet(withQuery("/api/SearchPolicyDetails/SearchPolicyDetails", { policyNumber }));
}

const POLICY_DETAIL_PRODUCTS = new Set([
  "agriculture",
  "burial",
  "caution",
  "combined",
  "fire",
  "general-liability",
  "hull-and-aircraft",
  "life",
  "other-risk",
  "personal-accidents",
  "technical",
  "theft",
  "transport",
]);

export async function policyDetailByProduct(product: string, policyNumber: string) {
  if (!POLICY_DETAIL_PRODUCTS.has(product)) {
    throw new Error("Producto de póliza inválido");
  }
  return scB2bGet(withQuery(`/api/PolicyDetail/${product}`, { policyNumber }));
}

export async function paymentHistory(policyNumber: string) {
  return scB2bGet(withQuery("/api/Payment/GetHistoryByPolicyNumber", { policyNumber }));
}

export async function claimsByProducer(createDateStart: string, createDateEnd: string) {
  return scB2bGet(
    withQuery("/api/Claims/Producer", {
      createDateStart,
      createDateEnd,
      producer: producerCode(),
    })
  );
}

export async function claimByNumber(claimNumber: string) {
  return scB2bGet(withQuery("/api/Claims/ClaimNumber", { claimNumber }));
}

export async function claimsNews(newsDate: string) {
  return scB2bGet(
    withQuery("/api/Claims/News", {
      producerCode: producerCode(),
      newsDate,
    })
  );
}

export async function vehicleVersion(codigoInfoauto: string, anio: string) {
  return scB2bGet(
    withQuery("/api/CatalogoVehiculos/AutosVersionPorCodigoInfoauto", {
      codigoInfoauto,
      anio,
    })
  );
}

export async function motoVersion(codigoInfomoto: string, anio: string) {
  return scB2bGet(
    withQuery("/api/CatalogoVehiculos/MotoVersionByCodigoInfomoto", {
      codigoInfomoto,
      anio,
    })
  );
}

const AGRI_CATALOGS = {
  coverages: "/b2b-api-cp7/api/AgriCatalog/coverages",
  "payment-methods": "/b2b-api-cp7/api/AgriCatalog/payment-methods",
  "crop-risks": "/b2b-api-cp7/api/AgriCatalog/crop-risks",
  "exchange-type": "/b2b-api-cp7/api/AgriCatalog/exchange-type",
  "tillage-type": "/b2b-api-cp7/api/AgriCatalog/tillage-type",
} as const;

export type AgriCatalogKind = keyof typeof AGRI_CATALOGS;

export async function agriCatalog(kind: AgriCatalogKind) {
  return scB2bGet(AGRI_CATALOGS[kind]);
}

export async function agriQuoteResult(id: string) {
  return scB2bGet(withQuery("/b2b-api-cp7/api/AgriQuote/result-by-id", { id }));
}

export async function downloadReport(
  kind: ReportKind,
  query: Record<string, string | number | boolean | undefined>
): Promise<ScB2bBinary> {
  const path = REPORT_PATHS[kind];
  return scB2bDownload(withQuery(path, query), `${kind}.pdf`);
}
