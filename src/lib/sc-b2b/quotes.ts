import { scB2bConfig, scB2bPost } from "./client";

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

export function buildCa7Quote(input: Ca7QuoteInput) {
  const producerCode = scB2bConfig().producerCode;
  const productCodes = input.productCodes?.length ? input.productCodes : ["CA7_A", "CA7_CM", "CA7_D"];
  return {
    InsuredData: {
      OfficialIDType: input.officialIdType || "Ext_CUIL86",
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
      LocationPostalCode: input.postalCode,
      LocationState: input.locationState,
    },
    VehicleData: {
      Vehicle: {
        InfoautoCode: String(input.infoautoCode),
        Year: input.year,
        Is0Km: Boolean(input.is0Km),
        HasGNC: Boolean(input.hasGnc),
        HasGPS: Boolean(input.hasGps),
        Usage: input.usage || "Personal",
        Category: "Car",
        StatedAmount: input.statedAmount,
        RiskLocationPostalCode: input.postalCode,
        RiskLocationState: input.locationState,
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
    BasicPlanCode: input.basicPlanCode || "Plan Standard",
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

export async function quoteCa7(input: Ca7QuoteInput) {
  return scB2bPost("/api/Quoted/QuoteCA7", buildCa7Quote(input));
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

export async function issueCa7(body: unknown) {
  return scB2bPost("/api/IssueSubmission/IssueCA7", body);
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
