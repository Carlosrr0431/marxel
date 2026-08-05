import OpenAI from "openai";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbot/prompt";
import { formatContext, retrieveChunks } from "@/lib/chatbot/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

function getClient() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
      }),
      model: process.env.AI_CHAT_MODEL || "deepseek-chat",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_CHAT_MODEL || process.env.AI_CHAT_MODEL || "gpt-4o-mini",
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: ChatMessage[];
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

    const ai = getClient();
    if (!ai) {
      return Response.json(
        {
          error:
            "El asistente no está configurado todavía. Escribinos por WhatsApp.",
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
      .slice(-8);

    const chunks = retrieveChunks(message, 8);
    const context = formatContext(chunks);

    const completion = await ai.client.chat.completions.create({
      model: ai.model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: "system", content: CHATBOT_SYSTEM_PROMPT },
        {
          role: "system",
          content: `CONTEXTO DOCUMENTAL:\n${context}`,
        },
        ...history.map((m) => ({
          role: m.role,
          content: m.content.slice(0, 2000),
        })),
        { role: "user", content: message },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "No pude generar una respuesta. Probá de nuevo o escribinos por WhatsApp.";

    return Response.json({
      answer,
      sources: [...new Set(chunks.map((c) => c.sourceTitle))],
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
