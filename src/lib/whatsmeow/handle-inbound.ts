import { after } from "next/server";
import { runChatTurn } from "@/lib/chatbot/run-turn";
import { getWhatsmeowAgentCode, getWhatsmeowWebhookSecret, normalizeArPhone, stripDeviceFromJid, toWhatsappSendTarget } from "@/lib/whatsmeow/config";
import { sendWhatsmeowPoll, sendWhatsmeowText } from "@/lib/whatsmeow/client";
import { WHATSAPP_OUTBOUND_INTERVAL_MS } from "@/lib/whatsmeow/outbound-queue";
import {
  ACCUMULATION_MS,
  claimInbox,
  claimConversationEvent,
  enqueueInbound,
  loadConversation,
  saveConversation,
  type ConversationRow,
} from "@/lib/whatsmeow/conversations";
import { persistCrmInbound, updateCrmChatNameIfMissing, isRecentBotOutbound } from "@/lib/whatsmeow/crm-chat";
import { mapPollToValue, parseInbound, pollOptionsFromReplies } from "@/lib/whatsmeow/inbound";
import {
  detectsQuoteIntent,
  isGreeting,
  shouldSendWhatsappPoll,
} from "@/lib/chatbot/quote-flow";
import { whatsappAgentGate, setChatAgentEnabled } from "@/lib/whatsmeow/agent-control";
import {
  looksLikeWhatsappInterest,
  notifyProducerPausedFollowup,
  notifyProducerWhatsappInterest,
} from "@/lib/whatsmeow/producer-notify";

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
  const jid = stripDeviceFromJid(chatJid);
  if (jid.includes("@lid") || jid.includes("@s.whatsapp.net")) return jid;
  return toWhatsappSendTarget(phone) || toWhatsappSendTarget(chatJid);
}

const CHOICE_STEPS = new Set([
  "idle",
  "producto",
  "seguro_tipo",
  "laboral",
  "grupo",
  "auto_anio",
  "auto_marca",
  "auto_modelo",
  "auto_version",
  "auto_cp",
  "auto_localidad",
  "auto_plan",
  "viajero_destino",
  "nombre",
  "whatsapp",
  "localidad",
  "edades",
  "uso",
  "prepaga",
  "seguro_detalle",
]);

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
  const quoteState = {
    ...result.quoteState,
    notifiedInterest: conv.quote_state.notifiedInterest || result.quoteState.notifiedInterest,
    agentEnabled:
      result.quoteState.agentEnabled !== undefined
        ? result.quoteState.agentEnabled
        : conv.quote_state.agentEnabled,
  };

  const history = [
    ...conv.history,
    { role: "user" as const, content: mapped },
    { role: "assistant" as const, content: result.answer },
  ].slice(-20);

  const pollOptions = result.mode !== "rag" && shouldSendWhatsappPoll(quoteState.step, result.quickReplies)
    ? pollOptionsFromReplies(result.quickReplies)
    : [];
  const agentCode = getWhatsmeowAgentCode();
  const hasPoll = pollOptions.length >= 2;

  try {
    const { cancelPendingOutboundPolls } = await import("@/lib/whatsmeow/outbound-queue");
    await cancelPendingOutboundPolls(dest);
  } catch {
    // si la cola no está, el poll previo puede llegar tarde; el flujo igual conserva contexto
  }

  if (result.answer) {
    const sent = await sendWhatsmeowText(agentCode, dest, result.answer, {
      wake: !hasPoll,
    });
    if (!sent.success) {
      console.error("[whatsapp][send]", sent.error);
    } else if ("messageId" in sent && sent.messageId) {
      const { saveCrmWhatsappMessage } = await import("@/lib/whatsmeow/crm-chat");
      await saveCrmWhatsappMessage({
        phone: conv.phone,
        direction: "outbound",
        body: result.answer,
        fromMe: true,
        waMessageId: sent.messageId,
        source: "bot",
      });
    }
  }

  let pendingPoll = null;
  if (hasPoll) {
    const poll = await sendWhatsmeowPoll(
      agentCode,
      dest,
      {
        name: "Elegí una opción",
        options: pollOptions.map((item) => item.label),
        maxSelections: 1,
      },
      { delayMs: WHATSAPP_OUTBOUND_INTERVAL_MS }
    );
    pendingPoll = {
      name: "Elegí una opción",
      options: pollOptions,
      messageId: poll.success ? poll.messageId : null,
    };
    if (!poll.success) {
      console.error("[whatsapp][poll]", poll.error);
      const fallback = pollOptions.map((item, i) => `${i + 1}. ${item.label}`).join("\n");
      await sendWhatsmeowText(agentCode, dest, fallback, {
        delayMs: WHATSAPP_OUTBOUND_INTERVAL_MS,
      }).catch(() => null);
    } else {
      // Guardar en CRM tanto si fue inmediato como si quedó en cola
      const { saveCrmWhatsappMessage } = await import("@/lib/whatsmeow/crm-chat");
      const queueId = "queueId" in poll && typeof poll.queueId === "string" ? poll.queueId : null;
      const waMessageId = typeof poll.messageId === "string" ? poll.messageId : null;
      await saveCrmWhatsappMessage({
        phone: conv.phone,
        direction: "outbound",
        body: "Elegí una opción",
        messageType: "poll",
        fromMe: true,
        waMessageId,
        queueId,
        source: "bot",
        pollOptions: pollOptions.map((item) => item.label),
        deliveryStatus: waMessageId ? "sent" : "pending",
      }).catch(() => null);
    }
  }

  await saveConversation({
    ...conv,
    quote_state: quoteState,
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
  if (["reaction", "protocol", "revoked"].includes(inbound.type) && !inbound.isPoll) {
    return { status: 200, body: { success: true, ignored: true, reason: "type_ignored" } };
  }
  if (inbound.isGroup) {
    return { status: 200, body: { success: true, ignored: true, reason: "group" } };
  }
  if (!inbound.phone) {
    if (inbound.isPoll) {
      console.error("[whatsapp][poll-skip]", "invalid_phone", inbound.event, inbound.text);
    }
    return { status: 200, body: { success: true, ignored: true, reason: "invalid_phone" } };
  }

  try {
    await persistCrmInbound(inbound);
  } catch (err) {
    console.error("[whatsapp-crm] persist", err instanceof Error ? err.message : err);
  }

  // --- Punto 4: Alta automática de lead para WhatsApp directo ---
  // Si el mensaje es entrante de un número que no está en leads, crear el lead.
  if (!inbound.fromMe && inbound.phone) {
    after(async () => {
      try {
        const { createServiceClient: sb } = await import("@/lib/supabase/server");
        const supabase = sb();
        const cleanPhone = normalizeArPhone(inbound.phone);
        if (!cleanPhone) return;
        const last8 = cleanPhone.slice(-8);
        // Buscar si ya existe un lead con este teléfono
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .or(`celular.ilike.%${last8}`)
          .limit(1);
        if (existing && existing.length > 0) return; // ya existe
        // Resolver nombre del contacto
        const chatName = inbound.pushName || null;
        const nombre = chatName?.trim() || "Contacto WhatsApp";
        // Crear lead directo
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            nombre,
            celular: cleanPhone,
            origen: "whatsapp",
            origen_detalle: "whatsapp_directo",
            tags: ["whatsapp_directo"],
            estado: "nuevo",
            producto: "general",
            prioridad: "media",
            notas_iniciales: "Lead creado automáticamente desde WhatsApp directo.",
          })
          .select("id")
          .single();
        if (newLead?.id) {
          await supabase.from("actividades").insert({
            lead_id: newLead.id,
            tipo: "sistema",
            titulo: "Lead creado automáticamente desde WhatsApp directo",
            detalle: `Primer mensaje entrante de ${cleanPhone}`,
            autor: "sistema",
          });
        }
      } catch (e) {
        console.warn("[whatsapp-crm] auto-lead:", e instanceof Error ? e.message : e);
      }
    });
  }

  // Si el mensaje es entrante y no tiene push_name, buscar el nombre
  // en la API de contactos de forma asíncrona (sin bloquear la respuesta).
  // Igual que resolvePushNameFromMessage en remax-noa-oficial.
  if (!inbound.fromMe && !inbound.pushName && inbound.phone) {
    after(async () => {
      try {
        const { fetchWhatsmeowContactName } = await import("@/lib/whatsmeow/client");
        const name = await fetchWhatsmeowContactName(inbound.phone);
        if (name) await updateCrmChatNameIfMissing(inbound.phone, name);
      } catch {
        // best-effort: no interrumpir el flujo
      }
    });
  }

  if (inbound.fromMe && !inbound.isPoll) {
    if (!(await isRecentBotOutbound(inbound))) {
      after(() => {
        void setChatAgentEnabled(inbound.phone, false);
      });
    }
    return { status: 200, body: { success: true, ignored: true, reason: "outgoing" } };
  }

  const destEarly = destination(inbound.chatJid, inbound.phone);
  const convEarly = await loadConversation(inbound.phone);
  const mappedInterest = convEarly.pending_poll
    ? mapPollToValue(inbound.text, convEarly.pending_poll) || inbound.text
    : inbound.text;

  if (inbound.phone && looksLikeWhatsappInterest(mappedInterest)) {
    after(() => {
      void notifyProducerWhatsappInterest({
        phone: inbound.phone,
        message: mappedInterest,
        pushName: inbound.pushName,
      });
    });
  }

  const gate = await whatsappAgentGate(inbound.phone);
  if (!gate.ok) {
    if (inbound.isPoll) {
      console.error("[whatsapp][poll-skip]", gate.reason, inbound.phone);
    }
    if (gate.reason === "chat_paused" && inbound.text.trim()) {
      after(() => {
        void notifyProducerPausedFollowup({
          phone: inbound.phone,
          message: inbound.text,
          pushName: inbound.pushName,
        });
      });
    }
    return { status: 200, body: { success: true, ignored: true, reason: gate.reason } };
  }

  const dest = destEarly;
  const conv = convEarly;
  const mappedNow = conv.pending_poll
    ? mapPollToValue(inbound.text, conv.pending_poll) || inbound.text
    : inbound.text;

  if (inbound.isPoll || shouldReplyNow(mappedNow || inbound.text, conv, inbound.isPoll)) {
    if (
      !inbound.isPoll &&
      inbound.id &&
      conv.last_message_id &&
      inbound.id === conv.last_message_id
    ) {
      return { status: 200, body: { success: true, ignored: true, reason: "duplicate" } };
    }
    const mapped = mappedNow;
    if (!mapped.trim()) {
      if (inbound.isPoll) {
        console.error("[whatsapp][poll-skip]", "empty_text", inbound.event);
      }
      return { status: 200, body: { success: true, ignored: true, reason: "empty_text" } };
    }
    const voteKey = inbound.isPoll
      ? `vote:${inbound.phone}:${mapped}`
      : inbound.id
        ? `msg:${inbound.id}`
        : "";
    if (voteKey) {
      const claimed = await claimConversationEvent(inbound.phone, voteKey);
      if (!claimed) {
        return { status: 200, body: { success: true, ignored: true, reason: "duplicate_vote" } };
      }
    }
    if (inbound.isPoll) {
      console.info("[whatsapp][poll-in]", inbound.phone, mapped);
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
