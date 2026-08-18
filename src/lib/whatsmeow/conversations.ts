import { emptyQuoteState, type QuoteQuickReply, type QuoteState } from "@/lib/chatbot/quote-flow";
import type { ChatMessage } from "@/lib/chatbot/run-turn";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export const ACCUMULATION_MS = 30_000;
const INBOX_KEY = "__waInbox";

export type PendingPoll = {
  name: string;
  options: QuoteQuickReply[];
  messageId?: string | null;
};

export type PendingInbound = {
  id: string;
  text: string;
  at: string;
};

export type WaInbox = {
  messages: PendingInbound[];
  until: string | null;
  dest: string;
};

export type ConversationRow = {
  phone: string;
  quote_state: QuoteState;
  history: ChatMessage[];
  pending_poll: PendingPoll | null;
  last_message_id: string | null;
  last_event: string | null;
  inbox: WaInbox;
};

function emptyInbox(): WaInbox {
  return { messages: [], until: null, dest: "" };
}

function splitQuote(raw: unknown): { quoteState: QuoteState; inbox: WaInbox } {
  const rec =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as QuoteState & { [INBOX_KEY]?: WaInbox })
      : null;
  const inbox = rec?.[INBOX_KEY];
  const quoteState =
    rec && "step" in rec ? ({ ...rec } as QuoteState & { [INBOX_KEY]?: WaInbox }) : emptyQuoteState();
  delete (quoteState as QuoteState & { [INBOX_KEY]?: WaInbox })[INBOX_KEY];
  return {
    quoteState,
    inbox:
      inbox && Array.isArray(inbox.messages)
        ? {
            messages: inbox.messages.slice(-20),
            until: inbox.until || null,
            dest: String(inbox.dest || ""),
          }
        : emptyInbox(),
  };
}

function storedQuote(quoteState: QuoteState, inbox: WaInbox) {
  return { ...quoteState, [INBOX_KEY]: inbox };
}

function fallbackRow(phone: string): ConversationRow {
  return {
    phone,
    quote_state: emptyQuoteState(),
    history: [],
    pending_poll: null,
    last_message_id: null,
    last_event: null,
    inbox: emptyInbox(),
  };
}

export async function loadConversation(phone: string): Promise<ConversationRow> {
  const key = normalizeArPhone(phone) || phone;
  const fallback = fallbackRow(key);
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("phone,quote_state,history,pending_poll,last_message_id,last_event")
      .eq("phone", key)
      .maybeSingle();
    if (error || !data) return fallback;
    const split = splitQuote(data.quote_state);
    return {
      phone: key,
      quote_state: split.quoteState,
      history: Array.isArray(data.history) ? (data.history as ChatMessage[]) : [],
      pending_poll: (data.pending_poll as PendingPoll | null) || null,
      last_message_id: data.last_message_id || null,
      last_event: data.last_event || null,
      inbox: split.inbox,
    };
  } catch {
    return fallback;
  }
}

export async function saveConversation(row: ConversationRow) {
  const payload = {
    phone: row.phone,
    quote_state: storedQuote(row.quote_state, row.inbox || emptyInbox()),
    history: row.history.slice(-20),
    pending_poll: row.pending_poll,
    last_message_id: row.last_message_id,
    last_event: row.last_event,
    updated_at: new Date().toISOString(),
  };
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("whatsapp_conversations").upsert(payload, {
      onConflict: "phone",
    });
    if (error) console.error("[whatsapp][conv]", error.message);
  } catch (err) {
    console.error("[whatsapp][conv]", err);
  }
}

export async function enqueueInbound(
  phone: string,
  item: { id: string; text: string; dest: string }
) {
  const conv = await loadConversation(phone);
  if (
    item.id &&
    (conv.last_message_id === item.id || conv.inbox.messages.some((row) => row.id === item.id))
  ) {
    return { duplicate: true as const, collector: false, waitMs: 0, conv };
  }

  const now = Date.now();
  const untilMs = conv.inbox.until ? Date.parse(conv.inbox.until) : 0;
  const collector = !untilMs || untilMs <= now;
  conv.inbox.messages = [
    ...conv.inbox.messages,
    { id: item.id, text: item.text, at: new Date(now).toISOString() },
  ].slice(-20);
  conv.inbox.dest = item.dest || conv.inbox.dest;
  if (collector) {
    conv.inbox.until = new Date(now + ACCUMULATION_MS).toISOString();
  }
  conv.last_message_id = item.id || conv.last_message_id;
  await saveConversation(conv);
  const waitMs = Math.max(0, Date.parse(conv.inbox.until || "") - now);
  return { duplicate: false as const, collector, waitMs, conv };
}

export async function claimInbox(phone: string) {
  const conv = await loadConversation(phone);
  if (!conv.inbox.messages.length) return null;
  const token = `flush:${conv.inbox.until || ""}`;
  if (conv.last_event === token) return null;
  const messages = conv.inbox.messages;
  const dest = conv.inbox.dest;
  conv.inbox = emptyInbox();
  conv.last_event = token;
  await saveConversation(conv);
  return { messages, dest, conv };
}
