import { createServiceClient } from "@/lib/supabase/server";
import { findLeadIdByPhone } from "@/lib/chatbot/persist-lead";
import { mapInteresToProducto } from "@/lib/crm/types";
import { scoreLead } from "@/lib/crm/utils";
import { notifyProducerQuoteReady } from "@/lib/whatsmeow/producer-notify";

const SC_PATH = /\/cotizar|\/seguros/;
const SC_NOTES = /san crist[oó]bal/;
const SC_RAMO = /auto|moto|hogar|comercio|accidente|praxis|\bart\b|seguro/;

export type WebLeadInput = {
  nombre: string;
  celular: string;
  email?: string | null;
  dni?: string | null;
  edad?: number | null;
  provincia?: string | null;
  localidad?: string | null;
  interes?: string | null;
  notas?: string | null;
  pagePath?: string | null;
  userAgent?: string | null;
};

export function isSanCristobalQuoteLead(row: Record<string, unknown>) {
  const producto = String(row.producto || "").toLowerCase();
  if (producto === "salud" || producto === "viajero") return false;
  const path = String(row.page_path || "").toLowerCase();
  const plan = String(row.plan_interes || "").toLowerCase();
  const notas = String(row.notas_iniciales || "").toLowerCase();
  if (/viajero|viaje/.test(plan) && !SC_RAMO.test(plan)) return false;
  if (/salud|prepaga/.test(plan) && !SC_RAMO.test(plan)) return false;
  if (SC_PATH.test(path)) return true;
  if (SC_NOTES.test(notas)) return true;
  if (String(row.origen_detalle || "") === "chatbot") {
    return producto === "seguros" && /auto|moto|hogar|comercio|accidente|praxis|\bart\b|seguros/.test(plan);
  }
  return producto === "seguros" && (SC_RAMO.test(plan) || !plan);
}

export async function upsertWebLead(input: WebLeadInput) {
  const nombre = String(input.nombre || "").trim();
  const celular = String(input.celular || "").trim();
  if (!nombre || !celular) return null;

  const interes = String(input.interes || "").trim();
  const notas = String(input.notas || "").trim() || `Cotización web: ${interes || "general"}`;
  const payload = {
    nombre,
    celular,
    email: input.email || null,
    dni: input.dni || null,
    edad: input.edad ? Number(input.edad) : null,
    provincia: input.provincia || null,
    localidad: input.localidad || null,
    producto: mapInteresToProducto(interes),
    plan_interes: interes || null,
    origen: "web" as const,
    page_path: input.pagePath || null,
    user_agent: input.userAgent || null,
    notas_iniciales: notas,
    prioridad: "alta" as const,
    modalidad: "no_aplica" as const,
  };
  const puntaje = scoreLead(payload);
  const supabase = createServiceClient();
  const existingId = await findLeadIdByPhone(celular);

  if (existingId) {
    const patch: Record<string, unknown> = {
      nombre,
      producto: payload.producto,
      plan_interes: payload.plan_interes,
      notas_iniciales: notas,
      prioridad: "alta",
      puntaje,
      updated_at: new Date().toISOString(),
    };
    if (payload.email) patch.email = payload.email;
    if (payload.dni) patch.dni = payload.dni;
    if (payload.edad) patch.edad = payload.edad;
    if (payload.provincia) patch.provincia = payload.provincia;
    if (payload.localidad) patch.localidad = payload.localidad;
    if (payload.page_path) patch.page_path = payload.page_path;

    const { error } = await supabase.from("leads").update(patch).eq("id", existingId);
    if (error) throw error;

    await notifyProducerQuoteReady({
      leadId: existingId,
      canal: "Cotizador web",
      kind: "actualizacion",
      nombre,
      celular,
      email: payload.email,
      dni: payload.dni,
      edad: payload.edad,
      provincia: payload.provincia,
      localidad: payload.localidad,
      interes: interes || null,
      notas,
    });
    return existingId;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, puntaje })
    .select("id")
    .single();
  if (error) throw error;

  await notifyProducerQuoteReady({
    leadId: data.id,
    canal: "Cotizador web",
    nombre,
    celular,
    email: payload.email,
    dni: payload.dni,
    edad: payload.edad,
    provincia: payload.provincia,
    localidad: payload.localidad,
    interes: interes || null,
    notas,
  });
  return data.id as string;
}

export async function saveQuoteLeadSafe(input: WebLeadInput) {
  try {
    return await upsertWebLead(input);
  } catch (err) {
    console.error("[quote-lead]", err);
    return null;
  }
}
