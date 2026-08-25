import {
  parseModelJson,
  respondWithTools,
  getChatAi,
} from "@/lib/chatbot/ai-client";
import {
  QUOTE_INTENT_JSON_SCHEMA,
  QUOTE_INTENT_TOOLS,
} from "@/lib/chatbot/intent-schema";
import {
  QUOTE_INTENT_SYSTEM_PROMPT,
  buildQuoteTurnPreamble,
} from "@/lib/chatbot/intent-prompt";
import { runQuoteIntentTool } from "@/lib/chatbot/intent-tools";
import {
  buildNotas,
  cloneQuoteState,
  isSaludHandoffReady,
  type ModalidadQuote,
  type QuoteState,
  type SeguroGrupo,
} from "@/lib/chatbot/quote-flow";
import type { AutoCatalogItem, AutoVersion } from "@/lib/sc-auto";

type HistoryMsg = { role: "user" | "assistant"; content: string };

const INTENTS = new Set(["quote", "question", "greeting", "cancel", "other"]);
const PRODUCTOS = new Set(["seguros", "salud", "viajero"]);
const GRUPOS = new Set(["auto", "auto_moto", "hogar_comercio", "praxis_art_ap"]);
const MODALIDADES = new Set(["monotributo", "relacion_dependencia", "particular"]);

export type QuoteIntent = {
  intent: "quote" | "question" | "greeting" | "cancel" | "other";
  new_quote: boolean;
  producto: "seguros" | "salud" | "viajero" | null;
  seguro_grupo: SeguroGrupo | null;
  year: number | null;
  is0km: boolean;
  brand_id: number | null;
  brand_name: string | null;
  model_id: number | null;
  model_name: string | null;
  version_id: number | null;
  version_name: string | null;
  cp: string | null;
  localidad: string | null;
  nombre: string | null;
  celular: string | null;
  seguro_detalle: string | null;
  viajero_destino: string | null;
  modalidad: ModalidadQuote | null;
  grupo_familiar: string | null;
  edades: string | null;
  uso: string | null;
  reply: string | null;
  needs_more_info: boolean;
  missing: string[];
  confidence: number;
};

function asString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text && text !== "null" ? text : null;
}

function asInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeIntent(raw: Record<string, unknown>): QuoteIntent {
  const intent = INTENTS.has(String(raw.intent))
    ? (raw.intent as QuoteIntent["intent"])
    : "other";
  const producto = PRODUCTOS.has(String(raw.producto))
    ? (raw.producto as QuoteIntent["producto"])
    : null;
  const seguro_grupo = GRUPOS.has(String(raw.seguro_grupo))
    ? (raw.seguro_grupo as SeguroGrupo)
    : null;
  const modalidad = MODALIDADES.has(String(raw.modalidad))
    ? (raw.modalidad as ModalidadQuote)
    : null;
  const cp = String(raw.cp || "").replace(/\D/g, "").slice(0, 4);
  return {
    intent,
    new_quote: raw.new_quote === true,
    producto,
    seguro_grupo,
    year: asInt(raw.year),
    is0km: raw.is0km === true,
    brand_id: asInt(raw.brand_id),
    brand_name: asString(raw.brand_name),
    model_id: asInt(raw.model_id),
    model_name: asString(raw.model_name),
    version_id: asInt(raw.version_id),
    version_name: asString(raw.version_name),
    cp: cp.length === 4 ? cp : null,
    localidad: asString(raw.localidad),
    nombre: asString(raw.nombre),
    celular: asString(raw.celular),
    seguro_detalle: asString(raw.seguro_detalle),
    viajero_destino: asString(raw.viajero_destino),
    modalidad,
    grupo_familiar: asString(raw.grupo_familiar),
    edades: asString(raw.edades),
    uso: asString(raw.uso),
    reply: asString(raw.reply),
    needs_more_info: raw.needs_more_info === true,
    missing: Array.isArray(raw.missing) ? raw.missing.map((m) => String(m)) : [],
    confidence: Number(raw.confidence) || 0,
  };
}

export function intentAdvancesQuote(intent: QuoteIntent): boolean {
  return Boolean(
    intent.producto ||
      intent.seguro_grupo ||
      intent.year ||
      intent.brand_id ||
      intent.model_id ||
      intent.version_id ||
      intent.cp ||
      intent.nombre ||
      intent.celular ||
      intent.modalidad ||
      intent.edades ||
      intent.uso ||
      intent.viajero_destino ||
      intent.seguro_detalle
  );
}

export function mergeIntentIntoState(state: QuoteState, intent: QuoteIntent): QuoteState {
  const next = cloneQuoteState(state);
  if (intent.new_quote) {
    next.data = {
      nombre: next.data.nombre,
      celular: next.data.celular,
      localidad: next.data.localidad,
    };
    next.active = true;
    next.step = "producto";
    next.pendingSave = null;
  }

  if (intent.producto) next.data.producto = intent.producto;
  if (intent.seguro_grupo) {
    next.data.seguroGrupo = intent.seguro_grupo;
    next.data.producto = next.data.producto || "seguros";
  }
  if (intent.year) {
    next.data.producto = next.data.producto || "seguros";
    next.data.seguroGrupo = next.data.seguroGrupo || "auto";
    next.data.auto = {
      ...(next.data.auto || {}),
      year: intent.year,
      is0km: intent.is0km,
      page: 0,
    };
    next.active = true;
  }
  if (intent.brand_id && intent.brand_name) {
    const brand: AutoCatalogItem = { id: intent.brand_id, description: intent.brand_name };
    next.data.auto = {
      ...(next.data.auto || {}),
      brand,
      model: intent.model_id ? next.data.auto?.model : undefined,
      version: intent.version_id ? next.data.auto?.version : undefined,
      page: 0,
    };
    next.active = true;
  }
  if (intent.model_id && intent.model_name) {
    const model: AutoCatalogItem = { id: intent.model_id, description: intent.model_name };
    next.data.auto = {
      ...(next.data.auto || {}),
      model,
      version: intent.version_id ? next.data.auto?.version : undefined,
      page: 0,
    };
  }
  if (intent.version_id && intent.version_name) {
    const version: AutoVersion = {
      id: intent.version_id,
      description: intent.version_name,
    };
    next.data.auto = { ...(next.data.auto || {}), version, page: 0 };
  }
  if (intent.cp) next.data.auto = { ...(next.data.auto || {}), cp: intent.cp, page: 0 };
  if (intent.localidad) next.data.localidad = intent.localidad;
  if (intent.nombre) next.data.nombre = intent.nombre;
  if (intent.celular) next.data.celular = intent.celular.replace(/\D/g, "");
  if (intent.seguro_detalle) next.data.seguroDetalle = intent.seguro_detalle;
  if (intent.viajero_destino) {
    next.data.viajeroDestino = intent.viajero_destino;
    next.data.producto = next.data.producto || "viajero";
  }
  if (intent.modalidad) {
    next.data.modalidad = intent.modalidad;
    next.data.producto = next.data.producto || "salud";
  }
  if (intent.grupo_familiar) next.data.grupoFamiliar = intent.grupo_familiar;
  if (intent.edades) next.data.edades = intent.edades;
  if (intent.uso) next.data.uso = intent.uso;
  return next;
}

export async function classifyQuoteIntent(input: {
  message: string;
  history?: HistoryMsg[];
  state: QuoteState;
}): Promise<QuoteIntent | null> {
  if (!getChatAi()) return null;

  const lastBot = [...(input.history || [])]
    .reverse()
    .find((m) => m.role === "assistant")?.content;
  const qualified = isSaludHandoffReady(input.state);
  const userContent = [
    buildQuoteTurnPreamble({
      alreadyGreeted: Boolean(lastBot || input.state.active),
      qualified,
      step: input.state.step,
      lastBotReply: lastBot || null,
      snapshot: buildNotas(input.state.data),
    }),
    `Mensaje actual del cliente:\n${input.message}`,
  ].join("\n\n");

  const historyMessages = (input.history || [])
    .filter((m) => m.content?.trim())
    .slice(-8)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 400),
    }));

  try {
    const result = await respondWithTools({
      instructions: QUOTE_INTENT_SYSTEM_PROMPT,
      userContent,
      historyMessages,
      tools: QUOTE_INTENT_TOOLS,
      jsonSchema: QUOTE_INTENT_JSON_SCHEMA,
      runTool: (name, args) => runQuoteIntentTool(name, args),
      maxRounds: 4,
      maxOutputTokens: 2000,
      thinking: true,
    });
    return normalizeIntent(parseModelJson(result.text));
  } catch (err) {
    console.error("[chat][classify]", err);
    return null;
  }
}
