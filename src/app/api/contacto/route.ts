import { NextResponse } from "next/server";
import { findLeadIdByPhone } from "@/lib/chatbot/persist-lead";
import { scoreLead } from "@/lib/crm/utils";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

function destination(request: Request, query: string) {
  const referer = request.headers.get("referer") || "";
  let path = "/formulario";
  try {
    const ref = new URL(referer);
    if (ref.pathname === "/contacto" || ref.pathname.startsWith("/contacto/")) path = "/contacto";
  } catch {
    path = "/formulario";
  }
  const url = new URL(path, request.url);
  url.search = query;
  return url;
}

function utmFrom(request: Request) {
  const referer = request.headers.get("referer") || "";
  try {
    const ref = new URL(referer);
    return {
      utm_source: ref.searchParams.get("utm_source"),
      utm_medium: ref.searchParams.get("utm_medium"),
      utm_campaign: ref.searchParams.get("utm_campaign"),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

async function notifyProducer(input: { celular: string; notas: string; leadId: string }) {
  try {
    const { getProducerWhatsapp } = await import("@/lib/whatsmeow/producer-notify");
    const { sendWhatsmeowText } = await import("@/lib/whatsmeow/client");
    const { getWhatsmeowAgentCode } = await import("@/lib/whatsmeow/config");
    const producer = getProducerWhatsapp();
    if (!producer) return;
    const text = [
      "📞 *Nuevo contacto web*",
      `Tel: ${input.celular}`,
      input.notas ? `Mensaje: ${input.notas}` : null,
      `CRM: https://www.marxen.com.ar/crm/leads/${input.leadId}`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendWhatsmeowText(getWhatsmeowAgentCode(), producer, text, { wake: true });
  } catch {
    // El aviso al asesor no bloquea el alta del lead.
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const celular = normalizeArPhone(String(form.get("phone_number") || ""));
  const notas = String(form.get("message") || "").trim().slice(0, 500);
  if (!celular || celular.length < 10) {
    return NextResponse.redirect(destination(request, "error=1"), 303);
  }

  const utm = utmFrom(request);
  const referer = request.headers.get("referer") || "";
  let pagePath = "/formulario";
  try {
    const ref = new URL(referer);
    if (ref.pathname === "/contacto") pagePath = "/contacto";
  } catch {
    pagePath = "/formulario";
  }
  const fromAds = /facebook|instagram|meta|fb|ig/i.test(
    `${utm.utm_source || ""} ${utm.utm_medium || ""}`
  );
  const payload = {
    nombre: "Contacto web",
    celular,
    producto: "general" as const,
    origen: (fromAds ? "redes" : "web") as "redes" | "web",
    origen_detalle: "formulario",
    prioridad: "alta" as const,
    modalidad: "no_aplica" as const,
    notas_iniciales: notas || "Pidió que lo contacten desde el formulario.",
    page_path: pagePath,
    tags: ["formulario"],
    ...utm,
  };

  const supabase = createServiceClient();
  const existingId = await findLeadIdByPhone(celular);
  let leadId = existingId;

  if (existingId) {
    const { error } = await supabase
      .from("leads")
      .update({
        notas_iniciales: payload.notas_iniciales,
        prioridad: "alta",
        origen_detalle: "formulario",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId);
    if (error) {
      return NextResponse.redirect(destination(request, "error=1"), 303);
    }
  } else {
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...payload, puntaje: scoreLead(payload) })
      .select("id")
      .single();
    if (error || !data?.id) {
      return NextResponse.redirect(destination(request, "error=1"), 303);
    }
    leadId = String(data.id);
  }

  if (leadId) await notifyProducer({ celular, notas, leadId });
  return NextResponse.redirect(destination(request, "enviado=1"), 303);
}
