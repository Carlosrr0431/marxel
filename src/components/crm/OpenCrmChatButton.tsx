"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export function OpenCrmChatButton({
  leadId,
  phone,
  name,
  existing = false,
}: {
  leadId?: string;
  phone: string;
  name?: string;
  existing?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const normalized = normalizeArPhone(phone);

  if (!normalized) {
    return (
      <span className="bot-chat-btn is-disabled" title="Este lead no tiene un celular válido">
        Sin celular
      </span>
    );
  }

  async function openChat() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/crm/whatsapp/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: leadId || undefined,
          phone: normalized,
          name: name || "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        phone?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.phone) {
        throw new Error(json.error || "No se pudo crear el contacto");
      }
      router.push(`/crm/chats?phone=${encodeURIComponent(json.phone)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el chat");
      setBusy(false);
    }
  }

  return (
    <span className="bot-chat-wrap">
      <button
        type="button"
        className="bot-chat-btn"
        disabled={busy}
        title={
          existing
            ? "Abrir este contacto en el panel de Chats"
            : "Crear el contacto en Chats y escribirle por WhatsApp"
        }
        onClick={() => void openChat()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 7A2.5 2.5 0 0 1 7.5 4.5h9A2.5 2.5 0 0 1 19 7v5.2A2.5 2.5 0 0 1 16.5 14.7H12l-3.4 2.4v-2.4H7.5A2.5 2.5 0 0 1 5 12.2V7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? "Abriendo…" : existing ? "Abrir chat" : "Crear contacto"}
      </button>
      {error ? <span className="bot-chat-error">{error}</span> : null}
    </span>
  );
}
