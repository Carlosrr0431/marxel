import type { Lead, ProductoInteres } from "@/lib/crm/types";

export type ChatbotField = {
  key: string;
  label: string;
  value: string;
};

const LABELS: Record<string, string> = {
  Interés: "Producto",
  Ramo: "Ramo",
  "Detalle seguro": "Vehículo / actividad",
  Viaje: "Viaje",
  Nombre: "Nombre",
  WhatsApp: "WhatsApp",
  Localidad: "Localidad",
  "Situación laboral": "Situación laboral",
  "Categoría monotributo": "Categoría",
  "Sueldo bruto estimado": "Sueldo bruto",
  Cobertura: "Grupo",
  "Edades titular/grupo": "Edades",
  Busca: "Busca",
  "Prepaga/OS actual": "Prepaga actual",
  Estado: "Estado",
};

export function isChatbotLead(lead: Pick<Lead, "origen_detalle" | "tags">) {
  return (
    lead.origen_detalle === "chatbot" ||
    (lead.tags || []).includes("chatbot")
  );
}

export function parseChatbotNotas(notas: string | null | undefined): ChatbotField[] {
  if (!notas) return [];
  const fields: ChatbotField[] = [];
  for (const line of notas.split("\n")) {
    const trimmed = line.trim();
    const idx = trimmed.indexOf(":");
    if (idx < 1) continue;
    const labelRaw = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!value) continue;
    const label = LABELS[labelRaw];
    if (!label) continue;
    fields.push({ key: labelRaw, label, value });
  }
  return fields;
}

export function briefValue(fields: ChatbotField[], key: string) {
  return fields.find((f) => f.key === key)?.value || "";
}

export function briefSummary(fields: ChatbotField[]) {
  const parts = [
    briefValue(fields, "Interés"),
    briefValue(fields, "Ramo"),
    briefValue(fields, "Situación laboral"),
    briefValue(fields, "Cobertura"),
    briefValue(fields, "Localidad"),
    briefValue(fields, "Busca"),
    briefValue(fields, "Viaje"),
  ].filter(Boolean);
  return parts.slice(0, 4).join(" · ");
}

export function qualificationGaps(lead: Lead, fields: ChatbotField[]) {
  const gaps: string[] = [];
  if (!lead.celular) gaps.push("WhatsApp");
  if (!lead.localidad && !briefValue(fields, "Localidad")) gaps.push("Localidad");
  if (lead.producto === "salud") {
    if (!lead.modalidad || lead.modalidad === "sin_definir") {
      gaps.push("Situación laboral");
    }
    if (!briefValue(fields, "Edades titular/grupo") && !lead.edad) {
      gaps.push("Edades");
    }
    if (!briefValue(fields, "Busca") && !lead.coberturas) {
      gaps.push("Qué busca");
    }
  }
  if (lead.producto === "seguros" && !briefValue(fields, "Detalle seguro") && !lead.coberturas) {
    gaps.push("Año/modelo o actividad");
  }
  if (lead.producto === "viajero" && !briefValue(fields, "Viaje") && !lead.coberturas) {
    gaps.push("Destino y fechas");
  }
  return gaps;
}

export function chatbotWhatsAppText(lead: Lead, fields: ChatbotField[]) {
  const nombre = lead.nombre.split(" ")[0] || lead.nombre;
  const interes =
    briefValue(fields, "Interés") ||
    lead.plan_interes ||
    productoNoun(lead.producto);
  const localidad = lead.localidad || briefValue(fields, "Localidad");
  const laboral = briefValue(fields, "Situación laboral");
  const busca = briefValue(fields, "Busca");
  const ramo = briefValue(fields, "Ramo");
  const detalle = briefValue(fields, "Detalle seguro");
  const viaje = briefValue(fields, "Viaje");
  const grupo = briefValue(fields, "Cobertura");

  if (lead.producto === "salud") {
    const extras = [laboral, grupo, busca].filter(Boolean).join(", ");
    return `Hola ${nombre}, soy tu asesor de MARXEN. Vi tu consulta de salud${localidad ? ` desde ${localidad}` : ""}${extras ? ` (${extras})` : ""}. Te armo una propuesta a medida con cartilla y aportes. ¿Te viene bien ahora?`;
  }
  if (lead.producto === "seguros") {
    const extra = [ramo, detalle].filter(Boolean).join(" · ");
    return `Hola ${nombre}, te escribo de MARXEN por tu consulta de seguros${extra ? ` (${extra})` : ""}. Te paso las opciones claras para cotizar. ¿Seguimos?`;
  }
  if (lead.producto === "viajero") {
    return `Hola ${nombre}, soy de MARXEN. Vi tu consulta de asistencia al viajero${viaje ? ` (${viaje})` : ""}. Te armo las coberturas nacional/internacional. ¿Confirmamos destino y fechas?`;
  }
  return `Hola ${nombre}, te escribo de MARXEN. Recibimos tu consulta de ${interes}${localidad ? ` (${localidad})` : ""}. ¿Seguimos con la cotización?`;
}

function productoNoun(producto: ProductoInteres) {
  if (producto === "salud") return "salud";
  if (producto === "seguros") return "seguros";
  if (producto === "viajero") return "asistencia al viajero";
  return "tu consulta";
}
