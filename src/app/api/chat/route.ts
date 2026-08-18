import { runChatTurn } from "@/lib/chatbot/run-turn";
import type { QuoteState } from "@/lib/chatbot/quote-flow";
import type { ChatMessage } from "@/lib/chatbot/run-turn";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      return Response.json({ error: "Mensaje demasiado largo." }, { status: 400 });
    }

    const result = await runChatTurn({
      message,
      history: body.history,
      quoteState: body.quoteState,
      channel: "web",
    });

    if (result.error === "missing_ai") {
      return Response.json(
        { error: result.answer, quoteState: result.quoteState },
        { status: 503 }
      );
    }

    return Response.json({
      answer: result.answer,
      sources: [],
      quoteState: result.quoteState,
      quickReplies: result.quickReplies,
      mode: result.mode,
    });
  } catch (error) {
    console.error("[chat]", error);
    return Response.json(
      {
        error: "Hubo un problema al responder. Intentá de nuevo en un momento.",
      },
      { status: 500 }
    );
  }
}
