"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando…",
  disconnected: "Desconectado",
  logged_out: "Sesión cerrada",
  expired: "Expirada",
  need_scan: "Listo para escanear",
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

function toQrSrc(qr: string | null | undefined) {
  if (!qr) return null;
  const value = qr.trim();
  if (value.startsWith("data:image")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const compact = value.replace(/\s/g, "");
  if (compact.length > 80 && /^[A-Za-z0-9+/]+=*$/.test(compact.slice(0, 120))) {
    return `data:image/png;base64,${compact}`;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&ecc=M&data=${encodeURIComponent(value)}`;
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

function WhatsappMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.11-.22-.16-.47-.28z"
      />
    </svg>
  );
}

export function WhatsappLinkPanel() {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrBroken, setQrBroken] = useState(false);
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
        setQrBroken(false);
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

  const connected = Boolean(snapshot?.connected || snapshot?.status === "connected");
  const qrSrc = toQrSrc(snapshot?.qr);
  const waitingScan = Boolean(qrSrc) && !connected;

  useEffect(() => {
    const ms = connected ? 8000 : waitingScan ? 2500 : 10000;
    const poll = window.setInterval(() => {
      void load();
    }, ms);
    return () => window.clearInterval(poll);
  }, [load, connected, waitingScan]);

  const missingKey = Boolean(snapshot?.error?.includes("WHATSMEOW_API_KEY"));
  const status = connected
    ? "connected"
    : waitingScan
      ? "need_scan"
      : acting
        ? "connecting"
        : snapshot?.status && snapshot.status !== "need_scan"
          ? snapshot.status
          : "disconnected";
  const tone = connected ? "ok" : waitingScan || acting ? "warn" : "bad";

  const generateQr = async () => {
    const data = await runAction({ action: snapshot?.qr ? "refresh-qr" : "connect" });
    if (data && !data.connected && !toQrSrc(data.qr)) {
      setError("No se pudo generar el QR. Intentá de nuevo.");
    }
  };

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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-[1.35rem] border border-line bg-white shadow-[0_12px_40px_rgba(5,30,54,0.06)]">
        <div className="flex items-center justify-between gap-3 border-b border-line/80 bg-[linear-gradient(135deg,#051e36_0%,#0a355c_55%,#0f9b94_140%)] px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Línea MARXEN</p>
            <p className="mt-0.5 font-display text-lg font-semibold tracking-tight">3876348199</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              connected
                ? "bg-emerald-400/20 text-emerald-100"
                : waitingScan
                  ? "bg-amber-300/20 text-amber-100"
                  : "bg-white/10 text-white/80"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-300" : "animate-pulse bg-amber-300"
              }`}
            />
            {STATUS_LABELS[status] || status}
          </span>
        </div>

        {loading && !snapshot ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-navy" />
            Consultando estado…
          </div>
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            {missingKey ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                Falta la clave de whatsmeow en Vercel para vincular el QR.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            {connected ? (
              <div className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <WhatsappMark className="h-8 w-8" />
                </span>
                <p className="mt-4 font-display text-xl font-semibold text-navy">WhatsApp en línea</p>
                <p className="mt-1 text-sm text-muted">
                  El chatbot atiende este número
                  {snapshot?.livePhone ? ` · ${snapshot.livePhone}` : ""}.
                </p>
              </div>
            ) : waitingScan && qrSrc && !qrBroken ? (
              <div className="flex flex-col items-center gap-5">
                <div className="relative rounded-[1.6rem] bg-[linear-gradient(160deg,#051e36,#0a355c_60%,#0d5752)] p-4 shadow-[0_18px_40px_rgba(5,30,54,0.18)]">
                  <div className="rounded-[1.1rem] bg-white p-3">
                    <div className="size-[220px] overflow-hidden sm:size-[240px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrSrc}
                        alt="Código QR para vincular WhatsApp"
                        width={240}
                        height={240}
                        className="size-full object-contain"
                        style={{ maxWidth: "none", height: "100%", width: "100%" }}
                        onError={() => setQrBroken(true)}
                      />
                    </div>
                  </div>
                </div>
                <ol className="w-full max-w-md space-y-2 text-sm text-muted">
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                      1
                    </span>
                    Abrí WhatsApp en el celular del 3876348199.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                      2
                    </span>
                    Dispositivos vinculados → Vincular dispositivo.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                      3
                    </span>
                    Escaneá este código. Caduca en unos 60 segundos.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-mist/50 px-5 py-12 text-center">
                {acting ? (
                  <>
                    <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-teal" />
                    <p className="mt-4 font-display text-lg font-semibold text-navy">Generando QR…</p>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                      Pedimos un código fresco a whatsmeow. En unos segundos aparece listo para
                      escanear.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#25D366] text-white shadow-[0_10px_24px_rgba(37,211,102,0.28)]">
                      <WhatsappMark className="h-9 w-9" />
                    </span>
                    <p className="mt-5 font-display text-xl font-semibold text-navy">
                      Vincular WhatsApp
                    </p>
                    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                      El código no se pide solo. Tocá generar y escanealo con el celular del
                      3876348199.
                    </p>
                    {qrBroken ? (
                      <p className="mt-2 text-sm text-rose-700">
                        El último código no se pudo mostrar. Generá uno nuevo.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <button
                  type="button"
                  className="crm-btn crm-btn-primary min-w-[10.5rem]"
                  disabled={acting || missingKey}
                  aria-busy={acting}
                  onClick={() => void generateQr()}
                >
                  {acting ? "Generando…" : waitingScan ? "Generar otro QR" : "Generar QR"}
                </button>
              ) : null}
              <button
                type="button"
                className="crm-btn crm-btn-ghost"
                disabled={acting}
                onClick={() => {
                  if (!window.confirm("¿Cerrar la sesión de WhatsApp de MARXEN?")) return;
                  lastQrRef.current = null;
                  setQrBroken(false);
                  void runAction({ action: "reset" });
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="crm-card h-fit space-y-4 p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Cómo funciona</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            El chatbot de la landing atiende este número. Los votos de encuestas se procesan igual
            que en el chat web.
          </p>
        </div>
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
          {tone === "ok" ? " · en vivo" : ""}
        </p>
      </aside>
    </div>
  );
}
