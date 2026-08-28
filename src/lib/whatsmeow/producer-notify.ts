import { getWhatsmeowAgentCode, normalizeArPhone } from "@/lib/whatsmeow/config";
import { sendWhatsmeowText } from "@/lib/whatsmeow/client";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildNotas,
  detectsHealthCoverageIntent,
  detectsQuoteIntent,
  inferProductoFromMessage,
  isGreeting,
  looksLikeCoverageQuestion,
  looksLikeExplicitQuote,
  MENU_SALUD,
  MENU_SEGUROS,
  MENU_VIAJERO,
  MENU_WHATSAPP,
  type QuoteData,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";
import { loadConversation, saveConversation } from "@/lib/whatsmeow/conversations";

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

  // Solo incluir líneas de notas con detalles técnicos — excluir los que ya están en el header
  const SKIP_RE = /^(Lead desde chatbot MARXEN|Nombre:|WhatsApp:|Localidad:|Interés:)/;
  const detailLines = (input.notas || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !SKIP_RE.test(l));

  const contactLine = [input.nombre, celular ? displayPhone(celular) : null]
    .filter(Boolean)
    .join(" · ");

  const lines: (string | null)[] = [
    `🔔 *Lead MARXEN*`,
    contactLine || null,
    celular ? `wa.me/${celular}` : null,
    input.localidad ? `📍 ${input.localidad}` : null,
    input.interes ? `📌 ${input.interes}` : null,
    detailLines.length > 0 ? detailLines.join("\n") : null,
    input.leadId ? `\n🔗 https://www.marxen.com.ar/crm/leads/${input.leadId}` : null,
  ];
  return lines.filter((l) => l != null && String(l).trim() !== "").join("\n");
}

const interestLocks = new Map<string, number>();

export function looksLikeWhatsappInterest(text: string) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (isGreeting(t)) return false;
  if (/^(cancelar|salir|dejar\s+cotiz|menu|men[uú])$/i.test(t)) return false;
  if (t === MENU_WHATSAPP) return true;
  if (looksLikeExplicitQuote(t) || detectsQuoteIntent(t)) return true;
  if (looksLikeCoverageQuestion(t) || detectsHealthCoverageIntent(t)) return true;
  return Boolean(inferProductoFromMessage(t));
}

function interestSnippet(message: string) {
  const t = String(message || "").trim();
  if (t === MENU_SEGUROS) return "Cotizar un seguro";
  if (t === MENU_SALUD) return "Consultar cobertura de salud";
  if (t === MENU_VIAJERO) return "Asistencia al viajero";
  if (t === MENU_WHATSAPP) return "Quiere hablar con un asesor";
  const compact = t.replace(/\s+/g, " ");
  return compact.length > 140 ? `${compact.slice(0, 137)}…` : compact;
}

function interestProductLabel(producto?: string | null, message?: string) {
  const inferred = producto || inferProductoFromMessage(message || "");
  if (inferred === "salud") return "Salud";
  if (inferred === "viajero") return "Viajero";
  if (inferred === "seguros") return "Seguros";
  return null;
}

export function formatProducerInterestMessage(input: {
  nombre?: string | null;
  celular: string;
  producto?: string | null;
  message?: string | null;
  leadId?: string | null;
}) {
  const celular = normalizeArPhone(input.celular) || input.celular;
  const product = interestProductLabel(input.producto, input.message || "");
  const snippet = interestSnippet(input.message || "");
  const crm = celular
    ? `https://www.marxen.com.ar/crm/chats?phone=${encodeURIComponent(celular)}`
    : "https://www.marxen.com.ar/crm/chats";
  const lead = input.leadId
    ? `https://www.marxen.com.ar/crm/leads/${input.leadId}`
    : null;

  return [
    "🔔 WhatsApp — hay interés",
    input.nombre ? String(input.nombre).trim() : null,
    celular ? displayPhone(celular) : null,
    celular ? `wa.me/${celular}` : null,
    product ? `📌 ${product}` : null,
    snippet ? `«${snippet}»` : null,
    `\nCRM: ${lead || crm}`,
  ]
    .filter((line) => line != null && String(line).trim() !== "")
    .join("\n");
}

function usableName(value?: string | null) {
  const name = String(value || "").trim();
  if (!name || /^yo$/i.test(name)) return "";
  return name;
}

async function resolveChatName(phone: string, fallback?: string | null) {
  const fromQuote = usableName(fallback);
  if (fromQuote) return fromQuote;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("whatsapp_chats")
      .select("name")
      .eq("phone", phone)
      .maybeSingle();
    return usableName(data?.name) || null;
  } catch {
    return null;
  }
}

/** Ping corto al productor en el primer mensaje con interés. Una vez por chat. */
export async function notifyProducerWhatsappInterest(input: {
  phone: string;
  message: string;
  pushName?: string | null;
}) {
  try {
    const customer = normalizeArPhone(input.phone);
    const producer = getProducerWhatsapp();
    if (!customer || !producer || customer === producer) return;
    if (!looksLikeWhatsappInterest(input.message)) return;

    const now = Date.now();
    const prevLock = interestLocks.get(customer) || 0;
    if (prevLock && now - prevLock < 120_000) return;
    interestLocks.set(customer, now);

    const conv = await loadConversation(customer);
    if (conv.quote_state.notifiedInterest) return;

    await saveConversation({
      ...conv,
      quote_state: { ...conv.quote_state, notifiedInterest: true },
    });

    const nombre =
      (await resolveChatName(
        customer,
        usableName(input.pushName) || conv.quote_state.data.nombre
      )) || null;
    const text = formatProducerInterestMessage({
      nombre,
      celular: customer,
      producto: conv.quote_state.data.producto,
      message: input.message,
      leadId: conv.quote_state.leadId,
    });
    const sent = await sendToProducer(text);
    if (!sent.ok) return;

    if (conv.quote_state.leadId) {
      const supabase = createServiceClient();
      await supabase.from("actividades").insert({
        lead_id: conv.quote_state.leadId,
        tipo: "whatsapp",
        titulo: "Interés de WhatsApp avisado al productor",
        detalle: `Aviso a ${displayPhone(producer)}`,
        autor: "sistema",
        meta: { source: "producer_interest", kind: "interes", producer, phone: customer },
      });
    }
  } catch (err) {
    console.error("[productor][interes]", err instanceof Error ? err.message : err);
  }
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

/** Verifica si ya se notificó al productor (cualquier kind) en los últimos N ms */
async function notifiedRecently(leadId: string, windowMs = 5 * 60_000) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data } = await supabase
    .from("actividades")
    .select("id")
    .eq("lead_id", leadId)
    .contains("meta", { source: "producer_notify" })
    .gte("created_at", since)
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
      // Si ya se notificó en los últimos 5 minutos (p.ej. "nuevo" enviado hace segundos),
      // no enviar otro mensaje de actualización — evita duplicados en la misma sesión.
      if (await notifiedRecently(input.leadId, 5 * 60_000)) return;
      if (await alreadySentKind(input.leadId, "actualizacion")) return;
    }

    const header =
      kind === "actualizacion" ? "🔄 *Actualización de cotización*\n" : "";
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
