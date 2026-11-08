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
};

function clip(value: string | null | undefined, max = 240) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function phoneOk(value: string | null) {
  return (value || "").replace(/\D/g, "").length >= 8;
}

async function ensureLead(input: CookieVisitInput) {
  const nombre = clip(input.nombre, 120);
  const celular = clip(input.celular, 40);
  if (!nombre || nombre.length < 2 || !celular || !phoneOk(celular)) return input.leadId || null;

  const supabase = createServiceClient();
  const existingId = input.leadId || (await findLeadIdByPhone(celular));
  if (existingId) return existingId;

  const notas = [
    "Confirmó el aviso del sitio.",
    input.patente ? `Patente ${input.patente}.` : "",
    input.interes ? `Interés: ${input.interes}.` : "",
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

export async function saveCookieVisit(input: CookieVisitInput) {
  if (!isVisitorId(input.visitorId)) return null;
  const supabase = createServiceClient();
  const leadId = await ensureLead(input);
  const row = {
    visitor_id: input.visitorId,
    consentimiento: "aceptado",
    consented_at: new Date().toISOString(),
    nombre: clip(input.nombre, 120),
    celular: clip(input.celular, 40),
    email: clip(input.email, 160),
    edad: input.edad && input.edad > 0 && input.edad <= 120 ? Math.round(input.edad) : null,
    patente: clip(input.patente, 12),
    interes: clip(input.interes, 40),
    page_path: clip(input.pagePath, 180),
    referrer: clip(input.referrer, 240),
    utm_source: clip(input.utmSource, 80),
    utm_medium: clip(input.utmMedium, 80),
    utm_campaign: clip(input.utmCampaign, 80),
    user_agent: clip(input.userAgent, 240),
    lead_id: leadId,
  };
  const filled = Object.fromEntries(Object.entries(row).filter(([, value]) => value != null));
  const { error } = await supabase.from("cookie_visitas").upsert(filled, { onConflict: "visitor_id" });
  if (error) {
    console.error("[cookie-visita]", error.message);
    return null;
  }
  return leadId;
}
