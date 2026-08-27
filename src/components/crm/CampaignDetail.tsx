"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { eventLabel } from "@/lib/mailing/events";
import type { CampaignStats } from "@/lib/mailing/stats";

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

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-cloud/70 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
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

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
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
        if (!alive) return;
        setCampaign(data.campaign || null);
        setStats(data.stats || null);
        setRecipients(data.recipients || []);
        setEvents(data.events || []);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [id]);

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

  if (loading && !campaign) {
    return <p className="text-sm text-muted">Cargando campaña…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!campaign || !stats) return null;

  const total = campaign.sent_count || campaign.recipient_count || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/crm/mailing" className="text-sm text-teal hover:underline">
            ← Volver a mailing
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-navy">{campaign.subject}</h1>
          <p className="mt-1 text-sm text-muted">
            {when(campaign.created_at)} · {campaign.status}
            {campaign.error ? ` · ${campaign.error}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Enviados" value={stats.sent} />
        <Stat label="Entregados" value={stats.delivered} hint={pct(stats.delivered, total)} />
        <Stat label="Abrieron" value={stats.opened} hint={pct(stats.opened, total)} />
        <Stat label="Clics" value={stats.clicked} hint={pct(stats.clicked, total)} />
        <Stat label="Rebotes" value={stats.bounced} />
        <Stat label="Quejas" value={stats.complained} />
        <Stat label="Bajas" value={stats.unsubscribed} />
        <Stat label="Proxy" value={stats.proxy} hint="Aperturas de Apple/proxy" />
      </div>

      <section className="crm-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  tab === item.id ? "bg-navy text-white" : "border border-line bg-white text-navy"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            className="crm-input max-w-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mail o nombre"
          />
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th className="px-2 py-2">Destinatario</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Abrió</th>
                <th className="px-2 py-2">Clic</th>
                <th className="px-2 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line/70 align-top">
                  <td className="px-2 py-2">
                    <p className="font-medium text-navy">{row.email}</p>
                    <p className="text-xs text-muted">{row.name || "—"}</p>
                  </td>
                  <td className="px-2 py-2">{eventLabel(row.last_event)}</td>
                  <td className="px-2 py-2">
                    {row.opened_at ? `${when(row.opened_at)} · ${row.open_count}x` : "—"}
                  </td>
                  <td className="px-2 py-2">
                    {row.clicked_at ? `${when(row.clicked_at)} · ${row.click_count}x` : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted">
                    {row.last_link || row.bounce_type || (row.proxy_opened_at ? "proxy" : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <p className="px-2 py-6 text-sm text-muted">Nadie en este filtro todavía.</p>
          ) : null}
        </div>
      </section>

      <section className="crm-card p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Actividad</p>
        <ul className="space-y-2 text-sm">
          {events.slice(0, 80).map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 py-2 last:border-0">
              <span>
                <span className="font-medium text-navy">{eventLabel(item.event)}</span>
                {" · "}
                {item.email}
                {item.link ? ` · ${item.link}` : ""}
                {item.reason ? ` · ${item.reason}` : ""}
              </span>
              <span className="text-muted">{when(item.occurred_at)}</span>
            </li>
          ))}
        </ul>
        {!events.length ? <p className="text-sm text-muted">Todavía no llegaron eventos del webhook.</p> : null}
      </section>
    </div>
  );
}
