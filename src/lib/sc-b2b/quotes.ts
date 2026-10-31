import { ScB2bError, scB2bConfig, scB2bGet, scB2bPost, withQuery } from "./client";

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

const CA7_PRODUCTS = [
  "CA7_A",
  "CA7_B",
  "CA7_B1",
  "CA7_B3",
  "CA7_Basic",
  "CA7_C",
  "CA7_CPlus",
  "CA7_C1",
  "CA7_C4",
  "CA7_CM",
  "CA7_D",
];

function quoteStartDate(value?: string) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Salta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function taxIdOf(raw: string, officialType: string) {
  const digits = raw.replace(/\D/g, "");
  if (officialType === "Ext_DNI96") return digits;
  return formatTaxId(raw);
}

export function buildCa7Quote(input: Ca7QuoteInput) {
  const producerCode = scB2bConfig().producerCode;
  const officialType = officialIdOf(input.taxId, input.officialIdType);
  const productCodes = input.productCodes?.length ? input.productCodes : CA7_PRODUCTS;
  const postal = String(input.postalCode || "");
  const state = input.locationState || "AR_01";
  const statedAmount = Number(input.statedAmount) > 0 ? Number(input.statedAmount) : 0;
  return {
    InsuredData: {
      OfficialIDType: officialType,
      TaxID: taxIdOf(input.taxId, officialType),
      Gender: input.gender || "M",
      Subtype: input.subtype || "person",
      ProducerCode: producerCode,
    },
    PolicyData: {
      StartDate: quoteStartDate(input.startDate),
      PolicyTermCode: input.policyTermCode || "Annual",
      PaymentMethodCode: input.paymentMethodCode || "responsive",
      CurrencyCode: String(input.currencyCode || "ARS").toUpperCase(),
      PaymentFees: Number(input.paymentFees) > 0 ? Number(input.paymentFees) : 1,
      CommercialAlternative: "0",
      AffinityGroupPublicId: null,
      TypeOfContracting: "Rebilling",
      Product: input.product || "CA7CommAuto",
      PolicyType: input.policyType || "CA7_Car",
      LocationPostalCode: postal,
      LocationState: state,
    },
    VehicleData: {
      Vehicle: {
        AccesoryAmount: 0,
        AdditionalInterestTaxId: "",
        AutomaticAdjust: "0",
        Category: input.category || "Car",
        FuelType: fuelTypeOf(input.fuelType),
        Color: "Unspecified",
        HasGNC: Boolean(input.hasGnc),
        HasGPS: Boolean(input.hasGps),
        IdVehicle: "",
        InfoautoCode: String(input.infoautoCode),
        Is0Km: Boolean(input.is0Km),
        StatedAmount: statedAmount,
        Usage: input.usage || "Personal",
        Year: Number(input.year),
        IsNational: input.isNational !== false,
        RiskLocationPostalCode: postal,
        RiskLocationState: state,
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
  let statedAmount = Number(input.statedAmount) || 0;
  try {
    const version = firstCatalogVersion(await vehicleVersion(String(input.infoautoCode), String(input.year)));
    if (Number(version.Precio) > 0) statedAmount = Number(version.Precio);
  } catch {
    // GetVersionByCodInfoAuto solo aporta la suma asegurada. Categoría, combustible y origen vienen de InfoAuto.
  }
  return scB2bPost("/api/Quoted/QuoteCA7", buildCa7Quote({ ...input, statedAmount }));
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

export type InspectionPhoto = { name: string; content: string };

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
  photos?: InspectionPhoto[];
};

function inspectionPhotos(raw: InspectionPhoto[] | undefined) {
  return (raw || [])
    .map((photo) => ({
      name: String(photo.name || "foto").replace(/[^\w.-]+/g, "").slice(0, 40) || "foto",
      content: String(photo.content || "")
        .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
        .replace(/\s/g, ""),
    }))
    .filter((photo) => photo.content.length > 100 && photo.content.length < 1_800_000)
    .slice(0, 8);
}

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
  if (!String(input.licensePlate || "").trim()) {
    throw new ScB2bError("Falta la patente. San Cristóbal la pide también en un 0 km.", 400);
  }
  if (String(input.vin || "").trim().length < 6 || String(input.engineNumber || "").trim().length < 4) {
    throw new ScB2bError("Faltan el chasis y el motor", 400);
  }

  const quoted = await quoteCa7(input);

  const quoteId = quoteIdFrom(quoted, productCode);
  if (!quoteId) throw new ScB2bError("La cotización no trajo un número para emitir", 422, quoted);

  const state = input.locationState || "AR_01";
  const postal = String(input.postalCode);
  const address = {
    PostalCode: postal,
    Street: street,
    StreetNumber: streetNumber,
    Floor: "",
    Block: "",
    City: city,
    StateCode: state,
    Phone: phone,
  };

  const photos = inspectionPhotos(input.photos);
  const issued = asRecord(
    await issueCa7({
      QuoteId: quoteId,
      PaymentInfo: {
        PaymentMethodCode: "responsive",
        SendCouponsByCode: "email",
      },
      VehicleInfo: {
        EngineNumber: String(input.engineNumber || "").trim(),
        LicensePlate: String(input.licensePlate || "").trim(),
        VIN: String(input.vin || "").trim(),
        Accesories: [],
        GpsProviderCode: "",
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
        Documents: photos.map((photo) => ({ nombre: `${photo.name}.jpg`, img: photo.content })),
        TrackingPAS: "",
        WarningsThrowException: false,
        StartDate: new Date().toISOString(),
        DetailResponse: true,
      },
      PepData: { Representatives: [] },
      TruckData: { AdditionalInsured: [] },
    })
  );

  let inspectionError = "";
  if (photos.length) {
    try {
      await scB2bPost("/api/Inspection/deferred-inspection", {
        PolicyPeriodId: String(issued.PolicyPeriodId || ""),
        QuoteId: quoteId,
        InspectionFiles: photos.map((photo) => ({
          Name: `${photo.name}.jpg`,
          Content: photo.content,
        })),
      });
    } catch (err) {
      inspectionError = err instanceof Error ? err.message : "No se pudieron cargar las fotos";
    }
  }

  let bound = "";
  const certificate = String(issued.PolicyNumber || "");
  if (certificate) {
    try {
      const status = asRecord(
        await scB2bGet(withQuery("/api/Vehicle/GetCertificateStatus", { CertificateNumber: certificate }))
      );
      const policyNumber = String(status.PolicyNumber || "");
      if (/^\d{2}-\d{2}-\d{2}-3\d+$/.test(policyNumber)) bound = policyNumber;
    } catch {
      bound = "";
    }
  }

  return {
    ...issued,
    BoundPolicyNumber: bound,
    InspectionError: inspectionError,
    PhotosSent: photos.length,
  };
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
