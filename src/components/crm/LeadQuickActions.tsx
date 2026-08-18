"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { logWhatsApp, convertLead } from "@/lib/crm/actions";
import { whatsappLink } from "@/lib/crm/types";

export function WhatsAppLogLink({
  leadId,
  celular,
  text,
  className,
  children,
}: {
  leadId: string;
  celular: string;
  text: string;
  className?: string;
  children: ReactNode;
}) {
  const [, start] = useTransition();
  return (
    <Link
      href={whatsappLink(celular, text)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => start(async () => logWhatsApp(leadId, null, text))}
      className={className}
    >
      {children}
    </Link>
  );
}

export function LeadQuickActions({
  leadId,
  nombre,
  celular,
  estado,
  mensaje,
}: {
  leadId: string;
  nombre: string;
  celular: string;
  estado: string;
  mensaje?: string;
}) {
  const [pending, start] = useTransition();
  const text =
    mensaje ||
    `Hola ${nombre}, te escribo de MARXEN. ¿Seguimos con tu cotización?`;

  return (
    <div className="flex flex-wrap gap-2">
      <WhatsAppLogLink
        leadId={leadId}
        celular={celular}
        text={text}
        className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
      >
        WhatsApp
      </WhatsAppLogLink>
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
