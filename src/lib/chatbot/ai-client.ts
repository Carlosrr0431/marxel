import OpenAI from "openai";

const DEEPSEEK_PRO = "deepseek-v4-pro";

export type ChatAi = {
  client: OpenAI;
  model: string;
  provider: "deepseek" | "openai";
};

export type ToolRunner = (
  name: string,
  args: Record<string, unknown>
) => Promise<unknown> | unknown;

export type JsonSchemaFormat = {
  name: string;
  schema: Record<string, unknown>;
};

let _client: ChatAi | null | undefined;

export function getChatAi(): ChatAi | null {
  if (_client !== undefined) return _client;

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    _client = {
      client: new OpenAI({
        apiKey: deepseekKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      }),
      model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_MODEL || DEEPSEEK_PRO,
      provider: "deepseek",
    };
    return _client;
  }

  if (process.env.OPENAI_API_KEY) {
    _client = {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_CHAT_MODEL || process.env.AI_CHAT_MODEL || "gpt-4o-mini",
      provider: "openai",
    };
    return _client;
  }

  _client = null;
  return _client;
}

export function repairLooseJson(text: string): string {
  return String(text || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*undefined\b/g, ": null")
    .replace(/:\s*NaN\b/g, ": null");
}

export function parseModelJson(raw: string): Record<string, unknown> {
  const text = String(raw || "").trim();
  if (!text) return {};
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = repairLooseJson(fenced ? fenced[1] : text).trim();
  const tryParse = (value: string) => {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  const direct = tryParse(payload);
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = tryParse(payload.slice(start, end + 1));
    if (sliced && typeof sliced === "object" && !Array.isArray(sliced)) return sliced;
  }
  return {};
}

function extractResponsesOutputText(response: {
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
}): string {
  if (response?.output_text) return String(response.output_text);
  const texts: string[] = [];
  for (const item of response?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item.content || []) {
      if ((part.type === "output_text" || part.type === "text") && part.text) {
        texts.push(part.text);
      }
    }
  }
  return texts.join("\n");
}

function functionCallsFromResponse(response: {
  output?: Array<{ type?: string; name?: string; arguments?: unknown; call_id?: string }>;
}) {
  return (response?.output || []).filter((item) => item?.type === "function_call");
}

function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function createResponsesOnce(
  client: OpenAI,
  request: Record<string, unknown>
) {
  const attempts = [
    request,
    { ...request, text: { format: { type: "json_object" } } },
    { ...request, reasoning: undefined, text: { format: { type: "json_object" } } },
  ];
  let lastErr: unknown;
  for (const body of attempts) {
    try {
      return await client.responses.create(body as never);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function respondWithTools({
  instructions,
  userContent,
  historyMessages = [],
  tools = [],
  jsonSchema,
  runTool,
  maxRounds = 3,
  maxOutputTokens = 800,
}: {
  instructions: string;
  userContent: string;
  historyMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: unknown[];
  jsonSchema?: JsonSchemaFormat | null;
  runTool?: ToolRunner | null;
  maxRounds?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; api: "responses" | "chat" }> {
  const ai = getChatAi();
  if (!ai) throw new Error("missing_ai");

  const text = jsonSchema?.schema
    ? {
        format: {
          type: "json_schema",
          name: jsonSchema.name || "result",
          schema: jsonSchema.schema,
          strict: false,
        },
      }
    : { format: { type: "json_object" } };

  let input: unknown[] = [
    ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userContent },
  ];

  try {
    for (let round = 0; round <= maxRounds; round += 1) {
      const request: Record<string, unknown> = {
        model: ai.model,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
        stream: false,
        reasoning: { effort: "none" },
        text,
      };
      if (tools.length) request.tools = tools;

      const response = (await createResponsesOnce(ai.client, request)) as {
        output_text?: string;
        output?: Array<{
          type?: string;
          name?: string;
          arguments?: unknown;
          call_id?: string;
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };

      const calls = functionCallsFromResponse(response);
      const textOut = extractResponsesOutputText(response);
      if (!calls.length || typeof runTool !== "function" || round >= maxRounds) {
        return { text: textOut, api: "responses" };
      }

      const followups = [];
      for (const call of calls) {
        let result: unknown;
        try {
          result = await runTool(String(call.name || ""), parseToolArgs(call.arguments));
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "tool_failed" };
        }
        followups.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: typeof result === "string" ? result : JSON.stringify(result),
        });
      }
      input = [...input, ...calls, ...followups];
    }
  } catch (err) {
    console.warn(
      "[chat][responses-fallback]",
      err instanceof Error ? err.message : "responses_failed"
    );
  }

  const completion = await ai.client.chat.completions.create({
    model: ai.model,
    messages: [
      { role: "system", content: instructions },
      ...historyMessages,
      { role: "user", content: userContent },
    ],
    max_tokens: maxOutputTokens,
    response_format: { type: "json_object" },
    ...(ai.provider === "deepseek"
      ? ({ thinking: { type: "disabled" } } as Record<string, unknown>)
      : {}),
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  return {
    text: completion.choices?.[0]?.message?.content || "",
    api: "chat",
  };
}
