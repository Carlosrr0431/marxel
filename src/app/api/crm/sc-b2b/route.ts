import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import {
  ScB2bError,
  agriCatalog,
  agriQuoteAndIssue,
  agriQuoteResult,
  argentineProvinces,
  citiesByPostalCode,
  claimByNumber,
  claimsByProducer,
  claimsNews,
  cuilsByDni,
  currentProducers,
  downloadReport,
  earnedCommissions,
  isScB2bConfigured,
  issueAtm,
  issueCa7,
  issueCp7,
  motoVersion,
  paymentHistory,
  policyByNumber,
  policyDetailByProduct,
  producerAffinity,
  producerCode,
  producerInfo,
  producerMovements,
  producerPortfolio,
  quoteAtm,
  quoteCa7,
  quoteCp7,
  quoteLife,
  REPORT_PATHS,
  scB2bConfig,
  scB2bLoginProbe,
  searchPolicy,
  taxIdFromProducerPayload,
  typeList,
  vehicleVersion,
  type AgriCatalogKind,
  type ReportKind,
} from "@/lib/sc-b2b";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown) {
  const status = err instanceof ScB2bError ? err.status : 502;
  const message = err instanceof Error ? err.message : "No se pudo hablar con San Cristóbal";
  return NextResponse.json({ ok: false, error: message }, { status });
}

function q(request: NextRequest, key: string) {
  return (request.nextUrl.searchParams.get(key) || "").trim();
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

async function handleGet(request: NextRequest) {
  const action = q(request, "action") || "ping";

  if (action === "bootstrap") {
    if (!isScB2bConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Faltan credenciales B2B de San Cristóbal en el servidor." },
        { status: 503 }
      );
    }
    async function settle<T>(fn: () => Promise<T>) {
      try {
        return { ok: true as const, data: await fn() };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Error" };
      }
    }
    const login = await scB2bLoginProbe();
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const [producers, info, portfolio, products, postal, claims] = await Promise.all([
      settle(currentProducers),
      settle(() => producerInfo()),
      settle(producerPortfolio),
      settle(() => typeList("Product")),
      settle(() => citiesByPostalCode("4400")),
      settle(() => claimsByProducer(monthAgo.toISOString(), now.toISOString())),
    ]);
    const taxId = taxIdFromProducerPayload(producers.ok ? producers.data : null, info.ok ? info.data : null);
    const [affinity, movements] = await Promise.all([
      settle(() => producerAffinity("CA7CommAuto")),
      taxId
        ? settle(() => producerMovements(now.toISOString(), taxId))
        : Promise.resolve({ ok: true as const, data: { Policies: [] } }),
    ]);
    return NextResponse.json({
      ok: true,
      login,
      producers: producers.ok ? producers.data : [],
      info: info.ok ? info.data : null,
      producerCode: producerCode(),
      env: scB2bConfig().baseUrl.includes("uat") ? "UAT" : "prod",
      portfolio: portfolio.ok ? portfolio.data : { Policies: [] },
      affinity: affinity.ok ? affinity.data : { AffinityGroups: [] },
      products: products.ok ? products.data : { Values: [] },
      postal: postal.ok ? postal.data : { ciudadDTO: [] },
      movements: movements.ok ? movements.data : { Policies: [] },
      claims: claims.ok ? claims.data : { Claims: [] },
      warnings: [producers, info, portfolio, affinity, products, postal, movements, claims]
        .filter((row) => !row.ok)
        .map((row) => ("error" in row ? row.error : "")),
    });
  }

  if (action === "ping") {
    if (!isScB2bConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Faltan credenciales B2B de San Cristóbal en el servidor." },
        { status: 503 }
      );
    }
    const login = await scB2bLoginProbe();
    const [producers, info] = await Promise.all([currentProducers(), producerInfo()]);
    return NextResponse.json({
      ok: true,
      login,
      producers,
      info,
      producerCode: producerCode(),
      env: scB2bConfig().baseUrl.includes("uat") ? "UAT" : "prod",
    });
  }

  if (action === "producer") return NextResponse.json({ ok: true, data: await producerInfo(q(request, "producerCode") || undefined) });
  if (action === "portfolio") return NextResponse.json({ ok: true, data: await producerPortfolio() });
  if (action === "affinity") {
    return NextResponse.json({
      ok: true,
      data: await producerAffinity(
        q(request, "productCode") || "CA7CommAuto",
        q(request, "policyTypeCode") || undefined
      ),
    });
  }
  if (action === "movements") {
    const date = q(request, "date") || new Date().toISOString();
    const taxId = q(request, "taxId") || taxIdFromProducerPayload(await currentProducers());
    if (!taxId) {
      return NextResponse.json({ ok: false, error: "No se pudo obtener el CUIT del productor" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await producerMovements(date, taxId) });
  }
  if (action === "commissions") {
    const taxId = q(request, "taxId");
    const yearMonth = q(request, "yearMonth");
    if (!taxId || !yearMonth) {
      return NextResponse.json({ ok: false, error: "Hace falta CUIT y período AAAAMM" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      data: await earnedCommissions({ taxId, yearMonth, currencyCode: q(request, "currencyCode") || "ars" }),
    });
  }
  if (action === "postal") {
    const codigo = q(request, "codigo");
    if (!codigo) return NextResponse.json({ ok: false, error: "Falta el código postal" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await citiesByPostalCode(codigo) });
  }
  if (action === "provinces") return NextResponse.json({ ok: true, data: await argentineProvinces() });
  if (action === "padron") {
    const dni = q(request, "dni");
    if (!dni) return NextResponse.json({ ok: false, error: "Falta el DNI" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await cuilsByDni(dni) });
  }
  if (action === "typelist") {
    const name = q(request, "name");
    if (!name) return NextResponse.json({ ok: false, error: "Falta el nombre de la lista" }, { status: 400 });
    const extra: Record<string, string> = {};
    const product = q(request, "product");
    if (product) extra.product = product;
    return NextResponse.json({ ok: true, data: await typeList(name, extra) });
  }
  if (action === "policy") {
    const policyNumber = q(request, "policyNumber");
    if (!policyNumber) return NextResponse.json({ ok: false, error: "Falta el número de póliza" }, { status: 400 });
    const includePayments = q(request, "includePayments") === "1";
    const product = q(request, "product");
    const data = product
      ? await policyDetailByProduct(product, policyNumber)
      : await policyByNumber(policyNumber, includePayments);
    return NextResponse.json({ ok: true, data });
  }
  if (action === "policy-search") {
    const policyNumber = q(request, "policyNumber");
    if (!policyNumber) return NextResponse.json({ ok: false, error: "Falta el número de póliza" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await searchPolicy(policyNumber) });
  }
  if (action === "payments") {
    const policyNumber = q(request, "policyNumber");
    if (!policyNumber) return NextResponse.json({ ok: false, error: "Falta el número de póliza" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await paymentHistory(policyNumber) });
  }
  if (action === "claims") {
    const start = q(request, "start") || new Date(Date.now() - 30 * 86400000).toISOString();
    const end = q(request, "end") || new Date().toISOString();
    return NextResponse.json({ ok: true, data: await claimsByProducer(start, end) });
  }
  if (action === "claim") {
    const claimNumber = q(request, "claimNumber");
    if (!claimNumber) return NextResponse.json({ ok: false, error: "Falta el número de siniestro" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await claimByNumber(claimNumber) });
  }
  if (action === "claims-news") {
    const newsDate = q(request, "newsDate") || new Date().toISOString();
    return NextResponse.json({ ok: true, data: await claimsNews(newsDate) });
  }
  if (action === "vehicle-version") {
    const codigo = q(request, "codigoInfoauto");
    const anio = q(request, "anio");
    if (!codigo || !anio) {
      return NextResponse.json({ ok: false, error: "Faltan código Infoauto y año" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await vehicleVersion(codigo, anio) });
  }
  if (action === "moto-version") {
    const codigo = q(request, "codigoInfomoto");
    const anio = q(request, "anio");
    if (!codigo || !anio) {
      return NextResponse.json({ ok: false, error: "Faltan código Infomoto y año" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await motoVersion(codigo, anio) });
  }
  if (action === "agri-catalog") {
    const kind = (q(request, "kind") || "payment-methods") as AgriCatalogKind;
    const allowed: AgriCatalogKind[] = ["coverages", "payment-methods", "crop-risks", "exchange-type", "tillage-type"];
    if (!allowed.includes(kind)) {
      return NextResponse.json({ ok: false, error: "Catálogo agro inválido" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await agriCatalog(kind) });
  }
  if (action === "agri-result") {
    const id = q(request, "id");
    if (!id) return NextResponse.json({ ok: false, error: "Falta el id de cotización agro" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await agriQuoteResult(id) });
  }
  if (action === "report") {
    const kind = q(request, "kind") as ReportKind;
    if (!kind || !(kind in REPORT_PATHS)) {
      return NextResponse.json({ ok: false, error: "Tipo de reporte inválido" }, { status: 400 });
    }
    const query: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key === "action" || key === "kind") return;
      query[key] = value;
    });
    const file = await downloadReport(kind, query);
    return NextResponse.json({ ok: true, file });
  }

  return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
}

async function handlePost(request: NextRequest) {
  const payload = asRecord(await request.json().catch(() => ({})));
  const action = String(payload.action || "");
  const confirm = payload.confirm === true;

  if (action === "quote-ca7") {
    return NextResponse.json({
      ok: true,
      data: await quoteCa7({
        taxId: String(payload.taxId || ""),
        officialIdType: payload.officialIdType ? String(payload.officialIdType) : undefined,
        gender: payload.gender ? String(payload.gender) : undefined,
        age: payload.age ? Number(payload.age) : undefined,
        postalCode: Number(payload.postalCode),
        locationState: String(payload.locationState || "AR_01"),
        infoautoCode: String(payload.infoautoCode || ""),
        year: Number(payload.year),
        is0Km: Boolean(payload.is0Km),
        hasGnc: Boolean(payload.hasGnc),
        hasGps: Boolean(payload.hasGps),
        statedAmount: payload.statedAmount ? Number(payload.statedAmount) : undefined,
        productCodes: Array.isArray(payload.productCodes)
          ? payload.productCodes.map((code) => String(code))
          : undefined,
        policyType: payload.policyType ? String(payload.policyType) : undefined,
      }),
    });
  }

  if (action === "quote-cp7") {
    return NextResponse.json({
      ok: true,
      data: await quoteCp7({
        taxId: String(payload.taxId || ""),
        officialIdType: payload.officialIdType ? String(payload.officialIdType) : undefined,
        genre: payload.genre ? String(payload.genre) : undefined,
        policyTypeCode: payload.policyTypeCode ? String(payload.policyTypeCode) : undefined,
        basicPlanCode: payload.basicPlanCode ? String(payload.basicPlanCode) : undefined,
        postalCode: String(payload.postalCode || ""),
        state: String(payload.state || "AR_01"),
        city: payload.city ? String(payload.city) : undefined,
        email: payload.email ? String(payload.email) : undefined,
        phone: payload.phone ? String(payload.phone) : undefined,
      }),
    });
  }

  if (action === "quote-atm") {
    return NextResponse.json({ ok: true, data: await quoteAtm(payload.body) });
  }
  if (action === "quote-life") {
    return NextResponse.json({ ok: true, data: await quoteLife(payload.body) });
  }

  if (action === "issue-ca7" || action === "issue-cp7" || action === "issue-atm" || action === "agri-quote-issue") {
    if (!confirm) {
      return NextResponse.json(
        { ok: false, error: "La emisión pide confirmación explícita (confirm: true)." },
        { status: 400 }
      );
    }
    if (action === "issue-ca7") return NextResponse.json({ ok: true, data: await issueCa7(payload.body) });
    if (action === "issue-cp7") return NextResponse.json({ ok: true, data: await issueCp7(payload.body) });
    if (action === "issue-atm") return NextResponse.json({ ok: true, data: await issueAtm(payload.body) });
    return NextResponse.json({ ok: true, data: await agriQuoteAndIssue(payload.body) });
  }

  return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    return await handleGet(request);
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    return await handlePost(request);
  } catch (err) {
    return fail(err);
  }
}
