import { emptyQuoteState, type QuoteQuickReply, type QuoteState } from "@/lib/chatbot/quote-flow";
import type { ChatMessage } from "@/lib/chatbot/run-turn";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export type PendingPoll = {
  name: string;
  options: QuoteQuickReply[];
  messageId?: string | null;
};

export type ConversationRow = {
  phone: string;
  quote_state: QuoteState;
  history: ChatMessage[];
  pending_poll: PendingPoll | null;
  last_message_id: string | null;
  last_event: string | null;
};

export async function loadConversation(phone: string): Promise<ConversationRow> {
  const key = normalizeArPhone(phone) || phone;
  const fallback: ConversationRow = {
    phone: key,
    quote_state: emptyQuoteState(),
    history: [],
    pending_poll: null,
    last_message_id: null,
    last_event: null,
  };
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("phone,quote_state,history,pending_poll,last_message_id,last_event")
      .eq("phone", key)
      .maybeSingle();
    if (error || !data) return fallback;
    return {
      phone: key,
      quote_state:
        data.quote_state &&
        typeof data.quote_state === "object" &&
        "step" in (data.quote_state as object)
          ? (data.quote_state as QuoteState)
          : emptyQuoteState(),
      history: Array.isArray(data.history) ? (data.history as ChatMessage[]) : [],
      pending_poll: (data.pending_poll as PendingPoll | null) || null,
      last_message_id: data.last_message_id || null,
      last_event: data.last_event || null,
    };
  } catch {
    return fallback;
  }
}

export async function saveConversation(row: ConversationRow) {
  const payload = {
    phone: row.phone,
    quote_state: row.quote_state,
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
