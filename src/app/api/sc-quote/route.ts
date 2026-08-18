import { NextResponse } from "next/server";
import {
  appliedDiscountPct,
  campaignFor,
  contactEmail,
  getProducer,
  originalPrice,
  parseArPhone,
  scGet,
  scPost,
  tracking,
  type Location,
} from "@/lib/sc";

const HOGAR_COPY: Record<string, { title: string; description: string; mostChosen: boolean }> = {
  "Plan Standard": {
    title: "Hogar Standard",
    description: "Protección esencial de tu vivienda: incendio, rayo y responsabilidad civil.",
    mostChosen: false,
  },
  "Plan Plus": {
    title: "Hogar Plus",
    description: "Suma robo, cristales, daños por agua y servicios de urgencia para tu casa.",
    mostChosen: true,
  },
  "Plan Premium": {
    title: "Hogar Premium",
    description: "La cobertura más completa para tu hogar, tus pertenencias y tus equipos.",
    mostChosen: false,
  },
};

const AP_PLANS = [
  {
    key: "base",
    title: "AP Prestacional Base",
    description:
      "Cobertura básica para independientes y cuentapropistas: muerte accidental, invalidez y asistencia médico farmacéutica.",
    mostChosen: false,
  },
  {
    key: "plus",
    title: "AP Prestacional Plus",
    description: "Más protección para tu trabajo diario, a un precio moderado.",
    mostChosen: true,
  },
  {
    key: "completo",
    title: "AP Prestacional Completo",
    description: "La cobertura más completa para tu actividad, las 24 horas.",
    mostChosen: false,
  },
];

function resourceMap(landing: { resources?: { resourceType: string; desktopValue?: string }[] }) {
  const map: Record<string, string> = {};
  for (const row of landing.resources || []) {
    if (row.resourceType && row.desktopValue) map[row.resourceType] = row.desktopValue;
  }
  return map;
}

function stripHtml(html: string) {
  return html
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const product = url.searchParams.get("product");
  const postalCode = url.searchParams.get("postalCode") || "";

  try {
    if (product === "location" && postalCode) {
      const data = await scGet(`/location?criteria=${encodeURIComponent(postalCode)}`, {
        cache: "no-store",
      });
      return NextResponse.json({
        locations: (data as { locations?: Location[] }).locations || [],
      });
    }

    if (product === "hogar") {
      const [templates, producer] = await Promise.all([
        scGet("/Quote/templates", { next: { revalidate: 1800 } }),
        getProducer(),
      ]);
      const campaign = campaignFor(producer, "Hogar");
      const discount = appliedDiscountPct(campaign.commercialAlternative);
      const plans = (templates.templates || []).map(
        (row: { planCode: string; productName: string; totalCost: number; paymentFee: number }) => {
          const monthly = Math.round(Number(row.totalCost) / Math.max(1, Number(row.paymentFee) || 1));
          const copy = HOGAR_COPY[row.planCode] || {
            title: row.productName,
            description: "Cobertura de hogar San Cristóbal.",
            mostChosen: false,
          };
          return {
            key: row.planCode,
            title: copy.title,
            description: copy.description,
            mostChosen: copy.mostChosen,
            monthly,
            original: discount > 0 ? originalPrice(monthly, campaign.commercialAlternative) : null,
            discount,
          };
        }
      );
      return NextResponse.json({ plans, appliedDiscount: discount });
    }

    if (product === "moto") {
      const landing = await scGet("/Landing/resources-by-subBranch/Moto", {
        next: { revalidate: 1800 },
      });
      const ranges = (landing.insuredValues || []).map(
        (row: {
          sliderTitle: string;
          sliderIndex: number;
          coverages: { title: string; description: string }[];
        }) => ({
          id: String(row.sliderIndex),
          label: row.sliderTitle,
          plans: (row.coverages || []).map((c, i) => ({
            key: `${row.sliderIndex}-${i}`,
            title: c.title,
            description: c.description,
            mostChosen: c.title.toLowerCase().includes("premium"),
            monthly: null,
            original: null,
            discount: 0,
          })),
        })
      );
      const copy = resourceMap(landing);
      const vehicleInput = (landing.inputsCustom || [])[0] || {};
      return NextResponse.json({
        landingId: landing.id,
        title: copy.Title || "Asegurá tu moto en San Cristóbal.",
        subtitle: stripHtml(copy.InsurenceDescription || "").split("\n")[0],
        formTitle: copy.FormTitle || "¿Cuál es la cilindrada de tu moto?",
        vehicleLabel: vehicleInput.label || "Marca, modelo y año",
        vehiclePlaceholder: vehicleInput.placeholder || "ej: Honda XR 150, 2019",
        ranges,
      });
    }

    if (product === "ap") {
      const landing = await scGet("/Landing/resources-by-subBranch/accidentes-personales", {
        next: { revalidate: 1800 },
      });
      const copy = resourceMap(landing);
      const activityInput = (landing.inputsCustom || [])[0] || {};
      return NextResponse.json({
        landingId: landing.id,
        title: copy.Title || "Protegé tu día a día ante accidentes",
        subtitle: stripHtml(copy.InsurenceDescription || "").split("\n")[0],
        formTitle: copy.FormTitle || "Solicitá tu cotización y asesorate con expertos.",
        activityLabel: activityInput.label || "Rubro o actividad a cotizar",
        activityPlaceholder: activityInput.placeholder || "Actividad",
        plans: AP_PLANS.map((p) => ({ ...p, monthly: null, original: null, discount: 0 })),
      });
    }

    if (product === "comercio") {
      const landing = await scGet("/Landing/resources-by-subBranch/integral-de-comercio", {
        next: { revalidate: 1800 },
      });
      const copy = resourceMap(landing);
      return NextResponse.json({
        landingId: landing.id,
        title: copy.Title || "Un seguro a la medida de tu negocio",
        subtitle:
          copy.Subtitle || copy.FormTitle || "Solicitá tu cotización y asesorate con expertos.",
        plans: [
          {
            key: "integral",
            title: "Integral de Comercio",
            description:
              "Protege mercadería, mobiliario, incendio, robo y responsabilidad civil. Incluye asistencia 24 h.",
            mostChosen: true,
            monthly: null,
            original: null,
            discount: 0,
          },
        ],
      });
    }

    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar San Cristóbal" }, { status: 502 });
  }
}

const LANDING_IDS: Record<string, number> = {
  moto: 218,
  ap: 356,
  comercio: 325,
};

type QuoteBody = {
  product: string;
  nombre: string;
  celular: string;
  location: Location;
  landingId?: number;
  plan?: { key: string; title: string; monthly?: number | null };
  hogar?: { planCode: string; title: string; monthly: number | null };
  moto?: { cc: string; vehicle: string };
  ap?: { actividad: string; workers: number; period: number; isMotorcycle: boolean };
  comercio?: { rubro?: string };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuoteBody;
    const nombre = String(body.nombre || "").trim();
    const celular = String(body.celular || "").trim();
    const location = body.location;
    if (!body.product || !nombre || !celular || !location?.locationId) {
      return NextResponse.json({ error: "Faltan datos para cotizar" }, { status: 400 });
    }
    const phone = parseArPhone(celular);
    if (!phone) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }

    const producer = await getProducer();
    const track = tracking(producer);
    const email = contactEmail(phone);
    const address = {
      cityKey: location.synonymous,
      cityName: location.description,
      stateKey: location.stateKey,
      postalCode: Number(location.zipCode) || Number(String(location.zipCode)),
    };

    if (body.product === "hogar") {
      const plan = body.hogar;
      if (!plan?.planCode) {
        return NextResponse.json({ error: "Elegí un plan" }, { status: 400 });
      }
      const campaign = campaignFor(producer, "Hogar");
      const data = await scPost("/Opportunity/SaveCombinedFamily", {
        landingId: null,
        opportunitiesId: 0,
        ...track,
        email,
        documentNumber: null,
        stateId: 1,
        commercialAlternative: campaign.commercialAlternative,
        name: nombre,
        branch: "Hogar",
        phoneAreaCode: phone.area,
        phoneNumber: phone.number,
        postalCode: address.postalCode,
        cityName: address.cityName,
        stateKey: address.stateKey,
        cityKey: address.cityKey,
        isRead: false,
        riskData: {
          combinedFamilyId: plan.planCode === "Plan Premium" ? 3 : plan.planCode === "Plan Plus" ? 2 : 1,
          combinedFamilyName: plan.title,
          price: Number(plan.monthly) || 0,
          locationId: location.locationId,
          basicPlanCode: plan.planCode,
          additionalPlanCode: null,
          coverages: [{ title: plan.title, description: "" }],
        },
        affinityGroupId: campaign.affinityGroupId,
      });
      return NextResponse.json({
        ok: true,
        opportunityId: (data as { opportunitiesId?: number })?.opportunitiesId || null,
      });
    }

    const landingId = Number(body.landingId) || LANDING_IDS[body.product] || 0;
    if (!landingId) {
      return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
    }

    const branch =
      body.product === "moto"
        ? "Moto"
        : body.product === "ap"
          ? "Accidentes Personales"
          : "Integral de Comercio";

    const customInputs = [];
    if (body.moto?.vehicle) {
      customInputs.push({
        CustomRiskValue: body.moto.vehicle,
        CustomRiskLabel: "Marca, modelo y año",
      });
    }
    if (body.ap?.actividad) {
      customInputs.push({
        CustomRiskValue: `${body.ap.actividad} · ${body.ap.workers} persona(s) · ${body.ap.period} meses${body.ap.isMotorcycle ? " · usa moto" : ""}`,
        CustomRiskLabel: "Rubro o actividad a cotizar",
      });
    }
    if (body.comercio?.rubro) {
      customInputs.push({
        CustomRiskValue: body.comercio.rubro,
        CustomRiskLabel: "Rubro",
      });
    }

    const data = await scPost("/Landing/generic-opportunity", {
      email,
      ...track,
      producerCUIT: producer.cuit,
      branch,
      subBranch: branch,
      cityKey: address.cityKey,
      stateKey: address.stateKey,
      cityName: address.cityName,
      postalCode: String(address.postalCode),
      phoneAreaCode: phone.area,
      phoneNumber: phone.number,
      stateId: 1,
      affinityGroupId: null,
      name: nombre,
      monthlyCost: body.plan?.monthly || 0,
      landingId,
      customInput: {
        paymentFee: body.product === "moto" ? "1" : null,
        sliderValue: body.moto?.cc || body.plan?.title || null,
        inputs: customInputs,
      },
      coverages: body.plan ? [{ title: body.plan.title }] : null,
      commercialAlternative: 0,
    });

    return NextResponse.json({
      ok: true,
      opportunityId:
        (data as { opportunityId?: number; opportunitiesId?: number })?.opportunityId ||
        (data as { opportunitiesId?: number })?.opportunitiesId ||
        null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo cotizar" },
      { status: 502 }
    );
  }
}
