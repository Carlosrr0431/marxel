import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { getWhatsmeowAgentCode, normalizeArPhone } from "@/lib/whatsmeow/config";
import { enqueueWhatsappOutbound } from "@/lib/whatsmeow/outbound-queue";
import {
  getCrmMessageById,
  previewFromMessage,
  saveCrmWhatsappMessage,
  uploadCrmMediaBuffer,
} from "@/lib/whatsmeow/crm-chat";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT = 4096;

function inferType(mime: string, filename: string) {
  const type = String(mime || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/.test(name)) return "image";
  if (type.startsWith("video/") || /\.(mp4|mov|3gp|webm)$/.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(ogg|mp3|m4a|aac|wav|opus)$/.test(name)) return "audio";
  return "document";
}

function stripDataUrl(value: string) {
  return String(value || "").replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

async function parseBody(request: NextRequest) {
  const ctype = request.headers.get("content-type") || "";
  if (ctype.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("archivo") || form.get("file");
    return {
      phone: String(form.get("phone") || form.get("telefono") || ""),
      mensaje: String(form.get("mensaje") || form.get("caption") || ""),
      caption: String(form.get("caption") || ""),
      archivo: file instanceof File ? file : null,
      tipo: String(form.get("tipo") || ""),
      nombre: String(form.get("nombre") || ""),
      base64: "",
    };
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    phone: String(json.phone || json.telefono || ""),
    mensaje: String(json.mensaje || json.message || json.caption || ""),
    caption: String(json.caption || ""),
    archivo: null as File | null,
    tipo: String(json.tipo || json.type || json.mimetype || ""),
    nombre: String(json.nombre || json.filename || json.fileName || ""),
    base64: String(json.archivo || json.media || json.file || ""),
  };
}

async function touchChatPreview(
  phone: string,
  body: string,
  messageType: string,
  fileName: string | null
) {
  const supabase = createServiceClient();
  await supabase
    .from("whatsapp_chats")
    .update({
      last_message: previewFromMessage(body, messageType, fileName),
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", phone);
}

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const parsed = await parseBody(request);
  const phone = normalizeArPhone(parsed.phone);
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Falta el teléfono" }, { status: 400 });
  }

  const caption = String(parsed.caption || parsed.mensaje || "").trim().slice(0, MAX_TEXT);
  const agentCode = getWhatsmeowAgentCode();
  let buffer: Buffer | null = null;
  let mime = "";
  let filename = parsed.nombre || "";

  if (parsed.archivo) {
    if (parsed.archivo.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "El archivo supera los 12 MB" },
        { status: 413 }
      );
    }
    buffer = Buffer.from(await parsed.archivo.arrayBuffer());
    mime = parsed.archivo.type || parsed.tipo;
    filename = filename || parsed.archivo.name || "archivo";
  } else if (parsed.base64) {
    const raw = stripDataUrl(parsed.base64);
    buffer = Buffer.from(raw, "base64");
    mime = parsed.tipo;
    filename = filename || "archivo";
  }

  if (buffer && buffer.length > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "El archivo supera los 12 MB" },
      { status: 413 }
    );
  }

  if (!buffer && !caption) {
    return NextResponse.json({ ok: false, error: "Escribí un mensaje o adjuntá un archivo" }, { status: 400 });
  }

  const messageType = buffer ? inferType(mime, filename) : "text";
  let mediaUrl: string | null = null;
  if (buffer) {
    mediaUrl = await uploadCrmMediaBuffer(
      buffer,
      mime || "application/octet-stream",
      phone,
      `${Date.now()}`
    );
    if (!mediaUrl) {
      return NextResponse.json(
        { ok: false, error: "No se pudo subir el archivo. Reintentá." },
        { status: 502 }
      );
    }
  }

  const queued = await enqueueWhatsappOutbound({
    agentCode,
    to: phone,
    kind: buffer ? "media" : "text",
    payload: buffer
      ? {
          text: caption,
          caption,
          mediaUrl: mediaUrl || "",
          mimetype: mime,
          filename,
          type: messageType,
        }
      : { text: caption },
    unique: true,
    meta: { source: "crm" },
    wake: true,
  });

  if (!queued.success) {
    const sqlHint =
      queued.missingTable || /kind_check|kind in \(/i.test(queued.error || "")
        ? " Falta aplicar supabase/whatsapp_outbound_queue_v4_crm_15s.sql en Supabase."
        : "";
    return NextResponse.json(
      {
        ok: false,
        error: `${queued.error || "No se pudo encolar"}${sqlHint}`,
        missingTable: queued.missingTable,
      },
      { status: queued.missingTable ? 503 : 502 }
    );
  }

  const queueId = queued.queueId;
  const saved = await saveCrmWhatsappMessage({
    phone,
    direction: "outbound",
    body: caption,
    messageType,
    mediaUrl,
    mediaMime: mime || null,
    fileName: filename || null,
    waMessageId: queueId ? `queue:${queueId}` : null,
    fromMe: true,
    source: "crm",
    deliveryStatus: "pending",
    queueId,
  });

  const message = saved.ok ? await getCrmMessageById(saved.id) : null;
  if (!message) {
    await touchChatPreview(phone, caption, messageType, filename || null);
  }

  return NextResponse.json({
    ok: true,
    queued: true,
    queueId,
    savedId: saved.ok ? saved.id : null,
    message,
  });
}
