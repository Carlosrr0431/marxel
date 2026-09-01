"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAIL_PRESETS, buildMailHtml, greetingFor } from "@/lib/mailing/templates";
import {
  mergeRecipients,
  normalizeEmail,
  parseRecipientsFromText,
  type MailRecipient,
} from "@/lib/mailing/recipients";
import { emptyTotals, type MailTotals } from "@/lib/mailing/stats";
import { MailingCharts } from "@/components/crm/MailingCharts";

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

type ConfirmAsk = {
  takeFromPool: boolean;
  count: number;
  title: string;
  description: string;
};

const firstPreset = MAIL_PRESETS[0];

function fmt(n: number) {
  return n.toLocaleString("es-AR");
}

export function MailingComposer() {
  const { push } = useRouter();
  const [presetId, setPresetId] = useState(firstPreset.id);
  const [subject, setSubject] = useState(firstPreset.subject);
  const [preheader, setPreheader] = useState(firstPreset.preheader);
  const [title, setTitle] = useState(firstPreset.title);
  const [body, setBody] = useState(firstPreset.body);
  const [ctaLabel, setCtaLabel] = useState(firstPreset.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(firstPreset.ctaUrl);
  const [paste, setPaste] = useState("");
  const [recipients, setRecipients] = useState<MailRecipient[]>([]);
  const [repeatEmails, setRepeatEmails] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [brevoOk, setBrevoOk] = useState<boolean | null>(null);
  const [brevoError, setBrevoError] = useState("");
  const [senderLabel, setSenderLabel] = useState("Marxen <comercial@marxen.com.ar>");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totals, setTotals] = useState<MailTotals>(emptyTotals());
  const [takeCount, setTakeCount] = useState(50);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolRemaining, setPoolRemaining] = useState(0);
  const [poolSent, setPoolSent] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmAsk | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const repeatSet = useMemo(() => new Set(repeatEmails), [repeatEmails]);
  const pastedCount = recipients.filter((row) => repeatSet.has(row.email)).length;

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
    const camp = (await campRes.json().catch(() => ({}))) as {
      campaigns?: Campaign[];
      totals?: MailTotals;
    };
    setCampaigns(camp.campaigns || []);
    setTotals(camp.totals || emptyTotals());
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

  useEffect(() => {
    if (!confirm) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  function markRepeat(emails: string[]) {
    setRepeatEmails((prev) => {
      const next = new Set(prev);
      for (const email of emails) next.add(normalizeEmail(email));
      return [...next];
    });
  }

  function addList(list: MailRecipient[], skipped = 0) {
    setRecipients((prev) => mergeRecipients([prev, list]));
    setError("");
    setOkMsg(
      skipped
        ? `Se sumaron ${list.length} mails. Se omitieron ${skipped} de la base que ya recibieron una campaña.`
        : `Se sumaron ${list.length} mails.`
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
      return [] as MailRecipient[];
    }
    setBusy(addMore ? "Sumando mails de la base…" : "Tomando mails de la base Norte…");
    setError("");
    setOkMsg("");
    try {
      const keepPasted = addMore
        ? recipients
        : recipients.filter((row) => repeatSet.has(row.email));
      const res = await fetch("/api/crm/mailing/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          exclude: keepPasted.map((row) => row.email),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recipients?: MailRecipient[];
        remaining?: number;
        total?: number;
        sent?: number;
        exhausted?: boolean;
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo extraer de la base");
      const list = data.recipients || [];
      const next = mergeRecipients([keepPasted, list]);
      setRecipients(next);
      setPoolRemaining(Number(data.remaining) || 0);
      setPoolTotal(Number(data.total) || 0);
      setPoolSent(Number(data.sent) || 0);
      if (!list.length && !keepPasted.length) {
        setError("No quedan mails nuevos en la base Norte.");
        return [];
      }
      setOkMsg(
        data.exhausted
          ? `Se tomaron ${list.length} mails nuevos (no había ${count} sin enviar).`
          : `Se tomaron ${list.length} mails de la base Norte que todavía no recibieron ninguna campaña.`
      );
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al tomar la base Norte");
      return [];
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
      if (!kept.length) {
        setError(
          skipped
            ? "Todos los mails del archivo ya recibieron una campaña. Pegá a mano los que quieras reenviar."
            : "El archivo no tenía mails válidos."
        );
        return;
      }
      addList(kept, skipped);
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
      setOkMsg("");
      return;
    }
    const before = recipients.length;
    const next = mergeRecipients([recipients, list]);
    const added = next.length - before;
    markRepeat(list.map((row) => row.email));
    setRecipients(next);
    setPaste("");
    setError("");
    if (!added) {
      setOkMsg("Esos mails ya estaban en la lista. Se pueden reenviar en esta y en otras campañas.");
      return;
    }
    setOkMsg(
      `Se sumaron ${added} mails pegados. Estos se pueden repetir en otras campañas.`
    );
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
      if (!kept.length) {
        setError(
          skipped
            ? "Los mails del CRM ya recibieron una campaña. Pegá a mano los que quieras reenviar."
            : "No hay mails en el CRM."
        );
        return;
      }
      addList(kept, skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el CRM");
    } finally {
      setBusy("");
    }
  }

  async function sendList(list: MailRecipient[], test: boolean) {
    if (!subject.trim() || !title.trim() || !body.trim()) {
      setError("Completá asunto, título y cuerpo del mail.");
      return;
    }
    if (!test && !list.length) {
      setError("Cargá destinatarios antes de enviar.");
      return;
    }

    const payload = {
      subject,
      preheader,
      title,
      body,
      ctaLabel,
      ctaUrl,
      templateId: presetId,
      recipients: list,
      testEmail: test ? testEmail : "",
      allowRepeat: test ? [] : repeatEmails,
    };

    if (test) {
      setBusy("Enviando prueba…");
      setError("");
      setOkMsg("");
      try {
        const res = await fetch("/api/crm/mailing/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo enviar");
        setOkMsg(`Prueba enviada a ${testEmail}.`);
        await loadMeta();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de envío");
      } finally {
        setBusy("");
      }
      return;
    }

    setBusy("Abriendo la campaña…");
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/crm/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        campaignId?: string;
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo enviar");
      if (!data.campaignId) throw new Error("No se creó la campaña.");
      push(`/crm/mailing/${data.campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de envío");
      setBusy("");
    }
  }

  function startCampaign() {
    if (!subject.trim() || !title.trim() || !body.trim()) {
      setError("Completá asunto, título y cuerpo del mail.");
      return;
    }
    const count = Math.max(1, Math.min(2000, Math.floor(takeCount) || 0));
    if (!recipients.length) {
      setConfirm({
        takeFromPool: true,
        count,
        title: "Iniciar campaña",
        description: `Se toman ${fmt(count)} mails nuevos de la base Norte y se envían ahora.`,
      });
      return;
    }
    setConfirm({
      takeFromPool: false,
      count: recipients.length,
      title: "Enviar campaña",
      description: `Se envía “${subject}” a ${fmt(recipients.length)} destinatarios.`,
    });
  }

  function sendCurrent() {
    if (!recipients.length) {
      setError("Cargá destinatarios antes de enviar.");
      return;
    }
    setConfirm({
      takeFromPool: false,
      count: recipients.length,
      title: "Enviar campaña",
      description: `Se envía “${subject}” a ${fmt(recipients.length)} destinatarios.`,
    });
  }

  async function acceptConfirm() {
    if (!confirm) return;
    const take = confirm.takeFromPool;
    setConfirm(null);
    if (take) {
      const list = await takeFromPool(false);
      if (!list.length) return;
      await sendList(list, false);
      return;
    }
    await sendList(recipients, false);
  }

  const sending = Boolean(busy);

  return (
    <div className="mail-studio">
      {brevoOk === false ? (
        <div className="mail-alert mail-alert--warn">{brevoError}</div>
      ) : null}

      <section className="mail-hero">
        <div className="mail-stat">
          <span>Base Norte</span>
          <strong>{fmt(poolTotal)}</strong>
        </div>
        <div className="mail-stat">
          <span>Ya recibieron</span>
          <strong>{fmt(poolSent)}</strong>
        </div>
        <div className="mail-stat mail-stat--ok">
          <span>Disponibles</span>
          <strong>{fmt(poolRemaining)}</strong>
        </div>
        <div className="mail-stat mail-stat--now">
          <span>Lote actual</span>
          <strong>{fmt(recipients.length)}</strong>
        </div>
      </section>

      <MailingCharts totals={totals} />

      <div className="mail-workspace">
        <div className="mail-stack">
          <section className="mail-card">
            <div className="mail-card__head">
              <p className="mail-kicker">Audiencia</p>
              <h2>Armá el lote</h2>
              <p>Norte no se reenvía. Los mails pegados sí se pueden repetir.</p>
            </div>
            <div className="mail-take">
              <label>
                <span>Mails de Norte</span>
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
                className="crm-btn crm-btn-primary mail-btn-lg"
                disabled={sending}
                onClick={startCampaign}
              >
                {sending ? busy : "Iniciar campaña"}
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-ghost"
                disabled={sending}
                onClick={() => void takeFromPool(true)}
              >
                Sumar más
              </button>
            </div>
            <div className="mail-tools">
              <label className="crm-btn crm-btn-ghost cursor-pointer">
                Excel / CSV
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
              <button type="button" className="crm-btn crm-btn-ghost" disabled={sending} onClick={() => void addFromCrm()}>
                Del CRM
              </button>
              {recipients.length ? (
                <button
                  type="button"
                  className="crm-btn crm-btn-ghost"
                  onClick={() => {
                    setRecipients([]);
                    setRepeatEmails([]);
                    setOkMsg("Lista vacía.");
                  }}
                >
                  Vaciar
                </button>
              ) : null}
            </div>
            <label className="mail-paste">
              <span>Pegar mails</span>
              <textarea
                className="crm-input"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"uno@mail.com\nMaría, maria@mail.com"}
              />
            </label>
            <button type="button" className="crm-btn crm-btn-primary" disabled={sending} onClick={addPasted}>
              Sumar pegados
            </button>
            {pastedCount ? (
              <p className="mail-hint">
                {pastedCount} {pastedCount === 1 ? "mail pegado" : "mails pegados"} se pueden reenviar.
              </p>
            ) : null}
            {recipients.length ? (
              <div className="mail-table-wrap">
                <table className="mail-table">
                  <thead>
                    <tr>
                      <th>Mail</th>
                      <th>Nombre</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.slice(0, 80).map((row) => (
                      <tr key={row.email}>
                        <td>
                          {row.email}
                          {repeatSet.has(row.email) ? <em>pegado</em> : null}
                        </td>
                        <td>{row.name || "—"}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setRecipients((prev) => prev.filter((item) => item.email !== row.email));
                              setRepeatEmails((prev) => prev.filter((email) => email !== row.email));
                            }}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recipients.length > 80 ? (
                  <p className="mail-hint">…y {recipients.length - 80} más</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="mail-card">
            <p className="mail-kicker">Plantilla</p>
            <div className="mail-presets">
              {MAIL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={presetId === preset.id ? "is-on" : ""}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="mail-field">
              <span>Asunto</span>
              <input className="crm-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="mail-field">
              <span>Preheader</span>
              <input className="crm-input" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
            </label>
            <label className="mail-field">
              <span>Título</span>
              <input className="crm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="mail-field">
              <span>Cuerpo</span>
              <textarea className="crm-input min-h-40" value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <div className="mail-cta-row">
              <label className="mail-field">
                <span>Botón</span>
                <input className="crm-input" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
              </label>
              <label className="mail-field">
                <span>Link</span>
                <input className="crm-input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="mail-sendbar">
            <div>
              <p className="mail-kicker">Envío</p>
              <p className="mail-sender">{senderLabel}</p>
            </div>
            <div className="mail-take">
              <label>
                <span>Prueba</span>
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
                disabled={sending || !testEmail}
                onClick={() => void sendList(recipients, true)}
              >
                Enviar prueba
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-primary mail-btn-lg"
                disabled={sending || !recipients.length}
                onClick={sendCurrent}
              >
                Enviar ({recipients.length || 0})
              </button>
            </div>
            {busy ? <p className="mail-hint">{busy}</p> : null}
            {error ? <p className="mail-alert mail-alert--error">{error}</p> : null}
            {okMsg ? <p className="mail-alert mail-alert--ok">{okMsg}</p> : null}
          </section>
        </div>

        <section className="mail-card mail-preview">
          <p className="mail-kicker">Vista previa</p>
          <iframe title="Vista previa del mail" sandbox="allow-same-origin" srcDoc={previewHtml} />
        </section>
      </div>

      {campaigns.length ? (
        <section className="mail-card">
          <p className="mail-kicker">Historial</p>
          <ul className="mail-history">
            {campaigns.map((item) => (
              <li key={item.id}>
                <Link href={`/crm/mailing/${item.id}`}>
                  <div>
                    <p>{item.subject}</p>
                    <span>{new Date(item.created_at).toLocaleString("es-AR")}</span>
                  </div>
                  <p>
                    {item.status === "sending" ? "Enviando · " : ""}
                    {item.stats?.sent ?? item.sent_count} enviados · {item.stats?.delivered ?? 0} entregados
                    · {item.stats?.opened ?? 0} abrieron · {item.stats?.clicked ?? 0} clics
                    {item.stats?.bounced ? ` · ${item.stats.bounced} rebotes` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {confirm ? (
        <div className="mail-dialog" role="presentation" onClick={() => setConfirm(null)}>
          <div
            className="mail-dialog__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mail-confirm-title"
            aria-describedby="mail-confirm-copy"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mail-kicker">Confirmar envío</p>
            <h2 id="mail-confirm-title">{confirm.title}</h2>
            <p id="mail-confirm-copy" className="mail-dialog__copy">
              {confirm.description} El progreso se ve en la ficha de la campaña.
            </p>
            <p className="mail-dialog__count">
              {fmt(confirm.count)}
              <span>{confirm.takeFromPool ? "mails a tomar" : "destinatarios"}</span>
            </p>
            <div className="mail-dialog__actions">
              <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="crm-btn crm-btn-primary"
                onClick={() => void acceptConfirm()}
              >
                Enviar ahora
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
