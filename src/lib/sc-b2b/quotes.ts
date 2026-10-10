import { ScB2bError, scB2bConfig, scB2bPost } from "./client";

export type Ca7QuoteInput = {
  taxId: string;
  officialIdType?: string;
  gender?: string;
  subtype?: string;
  age?: number;
  postalCode: number;
  locationState: string;
  infoautoCode: string;
  year: number;
  is0Km?: boolean;
  hasGnc?: boolean;
  hasGps?: boolean;
  statedAmount?: number;
  fuelType?: string;
  category?: string;
  isNational?: boolean;
  usage?: string;
  productCodes?: string[];
  product?: string;
  policyType?: string;
  policyTermCode?: string;
  paymentMethodCode?: string;
  paymentFees?: string;
  currencyCode?: string;
  startDate?: string;
};

export type Cp7QuoteInput = {
  taxId: string;
  officialIdType?: string;
  genre?: string;
  policyTypeCode?: string;
  postalCode: string;
  state: string;
  city?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  policyTermCode?: string;
  currencyCode?: string;
  paymentMethod?: string;
  paymentFees?: number;
  basicPlanCode?: string;
  additionalPlanCode?: string;
};

function isoDate(value?: string) {
  if (value) return value;
  return new Date().toISOString();
}

function formatTaxId(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return raw.trim();
}

function officialIdOf(taxId: string, fallback?: string) {
  if (fallback) return fallback;
  const digits = taxId.replace(/\D/g, "");
  if (digits.length >= 7 && digits.length <= 8) return "Ext_DNI96";
  return "Ext_CUIL86";
}

function fuelTypeOf(value?: string) {
  const key = String(value || "")
    .trim()
    .toUpperCase();
  if (!key) return "NAF";
  if (key.includes("DIE") || key.includes("GASOIL")) return "DIE";
  if (key.includes("GNC")) return "GNC";
  if (key.includes("ELE")) return "ELE";
  if (key.includes("HIB")) return "HIB";
  return key.length <= 4 ? key : "NAF";
}

export function buildCa7Quote(input: Ca7QuoteInput) {
  const producerCode = scB2bConfig().producerCode;
  const productCodes = input.productCodes?.length ? input.productCodes : ["CA7_A", "CA7_CM"];
  const statedAmount = Number(input.statedAmount);
  return {
    InsuredData: {
      OfficialIDType: officialIdOf(input.taxId, input.officialIdType),
      TaxID: formatTaxId(input.taxId),
      Gender: input.gender || "M",
      Subtype: input.subtype || "person",
      ProducerCode: producerCode,
      Age: input.age || 35,
      UIFObligated: false,
    },
    PolicyData: {
      StartDate: isoDate(input.startDate),
      PolicyTermCode: input.policyTermCode || "Annual",
      PaymentMethodCode: input.paymentMethodCode || "creditcard",
      CurrencyCode: input.currencyCode || "ars",
      PaymentFees: input.paymentFees || "Monthly",
      Product: input.product || "CA7CommAuto",
      PolicyType: input.policyType || "CA7_Car",
      LocationPostalCode: Number(input.postalCode),
      LocationState: input.locationState || "AR_01",
    },
    VehicleData: {
      Vehicle: {
        InfoautoCode: String(input.infoautoCode),
        Year: Number(input.year),
        Is0Km: Boolean(input.is0Km),
        HasGNC: Boolean(input.hasGnc),
        Usage: input.usage || "Personal",
        Category: input.category || "Car",
        FuelType: fuelTypeOf(input.fuelType),
        IsNational: input.isNational !== false,
        ...(statedAmount > 0 ? { StatedAmount: statedAmount } : {}),
        RiskLocationPostalCode: Number(input.postalCode),
        RiskLocationState: input.locationState || "AR_01",
      },
      Product: productCodes.map((ProductCode) => ({ ProductCode })),
    },
  };
}

export function buildCp7Quote(input: Cp7QuoteInput) {
  const start = input.startDate ? new Date(input.startDate) : new Date();
  const end = input.endDate ? new Date(input.endDate) : new Date(start);
  if (!input.endDate) end.setFullYear(end.getFullYear() + 1);
  return {
    OfficialIDType: input.officialIdType || "Ext_CUIL86",
    TaxID: formatTaxId(input.taxId),
    Genre: input.genre || "M",
    ProducerCode: scB2bConfig().producerCode,
    PolicyTypeCode: input.policyTypeCode || "CP7_CombinedCombinedFamily",
    BasicPlanCode: input.basicPlanCode || "Plan Plus",
    AdditionalPlanCode: input.additionalPlanCode || undefined,
    Payment: {
      Method: input.paymentMethod || "creditcard",
      Fees: input.paymentFees || 1,
    },
    CurrencyCode: input.currencyCode || "ars",
    StartDate: start.toISOString(),
    EndDate: end.toISOString(),
    PolicyTermCode: input.policyTermCode || "Annual",
    PostalCodeRiskLocation: String(input.postalCode),
    State: input.state,
    City: input.city || undefined,
    Email: input.email || undefined,
    PrimaryPhone: input.phone || undefined,
  };
}

function firstCatalogVersion(data: unknown) {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const list = Array.isArray(root.Versiones) ? root.Versiones : [];
  const row = list[0];
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
}

export async function quoteCa7(input: Ca7QuoteInput) {
  const { vehicleVersion } = await import("./ops");
  let fuelType = input.fuelType;
  let statedAmount = input.statedAmount;
  let category = input.category;
  let isNational = input.isNational;
  try {
    const version = firstCatalogVersion(await vehicleVersion(String(input.infoautoCode), String(input.year)));
    if (!fuelType && version.CombustibleCodigo) fuelType = String(version.CombustibleCodigo);
    if (!(Number(statedAmount) > 0) && Number(version.Precio) > 0) statedAmount = Number(version.Precio);
    if (!category && version.Categoria) category = String(version.Categoria);
    if (isNational == null && typeof version.Importado === "boolean") isNational = !version.Importado;
  } catch {
    // Guidewire UAT a veces no responde el catálogo; cotizamos igual con el payload del swagger.
  }
  try {
    return await scB2bPost("/api/Quoted/QuoteCA7", buildCa7Quote({ ...input, fuelType, statedAmount, category, isNational }));
  } catch (err) {
    if (err instanceof ScB2bError && /Object reference not set/i.test(err.message)) {
      throw new ScB2bError(UAT_CATALOG_ERROR, 422, err.body);
    }
    throw err;
  }
}

export async function quoteCp7(input: Cp7QuoteInput) {
  return scB2bPost("/api/Quoted/QuoteCP7Template", buildCp7Quote(input));
}

export async function quoteAtm(body: unknown) {
  return scB2bPost("/api/Quoted/QuoteATM", body);
}

export async function quoteLife(body: unknown) {
  return scB2bPost("/api/Quoted/QuoteLifeIndividual", body);
}

const UAT_CATALOG_ERROR =
  "San Cristóbal UAT devolvió el precio, pero el catálogo de autos vino sin marca ni modelo. Sin eso no hay número de cotización y no se puede emitir la póliza. Hay que pedirle a soporteb2b@sancristobal.com.ar que cargue el catálogo de vehículos en el ambiente de pruebas.";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function quoteIdFrom(data: unknown, productCode: string) {
  const summaries = asRecord(data).Summaries;
  const rows = Array.isArray(summaries) ? summaries : [];
  const match =
    rows.find((row) => String(asRecord(row).ProductCode || "") === productCode) || rows[0];
  return String(asRecord(match).QuoteId || "");
}

export type Ca7IssueInput = Ca7QuoteInput & {
  productCode: string;
  email: string;
  phone: string;
  licensePlate?: string;
  vin?: string;
  engineNumber?: string;
  street?: string;
  streetNumber?: string;
  city?: string;
};

export async function issueCa7(body: unknown) {
  return scB2bPost("/api/IssueSubmission/IssueCA7", body);
}

export async function quoteAndIssueCa7(input: Ca7IssueInput) {
  const productCode = input.productCode || "CA7_CM";
  const email = String(input.email || "").trim();
  const phone = String(input.phone || "").replace(/\D/g, "");
  const street = String(input.street || "").trim();
  const streetNumber = String(input.streetNumber || "").trim();
  const city = String(input.city || "SALTA").trim();
  if (!email.includes("@")) throw new ScB2bError("Falta el email del asegurado", 400);
  if (phone.length < 8) throw new ScB2bError("Falta el celular del asegurado", 400);
  if (!street || !streetNumber) throw new ScB2bError("Falta la calle y la altura", 400);
  if (!input.is0Km && !String(input.licensePlate || "").trim()) {
    throw new ScB2bError("Falta la patente", 400);
  }
  if (String(input.vin || "").trim().length < 6 || String(input.engineNumber || "").trim().length < 4) {
    throw new ScB2bError("Faltan el chasis y el motor", 400);
  }

  let quoted: unknown;
  try {
    quoted = await quoteCa7({ ...input, productCodes: [productCode] });
  } catch (err) {
    if (err instanceof ScB2bError && /Object reference not set/i.test(err.message)) {
      throw new ScB2bError(UAT_CATALOG_ERROR, 422, err.body);
    }
    throw err;
  }

  const quoteId = quoteIdFrom(quoted, productCode);
  if (!quoteId) throw new ScB2bError("La cotización no trajo un número para emitir", 422, quoted);

  const state = input.locationState || "AR_01";
  const postal = String(input.postalCode);
  const address = {
    PostalCode: postal,
    Street: street,
    StreetNumber: streetNumber,
    City: city,
    StateCode: state,
    Phone: phone,
  };

  return issueCa7({
    QuoteId: quoteId,
    PaymentInfo: {
      PaymentMethodCode: "responsive",
      SendCouponsByCode: "email",
    },
    VehicleInfo: {
      EngineNumber: String(input.engineNumber || "").trim(),
      LicensePlate: String(input.licensePlate || "").trim(),
      VIN: String(input.vin || "").trim(),
      Address: address,
    },
    InsuredData: {
      CellPhone: phone,
      Email: email,
      Address: address,
      ElectronicDocuments: true,
      UIfObligated: false,
    },
    IssueData: {
      WarningsThrowException: false,
      StartDate: new Date().toISOString(),
      DetailResponse: true,
    },
  });
}

export async function issueCp7(body: unknown) {
  return scB2bPost("/api/IssueSubmission/IssueSubmissionCP7", body);
}

export async function issueAtm(body: unknown) {
  return scB2bPost("/api/IssueSubmission/IssueATM", body);
}

export async function agriQuoteAndIssue(body: unknown) {
  return scB2bPost("/b2b-api-cp7/api/AgriQuote/quote-and-issue-offcore", body);
}
