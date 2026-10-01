import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getChatAi, parseModelJson } from "@/lib/chatbot/ai-client";
import { getWhatsmeowAgentCode, normalizeArPhone } from "@/lib/whatsmeow/config";
import { getProducerWhatsapp } from "@/lib/whatsmeow/producer-notify";
import { enqueueWhatsappOutbound } from "@/lib/whatsmeow/outbound-queue";
import { SITE_URL } from "@/lib/seo";

const TZ = "America/Argentina/Salta";
const STATE_PREFIX = "__digest__:";
const STAGGER_MS = 60_000;
const MAX_NOTIFY = 30;
const CONCURRENCY = 6;
// Deja de iniciar análisis a los 125 s: lo que ya está en vuelo termina antes de los 300 s de la función.
const DEADLINE_MS = 125_000;
const LOCK_MS = 295_000;
const META_KEY = `${STATE_PREFIX}__meta__`;
const FULL_MAX_MESSAGES = 300;
const CONTEXT_MESSAGES = 12;
const NEW_MAX_MESSAGES = 200;
const BODY_MAX = 500;
const ACTION_LOG_MAX = 15;
const DAY_MS = 86_400_000;
// Seguimiento a largo plazo cuando un contacto no se mueve: se revisa a los 3, 7, 14, 30 y 30 días
// y después se corta hasta que haya actividad nueva.
const FOLLOW_UP_DAYS = [3, 7, 14, 30, 30];

type Supabase = ReturnType<typeof createServiceClient>;

type Lead = {
  id: string;
  nombre: string;
  celular: string;
  producto: string | null;
  plan_interes: string | null;
  estado: string;
  prioridad: string | null;
  localidad: string | null;
  origen: string | null;
  origen_detalle: string | null;
  notas_iniciales: string | null;
  updated_at: string;
  ultimo_contacto_at: string | null;
  proximo_contacto_at: string | null;
};

type Msg = {
  direction: string;
  source: string;
  from_me: boolean;
  message_type: string;
  body: string;
  created_at: string;
};

type Item = {
  key: string;
  phone: string;
  name: string | null;
  chatId: string | null;
  lead: Lead | null;
  signal: string;
};

type State = {
  v: 1;
  summary: string;
  etapa: string;
  cursor: string;
  analyzedAt: string;
  lastAction: string | null;
  lastActionHash: string | null;
  lastNotifiedAt: string | null;
  /** Revisiones por tiempo ya hechas desde la última actividad (0 si hubo movimiento). */
  nudges?: number;
  lastNudgeAt?: string | null;
};

type ActionLog = { at: string; accion: string; urgencia: string; tipo?: "aviso" | "insistencia" };

type Urgencia = "alta" | "media" | "baja";

export type Analysis = {
  resumen: string;
  etapa: string;
  oportunidad: boolean;
  urgencia: Urgencia;
  accion: string;
  motivo: string;
  mensaje_sugerido: string | null;
  novedad: boolean;
  /** Solo en seguimiento por tiempo: conviene dejar de insistir y cerrar el contacto. */
  descartar: boolean;
};

const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayOnlyFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const ETAPAS = [
  "nuevo",
  "interesado",
  "cotizando",
  "esperando_cliente",
  "esperando_asesor",
  "negociando",
  "cerrado",
  "frio",
  "sin_oportunidad",
];

const SYSTEM_PROMPT = `Sos el analista comercial de MARXEN Protección Integral (Salta, Argentina): seguros (auto, hogar, moto), salud/prepaga y asistencia al viajero. Leés la conversación de WhatsApp de un contacto junto con su ficha del CRM y le decís al productor (Marcos) si hay algo para accionar.

Reglas:
- Basate solo en lo que está escrito. No inventes datos, precios ni promesas.
- "Cliente" es el contacto, "Asesor" es Marcos o su equipo, "Bot IA" es el asistente automático.
- oportunidad=true solo si hay una acción concreta y útil para Marcos: responder algo pendiente, cotizar, mandar información, llamar, pedir documentación, cerrar una venta o retomar un contacto frío con interés real.
- Si el asesor ya respondió lo último y el cliente no pidió nada más, o el bot lo está atendiendo bien, oportunidad=false.
- Si la ficha del CRM está en estado "ganado" o "perdido", tomalo como definitivo: solo hay oportunidad si el cliente escribió algo nuevo que requiera atención (reclamo, renovación, otra consulta). No propongas retomar una venta que ya figura cerrada.
- Los mensajes marcados con ▶ son nuevos desde el último análisis. Cuando hay un resumen previo y una acción ya avisada, "novedad" es true solo si lo nuevo cambia lo que hay que hacer; si la acción sigue igual, novedad=false.
- "resumen": contexto acumulado de toda la conversación en 2 a 4 oraciones (qué quiere, producto, datos clave como personas, edades, localidad, vehículo, fechas, precios mencionados, objeciones y estado actual). Conservá del resumen previo lo que siga vigente.
- "accion": una sola acción concreta en imperativo, máximo 180 caracteres.
- "motivo": por qué ahora, en una frase corta.
- "mensaje_sugerido": texto corto en español rioplatense para enviarle al cliente, o null si la acción no es escribirle.
- "urgencia": alta = cliente esperando respuesta o a punto de decidir; media = oportunidad con margen de tiempo; baja = retomar más adelante.
- "etapa": una de ${ETAPAS.join(", ")}.
- Privacidad: no copies DNI, CBU, números de tarjeta ni claves en ningún campo.

Modo "seguimiento por tiempo" (no hay mensajes nuevos; pasaron días sin novedades desde el último aviso):
- Pensá a largo plazo. Proponé una acción DISTINTA a las ya avisadas (están en "ACCIONES YA AVISADAS") y adaptada a los días transcurridos y al número de recordatorio: 1.º recordatorio simple y amable; 2.º otro enfoque (resolver dudas, ofrecer una fecha o una llamada); 3.º último intento con una propuesta concreta; 4.º en adelante, una reactivación espaciada.
- Tené en cuenta la ficha (estado, seguimientos, último contacto) y el momento: no insistas si la conversación ya estaba resuelta o si el cliente dijo que no le interesa.
- Si tras varios intentos el contacto no responde y no hay señales de interés, poné descartar=true y en "accion" sugerí cerrarlo (marcarlo como perdido o frío en el CRM) en lugar de seguir insistiendo.
- "descartar" es true solo en este modo y solo cuando conviene dejar de insistir; en cualquier otro caso es false. "novedad" es false.

Respondé SOLO un JSON con las claves: resumen, etapa, oportunidad, urgencia, accion, motivo, mensaje_sugerido, novedad, descartar.`;

function displayPhone(phone: string) {
  const n = normalizeArPhone(phone);
  return n.startsWith("549") ? `+54 9 ${n.slice(3)}` : n ? `+${n}` : phone;
}

function usableName(value?: string | null) {
  const name = String(value || "").trim();
  return !name || /^[.\-_ ]+$/.test(name) || /^yo$/i.test(name) ? "" : name;
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function actionHash(action: string) {
  const normalized = action
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? createHash("sha1").update(normalized).digest("hex").slice(0, 16) : "";
}

function isClient(message: Msg) {
  return message.direction === "inbound" && !message.from_me;
}

function renderMessages(messages: Msg[], cursorMs: number | null) {
  return messages
    .map((message) => {
      const who = isClient(message) ? "Cliente" : message.source === "bot" ? "Bot IA" : "Asesor";
      const body = clean(message.body, BODY_MAX);
      const kind = message.message_type && message.message_type !== "text" ? `[${message.message_type}]` : "";
      const fresh = cursorMs !== null && new Date(message.created_at).getTime() > cursorMs ? "▶ " : "";
      return `${fresh}[${dateTimeFmt.format(new Date(message.created_at))}] ${who}: ${[kind, body].filter(Boolean).join(" ")}`;
    })
    .join("\n");
}

function hoursAgo(iso: string, nowMs: number) {
  const hours = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 3_600_000));
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} días`;
}

function conversationFacts(messages: Msg[], nowMs: number) {
  if (!messages.length) return "Sin mensajes de WhatsApp.";
  const last = messages[messages.length - 1];
  const lastClient = [...messages].reverse().find(isClient);
  const lastAdvisor = [...messages].reverse().find((m) => !isClient(m) && m.source !== "bot");
  const who = isClient(last) ? "Cliente" : last.source === "bot" ? "Bot IA" : "Asesor";
  return [
    `Último mensaje: ${who}, hace ${hoursAgo(last.created_at, nowMs)}.`,
    lastClient ? `Último mensaje del cliente: hace ${hoursAgo(lastClient.created_at, nowMs)}.` : "El cliente todavía no escribió.",
    lastAdvisor ? `Última respuesta humana (asesor): hace ${hoursAgo(lastAdvisor.created_at, nowMs)}.` : "Ningún asesor humano respondió todavía.",
  ].join("\n");
}

function leadSheet(lead: Lead | null, followups: Array<{ titulo: string; programado_para: string }>, nowMs: number) {
  if (!lead) return "Sin ficha en el CRM (contacto que escribió por WhatsApp).";
  const overdue = (iso: string) => (new Date(iso).getTime() < nowMs ? " (VENCIDO)" : "");
  return [
    `Estado: ${lead.estado} · Prioridad: ${lead.prioridad || "-"}`,
    `Producto: ${lead.producto || "-"}${lead.plan_interes ? ` · Plan: ${lead.plan_interes}` : ""}`,
    lead.localidad ? `Localidad: ${lead.localidad}` : null,
    `Origen: ${[lead.origen, lead.origen_detalle].filter(Boolean).join(" / ") || "-"}`,
    lead.ultimo_contacto_at ? `Último contacto registrado: hace ${hoursAgo(lead.ultimo_contacto_at, nowMs)}` : "Sin contacto registrado.",
    lead.notas_iniciales ? `Notas: ${clean(lead.notas_iniciales, 400)}` : null,
    followups.length
      ? `Seguimientos pendientes: ${followups
          .map((f) => `${f.titulo} (${dateTimeFmt.format(new Date(f.programado_para))}${overdue(f.programado_para)})`)
          .join("; ")}`
      : "Sin seguimientos pendientes.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAnalysis(raw: Record<string, unknown>): Analysis | null {
  const resumen = clean(raw.resumen, 800);
  if (!resumen) return null;
  const urgencia = ["alta", "media", "baja"].includes(String(raw.urgencia)) ? (String(raw.urgencia) as Urgencia) : "media";
  const etapa = ETAPAS.includes(String(raw.etapa)) ? String(raw.etapa) : "interesado";
  const accion = clean(raw.accion, 240);
  const suggested = clean(raw.mensaje_sugerido, 450);
  return {
    resumen,
    etapa,
    oportunidad: raw.oportunidad === true && Boolean(accion),
    urgencia,
    accion,
    motivo: clean(raw.motivo, 240),
    mensaje_sugerido: suggested || null,
    novedad: raw.novedad === true,
    descartar: raw.descartar === true,
  };
}

// 1.º intento con razonamiento (más preciso); si no alcanza, 2.º intento directo y más rápido.
const AI_ATTEMPTS = [
  { thinking: true, maxTokens: 16000, timeoutMs: 110_000 },
  { thinking: false, maxTokens: 3000, timeoutMs: 60_000 },
];

async function askAi(user: string): Promise<Analysis | null> {
  const ai = getChatAi();
  if (!ai) throw new Error("missing_ai");
  for (const [attempt, config] of AI_ATTEMPTS.entries()) {
    try {
      const completion = await ai.client.chat.completions.create(
        {
          model: ai.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: user },
          ],
          max_tokens: config.maxTokens,
          response_format: { type: "json_object" },
          ...(ai.provider === "deepseek" ? { thinking: { type: config.thinking ? "enabled" : "disabled" } } : {}),
        } as never,
        { signal: AbortSignal.timeout(config.timeoutMs) },
      );
      const choice = completion.choices?.[0];
      const content = choice?.message?.content || "";
      const analysis = normalizeAnalysis(parseModelJson(content));
      if (analysis) return analysis;
      console.warn("[digest][ai] respuesta inválida", {
        intento: attempt + 1,
        finish: choice?.finish_reason,
        largo: content.length,
        tokens: completion.usage?.completion_tokens,
      });
    } catch (err) {
      console.warn("[digest][ai]", err instanceof Error ? err.message : err);
    }
  }
  return null;
}

async function loadItems(supabase: Supabase, producer: string, onlyPhone?: string) {
  const [{ data: chats }, { data: leads }, { data: followups }] = await Promise.all([
    supabase.from("whatsapp_chats").select("id,phone,name,last_message_at").limit(1000),
    supabase
      .from("leads")
      .select(
        "id,nombre,celular,producto,plan_interes,estado,prioridad,localidad,origen,origen_detalle,notas_iniciales,updated_at,ultimo_contacto_at,proximo_contacto_at",
      )
      .order("updated_at", { ascending: false })
      .limit(2000),
    supabase
      .from("seguimientos")
      .select("lead_id,titulo,programado_para")
      .eq("estado", "pendiente")
      .not("lead_id", "is", null)
      .order("programado_para", { ascending: true })
      .limit(2000),
  ]);

  const leadByPhone = new Map<string, Lead>();
  for (const lead of (leads || []) as Lead[]) {
    const phone = normalizeArPhone(lead.celular);
    if (phone && !leadByPhone.has(phone)) leadByPhone.set(phone, lead);
  }

  const items: Item[] = [];
  const seen = new Set<string>();
  for (const chat of chats || []) {
    const phone = String(chat.phone);
    if (!phone || phone === producer || !chat.last_message_at) continue;
    seen.add(phone);
    items.push({
      key: phone,
      phone,
      name: usableName(chat.name) || null,
      chatId: String(chat.id),
      lead: leadByPhone.get(phone) || null,
      signal: String(chat.last_message_at),
    });
  }
  for (const lead of (leads || []) as Lead[]) {
    if (["ganado", "perdido"].includes(lead.estado)) continue;
    const phone = normalizeArPhone(lead.celular);
    if (phone === producer) continue;
    if (phone && seen.has(phone)) continue;
    if (phone) seen.add(phone);
    items.push({
      key: phone || `lead:${lead.id}`,
      phone,
      name: lead.nombre,
      chatId: null,
      lead,
      signal: lead.updated_at,
    });
  }

  const followupsByLead = new Map<string, Array<{ titulo: string; programado_para: string }>>();
  for (const row of followups || []) {
    const list = followupsByLead.get(String(row.lead_id)) || [];
    list.push({ titulo: String(row.titulo), programado_para: String(row.programado_para) });
    followupsByLead.set(String(row.lead_id), list);
  }

  return {
    items: onlyPhone ? items.filter((item) => item.phone === onlyPhone) : items,
    followupsByLead,
  };
}

async function loadStates(supabase: Supabase) {
  const { data } = await supabase
    .from("whatsapp_conversations")
    .select("phone,quote_state,history")
    .like("phone", `${STATE_PREFIX}%`)
    .limit(5000);
  const map = new Map<string, { state: State; log: ActionLog[] }>();
  for (const row of data || []) {
    const state = row.quote_state as State | null;
    if (!state?.cursor) continue;
    map.set(String(row.phone).slice(STATE_PREFIX.length), {
      state,
      log: Array.isArray(row.history) ? (row.history as ActionLog[]) : [],
    });
  }
  return map;
}

async function saveState(supabase: Supabase, key: string, state: State, log: ActionLog[]) {
  const { error } = await supabase.from("whatsapp_conversations").upsert(
    {
      phone: `${STATE_PREFIX}${key}`,
      quote_state: state,
      history: log.slice(-ACTION_LOG_MAX),
      pending_poll: null,
      last_message_id: null,
      last_event: "digest",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );
  if (error) throw new Error(error.message);
}

// Los avisos que manda este mismo cron (y los recordatorios del calendario) no son parte de la conversación.
const OWN_NOTICE = /^(☀️ \*Resumen diario MARXEN|🧪 \*VISTA PREVIA|(🔁 )?(🔴|🟡|🟢) \*(Alta|Media|Baja)\* — |⏰ \*Evento en 30 minutos\*)/;
const withoutNotices = (messages: Msg[]) => messages.filter((m) => !OWN_NOTICE.test(String(m.body || "").trim()));

async function loadMessages(supabase: Supabase, chatId: string, mode: "full" | "incremental", cursor: string | null) {
  if (mode === "full" || !cursor) {
    const { data } = await supabase
      .from("whatsapp_chat_messages")
      .select("direction,source,from_me,message_type,body,created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(FULL_MAX_MESSAGES);
    return withoutNotices(((data || []) as Msg[]).reverse());
  }
  const [fresh, before] = await Promise.all([
    supabase
      .from("whatsapp_chat_messages")
      .select("direction,source,from_me,message_type,body,created_at")
      .eq("chat_id", chatId)
      .gt("created_at", cursor)
      .order("created_at", { ascending: true })
      .limit(NEW_MAX_MESSAGES),
    supabase
      .from("whatsapp_chat_messages")
      .select("direction,source,from_me,message_type,body,created_at")
      .eq("chat_id", chatId)
      .lte("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(CONTEXT_MESSAGES),
  ]);
  return withoutNotices([...(((before.data || []) as Msg[]).reverse()), ...((fresh.data || []) as Msg[])]);
}

type Mode = "full" | "incremental" | "seguimiento";
type Follow = { n: number; quietDays: number };

function ts(iso: string | null | undefined) {
  return iso ? new Date(iso).getTime() : 0;
}

/**
 * ¿Toca revisar este contacto por tiempo aunque no haya mensajes nuevos? Devuelve el número de
 * recordatorio y los días sin novedades, o null si no corresponde.
 * - Se frena si el lead ya está ganado/perdido, si la conversación quedó cerrada o sin oportunidad,
 *   si ya se hicieron todas las revisiones, o si Marcos tiene un seguimiento agendado a futuro.
 * - Si Marcos registró un contacto después del último análisis, la cuenta de intervalos empieza de nuevo.
 */
function followUpDue(
  item: Item,
  state: State,
  followups: Array<{ programado_para: string }>,
  nowMs: number,
): Follow | null {
  if (item.lead && ["ganado", "perdido"].includes(item.lead.estado)) return null;
  if (["cerrado", "sin_oportunidad"].includes(state.etapa)) return null;
  if (followups.some((f) => ts(f.programado_para) > nowMs)) return null;
  const contactedAt = ts(item.lead?.ultimo_contacto_at);
  const analyzedAt = ts(state.analyzedAt);
  const done = contactedAt > analyzedAt ? 0 : state.nudges || 0;
  if (done >= FOLLOW_UP_DAYS.length) return null;
  const baseline = Math.max(analyzedAt, ts(state.lastNotifiedAt), ts(state.lastNudgeAt), contactedAt);
  if (nowMs - baseline < FOLLOW_UP_DAYS[done] * DAY_MS) return null;
  return { n: done + 1, quietDays: Math.max(1, Math.floor((nowMs - ts(item.signal)) / DAY_MS)) };
}

function buildPrompt(
  item: Item,
  mode: Mode,
  messages: Msg[],
  prev: { state: State; log: ActionLog[] } | null,
  followups: Array<{ titulo: string; programado_para: string }>,
  nowMs: number,
  follow?: Follow,
) {
  const cursorMs = mode === "incremental" && prev ? new Date(prev.state.cursor).getTime() : null;
  const label = item.lead?.nombre || item.name || displayPhone(item.phone);
  const modeLine =
    mode === "full"
      ? "primer análisis (historial completo)"
      : mode === "incremental"
        ? "incremental (hay mensajes nuevos)"
        : `seguimiento por tiempo: no hay mensajes nuevos y el contacto lleva ${follow?.quietDays ?? "varios"} días sin novedades. Es el recordatorio n.º ${follow?.n ?? 1} de ${FOLLOW_UP_DAYS.length}.`;
  const past = (prev?.log || [])
    .slice(-4)
    .map((entry) => `- ${dateTimeFmt.format(new Date(entry.at))} (${entry.tipo === "insistencia" ? "insistencia" : "aviso"}): ${entry.accion}`);
  return [
    `AHORA (Salta): ${dayFmt.format(new Date(nowMs))}`,
    `MODO: ${modeLine}`,
    `CONTACTO: ${label}${item.phone ? ` · ${displayPhone(item.phone)}` : ""}`,
    `\nFICHA CRM:\n${leadSheet(item.lead, followups, nowMs)}`,
    `\nDATOS CALCULADOS:\n${conversationFacts(messages, nowMs)}`,
    prev
      ? `\nRESUMEN PREVIO (guardado el ${dateTimeFmt.format(new Date(prev.state.analyzedAt))}):\n${prev.state.summary}`
      : null,
    prev?.state.lastAction
      ? `\nÚLTIMA ACCIÓN YA AVISADA A MARCOS (${prev.state.lastNotifiedAt ? dateTimeFmt.format(new Date(prev.state.lastNotifiedAt)) : "-"}): ${prev.state.lastAction}`
      : prev
        ? "\nNo hay una acción pendiente avisada."
        : null,
    past.length ? `\nACCIONES YA AVISADAS (de la más antigua a la más reciente):\n${past.join("\n")}` : null,
    prev && mode !== "seguimiento" && (prev.state.nudges || 0) > 0
      ? `\nOJO: este contacto ya tuvo ${prev.state.nudges} recordatorio(s) por falta de novedades. Si en los mensajes nuevos el cliente volvió a escribir, es una novedad importante: retomó el contacto, y conviene avisarlo aunque la acción siga siendo la misma.`
      : null,
    `\nCONVERSACIÓN${messages.length ? "" : " (vacía)"}:\n${renderMessages(messages, cursorMs)}`,
  ]
    .filter((part) => part !== null)
    .join("\n");
}

const URGENCY_ORDER: Record<Urgencia, number> = { alta: 0, media: 1, baja: 2 };
const URGENCY_LABEL: Record<Urgencia, string> = { alta: "🔴 *Alta*", media: "🟡 *Media*", baja: "🟢 *Baja*" };

function formatNotification(item: Item, a: Analysis, follow?: Follow, noticeAt?: string | null) {
  const name = item.lead?.nombre || item.name || displayPhone(item.phone);
  const ficha = item.lead
    ? [item.lead.estado, item.lead.producto, item.lead.plan_interes].filter(Boolean).join(" · ")
    : "Sin ficha en el CRM";
  const link = item.lead
    ? `${SITE_URL}/crm/leads/${item.lead.id}`
    : item.phone
      ? `${SITE_URL}/crm/chats?phone=${encodeURIComponent(item.phone)}`
      : `${SITE_URL}/crm`;
  return [
    follow
      ? `🔁 ${URGENCY_LABEL[a.urgencia]} — *${name}* · seguimiento ${follow.n}.º`
      : `${URGENCY_LABEL[a.urgencia]} — *${name}*`,
    item.phone ? `📱 ${displayPhone(item.phone)} · wa.me/${item.phone}` : null,
    `🏷 ${ficha}`,
    follow
      ? `⏳ Sin novedades hace ${follow.quietDays} ${follow.quietDays === 1 ? "día" : "días"}${noticeAt ? ` · último aviso ${dayOnlyFmt.format(new Date(noticeAt))}` : ""}`
      : null,
    `\n🧠 ${a.resumen}`,
    a.accion ? `\n✅ *Acción:* ${a.accion}` : null,
    a.descartar ? "💤 *Sugerencia:* dejar de insistir y marcarlo como perdido o frío en el CRM." : null,
    a.motivo ? `⏱ ${a.motivo}` : null,
    a.mensaje_sugerido ? `\n💬 Sugerido: «${a.mensaje_sugerido}»` : null,
    `\n🔗 ${link}`,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .slice(0, 1800);
}

async function pool<T, R>(list: T[], size: number, run: (value: T) => Promise<R>, stopAt: number) {
  const results: Array<R | undefined> = new Array(list.length);
  let next = 0;
  async function worker() {
    while (next < list.length && Date.now() < stopAt) {
      const index = next;
      next += 1;
      results[index] = await run(list[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, list.length) }, worker));
  return results;
}

type Todo = {
  item: Item;
  mode: Mode;
  prev: { state: State; log: ActionLog[] } | null;
  follow?: Follow;
};

type Outcome = Todo & {
  analysis: Analysis | null;
  messages: number;
};

async function alreadyQueued(supabase: Supabase, agentCode: string, dedupKey: string) {
  const { data } = await supabase
    .from("whatsapp_outbound_queue")
    .select("id")
    .eq("agent_code", agentCode)
    .eq("dedup_key", dedupKey)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

type Meta = { lockUntil: string | null; headerDay: string | null };

async function readMeta(supabase: Supabase): Promise<Meta> {
  const { data } = await supabase.from("whatsapp_conversations").select("quote_state").eq("phone", META_KEY).maybeSingle();
  const meta = (data?.quote_state || {}) as Partial<Meta>;
  return { lockUntil: meta.lockUntil || null, headerDay: meta.headerDay || null };
}

async function writeMeta(supabase: Supabase, meta: Meta) {
  await supabase.from("whatsapp_conversations").upsert(
    {
      phone: META_KEY,
      quote_state: meta,
      history: [],
      pending_poll: null,
      last_message_id: null,
      last_event: "digest:meta",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );
}

function salta(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

/**
 * Analiza cada conversación de WhatsApp (y cada lead) con DeepSeek, guarda el contexto y avisa
 * a Marcos de las oportunidades, un mensaje por minuto. La primera vez lee el historial completo;
 * después solo mira lo nuevo y avisa únicamente si cambia lo que hay que hacer.
 *
 * Es seguro correrlo varias veces: lo ya analizado se saltea, lo que falló o no llegó a tiempo se
 * retoma, y un candado evita dos corridas a la vez.
 */
export async function runWhatsappDigest({
  dry = false,
  onlyPhone,
  deliverTo,
  preview = false,
}: { dry?: boolean; onlyPhone?: string; deliverTo?: string; preview?: boolean } = {}) {
  // Vista previa: envía de verdad a `deliverTo`, pero no guarda estado ni usa el candado,
  // así la corrida real de Marcos sigue siendo la primera.
  if (dry || preview) return runDigest({ dry, onlyPhone, deliverTo, preview }, { lockUntil: null, headerDay: null });

  const supabase = createServiceClient();
  const meta = await readMeta(supabase).catch(() => ({ lockUntil: null, headerDay: null }) as Meta);
  if (meta.lockUntil && new Date(meta.lockUntil).getTime() > Date.now()) {
    return { ok: true, dry, omitido: "corrida_en_curso" as const };
  }
  await writeMeta(supabase, { ...meta, lockUntil: new Date(Date.now() + LOCK_MS).toISOString() }).catch(() => null);
  let headerDay = meta.headerDay;
  try {
    const result = await runDigest({ dry, onlyPhone, deliverTo }, meta);
    if (result.headerSent) headerDay = salta(new Date());
    return result;
  } finally {
    await writeMeta(supabase, { lockUntil: null, headerDay }).catch(() => null);
  }
}

async function runDigest(
  { dry, onlyPhone, deliverTo, preview = false }: { dry: boolean; onlyPhone?: string; deliverTo?: string; preview?: boolean },
  meta: Meta,
) {
  const started = Date.now();
  const supabase = createServiceClient();
  const producer = getProducerWhatsapp();
  if (!producer) throw new Error("Sin número del productor");
  // El productor sigue excluido del análisis; solo cambia a quién se le entregan los mensajes.
  const destination = (deliverTo && normalizeArPhone(deliverTo)) || producer;
  const persist = (key: string, state: State, log: ActionLog[]) =>
    preview ? Promise.resolve() : saveState(supabase, key, state, log).catch(() => null);
  const agentCode = getWhatsmeowAgentCode();

  const [{ items, followupsByLead }, states] = await Promise.all([
    loadItems(supabase, producer, onlyPhone),
    loadStates(supabase),
  ]);

  const todo: Todo[] = [];
  const reviewAt = Date.now();
  for (const item of items) {
    const prev = states.get(item.key) || null;
    const followups = item.lead ? followupsByLead.get(item.lead.id) || [] : [];
    if (!prev) todo.push({ item, mode: "full", prev });
    else if (ts(item.signal) > ts(prev.state.cursor)) todo.push({ item, mode: "incremental", prev });
    else {
      // Sin mensajes nuevos: seguimiento a largo plazo por tiempo transcurrido.
      const follow = followUpDue(item, prev.state, followups, reviewAt);
      if (follow) todo.push({ item, mode: "seguimiento", prev, follow });
    }
  }

  const outcomes = (
    await pool(
      todo,
      CONCURRENCY,
      async ({ item, mode, prev, follow }: Todo): Promise<Outcome> => {
        const nowMs = Date.now();
        const messages = item.chatId
          ? await loadMessages(supabase, item.chatId, mode === "full" ? "full" : "incremental", prev?.state.cursor || null)
          : [];
        const followups = item.lead ? followupsByLead.get(item.lead.id) || [] : [];
        const analysis = await askAi(buildPrompt(item, mode, messages, prev, followups, nowMs, follow));
        return { item, mode, prev, follow, analysis, messages: messages.length };
      },
      started + DEADLINE_MS,
    )
  ).filter((outcome): outcome is Outcome => Boolean(outcome));

  const failed = outcomes.filter((o) => !o.analysis).length;
  const nowIso = new Date().toISOString();
  const wanting: Array<Outcome & { analysis: Analysis; hash: string }> = [];
  const quiet: Array<Outcome & { analysis: Analysis }> = [];

  for (const outcome of outcomes) {
    const a = outcome.analysis;
    if (!a) continue;
    const hash = actionHash(a.accion);
    // Un contacto que ya tuvo recordatorios y vuelve a escribir siempre es una novedad para avisar,
    // aunque la acción recomendada sea la misma.
    const reengaged = outcome.mode === "incremental" && (outcome.prev?.state.nudges || 0) > 0;
    const repeated = !reengaged && Boolean(hash) && hash === outcome.prev?.state.lastActionHash;
    // En el seguimiento por tiempo insistir es justamente el objetivo: se avisa si hay algo para
    // hacer o si conviene cerrar el contacto; en los demás modos solo si hay una novedad real.
    const wants =
      outcome.mode === "seguimiento"
        ? a.oportunidad || a.descartar
        : a.oportunidad && !repeated && (outcome.mode === "full" || a.novedad || reengaged);
    if (wants) wanting.push({ ...outcome, analysis: a, hash });
    else quiet.push({ ...outcome, analysis: a });
  }

  wanting.sort(
    (x, y) =>
      URGENCY_ORDER[x.analysis.urgencia] - URGENCY_ORDER[y.analysis.urgencia] ||
      new Date(y.item.signal).getTime() - new Date(x.item.signal).getTime(),
  );

  const stateFor = (o: Outcome & { analysis: Analysis }, notified: boolean, hash: string): State => {
    const a = o.analysis;
    const follow = o.mode === "seguimiento" ? o.follow : undefined;
    const withAction = notified && Boolean(a.accion);
    return {
      v: 1,
      summary: a.resumen,
      etapa: a.etapa,
      cursor: o.item.signal,
      analyzedAt: nowIso,
      // Si ya no hay nada para accionar se limpia: la misma acción podrá volver a avisarse más adelante.
      lastAction: withAction ? a.accion : a.oportunidad ? o.prev?.state.lastAction || null : null,
      lastActionHash: withAction ? hash : a.oportunidad ? o.prev?.state.lastActionHash || null : null,
      lastNotifiedAt: notified ? nowIso : o.prev?.state.lastNotifiedAt || null,
      // Con movimiento nuevo la cuenta de recordatorios vuelve a cero; si se sugirió cerrar, se corta.
      nudges: follow ? (a.descartar ? FOLLOW_UP_DAYS.length : follow.n) : 0,
      lastNudgeAt: follow ? nowIso : null,
    };
  };

  let sent = 0;
  let skippedOverCap = 0;
  let enqueueErrors = 0;
  let headerSent = false;

  if (!dry) {
    for (const o of quiet) {
      await persist(o.item.key, stateFor(o, false, ""), o.prev?.log || []);
    }

    const today = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date());
    const toSend = wanting.slice(0, MAX_NOTIFY);
    skippedOverCap = wanting.length - toSend.length;
    const leftover = todo.length - outcomes.length;
    const followCount = toSend.filter((o) => o.mode === "seguimiento").length;
    // Encabezado: siempre que haya oportunidades; y una sola vez por día cuando no hay nada (o falló algo),
    // para saber que el cron corrió. En las pasadas de continuación no se repite.
    const withHeader =
      !onlyPhone && (toSend.length > 0 || (meta.headerDay !== salta(new Date()) && (leftover === 0 || failed > 0)));
    let slot = 0;

    if (withHeader) {
      const header = [
        preview ? `🧪 *VISTA PREVIA* — así le llega mañana a las 7 a Marcos. No se guardó nada.\n` : null,
        `☀️ *Resumen diario MARXEN* · ${today}`,
        toSend.length
          ? `${toSend.length} ${toSend.length === 1 ? "oportunidad para accionar" : "oportunidades para accionar"} · ${items.length} conversaciones y leads revisados.\nTe las mando de a una por minuto, las urgentes primero.`
          : `Sin novedades para accionar hoy · ${items.length} conversaciones y leads revisados.`,
        followCount > 0
          ? `🔁 ${followCount} ${followCount === 1 ? "es un seguimiento" : "son seguimientos"} de contactos sin novedades.`
          : null,
        failed > 0 ? `⚠️ ${failed} no se pudieron analizar; se reintenta en los próximos minutos.` : null,
        leftover > 0 ? `Quedan ${leftover} por analizar; si hay algo, te llega a continuación.` : null,
      ]
        .filter((line) => line !== null)
        .join("\n");
      await enqueueWhatsappOutbound({
        agentCode,
        to: destination,
        kind: "text",
        payload: { text: header },
        unique: true,
        dedupKey: `digest:${preview ? "preview:" : ""}head:${sha(`${today}|${toSend.length}|${items.length}|${preview ? nowIso : nowIso.slice(0, 13)}`)}`,
        delayMs: 0,
        wake: true,
        meta: { source: "whatsapp_digest", kind: "header" },
      });
      headerSent = true;
      slot = 1;
    }

    for (const o of toSend) {
      // Una sola notificación por contacto y por novedad, aunque dos corridas redacten distinto la acción.
      // La vista previa usa claves propias y únicas para no bloquear el envío real de mañana.
      const base =
        o.mode === "seguimiento"
          ? `${o.item.key}|seg${o.follow?.n}|${o.prev?.state.analyzedAt}`
          : `${o.item.key}|${o.item.signal}`;
      const dedupKey = preview ? `digest:preview:${sha(`${base}|${nowIso}`)}` : `digest:${sha(base)}`;
      if (!preview && (await alreadyQueued(supabase, agentCode, dedupKey))) {
        await persist(o.item.key, stateFor(o, true, o.hash), [...(o.prev?.log || [])]);
        continue;
      }
      const delayMs = slot * STAGGER_MS;
      const result = await enqueueWhatsappOutbound({
        agentCode,
        to: destination,
        kind: "text",
        payload: { text: formatNotification(o.item, o.analysis, o.follow, o.prev?.state.lastNotifiedAt) },
        unique: true,
        dedupKey,
        delayMs,
        wake: delayMs === 0,
        meta: {
          source: "whatsapp_digest",
          kind: o.mode === "seguimiento" ? "seguimiento" : "oportunidad",
          key: o.item.key,
        },
      });
      if (!result.success) {
        // No se guarda el estado: queda pendiente y se vuelve a intentar en la próxima corrida.
        enqueueErrors += 1;
        continue;
      }
      slot += 1;
      sent += 1;
      const log: ActionLog[] = [
        ...(o.prev?.log || []),
        {
          at: nowIso,
          accion: o.analysis.accion || "Sugerencia: cerrar el contacto",
          urgencia: o.analysis.urgencia,
          tipo: o.mode === "seguimiento" ? "insistencia" : "aviso",
        },
      ];
      await persist(o.item.key, stateFor(o, true, o.hash), log);
    }
  }

  return {
    ok: true,
    dry,
    elapsedMs: Date.now() - started,
    elementos: items.length,
    analizados: outcomes.length - failed,
    fallidos: failed,
    sinNovedad: items.length - todo.length,
    pendientesPorTiempo: todo.length - outcomes.length,
    oportunidades: wanting.length,
    enviados: sent,
    excedenCupo: skippedOverCap,
    erroresEnCola: enqueueErrors,
    headerSent,
    ...(dry
      ? {
          detalle: outcomes.map((o) => ({
            clave: `${o.item.key.slice(0, 8)}…`,
            nombre: o.item.name || o.item.lead?.nombre || null,
            modo: o.mode,
            mensajes: o.messages,
            analisis: o.analysis,
            avisaria: wanting.some((w) => w.item.key === o.item.key),
          })),
        }
      : {}),
  };
}

function sha(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 32);
}
