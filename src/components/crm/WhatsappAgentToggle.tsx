"use client";

import { useCallback, useEffect, useState } from "react";

type AgentState = {
  enabled: boolean;
  testPhone: string;
};

export function WhatsappAgentToggle() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/agent", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as AgentState & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "No se pudo leer el estado del agente");
      }
      setState({
        enabled: Boolean(data.enabled),
        testPhone: data.testPhone || "3878630173",
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el agente");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (!state || saving) return;
    const next = !state.enabled;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/agent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = (await res.json().catch(() => ({}))) as AgentState & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "No se pudo guardar");
      }
      setState({
        enabled: Boolean(data.enabled),
        testPhone: data.testPhone || state.testPhone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la automatización");
    } finally {
      setSaving(false);
    }
  };

  const enabled = state?.enabled === true;
  const testPhone = state?.testPhone || "3878630173";

  return (
    <section className="crm-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">
            Agente IA
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-navy">
            Automatización de WhatsApp
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {loading
              ? "Consultando si el agente está activo…"
              : enabled
                ? "Activo. Responde a todos los chats, salvo los que pauses en el inbox."
                : "Pausado. El webhook recibe mensajes, pero el agente no responde."}
          </p>
        </div>
        <button
          type="button"
          className={`crm-btn shrink-0 disabled:opacity-50 ${enabled ? "crm-btn-ghost" : "crm-btn-primary"}`}
          disabled={loading || saving || !state}
          aria-pressed={enabled}
          onClick={() => void toggle()}
        >
          {saving
            ? "Guardando…"
            : enabled
              ? "Deshabilitar agente"
              : "Habilitar agente"}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            loading
              ? "bg-mist text-navy"
              : enabled
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              loading ? "bg-navy/40" : enabled ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {loading ? "Cargando…" : enabled ? "Agente activo" : "Agente pausado"}
        </span>
        <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-navy">
          Control por chat en el inbox
        </span>
      </div>
      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
