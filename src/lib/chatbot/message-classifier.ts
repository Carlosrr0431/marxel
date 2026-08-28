import {
  parseModelJson,
  respondWithTools,
  getChatAi,
} from "@/lib/chatbot/ai-client";
import { QUOTE_INTENT_TOOLS } from "@/lib/chatbot/intent-schema";
import { runQuoteIntentTool } from "@/lib/chatbot/intent-tools";
import {
  findPrestadores,
  formatPrestadorAnswer,
} from "@/lib/chatbot/lookup-prestadores";
import { answerHealthPlanQuestion } from "@/lib/chatbot/health-plan-answer";
import {
  inferProductoFromMessage,
  isDeterministicQuoteInput,
  looksLikeCoverageQuestion,
  looksLikeExplicitQuote,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";
import type { ProductoInteres } from "@/lib/crm/types";

export type MessageIntent =
  | "quote"
  | "question"
  | "provider"
  | "greeting"
  | "cancel"
  | "chitchat";

export type ClassifiedMessage = {
  intent: MessageIntent;
  pauseQuote: boolean;
  reply: string | null;
  confidence: number;
  source: "rule" | "deepseek";
  producto: ProductoInteres | null;
};

const CONVERSATIONAL: ReadonlySet<MessageIntent> = new Set([
  "question",
  "provider",
  "chitchat",
]);

const CLASSIFIER_TOOLS = QUOTE_INTENT_TOOLS.filter((t) =>
  ["lookup_prestadores", "search_knowledge", "get_contact_info"].includes(t.name)
);

const CLASSIFIER_SCHEMA = {
  name: "message_intent",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intent", "pause_quote", "reply", "confidence", "producto"],
    properties: {
      intent: {
        type: "string",
        enum: ["quote", "question", "provider", "greeting", "cancel", "chitchat"],
      },
      pause_quote: { type: "boolean" },
      reply: { type: ["string", "null"] },
      confidence: { type: "number" },
      producto: {
        type: ["string", "null"],
        enum: ["seguros", "salud", "viajero", null],
      },
    },
  },
};

const CLASSIFIER_PROMPT = `Sos el clasificador y voz de WhatsApp de MARXEN Protección Integral (productores en Salta, Argentina).
Hablás como una persona: español rioplatense, natural, corto. Sin markdown, sin "como asistente de IA".

## QUÉ HACER
1) Clasificá el mensaje con RIGOR. Cotizar es raro: solo si lo pide o está contestando el dato del flujo ACTUAL.
2) Si es pregunta, prestador o charla, RESPONDÉ en "reply" (2 a 5 oraciones) usando tools.
3) producto: seguros | salud | viajero | null. Llenalo si el tema se entiende, aunque sea pregunta.

## INTENT=quote SOLO SI
- Dice cotizar / presupuesto / pasame precio / quiero un plan / quiero afiliarme / quiero un seguro.
- O responde el paso ACTUAL con un dato de ESE producto: "Terceros Básico", "2020", "volkswagen", "4400", "me llamo Juan", "monotributo".
Si hay duda, NO es quote. Es question.

## NO ES QUOTE (ejemplos reales)
- "che capo y odontologo con protesis" → question, producto=salud. Habla de cobertura dental. NO pidas plan de auto.
- "atentes en el jaraba" → provider.
- "tienen ortodoncia?" → question, salud.
- "cuánto cubre el A2 en odontología" → question, salud.
- "y para viajar a Brasil?" como duda de cobertura viajero, sin "cotizar" → question, viajero.
- "quiero cotizar prepaga" / "armame salud" → quote, producto=salud (cambia de producto).
- "cotizame viajero" / "asistencia al viajero" + cotizar → quote, producto=viajero.
- "mejor el seguro del auto no, quiero salud" → quote, producto=salud.

## CAMBIO DE PRODUCTO
Si cotiza OTRO producto distinto al flujo abierto: intent=quote, pause_quote=false, producto=el nuevo.
El sistema limpia auto/salud/viaje y conserva nombre, WhatsApp y localidad. reply=null.

## TOOLS
- lookup_prestadores: clínicas, institutos, hospitales.
- search_knowledge: coberturas (odontología, prótesis, A2/A4, viajero, autos). USALO en preguntas.
- get_contact_info: teléfono MARXEN.

## REGLAS
- Flujo abierto de auto NO convierte una pregunta de salud en quote.
- No inventes coberturas. Si falta dato, un asesor de MARXEN lo confirma (387 634-8199).
- Cartilla: https://www.marxen.com.ar/salud/cartilla-medica

## JSON
{"intent":"question","pause_quote":true,"producto":"salud","reply":"En A2 y A4 hay cobertura odontológica y prótesis según plan. Un asesor te confirma el detalle.","confidence":0.93}`;

export function isConversationalIntent(intent: MessageIntent): boolean {
  return CONVERSATIONAL.has(intent);
}

function ruleClassify(
  message: string,
  state: QuoteState
): ClassifiedMessage | null {
  const t = message.trim();
  if (!t) return null;

  if (isDeterministicQuoteInput(t, state)) {
    return {
      intent: "quote",
      pauseQuote: false,
      reply: null,
      confidence: 1,
      source: "rule",
      producto: state.data.producto || inferProductoFromMessage(t),
    };
  }

  if (
    /^(cancel(ar)?|paus(a|ar)|dejalo|dejame|otro\s+rato|despu[eé]s|no\s+ahora|basta|parar)\s*[.!]?\s*$/i.test(
      t
    )
  ) {
    return {
      intent: "cancel",
      pauseQuote: true,
      reply: "Queda pausado. Cuando quieras seguimos con los datos que ya anoté.",
      confidence: 0.95,
      source: "rule",
      producto: state.data.producto || null,
    };
  }

  const prestadores = findPrestadores(t);
  if (prestadores.length > 0) {
    return {
      intent: "provider",
      pauseQuote: true,
      reply: formatPrestadorAnswer(prestadores),
      confidence: 0.98,
      source: "rule",
      producto: "salud",
    };
  }

  const planReply = answerHealthPlanQuestion(t);
  if (planReply) {
    return {
      intent: "question",
      pauseQuote: true,
      reply: planReply,
      confidence: 0.95,
      source: "rule",
      producto: "salud",
    };
  }

  return null;
}

function applyQuoteRigor(
  classified: ClassifiedMessage,
  message: string,
  state: QuoteState
): ClassifiedMessage {
  const hinted = classified.producto || inferProductoFromMessage(message);
  const explicit = looksLikeExplicitQuote(message);
  const coverage = looksLikeCoverageQuestion(message, state);
  const current = state.data.producto;

  if (coverage && !explicit) {
    return {
      ...classified,
      intent: classified.intent === "provider" ? "provider" : "question",
      pauseQuote: true,
      producto: hinted || "salud",
    };
  }

  if (classified.intent === "quote" && hinted && current && hinted !== current && !explicit) {
    return {
      ...classified,
      intent: "question",
      pauseQuote: true,
      producto: hinted,
    };
  }

  return { ...classified, producto: hinted || classified.producto };
}

export async function classifyWhatsappMessage(input: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  state: QuoteState;
}): Promise<ClassifiedMessage | null> {
  const ruled = ruleClassify(input.message, input.state);
  if (ruled?.reply || (ruled?.intent === "quote" && ruled.source === "rule")) {
    return applyQuoteRigor(ruled, input.message, input.state);
  }
  if (!getChatAi()) {
    if (looksLikeCoverageQuestion(input.message, input.state)) {
      return {
        intent: "question",
        pauseQuote: true,
        reply: null,
        confidence: 0.7,
        source: "rule",
        producto: inferProductoFromMessage(input.message),
      };
    }
    return ruled;
  }

  const lastBot =
    [...(input.history || [])].reverse().find((m) => m.role === "assistant")
      ?.content || "";

  const userContent = [
    `Paso del flujo: ${input.state.step || "idle"}`,
    `Producto en curso: ${input.state.data.producto || "ninguno"}`,
    `Cotización activa: ${input.state.active ? "sí" : "no"}`,
    `Último mensaje del bot: ${lastBot ? `"${lastBot.slice(0, 220)}"` : "ninguno"}`,
    `Mensaje del cliente: ${input.message}`,
    looksLikeCoverageQuestion(input.message, input.state)
      ? "HINT: parece pregunta de cobertura, no cotización, salvo que pida cotizar explícito."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyMessages = (input.history || [])
    .filter((m) => m.content?.trim())
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 320) }));

  try {
    const result = await respondWithTools({
      instructions: CLASSIFIER_PROMPT,
      userContent,
      historyMessages,
      tools: CLASSIFIER_TOOLS,
      jsonSchema: CLASSIFIER_SCHEMA,
      runTool: (name, args) => runQuoteIntentTool(name, args),
      maxRounds: 4,
      maxOutputTokens: 1800,
      thinking: true,
    });
    const raw = parseModelJson(result.text);
    const intent = String(raw.intent || "other");
    const allowed: MessageIntent[] = [
      "quote",
      "question",
      "provider",
      "greeting",
      "cancel",
      "chitchat",
    ];
    const resolved: MessageIntent = allowed.includes(intent as MessageIntent)
      ? (intent as MessageIntent)
      : "question";
    const reply = String(raw.reply ?? "").trim();
    const productoRaw = String(raw.producto || "");
    const producto: ProductoInteres | null =
      productoRaw === "salud" || productoRaw === "seguros" || productoRaw === "viajero"
        ? productoRaw
        : inferProductoFromMessage(input.message);
    const pauseQuote =
      raw.pause_quote === true || isConversationalIntent(resolved) || resolved === "cancel";
    return applyQuoteRigor(
      {
        intent: resolved,
        pauseQuote,
        reply: reply && reply !== "null" ? reply : null,
        confidence: Number(raw.confidence) || 0.5,
        source: "deepseek",
        producto,
      },
      input.message,
      input.state
    );
  } catch (err) {
    console.error("[chat][message-classifier]", err);
    if (looksLikeCoverageQuestion(input.message, input.state)) {
      return {
        intent: "question",
        pauseQuote: true,
        reply: null,
        confidence: 0.6,
        source: "rule",
        producto: inferProductoFromMessage(input.message),
      };
    }
    return null;
  }
}
