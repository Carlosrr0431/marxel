import { createServiceClient } from "@/lib/supabase/server";
import {
  getWhatsmeowAgentCode,
  getWhatsmeowApiBase,
  getWhatsmeowApiKey,
  normalizeArPhone,
} from "@/lib/whatsmeow/config";
import type { InboundMessage } from "@/lib/whatsmeow/inbound";

export const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";
export const CRM_MEDIA_TYPES = new Set(["image", "video", "audio", "ptt", "document", "sticker"]);

export type CrmChat = {
  id: string;
  phone: string;
  name: string | null;
  profile_pic_url?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type CrmDeliveryStatus = "pending" | "sending" | "sent" | "failed";

export type CrmChatMessage = {
  id: string;
  chat_id: string;
  phone: string;
  direction: "inbound" | "outbound";
  body: string;
  message_type: string;
  media_url: string | null;
  media_mime: string | null;
  file_name: string | null;
  wa_message_id: string | null;
  from_me: boolean;
  source: string;
  delivery_status?: CrmDeliveryStatus;
  queue_id?: string | null;
  poll_options?: string[] | null;
  created_at: string;
};

export type SaveCrmMessageInput = {
  phone: string;
  direction: "inbound" | "outbound";
  body?: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  fileName?: string | null;
  waMessageId?: string | null;
  fromMe?: boolean;
  pushName?: string | null;
  source?: string;
  deliveryStatus?: CrmDeliveryStatus;
  queueId?: string | null;
  pollOptions?: string[] | null;
};

const MIME_NORMALIZATIONS: Record<string, string> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/x-mpeg": "audio/mpeg",
  "application/x-zip-compressed": "application/zip",
};

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/opus": "opus",
  "audio/wav": "wav",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/octet-stream": "bin",
};

function missingCrmTable(error: { code?: string; message?: string } | null) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    /does not exist|schema cache|could not find the (function|table)/i.test(message)
  );
}

export function isCrmChatSchemaMissing(error: { code?: string; message?: string } | null) {
  return missingCrmTable(error);
}

export function previewFromMessage(body: string, messageType: string, fileName?: string | null) {
  const text = String(body || "").trim();
  if (text) return text.slice(0, 180);
  switch (messageType) {
    case "image":
      return "Imagen";
    case "video":
      return "Video";
    case "audio":
    case "ptt":
      return "Audio";
    case "document":
      return fileName || "Archivo";
    case "sticker":
      return "Sticker";
    default:
      return "Mensaje";
  }
}

export async function saveCrmWhatsappMessage(input: SaveCrmMessageInput) {
  const phone = normalizeArPhone(input.phone);
  if (!phone) return { ok: false as const, error: "teléfono inválido" };

  const supabase = createServiceClient();
  const base = {
    p_phone: phone,
    p_direction: input.direction,
    p_body: input.body || "",
    p_message_type: input.messageType || "text",
    p_media_url: input.mediaUrl || null,
    p_media_mime: input.mediaMime || null,
    p_file_name: input.fileName || null,
    p_wa_message_id: input.waMessageId || null,
    p_from_me: Boolean(input.fromMe),
    p_push_name: input.pushName || null,
    p_source: input.source || "webhook",
  };
  const withQueue = {
    ...base,
    p_delivery_status: input.deliveryStatus || "sent",
    p_queue_id: input.queueId || null,
    p_poll_options: input.pollOptions || null,
  };

  let { data, error } = await supabase.rpc("save_whatsapp_crm_message", withQueue);
  if (error && /could not find the function|PGRST202/i.test(String(error.message || ""))) {
    ({ data, error } = await supabase.rpc("save_whatsapp_crm_message", base));
  }

  if (error) {
    if (missingCrmTable(error)) {
      console.warn("[whatsapp-crm] falta aplicar supabase/whatsapp_crm_chat.sql");
      return { ok: false as const, error: "schema_missing", missingTable: true as const };
    }
    console.error("[whatsapp-crm] save", error.message);
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, id: data ? String(data) : null };
}

export async function getCrmMessageById(id: string | null | undefined) {
  const messageId = String(id || "").trim();
  if (!messageId) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CrmChatMessage;
}

export async function markCrmMessageFromQueue({
  queueId,
  waMessageId,
  status,
}: {
  queueId: string;
  waMessageId?: string | null;
  status: CrmDeliveryStatus;
}) {
  const id = String(queueId || "").trim();
  if (!id) return { ok: false as const, updated: false };
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = { delivery_status: status };
  if (waMessageId) patch.wa_message_id = waMessageId;
  const { data, error } = await supabase
    .from("whatsapp_chat_messages")
    .update(patch)
    .eq("queue_id", id)
    .select("id");
  if (error) {
    if (!missingCrmTable(error)) {
      console.warn("[whatsapp-crm] mark queue", error.message);
    }
    return { ok: false as const, updated: false };
  }
  return { ok: true as const, updated: Boolean(data?.length), id: data?.[0]?.id ? String(data[0].id) : null };
}

export async function ensureCrmChatContact(phone: string, name?: string | null) {
  const key = normalizeArPhone(phone);
  if (!key) return { ok: false as const, error: "Celular inválido" };

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const cleanName = String(name || "").trim() || null;

  const { data: existing, error: readError } = await supabase
    .from("whatsapp_chats")
    .select("*")
    .eq("phone", key)
    .maybeSingle();
  if (readError) {
    if (missingCrmTable(readError)) {
      return { ok: false as const, error: "Falta aplicar el SQL de chats en Supabase." };
    }
    return { ok: false as const, error: readError.message };
  }

  if (existing) {
    if (cleanName && !existing.name) {
      const { data: updated, error: updateError } = await supabase
        .from("whatsapp_chats")
        .update({ name: cleanName, updated_at: now })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (!updateError && updated) {
        return { ok: true as const, chat: updated as CrmChat, created: false, phone: key };
      }
    }
    return { ok: true as const, chat: existing as CrmChat, created: false, phone: key };
  }

  const { data, error } = await supabase
    .from("whatsapp_chats")
    .insert({
      phone: key,
      name: cleanName,
      last_message: null,
      last_message_at: now,
      unread_count: 0,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    const { data: raced } = await supabase
      .from("whatsapp_chats")
      .select("*")
      .eq("phone", key)
      .maybeSingle();
    if (raced) {
      return { ok: true as const, chat: raced as CrmChat, created: false, phone: key };
    }
    if (missingCrmTable(error)) {
      return { ok: false as const, error: "Falta aplicar el SQL de chats en Supabase." };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, chat: data as CrmChat, created: true, phone: key };
}

export async function setCrmChatName(phone: string, name: string) {
  const key = normalizeArPhone(phone);
  const clean = String(name || "").trim();
  if (!key || !clean) return { ok: false as const, error: "Datos inválidos" };
  const ensured = await ensureCrmChatContact(key, clean);
  if (!ensured.ok) return { ok: false as const, error: ensured.error };
  if (ensured.chat.name === clean) return { ok: true as const, phone: key };
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("whatsapp_chats")
    .update({ name: clean, updated_at: new Date().toISOString() })
    .eq("phone", key);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, phone: key };
}

export async function clearCrmChatMessages(phone: string) {
  const normalized = normalizeArPhone(phone);
  if (!normalized) return { ok: false as const, error: "teléfono inválido" };
  const supabase = createServiceClient();
  const { data: chat, error: chatError } = await supabase
    .from("whatsapp_chats")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();
  if (chatError) {
    if (missingCrmTable(chatError)) return { ok: false as const, error: "schema_missing" };
    throw new Error(chatError.message);
  }
  if (chat?.id) {
    const { error: deleteError } = await supabase
      .from("whatsapp_chat_messages")
      .delete()
      .eq("chat_id", chat.id);
    if (deleteError) throw new Error(deleteError.message);
    const { error: updateError } = await supabase
      .from("whatsapp_chats")
      .update({
        last_message: null,
        last_message_at: null,
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chat.id);
    if (updateError) throw new Error(updateError.message);
  }
  return { ok: true as const };
}

export async function markCrmChatRead(phone: string) {
  const normalized = normalizeArPhone(phone);
  if (!normalized) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("whatsapp_chats")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("phone", normalized);
  if (error && !missingCrmTable(error)) {
    console.error("[whatsapp-crm] read", error.message);
  }
}

function extensionForMime(mime: string) {
  const clean = mime.split(";")[0].trim().toLowerCase();
  return EXT_MAP[clean] || "bin";
}

export async function uploadCrmMediaBuffer(
  buffer: Buffer,
  contentType: string,
  folder: string,
  fileId: string
) {
  let mime = (contentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
  mime = MIME_NORMALIZATIONS[mime] || mime;
  const safeId = String(fileId || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${safeId}.${extensionForMime(mime)}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(WHATSAPP_MEDIA_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) {
    console.warn("[whatsapp-crm] storage", error.message);
    return null;
  }
  const { data } = supabase.storage.from(WHATSAPP_MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function fetchWhatsmeowMediaBytes(messageId: string, type: string) {
  const id = String(messageId || "").trim();
  if (!id) return null;
  const qs = new URLSearchParams({
    agent_code: getWhatsmeowAgentCode(),
    type: type === "ptt" ? "ptt" : type || "image",
  });
  try {
    const res = await fetch(
      `${getWhatsmeowApiBase()}/api/messages/media/${encodeURIComponent(id)}?${qs}`,
      {
        headers: { "X-API-Key": getWhatsmeowApiKey() },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 8) return null;
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return { buffer, contentType };
  } catch (err) {
    console.warn(
      "[whatsapp-crm] media download",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function persistInboundMedia(inbound: InboundMessage) {
  if (!CRM_MEDIA_TYPES.has(inbound.type) || !inbound.id) return null;

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 2_000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
    const downloaded = await fetchWhatsmeowMediaBytes(inbound.id, inbound.type);
    if (downloaded) {
      const mime = inbound.mimetype || downloaded.contentType;
      const url = await uploadCrmMediaBuffer(
        downloaded.buffer,
        mime,
        inbound.phone || "inbox",
        inbound.id
      );
      if (url) return url;
    }
    console.warn(
      `[whatsapp-crm] media attempt ${attempt + 1}/${MAX_ATTEMPTS} failed`,
      inbound.id,
      inbound.type
    );
  }

  return null;
}

export async function persistCrmInbound(inbound: InboundMessage) {
  const isMedia = CRM_MEDIA_TYPES.has(inbound.type);
  if (!inbound.phone) return;
  if (!inbound.text.trim() && !isMedia && !inbound.isPoll) return;

  if (inbound.fromMe) {
    const adopted = await adoptPendingCrmOutbound(inbound);
    if (adopted) return;
  }

  let mediaUrl: string | null = null;
  if (isMedia) {
    mediaUrl = await persistInboundMedia(inbound);
  }

  const body = inbound.text.trim() || inbound.caption.trim();
  await saveCrmWhatsappMessage({
    phone: inbound.phone,
    direction: inbound.fromMe ? "outbound" : "inbound",
    body,
    messageType: isMedia ? inbound.type : inbound.isPoll ? "poll" : inbound.type || "text",
    mediaUrl,
    mediaMime: inbound.mimetype || null,
    fileName: inbound.filename || null,
    waMessageId: inbound.id || null,
    fromMe: inbound.fromMe,
    // Solo pasar pushName para mensajes entrantes: los salientes (fromMe=true)
    // traen el nombre de nuestra propia cuenta ("Yo") y no deben usarse como
    // nombre del contacto.
    pushName: inbound.fromMe ? null : (inbound.pushName || null),
    source: "webhook",
  });
}

/**
 * Actualiza el nombre del chat solo si actualmente está vacío (null).
 * Evita sobreescribir nombres que el operador pudo haber editado.
 */
export async function updateCrmChatNameIfMissing(phone: string, name: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone || !name.trim()) return;
  try {
    const supabase = createServiceClient();
    await supabase
      .from("whatsapp_chats")
      .update({ name: name.trim() })
      .eq("phone", cleanPhone)
      .is("name", null);
  } catch (err) {
    console.warn("[crm-chat] updateCrmChatNameIfMissing:", err instanceof Error ? err.message : err);
  }
}

async function adoptPendingCrmOutbound(inbound: InboundMessage) {
  const phone = normalizeArPhone(inbound.phone);
  if (!phone) return false;
  const body = inbound.text.trim() || inbound.caption.trim();
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 20 * 60_000).toISOString();
  let query = supabase
    .from("whatsapp_chat_messages")
    .select("id")
    .eq("phone", phone)
    .eq("from_me", true)
    .eq("delivery_status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (body) query = query.eq("body", body);
  const { data, error } = await query.maybeSingle();
  if (error || !data?.id) return false;
  const patch: Record<string, unknown> = { delivery_status: "sent" };
  if (inbound.id) patch.wa_message_id = inbound.id;
  const { error: upErr } = await supabase.from("whatsapp_chat_messages").update(patch).eq("id", data.id);
  return !upErr;
}
