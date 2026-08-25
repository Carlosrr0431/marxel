"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { relativeTime } from "@/lib/crm/utils";
import type { CrmChat, CrmChatMessage } from "@/lib/whatsmeow/crm-chat";

const ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt";

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

function displayPhone(phone: string) {
  const raw = String(phone || "");
  if (raw.startsWith("549") && raw.length >= 12) return `+${raw.slice(0, 2)} ${raw.slice(2, 3)} ${raw.slice(3)}`;
  if (raw.startsWith("54")) return `+${raw}`;
  return raw;
}

function clock(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return timeFmt.format(d);
}

function mediaKind(message: CrmChatMessage) {
  const type = (message.message_type || "").toLowerCase();
  const mime = (message.media_mime || "").toLowerCase();
  if (type === "image" || type === "sticker" || mime.startsWith("image/")) return "image";
  if (type === "video" || mime.startsWith("video/")) return "video";
  if (type === "audio" || type === "ptt" || mime.startsWith("audio/")) return "audio";
  if (type === "document" || message.media_url || message.file_name) return "file";
  return "text";
}

function mediaSrc(message: CrmChatMessage) {
  if (message.media_url) return message.media_url;
  if (!message.wa_message_id) return "";
  const type = mediaKind(message) === "file" ? "document" : mediaKind(message);
  return `/api/crm/whatsapp/media/${encodeURIComponent(message.wa_message_id)}?type=${encodeURIComponent(type)}`;
}

function Bubble({ message }: { message: CrmChatMessage }) {
  const mine = message.direction === "outbound" || message.from_me;
  const kind = mediaKind(message);
  const src = kind === "text" ? "" : mediaSrc(message);
  return (
    <div className={`crm-wa-bubble-row${mine ? " is-mine" : ""}`}>
      <div className={`crm-wa-bubble${mine ? " is-mine" : ""}`}>
        {kind === "image" && src ? (
          <a href={src} target="_blank" rel="noreferrer" className="crm-wa-media-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={message.file_name || "Imagen"} className="crm-wa-media-img" />
          </a>
        ) : null}
        {kind === "video" && src ? (
          <video src={src} controls className="crm-wa-media-video" preload="metadata" />
        ) : null}
        {kind === "audio" && src ? (
          <audio src={src} controls className="crm-wa-media-audio" preload="metadata" />
        ) : null}
        {kind === "file" && src ? (
          <a href={src} target="_blank" rel="noreferrer" className="crm-wa-file">
            {message.file_name || "Descargar archivo"}
          </a>
        ) : null}
        {message.body ? <p className="crm-wa-text">{message.body}</p> : null}
        <time dateTime={message.created_at}>{clock(message.created_at)}</time>
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
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

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
          event: "INSERT",
          schema: "public",
          table: "whatsapp_chat_messages",
          filter: `phone=eq.${selected}`,
        },
        (payload) => {
          const row = payload.new as CrmChatMessage;
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((item) => item.id === row.id || (row.wa_message_id && item.wa_message_id === row.wa_message_id))) {
              return prev;
            }
            return [...prev, row];
          });
          if (row.direction === "inbound") {
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
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "No se pudo enviar");
        return;
      }
      setDraft("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Error de red al enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="crm-wa">
      <aside className="crm-wa-list">
        <div className="crm-wa-list__head">
          <div>
            <p className="crm-wa-kicker">WhatsApp</p>
            <h1>Chats</h1>
          </div>
          <span className={`crm-wa-live${live ? " is-on" : ""}`}>{live ? "En vivo" : "Sin vivo"}</span>
        </div>
        <form className="crm-wa-new" onSubmit={startNewChat}>
          <input
            className="crm-input"
            value={composerPhone}
            onChange={(e) => setComposerPhone(e.target.value)}
            placeholder="Nuevo chat: 387..."
            inputMode="tel"
            aria-label="Celular para nuevo chat"
          />
          <button type="submit" className="crm-btn crm-btn-primary">
            Abrir
          </button>
        </form>
        <input
          className="crm-input crm-wa-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar chats"
          aria-label="Buscar chats"
        />
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
                  {(chat.name || chat.phone).slice(0, 1).toUpperCase()}
                </span>
                <span className="crm-wa-item__copy">
                  <span className="crm-wa-item__top">
                    <strong>{chat.name || displayPhone(chat.phone)}</strong>
                    <time>{relativeTime(chat.last_message_at)}</time>
                  </span>
                  <span className="crm-wa-item__preview">{chat.last_message || displayPhone(chat.phone)}</span>
                </span>
                {chat.unread_count > 0 ? (
                  <span className="crm-wa-unread">{chat.unread_count > 99 ? "99+" : chat.unread_count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="crm-wa-thread" aria-live="polite">
        {!selected ? (
          <div className="crm-wa-placeholder">
            <h2>Elegí un chat</h2>
            <p>El historial, los archivos y los envíos quedan acá en tiempo real, aunque el agente esté en pausa.</p>
          </div>
        ) : (
          <>
            <header className="crm-wa-thread__head">
              <div>
                <strong>{activeChat?.name || displayPhone(selected)}</strong>
                <p>{displayPhone(selected)}</p>
              </div>
              <a
                className="crm-btn crm-btn-ghost"
                href={`https://wa.me/${selected}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en WhatsApp
              </a>
            </header>
            <div className="crm-wa-thread__body" ref={threadRef}>
              {loadingThread ? <p className="crm-wa-empty">Cargando mensajes…</p> : null}
              {!loadingThread && messages.length === 0 ? (
                <p className="crm-wa-empty">No hay mensajes todavía. Escribí el primero.</p>
              ) : null}
              {messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
            </div>
            {error ? <p className="crm-wa-error">{error}</p> : null}
            <form className="crm-wa-composer" onSubmit={sendMessage}>
              {file ? (
                <div className="crm-wa-attach">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ) : null}
              <div className="crm-wa-composer__row">
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
                  className="crm-input"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribí un mensaje"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button type="submit" className="crm-btn crm-btn-primary" disabled={sending || (!draft.trim() && !file)}>
                  {sending ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
