"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/content";
import {
  emptyQuoteState,
  MAIN_MENU,
  MENU_WHATSAPP,
  usesChoiceGrid,
  type QuoteQuickReply,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const DEBOUNCE_MS = 700;
const STORAGE_KEY = "marxel-chat-v3";
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORED_MSGS = 60;

const WELCOME_MSG: Msg = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Bienvenido a MARXEN Protección Integral. ¿En qué te puedo ayudar hoy?",
};

function loadStorage(): { messages: Msg[]; quoteState: QuoteState } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      messages: Msg[];
      quoteState: QuoteState;
      ts: number;
    };
    if (!parsed.ts || Date.now() - parsed.ts > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.messages?.length > 0) return parsed;
  } catch {}
  return null;
}

function saveStorage(messages: Msg[], quoteState: QuoteState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: messages.slice(-MAX_STORED_MSGS),
        quoteState,
        ts: Date.now(),
      })
    );
  } catch {}
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingDebounce, setWaitingDebounce] = useState(false);
  const [quoteState, setQuoteState] = useState<QuoteState>(emptyQuoteState());
  const [quickReplies, setQuickReplies] = useState<QuoteQuickReply[]>([]);
  const [messages, setMessages] = useState<Msg[]>([WELCOME_MSG]);

  const quickRepliesRef = useRef<QuoteQuickReply[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const quoteStateRef = useRef<QuoteState>(quoteState);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    quoteStateRef.current = quoteState;
  }, [quoteState]);
  useEffect(() => {
    quickRepliesRef.current = quickReplies;
  }, [quickReplies]);

  const pendingRef = useRef<string[]>([]);
  const historySnapRef = useRef<{ role: "user" | "assistant"; content: string }[]>(
    []
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, quiero asesoramiento."
  )}`;

  useEffect(() => {
    const saved = loadStorage();
    if (saved) {
      setMessages(saved.messages);
      setQuoteState(saved.quoteState);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      saveStorage(messages, quoteState);
    }
  }, [messages, quoteState]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading, waitingDebounce, quickReplies, quoteState.step]);

  useEffect(() => {
    document.documentElement.classList.toggle("chat-open", open);
    return () => document.documentElement.classList.remove("chat-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = document.getElementById("marxel-chatbot");
    const vv = window.visualViewport;
    if (!panel || !vv) return;

    const sync = () => {
      if (window.matchMedia("(min-width: 640px)").matches) {
        panel.style.bottom = "";
        return;
      }
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.bottom = `max(0.5rem, env(safe-area-inset-bottom, 0px), ${covered + 8}px)`;
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      panel.style.bottom = "";
    };
  }, [open]);

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([WELCOME_MSG]);
    setQuoteState(emptyQuoteState());
    setQuickReplies([]);
  }

  async function flush() {
    const msgs = [...pendingRef.current];
    pendingRef.current = [];
    setWaitingDebounce(false);
    if (msgs.length === 0) return;

    setLoading(true);
    const combined = msgs.join("\n");
    const history = historySnapRef.current;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: combined,
          history,
          quoteState: quoteStateRef.current,
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        sources?: string[];
        quoteState?: QuoteState;
        quickReplies?: QuoteQuickReply[];
      };

      if (data.quoteState) setQuoteState(data.quoteState);
      setQuickReplies(data.quickReplies || []);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            data.answer ||
            data.error ||
            "No pude responder ahora. Probá de nuevo o escribinos por WhatsApp.",
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            "No pude conectar. Revisá tu conexión o escribinos por WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function send(text: string, immediate = false) {
    const content = text.trim();
    if (!content || loading) return;

    if (content === MENU_WHATSAPP) {
      window.open(wa, "_blank", "noopener,noreferrer");
      return;
    }

    if (pendingRef.current.length === 0) {
      historySnapRef.current = messagesRef.current
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-10);
    }

    const visible = content.startsWith("menu:")
      ? MAIN_MENU.find((item) => item.value === content)?.label || content
      : quickRepliesRef.current.find((item) => item.value === content)?.label || content;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: visible },
    ]);
    setInput("");
    setQuickReplies([]);

    pendingRef.current.push(content);
    setWaitingDebounce(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (immediate) {
      void flush();
      return;
    }
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }

  const inQuote = quoteState.active;
  const busy = loading || waitingDebounce;
  const showGrid = !busy && inQuote && usesChoiceGrid(quoteState.step);
  const choiceButtons = busy ? [] : quickReplies;
  const showMainMenu =
    !busy && !inQuote && messages.length <= 2 && choiceButtons.length === 0;
  const menuButtons = showMainMenu ? MAIN_MENU : choiceButtons;
  const menuIsGrid = showMainMenu || showGrid;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="marxel-chatbot"
        aria-label={open ? "Cerrar asistente" : "Abrir Asistente MARXEN"}
        className="chatbot-fab fixed z-50 inline-flex flex-col items-end gap-1"
      >
        {open ? null : (
          <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Asistente
          </span>
        )}
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white shadow-[0_10px_28px_rgba(10,53,92,0.35)] transition hover:bg-navy-deep sm:h-14 sm:w-14">
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="12" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          )}
        </span>
      </button>

      {open ? (
        <button
          type="button"
          className="chatbot-backdrop"
          aria-label="Cerrar asistente"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div
          id="marxel-chatbot"
          className="chatbot-panel"
          role="dialog"
          aria-label="Asistente MARXEN"
        >
          <header className="flex min-h-11 shrink-0 items-center justify-between gap-2 bg-navy px-3 py-2 text-white">
            <p className="min-w-0 truncate text-[13px] font-semibold">
              Asistente MARXEN
              <span className="ml-1.5 hidden font-normal text-white/55 sm:inline">
                · Asesor virtual
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              {messages.length > 1 ? (
                <button
                  type="button"
                  onClick={clearHistory}
                  title="Limpiar conversación"
                  className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white/90"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
              <Link
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10 hover:text-white"
              >
                WA
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
                className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </header>

          <div className="chatbot-scroll">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-navy text-white"
                      : "rounded-bl-md border border-line/70 bg-white text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {busy ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line/70 bg-white px-3.5 py-3">
                  <span className="chatbot-dot" style={{ animationDelay: "0ms" }} />
                  <span className="chatbot-dot" style={{ animationDelay: "160ms" }} />
                  <span className="chatbot-dot" style={{ animationDelay: "320ms" }} />
                </div>
              </div>
            ) : null}

            {menuButtons.length > 0 ? (
              <div
                className={
                  menuIsGrid ? "grid gap-1.5 pt-1" : "flex flex-wrap gap-1.5 pt-1"
                }
              >
                {menuButtons.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => send(r.value, true)}
                    disabled={busy}
                    className={
                      menuIsGrid
                        ? "w-full rounded-xl border border-line bg-white px-3 py-2 text-left transition hover:border-navy/30 hover:bg-aqua disabled:opacity-50"
                        : "rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-medium text-navy hover:bg-aqua disabled:opacity-50"
                    }
                  >
                    <span className="block text-[13px] font-semibold text-navy">
                      {r.label}
                    </span>
                    {r.hint ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-muted">
                        {r.hint}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form
            className="flex shrink-0 gap-2 border-t border-line/70 bg-white p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                showMainMenu || showGrid
                  ? "O elegí una opción arriba…"
                  : inQuote
                    ? "Respondé acá…"
                    : "Escribí tu consulta…"
              }
              className="field !min-h-10 flex-1 !rounded-xl !py-2 text-[13px]"
              disabled={loading}
              maxLength={1200}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary !min-h-10 !rounded-xl px-3 text-[13px] disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
