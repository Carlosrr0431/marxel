import type { MailTotals } from "@/lib/mailing/stats";

const R = 36;
const C = 2 * Math.PI * R;

function fmt(n: number) {
  return n.toLocaleString("es-AR");
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function pctLabel(value: number, total: number) {
  const n = pct(value, total);
  if (!total) return "0%";
  return `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}%`;
}

function Gauge({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "navy" | "teal" | "green";
}) {
  const p = pct(value, total);
  return (
    <div className={`mail-gauge mail-gauge--${tone}`}>
      <div className="mail-gauge__ring">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle className="mail-gauge__track" cx="48" cy="48" r={R} />
          <circle
            className="mail-gauge__value"
            cx="48"
            cy="48"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C - (p / 100) * C}
          />
        </svg>
        <strong>{pctLabel(value, total)}</strong>
      </div>
      <span>{label}</span>
    </div>
  );
}

export function MailingCharts({
  live = false,
  totals,
  kicker = "Resultados",
  title = "Todas las campañas",
  copy,
}: {
  live?: boolean;
  totals: MailTotals;
  kicker?: string;
  title?: string;
  copy?: string;
}) {
  const sent = totals.sent;
  const clicked = Math.min(totals.clicked, totals.opened, totals.delivered, totals.sent);
  const openedOnly = Math.max(0, Math.min(totals.opened, totals.delivered, totals.sent) - clicked);
  const deliveredOnly = Math.max(0, Math.min(totals.delivered, totals.sent) - clicked - openedOnly);
  const rest = Math.max(0, totals.sent - clicked - openedOnly - deliveredOnly);
  const rows = [
    { key: "sent", label: "Enviados", value: totals.sent, tone: "navy" },
    { key: "delivered", label: "Entregados", value: totals.delivered, tone: "teal" },
    { key: "opened", label: "Abrieron", value: totals.opened, tone: "sky" },
    { key: "clicked", label: "Clics", value: totals.clicked, tone: "green" },
  ] as const;

  return (
    <section className="mail-charts">
      <div className="mail-charts__head">
        <div className="mail-charts__title">
          <p className="mail-kicker">{kicker}</p>
          {live ? (
            <span className="mail-charts__live">
              <i />
              En vivo
            </span>
          ) : null}
        </div>
        <h2>{title}</h2>
        <p>
          {copy ||
            (totals.campaigns
              ? `${fmt(totals.campaigns)} campaña${totals.campaigns === 1 ? "" : "s"} real${totals.campaigns === 1 ? "" : "es"}. Pruebas y fallidas no entran.`
              : "Cuando arranques una campaña, acá se arma el embudo del total.")}
        </p>
      </div>

      <div className="mail-mix" aria-hidden={sent === 0}>
        <div className="mail-mix__bar">
          <span className="is-click" style={{ flexGrow: clicked || 0 }} />
          <span className="is-open" style={{ flexGrow: openedOnly || 0 }} />
          <span className="is-in" style={{ flexGrow: deliveredOnly || 0 }} />
          <span className="is-out" style={{ flexGrow: rest || (sent ? 0 : 1) }} />
        </div>
        <div className="mail-mix__legend">
          <span>Clics</span>
          <span>Abrieron</span>
          <span>Entregados</span>
          <span>Sin entrega</span>
        </div>
      </div>

      <div className="mail-charts__grid">
        <div className="mail-funnel" role="img" aria-label="Embudo de envíos, entregas, aperturas y clics">
          {rows.map((row) => (
            <div key={row.key} className="mail-funnel__row">
              <div className="mail-funnel__meta">
                <span>{row.label}</span>
                <strong>{fmt(row.value)}</strong>
                {row.key === "sent" ? null : <em>{pctLabel(row.value, sent)} del total</em>}
              </div>
              <div className="mail-funnel__track">
                <span
                  className={`mail-funnel__fill mail-funnel__fill--${row.tone}`}
                  style={{ width: `${sent ? Math.max(row.value ? 4 : 0, pct(row.value, sent)) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mail-gauges">
          <Gauge label="Entrega" value={totals.delivered} total={sent} tone="navy" />
          <Gauge label="Apertura" value={totals.opened} total={sent} tone="teal" />
          <Gauge label="Clics" value={totals.clicked} total={sent} tone="green" />
        </div>
      </div>

      <p className="mail-charts__foot">
        {fmt(totals.bounced)} rebotes · {fmt(totals.unsubscribed)} bajas
        {totals.complained ? ` · ${fmt(totals.complained)} quejas` : ""}
      </p>
    </section>
  );
}
