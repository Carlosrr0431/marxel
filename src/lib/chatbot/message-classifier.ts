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
import {
  isDeterministicQuoteInput,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";

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
    required: ["intent", "pause_quote", "reply", "confidence"],
    properties: {
      intent: {
        type: "string",
        enum: ["quote", "question", "provider", "greeting", "cancel", "chitchat"],
      },
      pause_quote: { type: "boolean" },
      reply: { type: ["string", "null"] },
      confidence: { type: "number" },
    },
  },
};

const CLASSIFIER_PROMPT = `Sos el clasificador y voz de WhatsApp de MARXEN Protección Integral (productores en Salta, Argentina).
Hablás como una persona: español rioplatense, natural, corto. Sin markdown, sin listas robóticas, sin "como asistente de IA".

## QUÉ HACER
1) Clasificá el mensaje.
2) Si es pregunta, prestador o charla, RESPONDÉ en "reply" (2 a 5 oraciones).
3) Si es cotización (dato del flujo o pedido de cotizar), intent=quote, reply=null, pause_quote=false.

## INTENTS
- quote: cotizar o responder el flujo (año, marca, modelo, versión, CP, plan, nombre, teléfono, A2/A4 como elección de producto, destino viajero).
- question: duda de cobertura, precios orientativos, planes A2/A4, seguros, viajero. Usá search_knowledge.
- provider: si atienden / cubren / trabajan con un instituto, clínica, sanatorio, hospital, farmacia. Usá lookup_prestadores SIEMPRE. Typos: atentes=atienden, jaraba=Imágenes Jaraba.
- greeting: solo hola / buen día, sin pregunta.
- cancel: pausar, después, no ahora.
- chitchat: gracias, ok, jajaja, buenisimo, sin dato nuevo de cotización.

## REGLAS DE ORO
- Hay un flujo de cotización ABIERTO no significa que el mensaje sea quote. Si pregunta algo, es question/provider y pause_quote=true. No pidas el plan ni sigas el flujo.
- "capo atentes en el jaraba" = provider. No es un plan de auto.
- "dale" / "sí" después de un mensaje tuyo de cartilla o salud = question (seguí el tema), no quote.
- "Terceros Básico", "2020", "volkswagen", "4400", "me llamo Juan" con flujo abierto = quote.
- No inventes prestadores, precios ni coberturas. Si la tool no trae dato, decí que un asesor de MARXEN lo confirma (WhatsApp 387 634-8199).
- Cartilla: https://www.marxen.com.ar/salud/cartilla-medica — si hablás de prestadores, pasá el link.
- Conservá el tono humano: "Sí, en Jaraba atienden con A2 y A4" está bien. "Elegí un plan de la lista" NO, si no pidió cotizar.

## JSON
{"intent":"provider","pause_quote":true,"reply":"Sí, Imágenes Jaraba está en la cartilla A2 y A4. Queda en Mitre 486.","confidence":0.92}`;

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
    };
  }

  return null;
}

export async function classifyWhatsappMessage(input: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  state: QuoteState;
}): Promise<ClassifiedMessage | null> {
  const ruled = ruleClassify(input.message, input.state);
  if (ruled) return ruled;
  if (!getChatAi()) return null;

  const lastBot =
    [...(input.history || [])].reverse().find((m) => m.role === "assistant")
      ?.content || "";

  const userContent = [
    `Paso del flujo: ${input.state.step || "idle"}`,
    `Cotización activa: ${input.state.active ? "sí" : "no"}`,
    `Último mensaje del bot: ${lastBot ? `"${lastBot.slice(0, 220)}"` : "ninguno"}`,
    `Mensaje del cliente: ${input.message}`,
  ].join("\n");

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
    const pauseQuote =
      raw.pause_quote === true || isConversationalIntent(resolved) || resolved === "cancel";
    return {
      intent: resolved,
      pauseQuote,
      reply: reply && reply !== "null" ? reply : null,
      confidence: Number(raw.confidence) || 0.5,
      source: "deepseek",
    };
  } catch (err) {
    console.error("[chat][message-classifier]", err);
    return null;
  }
}
