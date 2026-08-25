import { getWhatsmeowAgentCode, normalizeArPhone } from "@/lib/whatsmeow/config";
import { sendWhatsmeowText } from "@/lib/whatsmeow/client";
import { createServiceClient } from "@/lib/supabase/server";
import { buildNotas, type QuoteData, type QuoteState } from "@/lib/chatbot/quote-flow";

export const PRODUCER_WHATSAPP_DEFAULT = "3875724473";

export function getProducerWhatsapp() {
  return normalizeArPhone(
    process.env.PRODUCER_WHATSAPP || PRODUCER_WHATSAPP_DEFAULT
  );
}

export function isQuoteReadyForProducer(data: QuoteData) {
  if (!String(data.nombre || "").trim() || !normalizeArPhone(data.celular || "")) {
    return false;
  }
  if (data.producto === "salud") {
    return Boolean(data.modalidad);
  }
  if (data.producto === "viajero") {
    return Boolean(data.viajeroDestino);
  }
  if (data.producto === "seguros") {
    if (data.seguroGrupo === "auto") {
      return Boolean(data.auto?.version && (data.auto.location || data.localidad));
    }
    return Boolean(data.seguroGrupo && data.seguroDetalle);
  }
  return false;
}

function displayPhone(phone: string) {
  const n = normalizeArPhone(phone);
  if (n.startsWith("549") && n.length >= 12) {
    return `+${n.slice(0, 2)} 9 ${n.slice(3)}`;
  }
  if (n.startsWith("54")) return `+${n}`;
  return phone;
}

export function formatProducerQuoteMessage(input: {
  canal: string;
  nombre?: string | null;
  celular?: string | null;
  email?: string | null;
  dni?: string | null;
  edad?: string | number | null;
  provincia?: string | null;
  localidad?: string | null;
  interes?: string | null;
  notas?: string | null;
  leadId?: string | null;
}) {
  const celular = input.celular ? normalizeArPhone(input.celular) || input.celular : "";
  const lines = [
    "*Lead listo para cotizar*",
    `Canal: ${input.canal}`,
    input.nombre ? `Nombre: ${input.nombre}` : null,
    celular ? `WhatsApp: ${displayPhone(celular)}` : null,
    celular ? `Abrir chat: https://wa.me/${celular}` : null,
    input.email ? `Email: ${input.email}` : null,
    input.dni ? `DNI: ${input.dni}` : null,
    input.edad ? `Edad: ${input.edad}` : null,
    input.provincia ? `Provincia: ${input.provincia}` : null,
    input.localidad ? `Localidad: ${input.localidad}` : null,
    input.interes ? `Interés: ${input.interes}` : null,
    input.notas ? `\n${input.notas}` : null,
    input.leadId ? `\nCRM: /crm/leads/${input.leadId}` : null,
  ];
  return lines.filter((line) => line != null && String(line).trim() !== "").join("\n");
}

async function alreadySentKind(leadId: string, kind: "nuevo" | "actualizacion") {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("actividades")
    .select("id")
    .eq("lead_id", leadId)
    .contains("meta", { source: "producer_notify", kind })
    .limit(1);
  return Boolean(data?.length);
}

async function addLeadTag(leadId: string, tag: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("leads").select("tags").eq("id", leadId).maybeSingle();
  const tags = Array.isArray(data?.tags) ? (data.tags as string[]) : [];
  if (tags.includes(tag)) return;
  await supabase.from("leads").update({ tags: [...tags, tag] }).eq("id", leadId);
}

async function sendToProducer(text: string) {
  const producer = getProducerWhatsapp();
  if (!producer) return { ok: false as const, error: "sin productor" };
  const agent = getWhatsmeowAgentCode();
  const sent = await sendWhatsmeowText(agent, producer, text, { wake: true });
  if (!sent.success) {
    console.error("[productor][whatsapp]", sent.error);
    return { ok: false as const, error: sent.error };
  }
  return { ok: true as const };
}

export async function notifyProducerQuoteReady(input: {
  leadId?: string | null;
  canal: string;
  nombre?: string | null;
  celular?: string | null;
  email?: string | null;
  dni?: string | null;
  edad?: string | number | null;
  provincia?: string | null;
  localidad?: string | null;
  interes?: string | null;
  notas?: string | null;
  kind?: "nuevo" | "actualizacion";
}) {
  try {
    const customer = normalizeArPhone(input.celular || "");
    const producer = getProducerWhatsapp();
    if (!producer) return;
    if (customer && customer === producer) return;

    const kind = input.kind || "nuevo";
    if (input.leadId && kind === "nuevo") {
      if (await alreadySentKind(input.leadId, "nuevo")) return;
    }
    if (input.leadId && kind === "actualizacion") {
      if (await alreadySentKind(input.leadId, "actualizacion")) return;
    }

    const header =
      kind === "actualizacion" ? "*Actualización de cotización*\n" : "";
    const text = `${header}${formatProducerQuoteMessage(input)}`.trim();
    const sent = await sendToProducer(text);
    if (!sent.ok) return;

    if (input.leadId) {
      await addLeadTag(input.leadId, "productor_avisado");
      const supabase = createServiceClient();
      await supabase.from("actividades").insert({
        lead_id: input.leadId,
        tipo: "whatsapp",
        titulo:
          kind === "actualizacion"
            ? "Actualización enviada al productor"
            : "Lead enviado al productor",
        detalle: `Aviso a ${displayPhone(producer)}`,
        autor: "sistema",
        meta: { source: "producer_notify", kind, producer },
      });
    }
  } catch (err) {
    console.error("[productor][notify]", err instanceof Error ? err.message : err);
  }
}

export async function notifyProducerFromQuoteState(
  state: QuoteState,
  kind: "nuevo" | "actualizacion" = "nuevo"
) {
  if (!isQuoteReadyForProducer(state.data)) return;
  await notifyProducerQuoteReady({
    leadId: state.leadId,
    canal: state.channel === "whatsapp" ? "WhatsApp" : "Asistente web",
    nombre: state.data.nombre,
    celular: state.data.celular,
    localidad: state.data.localidad || state.data.auto?.location?.description,
    interes: state.data.producto,
    notas: buildNotas(
      state.data,
      kind === "actualizacion"
        ? "Estado: actualización · datos completos para cotizar"
        : "Estado: LEAD CALIENTE · listo para cotizar"
    ),
    kind,
  });
}
