"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { eventLabel } from "@/lib/mailing/events";
import type { CampaignStats } from "@/lib/mailing/stats";
import { createClient } from "@/lib/supabase/client";
import { MailingCharts } from "@/components/crm/MailingCharts";

type Recipient = {
  id: string;
  email: string;
  name: string;
  last_event: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_type: string | null;
  unsubscribed_at: string | null;
  complained_at: string | null;
  proxy_opened_at: string | null;
  open_count: number;
  click_count: number;
  last_link: string | null;
};

type MailEvent = {
  id: string;
  email: string;
  event: string;
  link: string | null;
  reason: string | null;
  device: string | null;
  occurred_at: string;
};

type Campaign = {
  id: string;
  created_at: string;
  subject: string;
  title: string | null;
  body: string | null;
  status: string;
  error: string | null;
  sent_count: number;
  recipient_count: number;
};

type Tab = "all" | "opened" | "clicked" | "bounced" | "complaints" | "unsubscribed";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "opened", label: "Abrieron" },
  { id: "clicked", label: "Clics" },
  { id: "bounced", label: "Rebotes" },
  { id: "complaints", label: "Quejas" },
  { id: "unsubscribed", label: "Bajas" },
];

const STATUS: Record<string, string> = {
  sending: "Enviando",
  sent: "Enviada",
  test: "Prueba",
  failed: "Falló",
};

function fmt(n: number) {
  return n.toLocaleString("es-AR");
}

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

export function CampaignDetail({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [events, setEvents] = useState<MailEvent[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);

  const sending = campaign?.status === "sending";

  const load = useCallback(async (first = false) => {
    if (first) setLoading(true);
    try {
      const res = await fetch(`/api/crm/mailing/campaigns/${id}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        campaign?: Campaign;
        stats?: CampaignStats;
        recipients?: Recipient[];
        events?: MailEvent[];
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "No se pudo cargar");
      setCampaign(data.campaign || null);
      setStats(data.stats || null);
      setRecipients(data.recipients || []);
      setEvents(data.events || []);
      setError("");
      setLive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const ms = sending ? 900 : 4000;
    const timer = window.setInterval(() => void load(false), ms);
    const supabase = createClient();
    const channel = supabase
      .channel(`mailing-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mailing_recipients", filter: `campaign_id=eq.${id}` },
        () => void load(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mailing_campaigns", filter: `id=eq.${id}` },
        () => void load(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mailing_events", filter: `campaign_id=eq.${id}` },
        () => void load(false)
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [id, load, sending]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipients.filter((row) => {
      if (tab === "opened" && !row.opened_at) return false;
      if (tab === "clicked" && !row.clicked_at) return false;
      if (tab === "bounced" && !row.bounced_at) return false;
      if (tab === "complaints" && !row.complained_at) return false;
      if (tab === "unsubscribed" && !row.unsubscribed_at) return false;
      if (!q) return true;
      return `${row.email} ${row.name}`.toLowerCase().includes(q);
    });
  }, [recipients, tab, query]);

  const sentNow = recipients.filter((row) => row.last_event !== "queued").length;
  const total = campaign?.recipient_count || recipients.length || 1;
  const progressPct = Math.min(100, Math.round((sentNow / total) * 100));

  if (loading && !campaign) {
    return <p className="mail-hint">Cargando campaña…</p>;
  }
  if (error && !campaign) {
    return <p className="mail-alert mail-alert--error">{error}</p>;
  }
  if (!campaign || !stats) return null;

  return (
    <div className="mail-studio">
      <div className="mail-detail-head">
        <Link href="/crm/mailing" className="mail-back">
          ← Mailing
        </Link>
        <div className="mail-detail-title">
          <h1>{campaign.subject}</h1>
          <p>
            <span className={`mail-chip is-${campaign.status}`}>{STATUS[campaign.status] || campaign.status}</span>
            <span>{when(campaign.created_at)}</span>
            {live ? (
              <span className="mail-charts__live">
                <i />
                En vivo
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {sending ? (
        <section className="mail-live" aria-live="polite">
          <div className="mail-live__top">
            <span className="mail-live__pulse" />
            <p>Enviando campaña</p>
            <strong>
              {fmt(sentNow)}
              <small> / {fmt(total)}</small>
            </strong>
          </div>
          <div className="mail-live__bar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mail-live__copy">
            {sentNow < total
              ? `Ya salieron ${fmt(sentNow)} mails. El resto sigue en cola.`
              : "Cerrando el envío…"}
          </p>
        </section>
      ) : null}

      {campaign.status === "failed" && campaign.error ? (
        <p className="mail-alert mail-alert--error">{campaign.error}</p>
      ) : null}

      <MailingCharts
        live={live}
        totals={{ ...stats, campaigns: 1 }}
        kicker="Rendimiento"
        title="Esta campaña"
        copy="Aperturas, clics y entregas de este envío, en vivo."
      />

      <div className="mail-pills">
        <span>
          Rebotes <b>{fmt(stats.bounced)}</b>
        </span>
        <span>
          Quejas <b>{fmt(stats.complained)}</b>
        </span>
        <span>
          Bajas <b>{fmt(stats.unsubscribed)}</b>
        </span>
        <span>
          Proxy <b>{fmt(stats.proxy)}</b>
        </span>
      </div>

      <section className="mail-card">
        <div className="mail-toolbar">
          <div className="mail-presets">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={tab === item.id ? "is-on" : ""}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            className="crm-input mail-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mail o nombre"
          />
        </div>
        <div className="mail-table-wrap mail-table-wrap--tall">
          <table className="mail-table">
            <thead>
              <tr>
                <th>Destinatario</th>
                <th>Estado</th>
                <th>Abrió</th>
                <th>Clic</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.email}</strong>
                    <span className="mail-sub">{row.name || "—"}</span>
                  </td>
                  <td>
                    <span className={`mail-chip is-${row.last_event}`}>{eventLabel(row.last_event)}</span>
                  </td>
                  <td>{row.opened_at ? `${when(row.opened_at)} · ${row.open_count}x` : "—"}</td>
                  <td>{row.clicked_at ? `${when(row.clicked_at)} · ${row.click_count}x` : "—"}</td>
                  <td>{row.last_link || row.bounce_type || (row.proxy_opened_at ? "proxy" : "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <p className="mail-hint">Nadie en este filtro todavía.</p> : null}
        </div>
      </section>

      <section className="mail-card">
        <p className="mail-kicker">Actividad</p>
        <ul className="mail-activity">
          {events.slice(0, 80).map((item) => (
            <li key={item.id}>
              <i className={`is-${item.event}`} aria-hidden="true" />
              <p>
                <strong>{eventLabel(item.event)}</strong>
                {` · ${item.email}`}
                {item.link ? ` · ${item.link}` : ""}
                {item.reason ? ` · ${item.reason}` : ""}
              </p>
              <span>{when(item.occurred_at)}</span>
            </li>
          ))}
        </ul>
        {!events.length ? (
          <p className="mail-hint">
            {sending ? "Los eventos aparecen a medida que Brevo entrega los mails." : "Todavía no llegaron eventos."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
