"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { COVER_ROWS } from "@/lib/plan-covers";
import { site } from "@/lib/content";

export type ComparePlan = {
  key: string;
  company: string;
  logo: string;
  title: string;
  monthly: number;
  covers?: Record<string, string> | null;
};

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(value: number) {
  return value > 0 ? `$ ${moneyFmt.format(value)}` : "Consultar";
}

function mark(value: string | undefined) {
  if (!value || value === "no") return { kind: "no" as const, text: "No cubre" };
  if (value === "si") return { kind: "si" as const, text: "Cubre" };
  return { kind: "note" as const, text: value };
}

function PlanHead({
  plan,
  onPick,
  picked,
  onTogglePdf,
}: {
  plan: ComparePlan;
  onPick?: (plan: ComparePlan) => void;
  picked?: boolean;
  onTogglePdf?: (key: string) => void;
}) {
  return (
    <div className="quote-compare__plan">
      {onTogglePdf ? (
        <label className="quote-compare__pick">
          <input type="checkbox" checked={Boolean(picked)} onChange={() => onTogglePdf(plan.key)} />
          Incluir
        </label>
      ) : null}
      <img src={plan.logo} alt="" />
      <span>{plan.company}</span>
      <strong>{plan.title}</strong>
      <b>{money(plan.monthly)}</b>
      <small>por mes</small>
      {onPick ? (
        <button type="button" className="quote-compare__emit" onClick={() => onPick(plan)}>
          Emitir
        </button>
      ) : null}
    </div>
  );
}

function WhatsAppAsk() {
  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, tengo una duda sobre la cotización del auto."
  )}`;
  return (
    <a className="quote-compare__wa" href={href} target="_blank" rel="noopener noreferrer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.5 3.5A11 11 0 0 0 2.4 17.1L1.5 22l5-1.3A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 21Zm5-6.6c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5c.1-.2.1-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4s-1 1-1 2.4 1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.3.7 3.1.6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3s-.3-.2-.6-.3Z" />
      </svg>
      Consultar
    </a>
  );
}

export function QuoteCompareTable({
  plans,
  focusKey = "",
  onPick,
  pickedKeys,
  onTogglePdf,
}: {
  plans: ComparePlan[];
  focusKey?: string;
  onPick?: (plan: ComparePlan) => void;
  pickedKeys?: string[];
  onTogglePdf?: (key: string) => void;
}) {
  return (
    <div className="quote-compare__scroll">
      <table className="quote-compare__table">
        <thead>
          <tr>
            <th>Cobertura</th>
            {plans.map((plan) => (
              <th key={plan.key} className={plan.key === focusKey ? "is-focus" : undefined}>
                <PlanHead
                  plan={plan}
                  onPick={onPick}
                  picked={pickedKeys?.includes(plan.key)}
                  onTogglePdf={onTogglePdf}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COVER_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {plans.map((plan) => {
                const item = mark(plan.covers?.[row.key]);
                return (
                  <td key={plan.key} className={plan.key === focusKey ? "is-focus" : undefined}>
                    <span className={`quote-compare__mark is-${item.kind}`}>{item.text}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuoteCompare({
  plans,
  focusKey,
  onClose,
  embedded = false,
  onPick,
  notices = [],
  whatsapp = false,
  pickedKeys,
  onTogglePdf,
}: {
  plans: ComparePlan[];
  focusKey: string;
  onClose: () => void;
  embedded?: boolean;
  onPick?: (plan: ComparePlan) => void;
  notices?: string[];
  whatsapp?: boolean;
  pickedKeys?: string[];
  onTogglePdf?: (key: string) => void;
}) {
  useEffect(() => {
    if (embedded) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [embedded, onClose]);

  const table = (
    <QuoteCompareTable
      plans={plans}
      focusKey={focusKey}
      onPick={onPick}
      pickedKeys={pickedKeys}
      onTogglePdf={onTogglePdf}
    />
  );

  if (embedded) {
    return (
      <section className="quote-compare quote-compare--inline" aria-label="Comparación de coberturas">
        {table}
      </section>
    );
  }

  return createPortal(
    <div className="quote-compare" role="presentation" onClick={onClose}>
      <div
        className="quote-compare__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-compare-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="quote-compare__head">
          <div>
            <p className="quote-compare__kicker">Coberturas</p>
            <h2 id="quote-compare-title">Qué incluye cada plan</h2>
          </div>
          <div className="quote-compare__actions">
            {whatsapp ? <WhatsAppAsk /> : null}
            <button type="button" className="quote-compare__close" onClick={onClose} aria-label="Cerrar">
              Cerrar
            </button>
          </div>
        </header>
        {notices.map((notice) => (
          <p key={notice} className="quote-alert">{notice}</p>
        ))}
        {table}
      </div>
    </div>,
    document.body
  );
}
