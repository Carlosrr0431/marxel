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
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

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
  const { data, error } = await supabase.rpc("save_whatsapp_crm_message", {
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
  });

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
  const downloaded = await fetchWhatsmeowMediaBytes(inbound.id, inbound.type);
  if (!downloaded) return null;
  const mime = inbound.mimetype || downloaded.contentType;
  return uploadCrmMediaBuffer(
    downloaded.buffer,
    mime,
    inbound.phone || "inbox",
    inbound.id
  );
}

export async function persistCrmInbound(inbound: InboundMessage) {
  const isMedia = CRM_MEDIA_TYPES.has(inbound.type);
  if (!inbound.phone) return;
  if (!inbound.text.trim() && !isMedia && !inbound.isPoll) return;

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
    pushName: inbound.pushName || null,
    source: "webhook",
  });
}
