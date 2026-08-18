import { NextResponse } from "next/server";

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

type QuoteRow = {
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

async function scGet(path: string, revalidate = 3600) {
  const res = await fetch(`${SC_API}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`SC ${res.status}`);
  return res.json();
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
    ? matched.filter((q) => q.product?.franchiseType === "amount").concat(
        matched.filter((q) => q.product?.franchiseType !== "amount")
      )
    : matched;
  if (pool.length === 0) return null;
  if (!franchise) return pool[0];
  const amount = pool.filter((q) => q.product?.franchiseType === "amount");
  const list = amount.length > 0 ? amount : pool;
  return list.reduce((best, q) => (q.monthlyCost < best.monthlyCost ? q : best));
}

function statedAmount(year: number, is0km: boolean, version: Record<string, unknown>) {
  const current = new Date().getFullYear();
  const used = Number(version.used0KmPrice) || 0;
  const stated = Number(version.statedAmount) || 0;
  if (year === current) {
    if (is0km || used === 0) return stated;
    return used;
  }
  return stated;
}

function parseArPhone(raw: string) {
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const year = url.searchParams.get("year") || "";
  const brandId = url.searchParams.get("brandId") || "";
  const modelId = url.searchParams.get("modelId") || "";
  const postalCode = url.searchParams.get("postalCode") || "";

  let target = "";
  if (kind === "brands" && year) {
    target = `${SC_API}/InfoAuto/brands-highlight-by-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A`;
  } else if (kind === "models" && year && brandId) {
    target = `${SC_API}/InfoAuto/model-by-brand-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A&brandId=${encodeURIComponent(brandId)}`;
  } else if (kind === "versions" && year && brandId && modelId) {
    const params = new URLSearchParams({
      year,
      brandId,
      modelId,
      portalCategory: "A",
    });
    target = `${SC_API}/InfoAuto/versions-by-brand-model-year-and-portal-category?${params}`;
  } else if (kind === "location" && postalCode) {
    target = `${SC_API}/location?criteria=${encodeURIComponent(postalCode)}`;
  } else {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    const res = await fetch(
      target,
      kind === "location" ? { cache: "no-store" } : { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar San Cristóbal" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de red" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const is0km = Boolean(body.is0km);
    const brand = body.brand as { id: number; description: string };
    const model = body.model as { id: number; description: string };
    const version = body.version as Record<string, unknown>;
    const location = body.location as {
      locationId: number;
      description: string;
      stateKey: string;
      synonymous: string;
      zipCode: number;
    };
    const nombre = String(body.nombre || "").trim();
    const celular = String(body.celular || "").trim();

    if (!year || !brand?.id || !model?.id || !version?.id || !location?.locationId || !nombre || !celular) {
      return NextResponse.json({ error: "Faltan datos para cotizar" }, { status: 400 });
    }

    const phone = parseArPhone(celular);
    if (!phone) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }

    const producer = await getProducer();
    const amount = statedAmount(year, is0km, version);
    const email = `cotiza.${phone.area}${phone.number}@marxel.com.ar`;

    const payload = {
      isLanding: false,
      landingId: null,
      sourceId: "Sitio Seguro",
      subSourceId: "Web",
      token: null,
      affinityGroupId: producer.affinityGroupId,
      isCampaignEnabled: producer.isCampaignEnabled,
      contactData: {
        email,
        age: 35,
        firstName: nombre,
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
        utmCampaign: "cotizador-web",
        gclid: null,
      },
      commercialAlternative: producer.commercialAlternative,
      riskData: {
        accessoriesStatedAmount: 0,
        carDescription: `${year} ${version.fullCarDescripcion || ""}`,
        category: version.category,
        fuelCode: version.fuelCode,
        hasGnc: false,
        gpsProviderCode: null,
        gpsProviderDescription: null,
        infoAutoCode: version.infoAutoCode,
        is0km,
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
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo obtener la cotización" }, { status: 502 });
    }

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
      };
    }).filter(Boolean);

    if (plans.length === 0) {
      return NextResponse.json(
        { error: "No hay planes disponibles para este vehículo" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      opportunityId: data.opportunityId,
      statedAmount: amount,
      carDescription: `${year} ${version.fullCarDescripcion || ""}`,
      appliedDiscount: discount,
      plans,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo cotizar" }, { status: 502 });
  }
}
