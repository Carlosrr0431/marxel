"use client";

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
      buildMailHtml({ preheader, title, body, ctaLabel, ctaUrl }).replaceAll(
        "{{params.greeting}}",
        greetingFor(recipients[0]?.name || "María")
      ),
    [preheader, title, body, ctaLabel, ctaUrl, recipients]
  );

  const loadMeta = useCallback(async () => {
    const [statusRes, campRes] = await Promise.all([
      fetch("/api/crm/mailing/send", { cache: "no-store" }),
      fetch("/api/crm/mailing/campaigns", { cache: "no-store" }),
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
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function addList(list: MailRecipient[]) {
    setRecipients((prev) => mergeRecipients([prev, list]));
    setError("");
    setOkMsg("");
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
      addList(data.recipients || []);
      setOkMsg(`Se cargaron ${(data.recipients || []).length} mails del archivo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el archivo");
    } finally {
      setBusy("");
    }
  }

  function addPasted() {
    const list = parseRecipientsFromText(paste);
    if (!list.length) {
      setError("No encontré mails válidos en el texto.");
      return;
    }
    addList(list);
    setPaste("");
    setOkMsg(`Se sumaron ${list.length} mails.`);
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
      addList(data.recipients || []);
      setOkMsg(`Se cargaron ${(data.recipients || []).length} mails de leads y afiliados.`);
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
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo enviar");
      setOkMsg(
        test
          ? `Prueba enviada a ${testEmail}.`
          : `Campaña enviada a ${data.sent} destinatarios.`
      );
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
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Destinatarios</p>
            <p className="mt-1 text-sm text-muted">
              Excel/CSV (columnas email y nombre), lista pegada, o mails ya cargados en el CRM.
            </p>
          </div>
          <p className="font-display text-2xl font-semibold text-navy">{recipients.length}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="crm-btn crm-btn-ghost cursor-pointer">
            Subir Excel / CSV
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
            Cargar mails del CRM
          </button>
          {recipients.length ? (
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setRecipients([])}>
              Vaciar lista
            </button>
          ) : null}
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">Pegar lista de mails</span>
          <textarea
            className="crm-input min-h-28"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"uno@mail.com\nMaría, maria@mail.com\nnombre;otro@mail.com"}
          />
        </label>
        <button type="button" className="crm-btn crm-btn-primary" onClick={addPasted}>
          Sumar mails pegados
        </button>

        {recipients.length ? (
          <div className="max-h-40 overflow-auto rounded-xl border border-line bg-cloud/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Mail</th>
                  <th className="px-3 py-2">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 80).map((row) => (
                  <tr key={row.email} className="border-t border-line/70">
                    <td className="px-3 py-1.5">{row.email}</td>
                    <td className="px-3 py-1.5 text-muted">{row.name || "—"}</td>
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
            Enviar a {recipients.length || 0}
          </button>
        </div>
        {busy ? <p className="text-sm text-muted">{busy}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {okMsg ? <p className="text-sm text-teal">{okMsg}</p> : null}
      </section>

      {campaigns.length ? (
        <section className="crm-card p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Últimos envíos</p>
          <ul className="space-y-2 text-sm">
            {campaigns.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 py-2 last:border-0">
                <span className="font-medium text-navy">{item.subject}</span>
                <span className="text-muted">
                  {item.sent_count}/{item.recipient_count} · {item.status} ·{" "}
                  {new Date(item.created_at).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
