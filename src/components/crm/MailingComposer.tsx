"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAIL_PRESETS, buildMailHtml, greetingFor } from "@/lib/mailing/templates";
import {
  mergeRecipients,
  normalizeEmail,
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

type SendProgress = {
  open: boolean;
  phase: "preparing" | "sending" | "done" | "error";
  sent: number;
  total: number;
  current: string;
  error: string;
  campaignId: string;
};

const firstPreset = MAIL_PRESETS[0];
const emptyProgress: SendProgress = {
  open: false,
  phase: "preparing",
  sent: 0,
  total: 0,
  current: "",
  error: "",
  campaignId: "",
};

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
  const [takeCount, setTakeCount] = useState(50);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolRemaining, setPoolRemaining] = useState(0);
  const [poolSent, setPoolSent] = useState(0);
  const [progress, setProgress] = useState<SendProgress>(emptyProgress);

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
      stream: !test,
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

    setBusy("Enviando campaña…");
    setError("");
    setOkMsg("");
    setProgress({
      open: true,
      phase: "preparing",
      sent: 0,
      total: list.length,
      current: "",
      error: "",
      campaignId: "",
    });

    try {
      const res = await fetch("/api/crm/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("ndjson")) {
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        throw new Error(data.error || "No se pudo enviar");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No se pudo leer el progreso del envío.");
      const decoder = new TextDecoder();
      let buffer = "";
      let last: { type?: string; sent?: number; total?: number; campaignId?: string; error?: string; current?: string } =
        {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as typeof last;
          last = event;
          if (event.type === "start" || event.type === "progress") {
            setProgress((prev) => ({
              ...prev,
              phase: "sending",
              sent: Number(event.sent) || prev.sent,
              total: Number(event.total) || prev.total,
              current: String(event.current || prev.current),
              campaignId: String(event.campaignId || prev.campaignId),
            }));
          } else if (event.type === "done") {
            setProgress((prev) => ({
              ...prev,
              phase: "done",
              sent: Number(event.sent) || prev.sent,
              total: Number(event.total) || prev.total,
              campaignId: String(event.campaignId || prev.campaignId),
            }));
          } else if (event.type === "error") {
            throw new Error(event.error || "No se pudo enviar");
          }
        }
      }

      if (last.type === "error") throw new Error(last.error || "No se pudo enviar");
      const campaignId = String(last.campaignId || "");
      setOkMsg(`Campaña enviada a ${last.sent || list.length} destinatarios.`);
      await loadMeta();
      if (campaignId) {
        window.setTimeout(() => {
          push(`/crm/mailing/${campaignId}`);
        }, 1200);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de envío";
      setError(message);
      setProgress((prev) => ({ ...prev, phase: "error", error: message }));
    } finally {
      setBusy("");
    }
  }

  async function startCampaign() {
    if (!subject.trim() || !title.trim() || !body.trim()) {
      setError("Completá asunto, título y cuerpo del mail.");
      return;
    }
    const count = Math.max(1, Math.min(2000, Math.floor(takeCount) || 0));
    let list = recipients;
    if (!list.length) {
      if (!window.confirm(`¿Tomar ${count} mails nuevos de la base Norte y enviar ahora?`)) {
        return;
      }
      list = await takeFromPool(false);
      if (!list.length) return;
    } else if (!window.confirm(`¿Enviar ahora a ${list.length} destinatarios?`)) {
      return;
    }
    await sendList(list, false);
  }

  function sendCurrent() {
    if (!recipients.length) {
      setError("Cargá destinatarios antes de enviar.");
      return;
    }
    if (!window.confirm(`¿Enviar “${subject}” a ${recipients.length} destinatarios?`)) return;
    void sendList(recipients, false);
  }

  const percent = progress.total ? Math.min(100, Math.round((progress.sent / progress.total) * 100)) : 0;
  const sending = Boolean(busy) || progress.open;

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
          <span>En esta campaña</span>
          <strong>{fmt(recipients.length)}</strong>
        </div>
      </section>

      <section className="mail-card">
        <div className="mail-card__head">
          <div>
            <p className="mail-kicker">Audiencia</p>
            <h2>Armá el lote y envialo</h2>
            <p>
              La base Norte saltea a quienes ya recibieron una campaña real. Los mails pegados a mano
              se pueden repetir.
            </p>
          </div>
        </div>

        <div className="mail-take">
          <label>
            <span>Mails a tomar de Norte</span>
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
            onClick={() => void startCampaign()}
          >
            Iniciar campaña
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-ghost"
            disabled={sending}
            onClick={() => void takeFromPool(true)}
          >
            Sumar más mails
          </button>
        </div>

        <div className="mail-tools">
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
          <button type="button" className="crm-btn crm-btn-ghost" disabled={sending} onClick={() => void addFromCrm()}>
            Sumar mails del CRM
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
              Vaciar lista
            </button>
          ) : null}
        </div>

        <label className="mail-paste">
          <span>Sumar mails a mano</span>
          <textarea
            className="crm-input"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"uno@mail.com\nMaría, maria@mail.com"}
          />
        </label>
        <button type="button" className="crm-btn crm-btn-primary" disabled={sending} onClick={addPasted}>
          Sumar mails pegados
        </button>
        {pastedCount ? (
          <p className="mail-hint">
            {pastedCount} {pastedCount === 1 ? "mail pegado" : "mails pegados"} se pueden reenviar en
            otra campaña.
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

      <div className="mail-grid">
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
              <span>Link del botón</span>
              <input className="crm-input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="mail-card mail-preview">
          <p className="mail-kicker">Vista previa</p>
          <iframe title="Vista previa del mail" sandbox="allow-same-origin" srcDoc={previewHtml} />
        </section>
      </div>

      <section className="mail-card mail-send">
        <div>
          <p className="mail-kicker">Envío con Brevo</p>
          <p className="mail-sender">Remitente: {senderLabel}</p>
        </div>
        <div className="mail-take">
          <label>
            <span>Mail de prueba</span>
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
            Enviar campaña ({recipients.length || 0})
          </button>
        </div>
        {busy && !progress.open ? <p className="mail-hint">{busy}</p> : null}
        {error ? <p className="mail-alert mail-alert--error">{error}</p> : null}
        {okMsg ? <p className="mail-alert mail-alert--ok">{okMsg}</p> : null}
      </section>

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

      {progress.open ? (
        <div className="mail-overlay" role="alertdialog" aria-live="polite" aria-label="Progreso de envío">
          <div className="mail-overlay__card">
            <p className="mail-kicker mail-kicker--light">
              {progress.phase === "preparing"
                ? "Preparando"
                : progress.phase === "sending"
                  ? "Enviando"
                  : progress.phase === "done"
                    ? "Listo"
                    : "Error"}
            </p>
            <div
              className="mail-ring"
              style={{ background: `conic-gradient(#5fc4e5 ${percent}%, rgba(255,255,255,0.12) 0)` }}
            >
              <div>
                <strong>
                  {progress.sent}
                  <small>/{progress.total || 0}</small>
                </strong>
                <span>mails enviados</span>
              </div>
            </div>
            <div className="mail-overlay__bar">
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="mail-overlay__status">
              {progress.phase === "preparing"
                ? "Armando la campaña en Brevo…"
                : progress.phase === "sending"
                  ? progress.current
                    ? `Enviando a ${progress.current}`
                    : "Enviando lotes…"
                  : progress.phase === "done"
                    ? "Campaña enviada. Abriendo el detalle…"
                    : progress.error}
            </p>
            {progress.phase === "error" ? (
              <button type="button" className="crm-btn crm-btn-primary" onClick={() => setProgress(emptyProgress)}>
                Cerrar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
