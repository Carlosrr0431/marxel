const SC_API = "https://api.sancristobal.com.ar/marketing-marketing/api";
const PRODUCER_URL = "marxen-seguros";
const CARD_DISCOUNT = -7;

type Campaign = {
  commercialAlternative: number;
  affinityGroupId: number | null;
};

export type Producer = {
  cuit: string;
  code: string;
  organizerNumber: number;
  branchOffice: number;
  isCampaignEnabled: boolean;
  commercialAlternative: number;
  campaigns: Record<string, Campaign>;
};

type Cache = { at: number; producer: Producer };
let cache: Cache | null = null;

export async function scGet(path: string, init?: RequestInit) {
  const res = await fetch(`${SC_API}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `SC ${res.status}`);
  }
  return res.json();
}

export async function scPost(path: string, body: unknown) {
  const res = await fetch(`${SC_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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
    throw new Error((data as { error?: string[] })?.error?.[0] || `SC ${res.status}`);
  }
  return data;
}

function producerCode(branchOffice: number, number: number) {
  return `${String(branchOffice).padStart(2, "0")}-${String(number).padStart(6, "0")}`;
}

function asList(data: unknown) {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object" && Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: Record<string, unknown>[] }).value;
  }
  return [];
}

export async function getProducer() {
  const now = Date.now();
  if (cache && now - cache.at < 60 * 60 * 1000) return cache.producer;

  const producer = await scGet(`/Microsites/MyDataByUrl/${PRODUCER_URL}`, {
    next: { revalidate: 3600 },
  });
  const campaigns = asList(
    await scGet(`/DigitalCampaign/CurrentCampaignByCuit/${producer.cuit}`, {
      next: { revalidate: 3600 },
    })
  );

  const byBranch: Record<string, Campaign> = {};
  for (const row of campaigns) {
    const branch = row.branch as { name?: string } | undefined;
    const name = branch?.name || "";
    if (!name || Number(row.digitalCampaignId) <= 0) continue;
    byBranch[name] = {
      commercialAlternative: Number(row.commercialAlternative) || 0,
      affinityGroupId: row.affinityGroupId != null ? Number(row.affinityGroupId) : null,
    };
  }

  const mapped: Producer = {
    cuit: String(producer.cuit),
    code: producerCode(Number(producer.branchOffice), Number(producer.number)),
    organizerNumber: Number(producer.organizerNumber) || 900001,
    branchOffice: Number(producer.branchOffice) || 8,
    isCampaignEnabled: Boolean(producer.isCampaignEnabled),
    commercialAlternative: Number(producer.commercialAlternative) || 0,
    campaigns: byBranch,
  };
  cache = { at: now, producer: mapped };
  return mapped;
}

export function campaignFor(producer: Producer, branch: string): Campaign {
  return (
    producer.campaigns[branch] || {
      commercialAlternative: producer.commercialAlternative,
      affinityGroupId: null,
    }
  );
}

export function appliedDiscountPct(commercialAlternative: number) {
  if (commercialAlternative >= 0) return 0;
  return Math.round(100 * (1 - (1 + CARD_DISCOUNT / 100) * (1 + commercialAlternative / 100)));
}

export function originalPrice(monthly: number, commercialAlternative: number) {
  if (commercialAlternative >= 0) return monthly;
  return Math.round(monthly / (1 + commercialAlternative / 100));
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

export function contactEmail(phone: { area: number; number: number }) {
  return `cotiza.${phone.area}${phone.number}@marxel.com.ar`;
}

export type Location = {
  locationId: number;
  description: string;
  state: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};

export function tracking(producer: Producer) {
  return {
    sourceId: "Sitio Seguro",
    subSourceId: "Web",
    producerCUIT: producer.cuit,
    producerCode: producer.code,
    branchOffice: producer.branchOffice,
    organizerNumber: producer.organizerNumber,
    utm_source: "Sitio Seguro",
    utm_medium: "MARXEN",
    utm_campaign: "cotizador-web",
    token: null as string | null,
    gclid: null as string | null,
    gclId: null as string | null,
  };
}
