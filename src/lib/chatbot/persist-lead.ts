import { createServiceClient } from "@/lib/supabase/server";
import type { LeadOrigen, ModalidadIngreso, ProductoInteres } from "@/lib/crm/types";
import { scoreLead } from "@/lib/crm/utils";
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
  return data.producto === "salud" ? "sin_definir" : "no_aplica";
}

function toProducto(data: QuoteData): ProductoInteres {
  return data.producto || "general";
}

function planInteres(data: QuoteData): string {
  const producto = toProducto(data);
  if (producto === "salud") {
    const extra = [data.grupoFamiliar, data.uso].filter(Boolean).join(" · ");
    return extra ? `Salud · ${extra}` : "Salud · consulta chatbot";
  }
  if (producto === "seguros") {
    if (data.seguroGrupo === "auto") {
      const car =
        data.seguroDetalle ||
        [data.auto?.year, data.auto?.brand?.description, data.auto?.model?.description]
          .filter(Boolean)
          .join(" ");
      const plan = data.auto?.planElegido;
      const extra = [car, plan].filter(Boolean).join(" · ");
      return extra ? `Seguros · Auto · ${extra}` : "Seguros · Auto";
    }
    const ramo =
      data.seguroGrupo === "auto_moto"
        ? "Moto"
        : data.seguroGrupo === "hogar_comercio"
          ? "Hogar/Comercio"
          : data.seguroGrupo === "praxis_art_ap"
            ? "Mala Praxis / ART / AP"
            : null;
    return ramo ? `Seguros · ${ramo}` : "Seguros · consulta chatbot";
  }
  if (producto === "viajero") {
    return data.viajeroDestino
      ? `Viajero · ${data.viajeroDestino}`
      : "Viajero · consulta chatbot";
  }
  return "Consulta chatbot";
}

function buildPayload(
  data: QuoteData,
  notas: string,
  tags: string[],
  channel?: QuoteState["channel"]
) {
  const producto = toProducto(data);
  const payload = {
    nombre: data.nombre!,
    celular: data.celular!,
    edad: parseEdadTitular(data.edades),
    localidad: data.localidad || null,
    provincia: "Salta",
    producto,
    plan_interes: planInteres(data),
    coberturas:
      [
        data.seguroDetalle,
        data.auto?.planElegido,
        data.viajeroDestino,
        data.prepaga,
        data.uso,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    modalidad: toModalidad(data),
    origen: (channel === "whatsapp" ? "whatsapp" : "web") as LeadOrigen,
    origen_detalle: "chatbot",
    estado: "interesado" as const,
    prioridad: "urgente" as const,
    tags,
    notas_iniciales: notas,
    page_path: channel === "whatsapp" ? "/whatsapp" : "/chatbot",
    proximo_contacto_at: new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toISOString(),
  };
  return { ...payload, puntaje: scoreLead(payload) };
}

export async function upsertHotLeadFromQuote(state: QuoteState) {
  const data = state.data;
  if (!data.nombre || !data.celular) {
    throw new Error("Faltan nombre o celular para guardar el lead.");
  }

  const supabase = createServiceClient();
  const notas = buildNotas(data, "Estado: LEAD CALIENTE · listo para cotizar");
  const tags = ["chatbot", "caliente", "cotizar", toProducto(data)];
  const payload = buildPayload(data, notas, tags, state.channel);

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

  const producto = toProducto(data);
  const tags = ["chatbot", "caliente", "cotizar", producto, "completo"];
  const patch = {
    localidad: data.localidad || null,
    provincia: "Salta",
    producto,
    plan_interes: planInteres(data),
    coberturas: [data.seguroDetalle, data.auto?.planElegido, data.viajeroDestino, data.prepaga, data.uso]
      .filter(Boolean)
      .join(" · ") || null,
    notas_iniciales: notas,
    tags,
    prioridad: "urgente" as const,
    modalidad: toModalidad(data),
    edad: parseEdadTitular(data.edades),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("leads")
    .update({
      ...patch,
      puntaje: scoreLead({
        ...patch,
        estado: "interesado",
        origen_detalle: "chatbot",
      }),
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
