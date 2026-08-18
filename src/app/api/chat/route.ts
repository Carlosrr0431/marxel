import {
  buildNotas,
  detectsHealthCoverageIntent,
  detectsQuoteIntent,
  emptyQuoteState,
  isSaludHandoffReady,
  processQuoteFlow,
  processQuoteFlowBatch,
  stripMarkdownNoise,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";
import {
  updateLeadOptionalFromQuote,
  upsertHotLeadFromQuote,
} from "@/lib/chatbot/persist-lead";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbot/prompt";
import { formatContext, retrieveChunks } from "@/lib/chatbot/retrieve";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEEPSEEK_PRO = "deepseek-v4-pro";

type ChatMessage = { role: "user" | "assistant"; content: string };

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
    // Keep flow going even if CRM write fails; warn softly in answer later
    next.pendingSave = null;
    (next as QuoteState & { persistError?: boolean }).persistError = true;
  }
  return next;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: ChatMessage[];
      quoteState?: QuoteState;
    };

    const message = (body.message || "").trim();
    if (!message) {
      return Response.json({ error: "Mensaje vacío." }, { status: 400 });
    }
    if (message.length > 1200) {
      return Response.json(
        { error: "Mensaje demasiado largo." },
        { status: 400 }
      );
    }

    // Cotización / precio → flujo estructurado.
    // Si el usuario envió varios mensajes acumulados (separados por \n), los procesamos en cadena.
    const lines = message.includes("\n")
      ? message.split("\n").map((s) => s.trim()).filter(Boolean)
      : [message];

    const prevState = body.quoteState || emptyQuoteState();

    if (lines.length > 1) {
      const batch = await processQuoteFlowBatch(lines, prevState, persistQuoteSideEffects);
      if (batch && batch.handled && batch.answer) {
        return Response.json({
          answer: stripMarkdownNoise(batch.answer),
          sources: [],
          quoteState: batch.state,
          quickReplies: batch.quickReplies || [],
          mode: "quote",
        });
      }
      // Si el batch no fue manejado, caemos al flujo normal con el mensaje completo
    }

    const quote = processQuoteFlow(message, prevState);
    if (quote.handled && quote.answer) {
      let state = await persistQuoteSideEffects(quote.state);
      let answer = quote.answer;
      if ((state as QuoteState & { persistError?: boolean }).persistError) {
        answer += " No pude guardar en el CRM; reintentá con tu WhatsApp.";
        delete (state as QuoteState & { persistError?: boolean }).persistError;
      }

      return Response.json({
        answer: stripMarkdownNoise(answer),
        sources: quote.sources || [],
        quoteState: state,
        quickReplies: quote.quickReplies || [],
        mode: "quote",
      });
    }

    const ai = getClient();
    if (!ai) {
      return Response.json(
        {
          error:
            "El asistente no está configurado todavía. Escribinos por WhatsApp.",
          quoteState: body.quoteState || emptyQuoteState(),
        },
        { status: 503 }
      );
    }

    const history = (body.history || [])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-10);

    const qualified = isSaludHandoffReady(prevState);
    const allowSpecificPlans =
      qualified || !detectsHealthCoverageIntent(message);
    const chunks = allowSpecificPlans ? retrieveChunks(message, 6) : [];
    const context = formatContext(chunks);
    const leadNotes = buildNotas(prevState.data);

    const completion = await ai.client.chat.completions.create({
      model: ai.model,
      temperature: 0.2,
      max_tokens: qualified ? 420 : 220,
      messages: [
        {
          role: "system",
          content: CHATBOT_SYSTEM_PROMPT,
        },
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

    return Response.json({
      answer,
      sources: [],
      quoteState: body.quoteState || emptyQuoteState(),
      quickReplies: detectsQuoteIntent(message)
        ? [{ label: "Quiero cotizar", value: "Quiero cotizar" }]
        : [],
      mode: "rag",
    });
  } catch (error) {
    console.error("[chat]", error);
    return Response.json(
      {
        error:
          "Hubo un problema al responder. Intentá de nuevo en un momento.",
      },
      { status: 500 }
    );
  }
}
