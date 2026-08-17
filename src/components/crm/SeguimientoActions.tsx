"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  completeSeguimiento,
  cancelSeguimiento,
  logWhatsApp,
  snoozeSeguimiento,
} from "@/lib/crm/actions";
import { whatsappLink } from "@/lib/crm/types";

export function SeguimientoActions({
  id,
  leadId,
  afiliadoId,
  celular,
  nombre,
  showSnooze,
}: {
  id: string;
  leadId?: string | null;
  afiliadoId?: string | null;
  celular?: string | null;
  nombre?: string | null;
  showSnooze?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {celular ? (
        <Link
          href={whatsappLink(
            celular,
            `Hola ${nombre || ""}, te escribo de MARXEN para seguir con tu cotización.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => start(async () => logWhatsApp(leadId || null, afiliadoId || null))}
          className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          WhatsApp
        </Link>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => completeSeguimiento(id))}
        className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Hecho
      </button>
      {showSnooze ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => snoozeSeguimiento(id, 24))}
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-navy"
        >
          +24h
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => cancelSeguimiento(id))}
        className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted"
      >
        Cancelar
      </button>
    </div>
  );
}
