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
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-teal">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
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
    <div className="crm-card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-2xl text-teal">
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-teal font-bold text-white ${sizes[size]}`}
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
