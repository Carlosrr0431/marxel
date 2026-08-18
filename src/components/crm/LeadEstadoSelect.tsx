"use client";

import { useTransition } from "react";
import { updateLeadEstado } from "@/lib/crm/actions";
import type { LeadEstado } from "@/lib/crm/types";
import { LEAD_ESTADOS } from "@/lib/crm/types";

export function LeadEstadoSelect({
  leadId,
  value,
}: {
  leadId: string;
  value: LeadEstado;
}) {
  const [pending, start] = useTransition();

  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as LeadEstado;
        start(async () => {
          await updateLeadEstado(leadId, next);
        });
      }}
      className="max-w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-sky focus-visible:ring-2 focus-visible:ring-sky/40"
      aria-label="Estado del lead"
    >
      {LEAD_ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  );
}
