import type { QuoteQuickReply } from "@/lib/chatbot/quote-flow";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import type { PendingPoll } from "@/lib/whatsmeow/conversations";

export type InboundMessage = {
  event: string;
  id: string;
  phone: string;
  text: string;
  fromMe: boolean;
  isGroup: boolean;
  pushName: string;
  chatJid: string;
  isPoll: boolean;
  type: string;
};

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RawRecord;
}

function firstRecord(value: unknown): RawRecord | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function digitsFrom(value: unknown) {
  return normalizeArPhone(String(value || ""));
}

function pickPhone(data: RawRecord) {
  const key = asRecord(data.key) || {};
  const candidates = [
    data.sender_pn,
    data.from,
    key.cleanedSenderPn,
    key.senderPn,
    data.chat_jid,
    key.remoteJid,
    data.to,
  ];
  for (const candidate of candidates) {
    const s = String(candidate || "");
    if (!s || s.includes("@lid") || s.includes("@g.us") || s.includes("@broadcast")) continue;
    const phone = digitsFrom(s);
    if (phone.length >= 8) return phone;
  }
  return "";
}

function pollChoiceFrom(data: RawRecord) {
  const option = String(data.poll_option || "").trim();
  if (option) return option;
  const voted = Array.isArray(data.pollResult)
    ? (data.pollResult as RawRecord[]).find((row) => Array.isArray(row.voters) && row.voters.length)
    : null;
  if (voted) {
    return String(voted.poll_option || voted.name || voted.button_id || "").trim();
  }
  const message = asRecord(data.message);
  const pollUpdate = asRecord(message?.pollUpdateMessage);
  const selected = pollUpdate?.vote
    ? asRecord(pollUpdate.vote)?.selectedOptions
    : pollUpdate?.selectedOptions;
  if (Array.isArray(selected) && selected.length) {
    const first = selected[0];
    if (typeof first === "string") return first;
    const rec = asRecord(first);
    return String(rec?.name || rec?.optionName || "").trim();
  }
  return String(data.body || data.button_id || "").trim();
}

export function parseInbound(body: unknown): InboundMessage | null {
  const root = asRecord(body);
  if (!root) return null;
  const event = String(root.event || "").trim();
  const rawData = firstRecord(root.data) || asRecord(root.data) || {};
  const data = firstRecord(rawData.messages) || rawData;

  if (event === "poll.results") {
    const voted = Array.isArray(data.pollResult)
      ? (data.pollResult as RawRecord[]).find((row) => Array.isArray(row.voters) && row.voters.length)
      : null;
    const voter = voted && Array.isArray(voted.voters) ? String(voted.voters[0] || "") : "";
    const phone = digitsFrom(voter) || pickPhone(data);
    const text = pollChoiceFrom(data);
    if (!phone) return null;
    return {
      event,
      id: String(
        voted?._vote_msg_id || data.id || asRecord(data.key)?.id || text || `poll_${Date.now()}`
      ),
      phone,
      text,
      fromMe: false,
      isGroup: false,
      pushName: String(data.push_name || ""),
      chatJid: String(data.chat_jid || ""),
      isPoll: true,
      type: "poll_vote",
    };
  }

  const phone = pickPhone(data);
  const text =
    event === "messages.poll" || event === "messages.button" || event === "messages.list"
      ? pollChoiceFrom(data) || String(data.body || "").trim()
      : String(
          data.body ||
            data.messageBody ||
            asRecord(data.message)?.conversation ||
            asRecord(asRecord(data.message)?.extendedTextMessage)?.text ||
            ""
        ).trim();

  const type = String(data.type || "").toLowerCase();
  return {
    event,
    id: String(data.id || asRecord(data.key)?.id || ""),
    phone,
    text,
    fromMe: Boolean(data.is_from_me || asRecord(data.key)?.fromMe),
    isGroup: Boolean(data.is_group) || String(data.chat_jid || data.from || "").includes("@g.us"),
    pushName: String(data.push_name || data.pushName || ""),
    chatJid: String(data.chat_jid || data.from || asRecord(data.key)?.remoteJid || ""),
    isPoll:
      event === "messages.poll" ||
      event === "messages.button" ||
      event === "messages.list" ||
      type === "poll_vote" ||
      Boolean(data.poll_option) ||
      /^opt_\d+$/i.test(String(data.button_id || "")),
    type,
  };
}

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapPollToValue(choice: string, pending: PendingPoll | null) {
  const raw = String(choice || "").trim();
  if (!raw) return "";
  if (!pending?.options?.length) return raw;
  const norm = fold(raw);
  const hit = pending.options.find((opt) => {
    const label = fold(opt.label);
    const value = fold(opt.value);
    return (
      label === norm ||
      value === norm ||
      norm.includes(label) ||
      label.includes(norm) ||
      value.includes(norm) ||
      norm.includes(value)
    );
  });
  if (hit) return hit.value;
  const index = Number(raw);
  if (Number.isInteger(index) && index >= 1 && index <= pending.options.length) {
    return pending.options[index - 1].value;
  }
  const optMatch = raw.match(/^opt_(\d+)$/i);
  if (optMatch) {
    const i = Number(optMatch[1]);
    if (i >= 1 && i <= pending.options.length) return pending.options[i - 1].value;
  }
  return raw;
}

export function pollOptionsFromReplies(replies: QuoteQuickReply[]) {
  return replies
    .map((item) => ({
      ...item,
      label: item.label.slice(0, 80),
    }))
    .slice(0, 8);
}
