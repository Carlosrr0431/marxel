import Link from "next/link";
import type { ProductoInteres } from "@/lib/crm/types";
import { productoLabel, productoTone } from "@/lib/crm/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-aqua px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[1.6rem] font-bold tracking-tight text-pretty text-navy sm:text-[1.95rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-pretty text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="crm-card flex flex-col items-center border-dashed bg-[linear-gradient(180deg,#ffffff_0%,#fafbfe_100%)] px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f1eef8,#e7f6fb)] text-2xl text-teal shadow-[0_8px_20px_rgba(58,180,217,0.18)]">
        ◌
      </div>
      <p className="font-display text-lg font-semibold text-navy">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="crm-btn crm-btn-primary mt-5">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-teal font-bold text-white shadow-[0_4px_10px_rgba(53,40,114,0.22)] ring-2 ring-white ${sizes[size]}`}
    >
      {initials || "?"}
    </span>
  );
}

export function ProductoPill({ producto }: { producto: ProductoInteres }) {
  return (
    <span className={`crm-badge ${productoTone(producto)}`}>
      {productoLabel(producto)}
    </span>
  );
}

export function ChatbotBadge() {
  return (
    <span className="crm-badge bg-indigo-100 text-indigo-800">Chatbot</span>
  );
}

export function OrigenBadge({ origen, detalle }: { origen?: string; detalle?: string | null }) {
  if (detalle === "whatsapp_directo") {
    return <span className="crm-badge bg-emerald-100 text-emerald-800">WhatsApp Directo</span>;
  }
  if (detalle === "chatbot" || origen === "chatbot") {
    return <span className="crm-badge bg-indigo-100 text-indigo-800">Chatbot</span>;
  }
  if (origen === "whatsapp") {
    return <span className="crm-badge bg-emerald-50 text-emerald-700">WhatsApp</span>;
  }
  if (origen === "web") {
    return <span className="crm-badge bg-sky-100 text-sky-800">Web</span>;
  }
  return null;
}

export function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-teal" : score >= 40 ? "text-blue" : "text-muted";
  return (
    <div className={`flex flex-col items-center ${color}`}>
      <span className="font-display text-2xl font-bold leading-none">{score}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        score
      </span>
    </div>
  );
}
