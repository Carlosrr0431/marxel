import { runChatTurn } from "@/lib/chatbot/run-turn";
import { getWhatsmeowAgentCode, getWhatsmeowWebhookSecret } from "@/lib/whatsmeow/config";
import { sendWhatsmeowPoll, sendWhatsmeowText } from "@/lib/whatsmeow/client";
import { loadConversation, saveConversation } from "@/lib/whatsmeow/conversations";
import { mapPollToValue, parseInbound, pollOptionsFromReplies } from "@/lib/whatsmeow/inbound";

const IGNORE_EVENTS = new Set([
  "messages.status",
  "messages.ack",
  "messages.reaction",
  "messages.revoke",
]);

const LIFECYCLE_EVENTS = new Set([
  "session.status",
  "webhook.test",
  "qrcode.updated",
  "passkey.updated",
]);

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function webhookSecretOk(request: Request) {
  const expected = getWhatsmeowWebhookSecret();
  if (!expected) return true;
  const got = String(
    request.headers.get("x-webhook-secret") || request.headers.get("X-Webhook-Secret") || ""
  ).trim();
  return Boolean(got) && timingSafeEqual(got, expected);
}

function destination(chatJid: string, phone: string) {
  if (chatJid.includes("@") && !chatJid.includes("@g.us") && !chatJid.includes("@broadcast")) {
    return chatJid;
  }
  return phone;
}

function pollNameFrom(answer: string) {
  const line =
    answer
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1) || "Elegí una opción";
  return line.slice(0, 80);
}

export async function handleWhatsappInbound(body: unknown) {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const event = String(root.event || "").trim();

  if (LIFECYCLE_EVENTS.has(event)) {
    return { status: 200, body: { success: true, ignored: true, reason: event || "lifecycle" } };
  }
  if (IGNORE_EVENTS.has(event)) {
    return { status: 200, body: { success: true, ignored: true, reason: "event_ignored" } };
  }

  const inbound = parseInbound(body);
  if (!inbound) {
    return { status: 200, body: { success: true, ignored: true, reason: "invalid_payload" } };
  }
  if (["reaction", "protocol", "revoked"].includes(inbound.type)) {
    return { status: 200, body: { success: true, ignored: true, reason: "type_ignored" } };
  }
  if (inbound.fromMe) {
    return { status: 200, body: { success: true, ignored: true, reason: "outgoing" } };
  }
  if (inbound.isGroup) {
    return { status: 200, body: { success: true, ignored: true, reason: "group" } };
  }
  if (!inbound.phone) {
    return { status: 200, body: { success: true, ignored: true, reason: "invalid_phone" } };
  }

  const conv = await loadConversation(inbound.phone);
  if (inbound.id && conv.last_message_id && inbound.id === conv.last_message_id) {
    return { status: 200, body: { success: true, ignored: true, reason: "duplicate" } };
  }

  const mapped = conv.pending_poll
    ? mapPollToValue(inbound.text, conv.pending_poll)
    : inbound.text;
  const voteKey = inbound.isPoll && mapped ? `vote:${inbound.phone}:${mapped}` : "";
  if (voteKey && conv.last_event === voteKey) {
    return { status: 200, body: { success: true, ignored: true, reason: "duplicate_vote" } };
  }
  if (!mapped) {
    return { status: 200, body: { success: true, ignored: true, reason: "empty_text" } };
  }

  const result = await runChatTurn({
    message: mapped,
    history: conv.history,
    quoteState: conv.quote_state,
    channel: "whatsapp",
    knownPhone: inbound.phone,
  });

  const history = [
    ...conv.history,
    { role: "user" as const, content: mapped },
    { role: "assistant" as const, content: result.answer },
  ].slice(-20);

  const pollOptions = pollOptionsFromReplies(result.quickReplies);
  const dest = destination(inbound.chatJid, inbound.phone);
  const agentCode = getWhatsmeowAgentCode();

  if (result.answer) {
    const sent = await sendWhatsmeowText(agentCode, dest, result.answer);
    if (!sent.success) {
      console.error("[whatsapp][send]", sent.error);
    }
  }

  let pendingPoll = null;
  if (pollOptions.length >= 2) {
    const name = pollNameFrom(result.answer);
    const poll = await sendWhatsmeowPoll(agentCode, dest, {
      name,
      options: pollOptions.map((item) => item.label),
      maxSelections: 1,
    });
    pendingPoll = {
      name,
      options: pollOptions,
      messageId: poll.success ? poll.messageId : null,
    };
    if (!poll.success) {
      console.error("[whatsapp][poll]", poll.error);
      const fallback = pollOptions.map((item, i) => `${i + 1}. ${item.label}`).join("\n");
      await sendWhatsmeowText(agentCode, dest, fallback).catch(() => null);
    }
  }

  await saveConversation({
    phone: inbound.phone,
    quote_state: result.quoteState,
    history,
    pending_poll: pendingPoll,
    last_message_id: inbound.id || conv.last_message_id,
    last_event: voteKey || inbound.event,
  });

  return {
    status: 200,
    body: {
      success: true,
      event: inbound.event,
      mode: result.mode,
      poll: Boolean(pendingPoll),
    },
  };
}
