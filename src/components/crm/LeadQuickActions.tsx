"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { logWhatsApp, convertLead } from "@/lib/crm/actions";
import { whatsappLink } from "@/lib/crm/types";
import { OpenCrmChatButton } from "@/components/crm/OpenCrmChatButton";

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
  existing = false,
}: {
  leadId: string;
  nombre: string;
  celular: string;
  estado: string;
  existing?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <OpenCrmChatButton
        leadId={leadId}
        phone={celular}
        name={nombre}
        existing={existing}
        className="px-4 py-2.5 text-sm"
      />
      {estado !== "ganado" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                `¿Confirmás la conversión de ${nombre} a Afiliado? Pasará al padrón de afiliados y se creará su ficha.`
              )
            ) {
              start(async () => convertLead(leadId));
            }
          }}
          className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition"
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
