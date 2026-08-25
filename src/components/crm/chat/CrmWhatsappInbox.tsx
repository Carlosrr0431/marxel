"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { relativeTime } from "@/lib/crm/utils";
import type { CrmChat, CrmChatMessage, CrmDeliveryStatus } from "@/lib/whatsmeow/crm-chat";

const ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt";

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function displayPhone(phone: string) {
  const raw = String(phone || "");
  if (raw.startsWith("549") && raw.length >= 12) {
    return `+${raw.slice(0, 2)} ${raw.slice(2, 3)} ${raw.slice(3)}`;
  }
  if (raw.startsWith("54")) return `+${raw}`;
  return raw;
}

function clock(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return timeFmt.format(d);
}

function dayKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return "Hoy";
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Ayer";
  }
  const label = dayFmt.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function initials(name: string | null, phone: string) {
  const source = (name || "").trim();
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "•";
  }
  return (phone.slice(-2) || "•").toUpperCase();
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaKind(message: CrmChatMessage) {
  const type = (message.message_type || "").toLowerCase();
  const mime = (message.media_mime || "").toLowerCase();

  if (type === "image" || type === "sticker") return "image";
  if (type === "video") return "video";
  if (type === "audio" || type === "ptt") return "audio";
  if (type === "document") return "file";

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  if (message.media_url || message.file_name) return "file";
  return "text";
}

function mediaSrc(message: CrmChatMessage) {
  if (message.media_url) return message.media_url;
  if (!message.wa_message_id) return "";
  const type = mediaKind(message) === "file" ? "document" : mediaKind(message);
  return `/api/crm/whatsapp/media/${encodeURIComponent(message.wa_message_id)}?type=${encodeURIComponent(type)}`;
}

function fileKind(file: File) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function deliveryOf(message: CrmChatMessage): CrmDeliveryStatus {
  return message.delivery_status || "sent";
}

function autosizeTextarea(el: HTMLTextAreaElement | null, maxPx = 168) {
  if (!el) return;
  el.style.height = "0px";
  const next = Math.min(el.scrollHeight, maxPx);
  el.style.height = `${Math.max(next, 46)}px`;
  el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
}

function sameMessage(a: CrmChatMessage, b: CrmChatMessage) {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.queue_id && b.queue_id && a.queue_id === b.queue_id) return true;
  if (a.wa_message_id && b.wa_message_id && a.wa_message_id === b.wa_message_id) return true;
  return false;
}

function mergeMessage(prev: CrmChatMessage[], incoming: CrmChatMessage) {
  const index = prev.findIndex((item) => sameMessage(item, incoming));
  if (index < 0) return [...prev, incoming];
  const next = prev.slice();
  next[index] = { ...next[index], ...incoming };
  return next;
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.4 11.2 20.8 3.9c.55-.23 1.1.32.87.87l-7.3 17.4c-.24.56-1.04.56-1.27 0l-3.2-7.55-7.55-3.2c-.56-.23-.56-1.03 0-1.27z" />
    </svg>
  );
}

function SendButton({
  loading,
  disabled,
}: {
  loading: boolean;
  disabled: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const idle = disabled || loading;
  return (
    <button
      type="submit"
      className={`crm-wa-send${loading ? " is-loading" : ""}${pressed ? " is-pressed" : ""}`}
      disabled={idle}
      aria-label={loading ? "Enviando" : "Enviar"}
      aria-busy={loading}
      onPointerDown={() => {
        if (!idle) setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      {loading ? <span className="crm-wa-send__spin" aria-hidden="true" /> : <SendIcon />}
    </button>
  );
}

function Ticks({ status }: { status: CrmDeliveryStatus }) {
  if (status === "pending" || status === "sending") {
    return (
      <svg viewBox="0 0 16 16" className="crm-wa-ticks is-pending" aria-hidden="true">
        <circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.6v3.5l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <span className="crm-wa-failed" title="No se pudo enviar">
        !
      </span>
    );
  }
  return (
    <svg viewBox="0 0 16 15" className="crm-wa-ticks" aria-hidden="true">
      <path d="M15.01 3.316l-.478-.372a.45.45 0 0 0-.612.06L8.14 9.97 6.035 8.007a.45.45 0 0 0-.613.007l-.378.378a.45.45 0 0 0 .007.613l2.654 2.53a.64.64 0 0 0 .918-.062L15.08 3.92a.45.45 0 0 0-.07-.604z" />
      <path d="M11.01 3.316l-.478-.372a.45.45 0 0 0-.612.06L4.14 9.97 2.035 8.007a.45.45 0 0 0-.613.007l-.378.378a.45.45 0 0 0 .007.613l2.654 2.53a.64.64 0 0 0 .918-.062L11.08 3.92a.45.45 0 0 0-.07-.604z" />
    </svg>
  );
}

function fileIconLabel(mime: string | null, name: string | null) {
  const m = (mime || "").toLowerCase();
  const ext = (name || "").split(".").pop()?.toUpperCase() || "FILE";
  if (m.startsWith("image/")) return "IMG";
  if (m === "application/pdf" || ext === "PDF") return "PDF";
  if (m.startsWith("video/")) return "VID";
  if (m.startsWith("audio/")) return "AUD";
  if (m.includes("word") || ext === "DOC" || ext === "DOCX") return "DOC";
  if (m.includes("excel") || m.includes("spreadsheet") || ext === "XLS" || ext === "XLSX") return "XLS";
  if (m.includes("zip") || m.includes("compressed") || ext === "ZIP") return "ZIP";
  return ext.slice(0, 4);
}

function MediaFallback({ src, name, mine }: { src: string; name: string | null; mine: boolean }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={`crm-wa-file${mine ? " is-mine" : ""}`}
    >
      <span className="crm-wa-file__icon" aria-hidden="true">IMG</span>
      <span>
        <strong>{name || "Imagen"}</strong>
        <em>Tocar para abrir</em>
      </span>
    </a>
  );
}

function Bubble({ message }: { message: CrmChatMessage }) {
  const mine = message.direction === "outbound" || message.from_me;
  const kind = mediaKind(message);
  const src = kind === "text" ? "" : mediaSrc(message);
  const status = deliveryOf(message);
  const [imgError, setImgError] = useState(false);

  const bodyText =
    message.body && message.body !== message.file_name ? message.body : null;

  return (
    <div className={`crm-wa-bubble-row${mine ? " is-mine" : ""}`}>
      <div
        className={`crm-wa-bubble${mine ? " is-mine" : ""}${kind !== "text" ? " has-media" : ""}${status === "failed" ? " is-failed" : ""}`}
      >
        {kind === "image" && src && !imgError ? (
          <a href={src} target="_blank" rel="noreferrer" className="crm-wa-media-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={message.file_name || "Imagen"}
              className="crm-wa-media-img"
              onError={() => setImgError(true)}
            />
          </a>
        ) : null}
        {kind === "image" && src && imgError ? (
          <MediaFallback src={src} name={message.file_name || null} mine={mine} />
        ) : null}
        {kind === "video" && src ? (
          <video src={src} controls className="crm-wa-media-video" preload="metadata" />
        ) : null}
        {kind === "audio" && src ? (
          <audio src={src} controls className="crm-wa-media-audio" preload="metadata" />
        ) : null}
        {kind === "file" && src ? (
          <a href={src} target="_blank" rel="noreferrer" className="crm-wa-file">
            <span className="crm-wa-file__icon" aria-hidden="true">
              {fileIconLabel(message.media_mime || null, message.file_name || null)}
            </span>
            <span>
              <strong>{message.file_name || "Archivo"}</strong>
              <em>Tocar para abrir</em>
            </span>
          </a>
        ) : null}
        {bodyText ? <p className="crm-wa-text">{bodyText}</p> : null}
        <span className="crm-wa-meta">
          {status === "pending" || status === "sending" ? <em className="crm-wa-queued">En cola</em> : null}
          {status === "failed" ? <em className="crm-wa-queued is-failed">No enviado</em> : null}
          <time dateTime={message.created_at}>{clock(message.created_at)}</time>
          {mine ? <Ticks status={status} /> : null}
        </span>
      </div>
    </div>
  );
}

export function CrmWhatsappInbox() {
  const [chats, setChats] = useState<CrmChat[]>([]);
  const [messages, setMessages] = useState<CrmChatMessage[]>([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [live, setLive] = useState(false);
  const [composerPhone, setComposerPhone] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (file) captionRef.current?.focus();
  }, [file]);

  useEffect(() => {
    autosizeTextarea(composerRef.current);
    autosizeTextarea(captionRef.current, 140);
  }, [draft, file]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => {
      const hay = `${chat.name || ""} ${chat.phone} ${chat.last_message || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [chats, query]);

  const activeChat = chats.find((chat) => chat.phone === selected) || null;

  const scrollThread = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/crm/whatsapp/chats", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      chats?: CrmChat[];
      missingTable?: boolean;
      error?: string;
    };
    if (json.missingTable) {
      setSchemaMissing(true);
      setChats([]);
      return;
    }
    setSchemaMissing(false);
    setChats(json.chats || []);
    if (!json.ok && json.error) setError(json.error);
  }, []);

  const openChat = useCallback(async (phone: string) => {
    const normalized = normalizeArPhone(phone);
    if (!normalized) return;
    setSelected(normalized);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setLoadingThread(true);
    setError("");
    try {
      const res = await fetch(
        `/api/crm/whatsapp/messages?phone=${encodeURIComponent(normalized)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        messages?: CrmChatMessage[];
        error?: string;
      };
      setMessages(json.messages || []);
      if (json.error) setError(json.error);
      setChats((prev) =>
        prev.map((chat) => (chat.phone === normalized ? { ...chat, unread_count: 0 } : chat))
      );
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadChats().finally(() => setLoadingChats(false));
  }, [loadChats]);

  useEffect(() => {
    scrollThread();
  }, [messages, selected, scrollThread]);

  useEffect(() => {
    const supabase = createClient();
    const chatsChannel = supabase
      .channel("marxel-wa-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_chats" },
        (payload) => {
          const row = (payload.new || payload.old) as CrmChat | undefined;
          if (!row?.phone) return;
          setChats((prev) => {
            const next = prev.filter((chat) => chat.phone !== row.phone);
            if (payload.eventType === "DELETE") return next;
            const incoming: CrmChat = {
              ...(row as CrmChat),
              unread_count:
                row.phone === selectedRef.current ? 0 : Number((row as CrmChat).unread_count || 0),
            };
            return [incoming, ...next].sort((a, b) => {
              const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bt - at;
            });
          });
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(chatsChannel);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const supabase = createClient();
    const msgsChannel = supabase
      .channel(`marxel-wa-msgs-${selected}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_chat_messages",
          filter: `phone=eq.${selected}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as CrmChatMessage | undefined;
          if (!row?.id) return;
          if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((item) => item.id !== row.id));
            return;
          }
          setMessages((prev) => mergeMessage(prev, row));
          if (payload.eventType === "INSERT" && row.direction === "inbound") {
            void fetch("/api/crm/whatsapp/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: selected }),
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(msgsChannel);
    };
  }, [selected]);

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function startNewChat(event: React.FormEvent) {
    event.preventDefault();
    const phone = normalizeArPhone(composerPhone);
    if (!phone) {
      setError("Ingresá un celular válido");
      return;
    }
    setComposerPhone("");
    if (!chats.some((chat) => chat.phone === phone)) {
      setChats((prev) => [
        {
          id: `tmp-${phone}`,
          phone,
          name: null,
          last_message: null,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    await openChat(phone);
  }

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    if (!selected || sending) return;
    const text = draft.trim();
    if (!text && !file) return;
    setSending(true);
    setError("");
    const form = new FormData();
    form.set("phone", selected);
    form.set("mensaje", text);
    if (file) {
      form.set("archivo", file);
      form.set("nombre", file.name);
      form.set("tipo", file.type);
    }
    try {
      const res = await fetch("/api/crm/whatsapp/send", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: CrmChatMessage | null;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || "No se pudo enviar");
        return;
      }
      if (json.message) {
        setMessages((prev) => mergeMessage(prev, json.message as CrmChatMessage));
        setChats((prev) => {
          const preview = json.message?.body || file?.name || "Mensaje";
          const now = json.message?.created_at || new Date().toISOString();
          const next = prev.filter((chat) => chat.phone !== selected);
          const current = prev.find((chat) => chat.phone === selected);
          return [
            {
              id: current?.id || `tmp-${selected}`,
              phone: selected,
              name: current?.name || null,
              last_message: preview,
              last_message_at: now,
              unread_count: 0,
              created_at: current?.created_at || now,
              updated_at: now,
            },
            ...next,
          ];
        });
      }
      setDraft("");
      clearFile();
    } catch {
      setError("Error de red al enviar");
    } finally {
      setSending(false);
    }
  }

  const attachedKind = file ? fileKind(file) : null;

  return (
    <div className="crm-wa">
      <aside className="crm-wa-list">
        <div className="crm-wa-list__head">
          <div>
            <p className="crm-wa-kicker">WhatsApp</p>
            <h1>Chats</h1>
          </div>
          <span className={`crm-wa-live${live ? " is-on" : ""}`}>
            <i />
            {live ? "En vivo" : "Sin vivo"}
          </span>
        </div>
        <form className="crm-wa-new" onSubmit={startNewChat}>
          <input
            className="crm-wa-field"
            value={composerPhone}
            onChange={(e) => setComposerPhone(e.target.value)}
            placeholder="Nuevo chat: 387..."
            inputMode="tel"
            aria-label="Celular para nuevo chat"
          />
          <button type="submit" className="crm-wa-open">
            Abrir
          </button>
        </form>
        <label className="crm-wa-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16.5L20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o empezar un chat"
            aria-label="Buscar chats"
          />
        </label>
        <div className="crm-wa-list__body">
          {loadingChats ? <p className="crm-wa-empty">Cargando chats…</p> : null}
          {!loadingChats && schemaMissing ? (
            <p className="crm-wa-empty">Falta aplicar el SQL de chats en Supabase.</p>
          ) : null}
          {!loadingChats && !schemaMissing && filtered.length === 0 ? (
            <p className="crm-wa-empty">Todavía no hay conversaciones.</p>
          ) : null}
          {filtered.map((chat) => {
            const active = chat.phone === selected;
            return (
              <button
                key={chat.id}
                type="button"
                className={`crm-wa-item${active ? " is-active" : ""}`}
                onClick={() => void openChat(chat.phone)}
              >
                <span className="crm-wa-avatar" aria-hidden="true">
                  {initials(chat.name, chat.phone)}
                </span>
                <span className="crm-wa-item__copy">
                  <span className="crm-wa-item__top">
                    <strong>{chat.name || displayPhone(chat.phone)}</strong>
                    <time className={chat.unread_count > 0 ? "is-unread" : ""}>
                      {relativeTime(chat.last_message_at)}
                    </time>
                  </span>
                  <span className="crm-wa-item__bottom">
                    <span className="crm-wa-item__preview">
                      {chat.last_message || displayPhone(chat.phone)}
                    </span>
                    {chat.unread_count > 0 ? (
                      <span className="crm-wa-unread">
                        {chat.unread_count > 99 ? "99+" : chat.unread_count}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="crm-wa-thread" aria-live="polite">
        {!selected ? (
          <div className="crm-wa-placeholder">
            <span className="crm-wa-placeholder__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.5 7.5A3.5 3.5 0 0 1 8 4h8a3.5 3.5 0 0 1 3.5 3.5v5A3.5 3.5 0 0 1 16 16h-3.2L8.5 19.2V16H8A3.5 3.5 0 0 1 4.5 12.5v-5z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
            <h2>WhatsApp para Marxen</h2>
            <p>
              Elegí un chat a la izquierda para ver el historial, enviar archivos y responder en
              tiempo real.
            </p>
          </div>
        ) : (
          <>
            <header className="crm-wa-thread__head">
              <span className="crm-wa-avatar" aria-hidden="true">
                {initials(activeChat?.name || null, selected)}
              </span>
              <div className="crm-wa-thread__who">
                <strong>{activeChat?.name || displayPhone(selected)}</strong>
                <p>{displayPhone(selected)}</p>
              </div>
              <a
                className="crm-wa-ext"
                href={`https://wa.me/${selected}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en WhatsApp
              </a>
            </header>

            {file ? (
              <div className="crm-wa-preview">
                <div className="crm-wa-preview__bar">
                  <button type="button" className="crm-wa-preview__close" onClick={clearFile} aria-label="Cerrar">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div>
                    <strong>{file.name}</strong>
                    <p>{formatBytes(file.size)}</p>
                  </div>
                </div>
                <div className="crm-wa-preview__stage">
                  {attachedKind === "image" && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} />
                  ) : null}
                  {attachedKind === "video" && previewUrl ? (
                    <video src={previewUrl} controls />
                  ) : null}
                  {attachedKind === "audio" && previewUrl ? (
                    <audio src={previewUrl} controls />
                  ) : null}
                  {attachedKind === "file" ? (
                    <div className="crm-wa-preview__doc">
                      <span>{file.name.split(".").pop()?.toUpperCase() || "FILE"}</span>
                      <strong>{file.name}</strong>
                      <p>{formatBytes(file.size)}</p>
                    </div>
                  ) : null}
                </div>
                <form className="crm-wa-preview__caption" onSubmit={sendMessage}>
                  <textarea
                    ref={captionRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Añadí un comentario"
                    rows={1}
                    maxLength={4096}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <SendButton loading={sending} disabled={sending} />
                </form>
                {error ? <p className="crm-wa-error">{error}</p> : null}
              </div>
            ) : (
              <>
                <div className="crm-wa-thread__body" ref={threadRef}>
                  {loadingThread ? <p className="crm-wa-empty">Cargando mensajes…</p> : null}
                  {!loadingThread && messages.length === 0 ? (
                    <p className="crm-wa-empty">No hay mensajes todavía. Escribí el primero.</p>
                  ) : null}
                  {messages.map((message, index) => {
                    const prev = messages[index - 1];
                    const showDay = !prev || dayKey(prev.created_at) !== dayKey(message.created_at);
                    return (
                      <div key={message.id}>
                        {showDay ? <div className="crm-wa-day">{dayLabel(message.created_at)}</div> : null}
                        <Bubble message={message} />
                      </div>
                    );
                  })}
                </div>
                {error ? <p className="crm-wa-error">{error}</p> : null}
                <form className="crm-wa-composer" onSubmit={sendMessage}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    id="crm-wa-file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="crm-wa-file" className="crm-wa-clip" title="Adjuntar archivo">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M16.5 6.5l-7.8 7.8a2.5 2.5 0 1 0 3.5 3.5l8.2-8.2a4.5 4.5 0 0 0-6.4-6.4L5.2 11.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="sr-only">Adjuntar archivo</span>
                  </label>
                  <textarea
                    ref={composerRef}
                    className="crm-wa-composer__input"
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Escribí un mensaje"
                    maxLength={4096}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <SendButton loading={sending} disabled={sending || !draft.trim()} />
                </form>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
