import {
  detectsHealthCoverageIntent,
  detectsQuoteIntent,
  emptyQuoteState,
  isDeterministicQuoteInput,
  isGreeting,
  menuForChannel,
  processQuoteFlow,
  processQuoteFlowBatch,
  resumeQuoteState,
  stripMarkdownNoise,
  type QuoteQuickReply,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";
import {
  classifyQuoteIntent,
  intentAdvancesQuote,
  mergeIntentIntoState,
} from "@/lib/chatbot/classify-intent";
import {
  updateLeadOptionalFromQuote,
  upsertHotLeadFromQuote,
} from "@/lib/chatbot/persist-lead";
import { getChatAi } from "@/lib/chatbot/ai-client";
import {
  findPrestadores,
  formatPrestadorAnswer,
  looksLikePrestadorQuery,
} from "@/lib/chatbot/lookup-prestadores";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatTurnResult = {
  answer: string;
  quoteState: QuoteState;
  quickReplies: QuoteQuickReply[];
  mode: "quote" | "rag";
  error?: string;
};

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
  const skipped = await processQuoteFlow(knownPhone, withChannel(state, channel));
  if (!skipped.handled) return { state, answer, quickReplies };
  const next = await persistQuoteSideEffects(withChannel(skipped.state, channel));
  return {
    state: next,
    answer: skipped.answer || answer,
    quickReplies: skipped.quickReplies || quickReplies,
  };
}

async function finishQuoteResult(
  quote: { answer?: string; state: QuoteState; quickReplies?: QuoteQuickReply[] },
  channel?: QuoteState["channel"],
  knownPhone?: string
): Promise<ChatTurnResult> {
  let state = await persistQuoteSideEffects(withChannel(quote.state, channel));
  const skipped = await skipWhatsappIfKnown(
    state,
    quote.answer || "",
    quote.quickReplies || [],
    knownPhone,
    channel
  );
  state = skipped.state;
  let answer = skipped.answer;
  if ((state as QuoteState & { persistError?: boolean }).persistError) {
    answer += " No pude guardar en el CRM; reintentá en un momento.";
    delete (state as QuoteState & { persistError?: boolean }).persistError;
  }
  return {
    answer: stripMarkdownNoise(answer),
    quoteState: state,
    quickReplies: skipped.quickReplies,
    mode: "quote",
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
  const history = (input.history || [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-12);

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

  // Si el mensaje es una pregunta informativa (contiene "?" o empieza con
  // palabras de pregunta / menciona prestadores/cartilla), lo dejamos pasar
  // directamente a classifyQuoteIntent para que el RAG responda, incluso
  // cuando hay un flujo de cotización activo.

  // Detectar afirmativo corto como respuesta a un mensaje RAG de salud/cartilla
  // Ej: el bot dijo "está en la cartilla..." y el usuario responde "dale"/"sí"/"ok"
  const lastBotMsg = history.filter((m) => m.role === "assistant").slice(-1)[0]?.content ?? "";
  const isAffirmativeFollowupHealth =
    /^\s*(dale|s[ií]|ok|bueno|listo|claro|perfecto|anda(ndo)?|va(le)?|genial|quiero|manda(me)?|pas[aá](me)?)\s*[!.,]*\s*$/i.test(message) &&
    /\b(cartilla|prestador|cl[ií]nica|sanatorio|hospital|farmacia|plan\s+[aA][24]|prevenci[oó]n\s+salud|cobertura|m[eé]dico)\b/i.test(lastBotMsg);

  const prestadorHits = findPrestadores(message);
  const isInfoQuestion =
    isAffirmativeFollowupHealth ||
    looksLikePrestadorQuery(message) ||
    message.includes("?") ||
    /^\s*(qu[eé]|cu[aá]l(es)?|c[oó]mo|d[oó]nde|cu[aá]nto|hay\s|existe[n]?\s|tienen|me\s+pod[eé]s|pod[eé]s\s+decir|quiero\s+saber|dame\s|decime\s|lista\s|quiero\s+ver)/i.test(message) ||
    /\b(prestador(es)?|cartilla|cl[ií]nica[s]?|sanatorio[s]?|hospital(es)?|farmacia[s]?|m[eé]dico[s]?|especialidad(es)?|coberturas?\s+del?\s+plan|qu[eé]\s+cubre|lista\s+de\s+prestadores?|qu[eé]\s+incluye)\b/i.test(message);

  // Respuesta directa de cartilla (Jaraba, Tres Cerritos, etc.) aunque el flujo
  // de cotización esté activo: no pedir plan ni enviar poll.
  if (prestadorHits.length > 0) {
    return {
      answer: formatPrestadorAnswer(prestadorHits),
      quoteState: prevState,
      quickReplies: [],
      mode: "rag",
    };
  }

  const deterministic = isDeterministicQuoteInput(message, prevState);
  if (!isInfoQuestion && (deterministic || prevState.active)) {
    const quote = await processQuoteFlow(message, prevState, input.channel);
    if (quote.handled && quote.answer) {
      return finishQuoteResult(quote, input.channel, input.knownPhone);
    }
  }

  const classified = await classifyQuoteIntent({
    message,
    history,
    state: prevState,
  });

  if (classified) {
    if (classified.intent === "cancel") {
      return {
        answer:
          classified.reply ||
          "Queda pausado. Cuando quieras seguimos con los datos que ya anoté.",
        quoteState: { ...prevState, active: false, step: prevState.step === "done" ? "done" : "idle" },
        quickReplies: menuForChannel(input.channel),
        mode: "quote",
      };
    }

    const merged = mergeIntentIntoState(prevState, classified);

    // FIX: si el usuario hizo una pregunta informativa durante un flujo activo
    // (ej: "trabajan con el hospital tres cerritos?" mientras se cotiza un auto),
    // responder directamente sin avanzar el estado de la cotización.
    // Esto evita que intentAdvancesQuote() dispare resumeQuoteState() y
    // envíe el poll del paso siguiente.
    const forcedInfo = isInfoQuestion && prevState.active;

    const questionOnly =
      forcedInfo ||
      ((classified.intent === "question" || classified.intent === "other") &&
      classified.reply &&
      !intentAdvancesQuote(classified));

    if (questionOnly) {
      if (classified.reply) {
        return {
          answer: stripMarkdownNoise(classified.reply),
          quoteState: prevState,
          quickReplies: prevState.active ? [] : menuForChannel(input.channel),
          mode: "rag",
        };
      }
      // classified.reply es null pero es forcedInfo: continúa para obtener respuesta de IA
      // sin avanzar el flujo (el guard al final lo evita)
    }

    if (!forcedInfo && (intentAdvancesQuote(classified) || classified.intent === "quote")) {
      const resumed = await resumeQuoteState(withChannel(merged, input.channel));
      if (resumed?.handled && resumed.answer) {
        return finishQuoteResult(resumed, input.channel, input.knownPhone);
      }
    }

    if (classified.reply) {
      return {
        answer: stripMarkdownNoise(classified.reply),
        quoteState: forcedInfo ? prevState : merged,
        quickReplies:
          input.channel === "whatsapp" && !(forcedInfo ? prevState : merged).active
            ? menuForChannel("whatsapp")
            : [],
        mode: classified.intent === "quote" ? "quote" : "rag",
      };
    }
  }

  // No llamar a processQuoteFlow si es pregunta informativa con flujo activo:
  // evita que el paso actual del flujo se regenere y dispare un poll no solicitado.
  if (!(isInfoQuestion && prevState.active)) {
    const quote = await processQuoteFlow(message, prevState, input.channel);
    if (quote.handled && quote.answer) {
      return finishQuoteResult(quote, input.channel, input.knownPhone);
    }
  }

  if (!getChatAi()) {
    return {
      answer: "El asistente no está configurado todavía. Escribinos por WhatsApp.",
      quoteState: prevState,
      quickReplies: [],
      mode: "rag",
      error: "missing_ai",
    };
  }

  const menu = menuForChannel(input.channel);
  return {
    answer: "No te seguí. ¿Cotizamos un seguro, vemos salud o viajero?",
    quoteState: prevState,
    quickReplies:
      input.channel === "whatsapp" && !prevState.active
        ? menu
        : detectsQuoteIntent(message) || detectsHealthCoverageIntent(message)
          ? [{ label: "Quiero cotizar", value: "Quiero cotizar" }]
          : menu,
    mode: "rag",
  };
}
