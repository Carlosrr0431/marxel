import {
  buildNotas,
  detectsHealthCoverageIntent,
  detectsQuoteIntent,
  emptyQuoteState,
  isGreeting,
  isSaludHandoffReady,
  menuForChannel,
  processQuoteFlow,
  processQuoteFlowBatch,
  stripMarkdownNoise,
  type QuoteQuickReply,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";
import {
  updateLeadOptionalFromQuote,
  upsertHotLeadFromQuote,
} from "@/lib/chatbot/persist-lead";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbot/prompt";
import { formatContext, retrieveChunks } from "@/lib/chatbot/retrieve";
import OpenAI from "openai";

const DEEPSEEK_PRO = "deepseek-v4-pro";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatTurnResult = {
  answer: string;
  quoteState: QuoteState;
  quickReplies: QuoteQuickReply[];
  mode: "quote" | "rag";
  error?: string;
};

function getClient() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    return {
      client: new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com",
      }),
      model: DEEPSEEK_PRO,
      provider: "deepseek" as const,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model:
        process.env.OPENAI_CHAT_MODEL ||
        process.env.AI_CHAT_MODEL ||
        "gpt-4o-mini",
      provider: "openai" as const,
    };
  }

  return null;
}

async function persistQuoteSideEffects(state: QuoteState): Promise<QuoteState> {
  const next = { ...state, data: { ...state.data } };
  try {
    if (next.pendingSave === "hot") {
      const leadId = await upsertHotLeadFromQuote(next);
      next.leadId = leadId;
      next.pendingSave = null;
    } else if (next.pendingSave === "optional" && next.leadId) {
      await updateLeadOptionalFromQuote(next);
      next.pendingSave = null;
    } else {
      next.pendingSave = null;
    }
  } catch (err) {
    console.error("[chat][persist]", err);
    next.pendingSave = null;
    (next as QuoteState & { persistError?: boolean }).persistError = true;
  }
  return next;
}

function withChannel(state: QuoteState, channel?: QuoteState["channel"]): QuoteState {
  if (!channel) return state;
  return { ...state, channel };
}

async function skipWhatsappIfKnown(
  state: QuoteState,
  answer: string,
  quickReplies: QuoteQuickReply[],
  knownPhone: string | undefined,
  channel?: QuoteState["channel"]
): Promise<{ state: QuoteState; answer: string; quickReplies: QuoteQuickReply[] }> {
  if (!knownPhone || state.step !== "whatsapp" || state.data.celular) {
    return { state, answer, quickReplies };
  }
  const skipped = processQuoteFlow(knownPhone, withChannel(state, channel));
  if (!skipped.handled) return { state, answer, quickReplies };
  const next = await persistQuoteSideEffects(withChannel(skipped.state, channel));
  return {
    state: next,
    answer: skipped.answer || answer,
    quickReplies: skipped.quickReplies || quickReplies,
  };
}

export async function runChatTurn(input: {
  message: string;
  history?: ChatMessage[];
  quoteState?: QuoteState;
  channel?: QuoteState["channel"];
  knownPhone?: string;
}): Promise<ChatTurnResult> {
  const message = (input.message || "").trim();
  if (!message) {
    return {
      answer: "",
      quoteState: input.quoteState || emptyQuoteState(),
      quickReplies: [],
      mode: "quote",
      error: "Mensaje vacío.",
    };
  }

  const prevState = withChannel(
    input.quoteState || emptyQuoteState(),
    input.channel
  );

  if (input.channel === "whatsapp" && !prevState.active && isGreeting(message)) {
    return {
      answer: "¡Hola! Bienvenido a MARXEN Protección Integral. ¿En qué te puedo ayudar hoy?",
      quoteState: prevState,
      quickReplies: menuForChannel("whatsapp"),
      mode: "quote",
    };
  }

  const lines = message.includes("\n")
    ? message.split("\n").map((s) => s.trim()).filter(Boolean)
    : [message];

  if (lines.length > 1) {
    const batch = await processQuoteFlowBatch(
      lines,
      prevState,
      persistQuoteSideEffects,
      input.channel
    );
    if (batch && batch.handled && batch.answer) {
      const skipped = await skipWhatsappIfKnown(
        withChannel(batch.state, input.channel),
        batch.answer,
        batch.quickReplies || [],
        input.knownPhone,
        input.channel
      );
      return {
        answer: stripMarkdownNoise(skipped.answer),
        quoteState: skipped.state,
        quickReplies: skipped.quickReplies,
        mode: "quote",
      };
    }
  }

  const quote = processQuoteFlow(message, prevState, input.channel);
  if (quote.handled && quote.answer) {
    let state = await persistQuoteSideEffects(withChannel(quote.state, input.channel));
    const skipped = await skipWhatsappIfKnown(
      state,
      quote.answer,
      quote.quickReplies || [],
      input.knownPhone,
      input.channel
    );
    state = skipped.state;
    quote.answer = skipped.answer;
    quote.quickReplies = skipped.quickReplies;
    let answer = quote.answer;
    if ((state as QuoteState & { persistError?: boolean }).persistError) {
      answer += " No pude guardar en el CRM; reintentá en un momento.";
      delete (state as QuoteState & { persistError?: boolean }).persistError;
    }
    return {
      answer: stripMarkdownNoise(answer),
      quoteState: state,
      quickReplies: quote.quickReplies || [],
      mode: "quote",
    };
  }

  const ai = getClient();
  if (!ai) {
    return {
      answer: "El asistente no está configurado todavía. Escribinos por WhatsApp.",
      quoteState: prevState,
      quickReplies: [],
      mode: "rag",
      error: "missing_ai",
    };
  }

  const history = (input.history || [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-10);

  const qualified = isSaludHandoffReady(prevState);
  const allowSpecificPlans = qualified || !detectsHealthCoverageIntent(message);
  const chunks = allowSpecificPlans ? retrieveChunks(message, 6) : [];
  const context = formatContext(chunks);
  const leadNotes = buildNotas(prevState.data);

  const completion = await ai.client.chat.completions.create({
    model: ai.model,
    temperature: 0.2,
    max_tokens: qualified ? 420 : 220,
    messages: [
      { role: "system", content: CHATBOT_SYSTEM_PROMPT },
      {
        role: "system",
        content: `CALIFICADO=${qualified ? "si" : "no"}\nDATOS DEL LEAD:\n${leadNotes || "sin datos todavía"}\n\nCONTEXTO:\n${context || "sin contexto específico"}`,
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content.slice(0, 1500),
      })),
      { role: "user", content: message },
    ],
    ...(ai.provider === "deepseek"
      ? ({ thinking: { type: "disabled" } } as Record<string, unknown>)
      : {}),
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  const answer = stripMarkdownNoise(
    completion.choices[0]?.message?.content?.trim() ||
      "No pude responder. Probá de nuevo o escribinos por WhatsApp."
  );

  const menu = menuForChannel(input.channel);
  return {
    answer,
    quoteState: prevState,
    quickReplies:
      input.channel === "whatsapp" && !prevState.active
        ? menu
        : detectsQuoteIntent(message)
          ? [{ label: "Quiero cotizar", value: "Quiero cotizar" }]
          : [],
    mode: "rag",
  };
}
