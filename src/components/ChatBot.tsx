"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/content";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const SUGGESTIONS = [
  "¿Qué diferencia hay entre A2 y A4?",
  "¿A2 cubre ortodoncia?",
  "¿Qué farmacias están en cartilla?",
  "¿Cómo me afilio siendo monotributista?",
];

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente de Marxel. Puedo ayudarte con planes A2/A4, cartillas y el manual de Prevención Salud. ¿Qué necesitás saber?",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola Marxel, quiero asesoramiento sobre Prevención Salud."
  )}`;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const history = next
        .filter((m) => m.id !== "welcome")
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        sources?: string[];
      };

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
            "No pude conectar con el asistente. Revisá tu conexión o escribinos por WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

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
          className="fixed z-50 flex w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-[1.35rem] border border-line/80 bg-white shadow-[0_24px_60px_rgba(5,30,54,0.22)]"
          style={{
            right: "calc(1.1rem + env(safe-area-inset-right, 0px))",
            bottom: "calc(5.4rem + env(safe-area-inset-bottom, 0px))",
            height: "min(70vh, 34rem)",
          }}
        >
          <header className="flex items-start justify-between gap-3 bg-navy px-4 py-3.5 text-white">
            <div>
              <p className="font-display text-base font-semibold">Asistente Marxel</p>
              <p className="mt-0.5 text-xs text-white/65">
                Prevención Salud · A2 / A4 · Cartillas
              </p>
            </div>
            <Link
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/15"
            >
              WhatsApp
            </Link>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-cloud/80 px-3.5 py-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-navy text-white"
                      : "rounded-bl-md border border-line/70 bg-white text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.sources && m.sources.length > 0 ? (
                    <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-snug text-muted">
                      Fuentes: {m.sources.slice(0, 3).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-muted">Pensando con la documentación…</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line/70 bg-white px-3 py-2.5">
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
            className="flex gap-2 border-t border-line/70 bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntá por A2, A4, cartilla…"
              className="field !min-h-11 flex-1 !rounded-xl !py-2.5 text-sm"
              disabled={loading}
              maxLength={1200}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary !min-h-11 !rounded-xl px-3.5 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
