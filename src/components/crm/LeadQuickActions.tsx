"use client";

import Link from "next/link";
import { useTransition } from "react";
import { logWhatsApp, convertLead } from "@/lib/crm/actions";
import { whatsappLink } from "@/lib/crm/types";

export function LeadQuickActions({
  leadId,
  nombre,
  celular,
  estado,
}: {
  leadId: string;
  nombre: string;
  celular: string;
  estado: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={whatsappLink(
          celular,
          `Hola ${nombre}, te escribo de Marxel. ¿Seguimos con tu cotización?`
        )}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => start(async () => logWhatsApp(leadId, null))}
        className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
      >
        WhatsApp
      </Link>
      {estado !== "ganado" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => convertLead(leadId))}
          className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Convertir a afiliado
        </button>
      ) : (
        <Link
          href="/crm/afiliados"
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy"
        >
          Ver afiliados
        </Link>
      )}
    </div>
  );
}
