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
    const { notifyProducerContactForm } = await import("@/lib/whatsmeow/producer-notify");
    await notifyProducerContactForm(input);
  } catch (err) {
    console.error("[contacto][whatsapp]", err instanceof Error ? err.message : err);
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
    const { data: current } = await supabase
      .from("leads")
      .select("notas_iniciales, estado")
      .eq("id", existingId)
      .maybeSingle();
    const previous = String(current?.notas_iniciales || "").trim();
    const estado = String(current?.estado || "");
    const { error } = await supabase
      .from("leads")
      .update({
        notas_iniciales: previous ? `${payload.notas_iniciales}\n\n${previous}` : payload.notas_iniciales,
        prioridad: "alta",
        origen_detalle: "formulario",
        page_path: pagePath,
        estado: estado === "perdido" || estado === "ganado" ? "nuevo" : estado || "nuevo",
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

  if (leadId) {
    await supabase.from("actividades").insert({
      lead_id: leadId,
      tipo: "nota",
      titulo: "Consulta del formulario",
      detalle: payload.notas_iniciales,
      autor: "web",
    });
    await notifyProducer({ celular, notas: payload.notas_iniciales, leadId });
  }
  return NextResponse.redirect(destination(request, "enviado=1"), 303);
}
