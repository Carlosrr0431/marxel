export type Dict = Record<string, unknown>;

export function asDict(value: unknown): Dict {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Dict) : {};
}

export function asList(value: unknown): Dict[] {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as Dict[];
  }
  const row = asDict(value);
  for (const key of [
    "Policies",
    "Producers",
    "AffinityGroups",
    "Claims",
    "Payments",
    "PaymentHistory",
    "Values",
    "ciudadDTO",
    "CodigoValorDTO",
    "Summaries",
    "Versiones",
    "Items",
    "Cuils",
    "EarnedCommissions",
    "ListJobSummary",
    "coverages",
    "cropRisksCatalog",
    "tillageTypes",
    "exchangeTypes",
    "paymentCatalog",
  ]) {
    if (Array.isArray(row[key])) return asList(row[key]);
  }
  return [];
}

export function textOf(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const row = asDict(value);
  return String(
    row.Description ||
      row.description ||
      row.Valor ||
      row.Name ||
      row.DisplayName ||
      row.Code ||
      row.Producer ||
      ""
  ).trim();
}

export function moneyOf(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
      value
    );
  }
  const row = asDict(value);
  if (typeof row.Amount === "number") {
    const currency = String(row.Currency || "ARS").toUpperCase();
    if (typeof row.Description === "string" && row.Description.trim()) return row.Description;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency === "ARS" ? "ARS" : currency,
      maximumFractionDigits: 2,
    }).format(row.Amount);
  }
  return textOf(value) || "—";
}

export function dateOf(value: unknown): string {
  const raw = textOf(value);
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function pickProducer(payload: unknown) {
  const root = asDict(payload);
  const producers = asList(root.producers);
  const first = producers[0] || {};
  const infoRoot = asDict(root.info);
  const info = asDict(infoRoot.producerInfo || infoRoot.ProducerInfo || infoRoot);
  return {
    name: textOf(first.Producer) || textOf(info.Name) || textOf(info.DisplayName) || "Productor",
    code: textOf(root.producerCode) || textOf(first.Code) || "08-006051",
    taxId: textOf(first.TaxId) || textOf(info.TaxID) || textOf(info.TaxId) || "—",
    type: textOf(first.TypeCode) || "productor_asesor",
    organizer: textOf(info.OrganizerName) || "—",
    organizerCode: textOf(info.OrganizerCode) || "—",
    channel: textOf(info.DistributionChannel) || "—",
    env: textOf(root.env) || "UAT",
  };
}

const POLICY_LABELS: Record<string, string> = {
  PolicyNumber: "Póliza",
  InsuredName: "Asegurado",
  InsuredDocument: "Documento",
  InsuredDocumentType: "Tipo doc.",
  PolicyType: "Ramo",
  State: "Estado",
  ProducerCode: "Productor",
  OrganizerCode: "Organizador",
  TypeOfContracting: "Contratación",
  RamoDescripcion: "Ramo",
  PeriodStart: "Vigencia desde",
  PeriodEnd: "Vigencia hasta",
  PaymentMethod: "Pago",
  PaymentFees: "Cuotas",
  PolicyPeriodId: "Período",
  JobNumber: "Propuesta",
  QuoteId: "Cotización",
  ProductOffering: "Cobertura",
  ProductCode: "Código",
  TotalPremium: "Prima",
  TotalCost: "Costo total",
  Cotizo: "Cotizó",
};

export function labelOf(key: string) {
  return POLICY_LABELS[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function rowsFrom(value: unknown, keys?: string[]) {
  const row = asDict(value);
  const list = keys || Object.keys(row);
  return list
    .map((key) => {
      const raw = row[key];
      if (raw == null || raw === "") return null;
      if (Array.isArray(raw)) {
        if (!raw.length) return null;
        return { key, label: labelOf(key), value: `${raw.length} ítem${raw.length === 1 ? "" : "s"}` };
      }
      if (typeof raw === "object") {
        const nested = asDict(raw);
        if (typeof nested.Amount === "number") return { key, label: labelOf(key), value: moneyOf(raw) };
        const label = textOf(raw);
        if (!label) return null;
        return { key, label: labelOf(key), value: label };
      }
      if (typeof raw === "boolean") return { key, label: labelOf(key), value: raw ? "Sí" : "No" };
      if (key.toLowerCase().includes("date") || key.includes("Period") || key.includes("Start") || key.includes("End")) {
        return { key, label: labelOf(key), value: dateOf(raw) };
      }
      return { key, label: labelOf(key), value: String(raw) };
    })
    .filter((item): item is { key: string; label: string; value: string } => Boolean(item));
}

export function catalogItems(data: unknown, key: string) {
  const root = asDict(data);
  const list = Array.isArray(root[key]) ? (root[key] as Dict[]) : asList(data);
  return list
    .map((row) => ({
      id: Number(row.id || row.ID || 0),
      description: textOf(row.description || row.name || row.VersionDescripcion || row.NombreCompleto),
      infoAutoCode: String(row.infoAutoCode || row.CodigoInfoAuto || ""),
      statedAmount: typeof row.statedAmount === "number" ? row.statedAmount : Number(row.Precio || 0) || undefined,
    }))
    .filter((item) => item.id || item.description);
}
