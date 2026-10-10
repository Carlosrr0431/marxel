"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { COVER_ROWS } from "@/lib/plan-covers";

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

function PlanHead({ plan, onPick }: { plan: ComparePlan; onPick?: (plan: ComparePlan) => void }) {
  const body = (
    <>
      <img src={plan.logo} alt="" />
      <span>{plan.company}</span>
      <strong>{plan.title}</strong>
      <b>{money(plan.monthly)}</b>
      <small>por mes</small>
      {onPick ? <em>Emitir</em> : null}
    </>
  );
  if (!onPick) return body;
  return (
    <button type="button" className="quote-compare__pick" onClick={() => onPick(plan)}>
      {body}
    </button>
  );
}

export function QuoteCompareTable({
  plans,
  focusKey = "",
  onPick,
}: {
  plans: ComparePlan[];
  focusKey?: string;
  onPick?: (plan: ComparePlan) => void;
}) {
  return (
    <div className="quote-compare__scroll">
      <table className="quote-compare__table">
        <thead>
          <tr>
            <th>Cobertura</th>
            {plans.map((plan) => (
              <th key={plan.key} className={plan.key === focusKey ? "is-focus" : undefined}>
                <PlanHead plan={plan} onPick={onPick} />
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
}: {
  plans: ComparePlan[];
  focusKey: string;
  onClose: () => void;
  embedded?: boolean;
  onPick?: (plan: ComparePlan) => void;
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

  const table = <QuoteCompareTable plans={plans} focusKey={focusKey} onPick={onPick} />;

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
          <button type="button" className="quote-compare__close" onClick={onClose} aria-label="Cerrar">
            Cerrar
          </button>
        </header>
        {table}
      </div>
    </div>,
    document.body
  );
}
