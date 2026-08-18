import { after } from "next/server";
import { runChatTurn } from "@/lib/chatbot/run-turn";
import { getWhatsmeowAgentCode, getWhatsmeowWebhookSecret, toWhatsappSendTarget } from "@/lib/whatsmeow/config";
import { sendWhatsmeowPoll, sendWhatsmeowText } from "@/lib/whatsmeow/client";
import {
  ACCUMULATION_MS,
  claimInbox,
  enqueueInbound,
  loadConversation,
  saveConversation,
  type ConversationRow,
} from "@/lib/whatsmeow/conversations";
import { mapPollToValue, parseInbound, pollOptionsFromReplies } from "@/lib/whatsmeow/inbound";
import {
  detectsQuoteIntent,
  isGreeting,
} from "@/lib/chatbot/quote-flow";
import { whatsappAgentGate } from "@/lib/whatsmeow/agent-control";

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
  return toWhatsappSendTarget(phone) || toWhatsappSendTarget(chatJid);
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

const CHOICE_STEPS = new Set(["idle", "producto", "seguro_tipo", "laboral", "grupo"]);

function shouldReplyNow(text: string, conv: ConversationRow, isPoll: boolean) {
  if (isPoll) return true;
  if (conv.pending_poll) return true;
  if (text.startsWith("menu:")) return true;
  if (isGreeting(text) || detectsQuoteIntent(text)) return true;
  if (!conv.quote_state.active) return true;
  return CHOICE_STEPS.has(conv.quote_state.step);
}

async function replyFromTurn(conv: ConversationRow, dest: string, mapped: string) {
  const result = await runChatTurn({
    message: mapped,
    history: conv.history,
    quoteState: conv.quote_state,
    channel: "whatsapp",
    knownPhone: conv.phone,
  });

  const history = [
    ...conv.history,
    { role: "user" as const, content: mapped },
    { role: "assistant" as const, content: result.answer },
  ].slice(-20);

  const pollOptions = pollOptionsFromReplies(result.quickReplies);
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
    ...conv,
    quote_state: result.quoteState,
    history,
    pending_poll: pendingPoll,
  });

  return { mode: result.mode, poll: Boolean(pendingPoll) };
}

async function flushConversation(phone: string) {
  const claimed = await claimInbox(phone);
  if (!claimed) return { skipped: true as const };
  const gate = await whatsappAgentGate(phone);
  if (!gate.ok) return { skipped: true as const, reason: gate.reason };
  const texts = claimed.messages.map((row) => row.text).map((t) => t.trim()).filter(Boolean);
  if (!texts.length) return { skipped: true as const };

  const last = texts[texts.length - 1];
  const mappedBatch = claimed.conv.pending_poll
    ? texts.map((text) => mapPollToValue(text, claimed.conv.pending_poll) || text)
    : texts;
  const mapped = mappedBatch.join("\n");
  const dest = claimed.dest || claimed.conv.phone;
  const voteKey =
    claimed.conv.pending_poll && last
      ? `vote:${phone}:${mapPollToValue(last, claimed.conv.pending_poll)}`
      : "";

  const result = await replyFromTurn(
    {
      ...claimed.conv,
      last_event: voteKey || claimed.conv.last_event,
    },
    dest,
    mapped
  );
  return { skipped: false as const, ...result };
}

function scheduleFlush(phone: string, waitMs: number) {
  after(async () => {
    const delay = Math.min(Math.max(waitMs, 0), ACCUMULATION_MS);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    try {
      await flushConversation(phone);
    } catch (err) {
      console.error("[whatsapp][flush]", err);
    }
  });
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

  const gate = await whatsappAgentGate(inbound.phone);
  if (!gate.ok) {
    return { status: 200, body: { success: true, ignored: true, reason: gate.reason } };
  }

  const dest = destination(inbound.chatJid, inbound.phone);
  const conv = await loadConversation(inbound.phone);
  const mappedNow = conv.pending_poll
    ? mapPollToValue(inbound.text, conv.pending_poll) || inbound.text
    : inbound.text;

  if (inbound.isPoll || shouldReplyNow(mappedNow || inbound.text, conv, inbound.isPoll)) {
    if (inbound.id && conv.last_message_id && inbound.id === conv.last_message_id) {
      return { status: 200, body: { success: true, ignored: true, reason: "duplicate" } };
    }
    const mapped = mappedNow;
    const voteKey =
      inbound.isPoll && mapped ? `vote:${inbound.phone}:${mapped}` : "";
    if (voteKey && conv.last_event === voteKey) {
      return { status: 200, body: { success: true, ignored: true, reason: "duplicate_vote" } };
    }
    if (!mapped.trim()) {
      return { status: 200, body: { success: true, ignored: true, reason: "empty_text" } };
    }
    const result = await replyFromTurn(
      {
        ...conv,
        last_message_id: inbound.id || conv.last_message_id,
        last_event: voteKey || conv.last_event,
      },
      dest,
      mapped
    );
    return {
      status: 200,
      body: { success: true, event: inbound.event, immediate: true, ...result },
    };
  }

  if (!inbound.text.trim()) {
    return { status: 200, body: { success: true, ignored: true, reason: "empty_text" } };
  }

  const queued = await enqueueInbound(inbound.phone, {
    id: inbound.id,
    text: inbound.text,
    dest,
  });
  if (queued.duplicate) {
    return { status: 200, body: { success: true, ignored: true, reason: "duplicate" } };
  }

  if (queued.collector) {
    scheduleFlush(inbound.phone, queued.waitMs || ACCUMULATION_MS);
  }

  return {
    status: 200,
    body: {
      success: true,
      queued: true,
      collector: queued.collector,
      waitMs: queued.collector ? queued.waitMs : 0,
      event: inbound.event,
    },
  };
}
