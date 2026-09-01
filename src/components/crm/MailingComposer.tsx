"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAIL_PRESETS, buildMailHtml, greetingFor } from "@/lib/mailing/templates";
import {
  mergeRecipients,
  parseRecipientsFromText,
  type MailRecipient,
} from "@/lib/mailing/recipients";

type Campaign = {
  id: string;
  created_at: string;
  subject: string;
  template_id: string | null;
  recipient_count: number;
  sent_count: number;
  status: string;
  error: string | null;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
};

const firstPreset = MAIL_PRESETS[0];

export function MailingComposer() {
  const [presetId, setPresetId] = useState(firstPreset.id);
  const [subject, setSubject] = useState(firstPreset.subject);
  const [preheader, setPreheader] = useState(firstPreset.preheader);
  const [title, setTitle] = useState(firstPreset.title);
  const [body, setBody] = useState(firstPreset.body);
  const [ctaLabel, setCtaLabel] = useState(firstPreset.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(firstPreset.ctaUrl);
  const [paste, setPaste] = useState("");
  const [recipients, setRecipients] = useState<MailRecipient[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [brevoOk, setBrevoOk] = useState<boolean | null>(null);
  const [brevoError, setBrevoError] = useState("");
  const [senderLabel, setSenderLabel] = useState("Marxen <comercial@marxen.com.ar>");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [takeCount, setTakeCount] = useState(50);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolRemaining, setPoolRemaining] = useState(0);
  const [poolSent, setPoolSent] = useState(0);

  const applyPreset = useCallback((id: string) => {
    const preset = MAIL_PRESETS.find((p) => p.id === id) || MAIL_PRESETS[0];
    setPresetId(preset.id);
    setSubject(preset.subject);
    setPreheader(preset.preheader);
    setTitle(preset.title);
    setBody(preset.body);
    setCtaLabel(preset.ctaLabel);
    setCtaUrl(preset.ctaUrl);
  }, []);

  const previewHtml = useMemo(
    () =>
      buildMailHtml({ preheader, title, body, ctaLabel, ctaUrl, theme: presetId }).replaceAll(
        "{{params.greeting}}",
        greetingFor(recipients[0]?.name || "María")
      ),
    [preheader, title, body, ctaLabel, ctaUrl, recipients, presetId]
  );

  const loadMeta = useCallback(async () => {
    const [statusRes, campRes, poolRes] = await Promise.all([
      fetch("/api/crm/mailing/send", { cache: "no-store" }),
      fetch("/api/crm/mailing/campaigns", { cache: "no-store" }),
      fetch("/api/crm/mailing/pool", { cache: "no-store" }),
    ]);
    const status = (await statusRes.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      senderEmail?: string;
      senderName?: string;
    };
    setBrevoOk(status.ok === true);
    setBrevoError(status.ok ? "" : String(status.error || "No se pudo conectar con Brevo"));
    if (status.senderEmail) {
      setSenderLabel(`${status.senderName || "Marxen"} <${status.senderEmail}>`);
    }
    const camp = (await campRes.json().catch(() => ({}))) as { campaigns?: Campaign[] };
    setCampaigns(camp.campaigns || []);
    const pool = (await poolRes.json().catch(() => ({}))) as {
      total?: number;
      remaining?: number;
      sent?: number;
    };
    setPoolTotal(Number(pool.total) || 0);
    setPoolRemaining(Number(pool.remaining) || 0);
    setPoolSent(Number(pool.sent) || 0);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function addList(list: MailRecipient[], skipped = 0) {
    setRecipients((prev) => mergeRecipients([prev, list]));
    setError("");
    setOkMsg(
      skipped
        ? `Se sumaron ${list.length} mails. Se omitieron ${skipped} que ya recibieron una campaña.`
        : ""
    );
  }

  async function keepUnsent(list: MailRecipient[]) {
    if (!list.length) return { kept: [] as MailRecipient[], skipped: 0 };
    const res = await fetch("/api/crm/mailing/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "filter", recipients: list }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      recipients?: MailRecipient[];
      skipped?: number;
      remaining?: number;
      total?: number;
      sent?: number;
    };
    if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo validar la lista");
    if (typeof data.remaining === "number") setPoolRemaining(data.remaining);
    if (typeof data.total === "number") setPoolTotal(data.total);
    if (typeof data.sent === "number") setPoolSent(data.sent);
    return { kept: data.recipients || [], skipped: data.skipped || 0 };
  }

  async function takeFromPool(addMore: boolean) {
    const count = Math.max(1, Math.min(2000, Math.floor(takeCount) || 0));
    if (!count) {
      setError("Indicá cuántos mails tomar de la base.");
      return;
    }
    setBusy(addMore ? "Sumando mails de la base…" : "Tomando mails de la base Norte…");
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/crm/mailing/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          exclude: addMore ? recipients.map((row) => row.email) : [],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recipients?: MailRecipient[];
        taken?: number;
        remaining?: number;
        total?: number;
        sent?: number;
        exhausted?: boolean;
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo extraer de la base");
      const list = data.recipients || [];
      setRecipients((prev) => (addMore ? mergeRecipients([prev, list]) : list));
      setPoolRemaining(Number(data.remaining) || 0);
      setPoolTotal(Number(data.total) || 0);
      setPoolSent(Number(data.sent) || 0);
      if (!list.length) {
        setError("No quedan mails nuevos en la base Norte.");
        return;
      }
      setOkMsg(
        data.exhausted
          ? `Se tomaron ${list.length} mails (no había ${count} sin enviar). Hasta que envíes la campaña, no se marcan como usados.`
          : `Se tomaron ${list.length} mails que todavía no recibieron ninguna campaña. Podés sumar más o enviar.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al tomar la base Norte");
    } finally {
      setBusy("");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy("Leyendo archivo…");
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/crm/mailing/parse", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recipients?: MailRecipient[];
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo leer el Excel");
      const { kept, skipped } = await keepUnsent(data.recipients || []);
      addList(kept, skipped);
      if (kept.length) {
        setOkMsg(
          skipped
            ? `Se cargaron ${kept.length} mails del archivo. Se omitieron ${skipped} ya enviados.`
            : `Se cargaron ${kept.length} mails del archivo.`
        );
      } else if (!skipped) {
        setError("El archivo no tenía mails válidos.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el archivo");
    } finally {
      setBusy("");
    }
  }

  async function addPasted() {
    const list = parseRecipientsFromText(paste);
    if (!list.length) {
      setError("No encontré mails válidos en el texto.");
      return;
    }
    setBusy("Validando mails…");
    try {
      const { kept, skipped } = await keepUnsent(list);
      if (!kept.length && skipped) {
        setError("Esos mails ya recibieron una campaña.");
        return;
      }
      if (!kept.length) {
        setError("No encontré mails válidos en el texto.");
        return;
      }
      addList(kept, skipped);
      setPaste("");
      if (!skipped) setOkMsg(`Se sumaron ${kept.length} mails.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar la lista");
    } finally {
      setBusy("");
    }
  }

  async function addFromCrm() {
    setBusy("Buscando mails del CRM…");
    setError("");
    try {
      const res = await fetch("/api/crm/mailing/contacts", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recipients?: MailRecipient[];
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudieron leer contactos");
      const { kept, skipped } = await keepUnsent(data.recipients || []);
      addList(kept, skipped);
      if (kept.length && !skipped) {
        setOkMsg(`Se cargaron ${kept.length} mails de leads y afiliados.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el CRM");
    } finally {
      setBusy("");
    }
  }

  async function send(test: boolean) {
    if (!test && !recipients.length) {
      setError("Cargá destinatarios antes de enviar.");
      return;
    }
    if (!test && !window.confirm(`¿Enviar “${subject}” a ${recipients.length} destinatarios?`)) {
      return;
    }
    setBusy(test ? "Enviando prueba…" : "Enviando campaña…");
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/crm/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          preheader,
          title,
          body,
          ctaLabel,
          ctaUrl,
          templateId: presetId,
          recipients,
          testEmail: test ? testEmail : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        sent?: number;
        skippedSent?: number;
        campaignId?: string;
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo enviar");
      setOkMsg(
        test
          ? `Prueba enviada a ${testEmail}.`
          : `Campaña enviada a ${data.sent} destinatarios.${
              data.skippedSent ? ` Se omitieron ${data.skippedSent} ya enviados.` : ""
            }`
      );
      if (!test && data.campaignId) {
        window.location.href = `/crm/mailing/${data.campaignId}`;
        return;
      }
      await loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de envío");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      {brevoOk === false ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {brevoError}
        </div>
      ) : null}

      <section className="crm-card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Base Norte</p>
            <p className="mt-1 text-sm text-muted">
              {poolTotal.toLocaleString("es-AR")} contactos · {poolSent.toLocaleString("es-AR")} ya
              recibieron una campaña · {poolRemaining.toLocaleString("es-AR")} disponibles.
            </p>
          </div>
          <p className="font-display text-2xl font-semibold text-navy">{recipients.length}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="mb-1.5 block font-medium text-ink">Mails a tomar</span>
            <input
              className="crm-input"
              type="number"
              min={1}
              max={2000}
              value={takeCount}
              onChange={(e) => setTakeCount(Number(e.target.value) || 0)}
            />
          </label>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            disabled={Boolean(busy)}
            onClick={() => void takeFromPool(false)}
          >
            Iniciar campaña
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-ghost"
            disabled={Boolean(busy)}
            onClick={() => void takeFromPool(true)}
          >
            Sumar más mails
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="crm-btn crm-btn-ghost cursor-pointer">
            Sumar Excel / CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              className="sr-only"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={() => void addFromCrm()}>
            Sumar mails del CRM
          </button>
          {recipients.length ? (
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setRecipients([])}>
              Vaciar lista
            </button>
          ) : null}
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">Sumar mails a mano</span>
          <textarea
            className="crm-input min-h-28"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"uno@mail.com\nMaría, maria@mail.com\nnombre;otro@mail.com"}
          />
        </label>
        <button type="button" className="crm-btn crm-btn-primary" onClick={() => void addPasted()}>
          Sumar mails pegados
        </button>

        {recipients.length ? (
          <div className="max-h-40 overflow-auto rounded-xl border border-line bg-cloud/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Mail</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 80).map((row) => (
                  <tr key={row.email} className="border-t border-line/70">
                    <td className="px-3 py-1.5">{row.email}</td>
                    <td className="px-3 py-1.5 text-muted">{row.name || "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        className="text-xs text-muted hover:text-navy"
                        onClick={() =>
                          setRecipients((prev) => prev.filter((item) => item.email !== row.email))
                        }
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 80 ? (
              <p className="px-3 py-2 text-xs text-muted">…y {recipients.length - 80} más</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="crm-card space-y-4 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Plantilla</p>
          <div className="flex flex-wrap gap-2">
            {MAIL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  presetId === preset.id ? "bg-navy text-white" : "border border-line bg-white text-navy"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Asunto</span>
            <input className="crm-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Preheader</span>
            <input className="crm-input" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Título</span>
            <input className="crm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Cuerpo</span>
            <textarea
              className="crm-input min-h-40"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink">Botón</span>
              <input className="crm-input" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink">Link del botón</span>
              <input className="crm-input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="crm-card overflow-hidden">
            <p className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Vista previa</p>
            <iframe
              title="Vista previa del mail"
              className="h-130 w-full border-t border-line bg-white"
              sandbox="allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>
        </section>
      </div>

      <section className="crm-card space-y-4 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Envío con Brevo</p>
        <p className="text-sm text-muted">Remitente: {senderLabel}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="mb-1.5 block font-medium text-ink">Mail de prueba</span>
            <input
              className="crm-input"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@mail.com"
            />
          </label>
          <button
            type="button"
            className="crm-btn crm-btn-ghost"
            disabled={Boolean(busy) || !testEmail}
            onClick={() => void send(true)}
          >
            Enviar prueba
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            disabled={Boolean(busy) || !recipients.length}
            onClick={() => void send(false)}
          >
            Enviar campaña ({recipients.length || 0})
          </button>
        </div>
        {busy ? <p className="text-sm text-muted">{busy}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {okMsg ? <p className="text-sm text-teal">{okMsg}</p> : null}
      </section>

      {campaigns.length ? (
        <section className="crm-card p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Historial de campañas</p>
          <ul className="space-y-3">
            {campaigns.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/crm/mailing/${item.id}`}
                  className="crm-card-hover block rounded-2xl border border-line px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-navy">{item.subject}</p>
                    <p className="text-xs text-muted">
                      {new Date(item.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {item.stats?.sent ?? item.sent_count} enviados · {item.stats?.delivered ?? 0} entregados ·{" "}
                    {item.stats?.opened ?? 0} abrieron · {item.stats?.clicked ?? 0} clics
                    {item.stats?.bounced ? ` · ${item.stats.bounced} rebotes` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
