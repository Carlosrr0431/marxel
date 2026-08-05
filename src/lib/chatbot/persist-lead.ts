import { createServiceClient } from "@/lib/supabase/server";
import type { ModalidadIngreso } from "@/lib/crm/types";
import {
  buildNotas,
  parseEdadTitular,
  type QuoteData,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";

function toModalidad(data: QuoteData): ModalidadIngreso {
  if (data.modalidad === "monotributo") return "monotributo";
  if (data.modalidad === "relacion_dependencia") return "relacion_dependencia";
  if (data.modalidad === "particular") return "particular";
  return "sin_definir";
}

export async function upsertHotLeadFromQuote(state: QuoteState) {
  const data = state.data;
  if (!data.nombre || !data.celular) {
    throw new Error("Faltan nombre o celular para guardar el lead.");
  }

  const supabase = createServiceClient();
  const notas = buildNotas(data, "Estado: LEAD CALIENTE · listo para cotizar");
  const tags = ["chatbot", "caliente", "cotizar", "salud"];

  const payload = {
    nombre: data.nombre,
    celular: data.celular,
    edad: parseEdadTitular(data.edades),
    localidad: data.localidad || null,
    provincia: "Salta",
    producto: "salud" as const,
    plan_interes: "Prevención Salud · cotización chatbot",
    coberturas: data.prepaga || data.uso || null,
    modalidad: toModalidad(data),
    origen: "web" as const,
    origen_detalle: "chatbot",
    estado: "interesado" as const,
    prioridad: "urgente" as const,
    tags,
    notas_iniciales: notas,
    page_path: "/chatbot",
    proximo_contacto_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };

  if (state.leadId) {
    const { data: updated, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", state.leadId)
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("actividades").insert({
      lead_id: updated.id,
      tipo: "sistema",
      titulo: "Lead caliente actualizado desde chatbot",
      detalle: notas,
      autor: "chatbot",
      meta: { source: "chatbot", stage: "hot" },
    });

    return updated.id as string;
  }

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  // Seguimiento específico de cotización (el trigger ya crea WA inicial + actividad)
  await supabase.from("seguimientos").insert({
    lead_id: inserted.id,
    titulo: `Cotizar · ${data.nombre}`,
    descripcion: notas,
    tipo: "cotizacion",
    estado: "pendiente",
    prioridad: "urgente",
    programado_para: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    creado_por: "chatbot",
  });

  return inserted.id as string;
}

export async function updateLeadOptionalFromQuote(state: QuoteState) {
  if (!state.leadId) return;
  const data = state.data;
  const supabase = createServiceClient();
  const notas = buildNotas(data, "Estado: LEAD CALIENTE · datos opcionales cargados");

  const { error } = await supabase
    .from("leads")
    .update({
      localidad: data.localidad || null,
      provincia: "Salta",
      coberturas: [data.prepaga, data.uso].filter(Boolean).join(" · ") || null,
      notas_iniciales: notas,
      tags: ["chatbot", "caliente", "cotizar", "salud", "completo"],
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.leadId);

  if (error) throw error;

  await supabase.from("actividades").insert({
    lead_id: state.leadId,
    tipo: "nota",
    titulo: "Datos opcionales del chatbot",
    detalle: notas,
    autor: "chatbot",
    meta: { source: "chatbot", stage: "optional" },
  });
}
