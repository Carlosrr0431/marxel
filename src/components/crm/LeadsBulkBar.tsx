"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { bulkUpdateLeadEstado } from "@/lib/crm/actions";
import type { LeadEstado } from "@/lib/crm/types";
import { LEAD_ESTADOS } from "@/lib/crm/types";

export function LeadsBulkBar({
  children,
  leads,
}: {
  children: ReactNode;
  leads: { id: string; nombre: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [estado, setEstado] = useState<LeadEstado>("contactado");

  useEffect(() => {
    const form = document.getElementById("bulk-form");
    if (!form) return;
    const sync = () => {
      const boxes = document.querySelectorAll<HTMLInputElement>(".lead-check:checked");
      setSelected(Array.from(boxes).map((b) => b.value));
    };
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, [leads]);

  return (
    <div>
      <form id="bulk-form" className="hidden" />
      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-teal/30 bg-aqua/60 px-4 py-3">
          <p className="text-sm font-semibold text-navy">
            {selected.length} seleccionados
          </p>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as LeadEstado)}
            className="crm-input max-w-[180px]"
          >
            {LEAD_ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            className="crm-btn crm-btn-primary"
            onClick={() =>
              start(async () => {
                await bulkUpdateLeadEstado(selected, estado);
                setSelected([]);
                document
                  .querySelectorAll<HTMLInputElement>(".lead-check:checked")
                  .forEach((b) => {
                    b.checked = false;
                  });
              })
            }
          >
            Aplicar estado
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
