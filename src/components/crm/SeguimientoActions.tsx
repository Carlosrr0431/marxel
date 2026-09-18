"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  completeSeguimiento,
  cancelSeguimiento,
  logWhatsApp,
  snoozeSeguimiento,
  activarSeguimientoIA,
} from "@/lib/crm/actions";
import { whatsappLink, googleCalendarLink } from "@/lib/crm/types";

export function SeguimientoActions({
  id,
  leadId,
  afiliadoId,
  celular,
  nombre,
  titulo,
  programadoPara,
  showSnooze,
}: {
  id: string;
  leadId?: string | null;
  afiliadoId?: string | null;
  celular?: string | null;
  nombre?: string | null;
  titulo?: string | null;
  programadoPara?: string | null;
  showSnooze?: boolean;
}) {
  const [pending, start] = useTransition();
  const cleanPhone = celular ? celular.replace(/\D/g, "") : null;

  const calUrl = googleCalendarLink({
    title: `Seguimiento: ${titulo || "Contacto"} - ${nombre || "Cliente"}`,
    startDate: programadoPara || new Date(),
    description: `Seguimiento en Marxen CRM\nContacto: ${nombre || ""}\nTel: ${celular || ""}\nFicha: https://www.marxen.com.ar/crm/${
      leadId ? `leads/${leadId}` : afiliadoId ? `afiliados/${afiliadoId}` : ""
    }`,
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {cleanPhone ? (
        <Link
          href={`/crm/chats?phone=${cleanPhone}`}
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-mist transition"
          title="Abrir chat en CRM"
        >
          Chat CRM
        </Link>
      ) : null}

      {celular ? (
        <Link
          href={whatsappLink(
            celular,
            `Hola ${nombre || ""}, te escribo de MARXEN para seguir con tu consulta.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => start(async () => logWhatsApp(leadId || null, afiliadoId || null))}
          className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 transition"
          title="Abrir en WhatsApp Web o App"
        >
          WhatsApp
        </Link>
      ) : null}

      {celular ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                `¿Activar seguimiento por IA para ${nombre || "este contacto"}? La IA retomará la conversación y responderá automáticamente.`
              )
            ) {
              start(async () => {
                await activarSeguimientoIA(id, leadId, celular);
              });
            }
          }}
          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition disabled:opacity-60"
          title="El Agente IA contacta y retoma la conversación"
        >
          🤖 Por IA
        </button>
      ) : null}

      <a
        href={calUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
        title="Agendar en Google Calendar para el asesor"
      >
        📅 Calendar
      </a>

      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => completeSeguimiento(id))}
        className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 transition disabled:opacity-60"
      >
        Hecho
      </button>

      {showSnooze ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => snoozeSeguimiento(id, 24))}
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-navy hover:bg-mist transition disabled:opacity-60"
          title="Posponer 24 horas"
        >
          +24h
        </button>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => cancelSeguimiento(id))}
        className="rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-muted hover:bg-mist transition disabled:opacity-60"
      >
        Cancelar
      </button>
    </div>
  );
}
