import { findLeadIdByPhone } from "@/lib/chatbot/persist-lead";
import { scoreLead } from "@/lib/crm/utils";
import { isVisitorId } from "@/lib/cookies/visitor";
import { createServiceClient } from "@/lib/supabase/server";

export type CookieVisitInput = {
  visitorId: string;
  nombre?: string | null;
  celular?: string | null;
  email?: string | null;
  edad?: number | null;
  patente?: string | null;
  interes?: string | null;
  pagePath?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  userAgent?: string | null;
  leadId?: string | null;
  landing?: string | null;
  pages?: string | null;
  recorrido?: string | null;
  visitas?: number | null;
};

function clip(value: string | null | undefined, max = 240) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function clipEnd(value: string | null | undefined, max: number) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length <= max ? text : text.slice(text.length - max);
}

function phoneOk(value: string | null) {
  return (value || "").replace(/\D/g, "").length >= 8;
}

function outsideReferrer(value: string | null) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (!host || host === "localhost" || host.endsWith("marxen.com.ar")) return null;
    return value;
  } catch {
    return null;
  }
}

async function ensureLead(input: CookieVisitInput) {
  const nombre = clip(input.nombre, 120);
  const celular = clip(input.celular, 40);
  if (!nombre || nombre.length < 2 || !celular || !phoneOk(celular)) return input.leadId || null;

  const supabase = createServiceClient();
  const existingId = input.leadId || (await findLeadIdByPhone(celular));
  if (existingId) return existingId;

  const notas = [
    "Dejó el WhatsApp en el sitio.",
    input.patente ? `Patente ${input.patente}.` : "",
    input.interes ? `Interés: ${input.interes}.` : "",
    input.utmSource ? `Vino de ${clip(input.utmSource, 80)}.` : "",
    input.visitas && input.visitas > 1 ? `Volvió ${input.visitas} veces.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const payload = {
    nombre,
    celular,
    email: clip(input.email, 160),
    edad: input.edad && input.edad >= 18 && input.edad <= 99 ? input.edad : null,
    producto: input.interes === "auto" ? ("seguros" as const) : ("general" as const),
    plan_interes: input.interes || null,
    origen: "web" as const,
    origen_detalle: "cookie",
    page_path: clip(input.pagePath, 180),
    user_agent: clip(input.userAgent, 240),
    utm_source: clip(input.utmSource, 80),
    utm_medium: clip(input.utmMedium, 80),
    utm_campaign: clip(input.utmCampaign, 80),
    notas_iniciales: notas,
    prioridad: "media" as const,
    modalidad: "no_aplica" as const,
    tags: ["cookie"],
  };
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, puntaje: scoreLead(payload) })
    .select("id")
    .single();
  if (error || !data?.id) {
    console.error("[cookie-visita][lead]", error?.message || "sin id");
    return null;
  }
  await supabase.from("actividades").insert({
    lead_id: data.id,
    tipo: "nota",
    titulo: "Aviso del sitio",
    detalle: notas,
    autor: "web",
  });
  return String(data.id);
}

type PreviousVisit = {
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  landing_path?: string | null;
  pages?: string | null;
  visitas_count?: number | null;
};

async function previousVisit(visitorId: string): Promise<PreviousVisit | null> {
  const supabase = createServiceClient();
  const full = await supabase
    .from("cookie_visitas")
    .select("referrer, utm_source, utm_medium, utm_campaign, landing_path, pages, visitas_count")
    .eq("visitor_id", visitorId)
    .maybeSingle();
  if (!full.error) return full.data;
  const base = await supabase
    .from("cookie_visitas")
    .select("referrer, utm_source, utm_medium, utm_campaign")
    .eq("visitor_id", visitorId)
    .maybeSingle();
  return base.data;
}

export async function saveCookieVisit(input: CookieVisitInput) {
  if (!isVisitorId(input.visitorId)) return null;
  const supabase = createServiceClient();
  const previous = await previousVisit(input.visitorId);
  const leadId = await ensureLead({
    ...input,
    utmSource: previous?.utm_source || input.utmSource,
  });
  const seen = new Date().toISOString();
  const visitas = Math.max(previous?.visitas_count || 0, input.visitas && input.visitas > 0 ? input.visitas : 1);
  const row = {
    visitor_id: input.visitorId,
    consentimiento: "aceptado",
    consented_at: seen,
    nombre: clip(input.nombre, 120),
    celular: clip(input.celular, 40),
    email: clip(input.email, 160),
    edad: input.edad && input.edad > 0 && input.edad <= 120 ? Math.round(input.edad) : null,
    patente: clip(input.patente, 12),
    interes: clip(input.interes, 40),
    page_path: clip(input.pagePath, 180),
    referrer: previous?.referrer || outsideReferrer(clip(input.referrer, 240)),
    utm_source: previous?.utm_source || clip(input.utmSource, 80),
    utm_medium: previous?.utm_medium || clip(input.utmMedium, 80),
    utm_campaign: previous?.utm_campaign || clip(input.utmCampaign, 80),
    user_agent: clip(input.userAgent, 240),
    lead_id: leadId,
    landing_path: previous?.landing_path || clip(input.landing, 180),
    pages: clip(input.pages, 240) || previous?.pages || null,
    recorrido: clipEnd(input.recorrido, 1000),
    last_seen_at: seen,
    visitas_count: visitas,
  };
  const filled = Object.fromEntries(Object.entries(row).filter(([, value]) => value != null));
  const extras = ["landing_path", "pages", "last_seen_at", "visitas_count", "recorrido"];
  let payload = { ...filled };
  let error: { message: string } | null = null;
  for (let attempt = 0; attempt < extras.length; attempt += 1) {
    const result = await supabase.from("cookie_visitas").upsert(payload, { onConflict: "visitor_id" });
    error = result.error;
    if (!error) break;
    const missing = extras.find((key) => error?.message.includes(key));
    if (!missing) break;
    delete payload[missing];
  }
  if (error) {
    console.error("[cookie-visita]", error.message);
    return null;
  }
  return leadId;
}
