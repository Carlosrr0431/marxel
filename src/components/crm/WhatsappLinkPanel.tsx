"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando…",
  disconnected: "Desconectado",
  logged_out: "Sesión cerrada",
  expired: "Expirada",
  need_scan: "Escaneá el código QR",
  unknown: "Verificando…",
};

type Snapshot = {
  ok?: boolean;
  error?: string;
  agentCode?: string;
  phone?: string;
  label?: string;
  webhookUrl?: string;
  status?: string;
  connected?: boolean;
  qr?: string | null;
  livePhone?: string | null;
};

function statusTone(status: string) {
  if (status === "connected") return "ok";
  if (status === "connecting" || status === "need_scan") return "warn";
  return "bad";
}

function qrImageUrl(qr: string | null | undefined, bust: number) {
  if (!qr) return null;
  const value = String(qr);
  if (value.startsWith("data:image") || value.startsWith("http://") || value.startsWith("https://")) {
    return bust ? `${value}${value.includes("?") ? "&" : "?"}t=${encodeURIComponent(String(bust))}` : value;
  }
  const base = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(value)}`;
  return bust ? `${base}&t=${encodeURIComponent(String(bust))}` : base;
}

function mergeSnapshot(prev: Snapshot | null, next: Snapshot) {
  if (!next || next.ok === false) return prev;
  const keepQr =
    !next.qr &&
    Boolean(prev?.qr) &&
    next.status !== "connected" &&
    ["need_scan", "connecting", "logged_out", "disconnected", "expired", "unknown"].includes(
      String(next.status || "")
    );
  return {
    ...next,
    qr: keepQr ? prev?.qr || null : next.qr || null,
  };
}

export function WhatsappLinkPanel() {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [qrBust, setQrBust] = useState(0);
  const [copied, setCopied] = useState(false);
  const autoConnectRef = useRef(false);
  const actingRef = useRef(false);
  const lastQrRef = useRef<string | null>(null);

  const applySnapshot = useCallback((data: Snapshot) => {
    if (!data || data.ok === false) {
      if (data?.error) setError(data.error);
      setSnapshot((prev) => ({ ...(prev || {}), ...data }));
      return;
    }
    setError("");
    setSnapshot((prev) => {
      const merged = mergeSnapshot(prev, data) || data;
      const nextQr = merged.qr || null;
      if (nextQr && nextQr !== lastQrRef.current) {
        lastQrRef.current = nextQr;
        setQrBust(Date.now());
      }
      if (!nextQr && merged.status === "connected") lastQrRef.current = null;
      return merged;
    });
  }, []);

  const load = useCallback(async () => {
    if (actingRef.current) return null;
    try {
      const res = await fetch("/api/whatsapp/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Snapshot;
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo consultar el estado de WhatsApp");
      }
      applySnapshot(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la sesión");
      return null;
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  const runAction = useCallback(
    async (body: { action: string }) => {
      actingRef.current = true;
      setActing(true);
      setError("");
      try {
        const res = await fetch("/api/whatsapp/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as Snapshot;
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "No se pudo completar la acción");
        }
        applySnapshot(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al vincular");
        return null;
      } finally {
        actingRef.current = false;
        setActing(false);
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    void load();
    return undefined;
  }, [load]);

  useEffect(() => {
    const connected = snapshot?.connected || snapshot?.status === "connected";
    const ms = connected ? 8000 : 3000;
    const poll = window.setInterval(() => {
      void load();
    }, ms);
    return () => window.clearInterval(poll);
  }, [load, snapshot?.connected, snapshot?.status]);

  useEffect(() => {
    if (loading || !snapshot) return;
    if (autoConnectRef.current) return;
    if (snapshot.connected || snapshot.status === "connected") return;
    if (snapshot.ok === false && snapshot.error?.includes("WHATSMEOW_API_KEY")) return;
    if (snapshot.qr && snapshot.status === "need_scan") {
      autoConnectRef.current = true;
      return;
    }
    const needsConnect =
      !snapshot.qr || ["logged_out", "disconnected", "expired", "unknown"].includes(String(snapshot.status));
    if (!needsConnect) return;
    autoConnectRef.current = true;
    void runAction({ action: "connect" });
  }, [loading, snapshot, runAction]);

  const status = snapshot?.status || "unknown";
  const connected = snapshot?.connected || status === "connected";
  const tone = statusTone(connected ? "connected" : status);
  const toneClasses = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    bad: "border-rose-200 bg-rose-50 text-rose-800",
  } as const;
  const qrUrl = qrImageUrl(snapshot?.qr, qrBust);
  const canShowQr = Boolean(snapshot?.qr) || ["need_scan", "logged_out", "disconnected", "expired", "connecting"].includes(status);
  const missingKey = Boolean(snapshot?.error?.includes("WHATSMEOW_API_KEY"));

  const copyWebhook = async () => {
    if (!snapshot?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(snapshot.webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No se pudo copiar la URL del webhook.");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="crm-card space-y-4 p-5">
        {loading && !snapshot ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-navy" />
            Consultando estado…
          </div>
        ) : (
          <>
            <div className={`rounded-2xl border px-4 py-4 ${toneClasses[tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">Estado en vivo</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {connected ? "WhatsApp conectado" : STATUS_LABELS[status] || status}
                  </p>
                  <p className="mt-1 truncate text-sm opacity-80">
                    {snapshot?.label || "MARXEN · 3876348199"}
                    {snapshot?.livePhone ? ` · ${snapshot.livePhone}` : ""}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"
                    }`}
                  />
                  {connected ? "En línea" : "Detectando…"}
                </span>
              </div>
            </div>

            {missingKey ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                Falta <code className="rounded bg-white px-1">WHATSMEOW_API_KEY</code> en Vercel para
                vincular el QR.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            {!connected && canShowQr ? (
              <div className="rounded-2xl border border-line bg-mist/60 p-4">
                {qrUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`${qrBust}-${String(snapshot?.qr).slice(0, 24)}`}
                      src={qrUrl}
                      alt="Código QR de WhatsApp"
                      className="h-[200px] w-[200px] rounded-2xl border border-white bg-white p-2 shadow-sm"
                    />
                    <p className="max-w-sm text-center text-sm leading-relaxed text-muted">
                      En el celular del 3876348199: WhatsApp → Dispositivos vinculados → Vincular
                      dispositivo.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-navy" />
                    Generando código QR…
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  disabled={acting || missingKey}
                  onClick={() => {
                    autoConnectRef.current = true;
                    void runAction({ action: snapshot?.qr ? "refresh-qr" : "connect" });
                  }}
                >
                  {acting ? "Esperá…" : snapshot?.qr ? "Nuevo QR" : "Vincular WhatsApp"}
                </button>
              ) : null}
              <button
                type="button"
                className="crm-btn crm-btn-ghost"
                disabled={acting}
                onClick={() => {
                  if (!window.confirm("¿Cerrar la sesión de WhatsApp de MARXEN?")) return;
                  autoConnectRef.current = false;
                  void runAction({ action: "reset" });
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </section>

      <aside className="crm-card h-fit space-y-3 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Línea</p>
        <p className="font-display text-lg font-semibold text-navy">3876348199</p>
        <p className="text-sm text-muted">
          El chatbot de la landing atiende este número. Los votos de encuestas (poll) se procesan
          igual que en el chat web.
        </p>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Webhook</p>
          <p className="break-all rounded-xl bg-mist px-3 py-2 font-mono text-[11px] text-navy">
            {snapshot?.webhookUrl || "https://marxel-omega.vercel.app/api/Agente_IA/5493876348199"}
          </p>
          <button type="button" className="crm-btn crm-btn-ghost mt-2 w-full" onClick={copyWebhook}>
            {copied ? "Copiado" : "Copiar webhook"}
          </button>
        </div>
        <p className="text-[11px] text-muted">
          Agente: <span className="font-semibold text-navy">{snapshot?.agentCode || "MARXEN"}</span>
        </p>
      </aside>
    </div>
  );
}
