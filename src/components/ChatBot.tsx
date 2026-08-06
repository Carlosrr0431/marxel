"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/content";
import {
  emptyQuoteState,
  type QuoteQuickReply,
  type QuoteState,
} from "@/lib/chatbot/quote-flow";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

// Espera antes de enviar al bot (acumula mensajes del usuario como en WhatsApp).
// Cambiá este valor para ajustar el delay.
const DEBOUNCE_MS = 4_000;

const SUGGESTIONS = [
  "Quiero cotizar",
  "¿Qué diferencia hay entre A2 y A4?",
  "¿A2 cubre ortodoncia?",
  "¿Qué farmacias están en cartilla?",
];

const LABORAL_OPTIONS: QuoteQuickReply[] = [
  { label: "Monotributo", value: "Monotributo" },
  { label: "Relación de dependencia", value: "Relación de dependencia" },
  { label: "Particular", value: "Particular" },
];

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingDebounce, setWaitingDebounce] = useState(false);
  const [quoteState, setQuoteState] = useState<QuoteState>(emptyQuoteState());
  const [quickReplies, setQuickReplies] = useState<QuoteQuickReply[]>([]);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola. Podés preguntarme lo que quieras sobre los planes de salud, o decí 'quiero cotizar' y te armo una cotización.",
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Refs para acceder a valores actualizados dentro del setTimeout
  const messagesRef = useRef<Msg[]>(messages);
  const quoteStateRef = useRef<QuoteState>(quoteState);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { quoteStateRef.current = quoteState; }, [quoteState]);

  // Buffer de mensajes pendientes de enviar
  const pendingRef = useRef<string[]>([]);
  const historySnapRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola Marxel, quiero asesoramiento sobre Prevención Salud."
  )}`;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading, waitingDebounce, quickReplies, quoteState.step]);

  async function flush() {
    const msgs = [...pendingRef.current];
    pendingRef.current = [];
    setWaitingDebounce(false);
    if (msgs.length === 0) return;

    setLoading(true);

    // Si hubo varios mensajes, los unimos con salto de línea para que el bot los procese como contexto único
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

  function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    // Snapshot de history solo antes del primer mensaje del batch
    if (pendingRef.current.length === 0) {
      historySnapRef.current = messagesRef.current
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-10);
    }

    // Mostrar en UI inmediatamente
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content },
    ]);
    setInput("");
    setQuickReplies([]);

    // Buffer y debounce
    pendingRef.current.push(content);
    setWaitingDebounce(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }

  const inQuote = quoteState.active;
  const busy = loading || waitingDebounce;
  const showLaboralButtons = !busy && quoteState.active && quoteState.step === "laboral";
  const choiceButtons = showLaboralButtons ? LABORAL_OPTIONS : busy ? [] : quickReplies;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="marxel-chatbot"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente IA"}
        className="fixed z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white shadow-[0_10px_28px_rgba(10,53,92,0.35)] transition hover:bg-navy-deep sm:h-14 sm:w-14"
        style={{
          right: "calc(5.4rem + env(safe-area-inset-right, 0px))",
          bottom: "calc(1.1rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
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
      </button>

      {open ? (
        <div
          id="marxel-chatbot"
          className="fixed z-50 flex w-[min(100vw-1.25rem,24rem)] flex-col overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_24px_60px_rgba(5,30,54,0.22)]"
          style={{
            right: "calc(1.1rem + env(safe-area-inset-right, 0px))",
            bottom: "calc(5.4rem + env(safe-area-inset-bottom, 0px))",
            height: "min(78vh, 38rem)",
          }}
        >
          <header className="flex h-10 shrink-0 items-center justify-between gap-2 bg-navy px-3 text-white">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              Asistente Marxel
              <span className="ml-1.5 font-normal text-white/55">
                {inQuote ? "· Cotización" : "· Salud"}
              </span>
            </p>
            <Link
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10 hover:text-white"
            >
              WA
            </Link>
          </header>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-cloud/80 px-3 py-3">
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
                  {m.sources && m.sources.length > 0 ? (
                    <p className="mt-1.5 border-t border-line/60 pt-1.5 text-[10px] leading-snug text-muted">
                      {m.sources.slice(0, 3).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Indicador de "escribiendo..." (espera debounce o respuesta API) */}
            {busy ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line/70 bg-white px-3.5 py-3">
                  <span className="chatbot-dot" style={{ animationDelay: "0ms" }} />
                  <span className="chatbot-dot" style={{ animationDelay: "160ms" }} />
                  <span className="chatbot-dot" style={{ animationDelay: "320ms" }} />
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          {choiceButtons.length > 0 ? (
            <div
              className={`shrink-0 border-t border-line/70 bg-white px-2.5 py-2 ${
                showLaboralButtons ? "grid gap-1.5" : "flex flex-wrap gap-1.5"
              }`}
            >
              {choiceButtons.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => send(r.value)}
                  disabled={busy}
                  className={
                    showLaboralButtons
                      ? "w-full rounded-xl border border-line bg-mist/80 px-3 py-2.5 text-left text-[13px] font-semibold text-navy transition hover:border-teal/40 hover:bg-aqua disabled:opacity-50"
                      : "rounded-full border border-line bg-mist/70 px-2.5 py-1.5 text-[11px] font-medium text-navy hover:bg-aqua disabled:opacity-50"
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : messages.length <= 2 ? (
            <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line/70 bg-white px-2.5 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-mist/70 px-2.5 py-1 text-[11px] font-medium text-navy hover:bg-aqua"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

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
                showLaboralButtons
                  ? "O elegí una opción arriba…"
                  : inQuote
                    ? "Respondé acá…"
                    : "Preguntá o escribí quiero cotizar…"
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
