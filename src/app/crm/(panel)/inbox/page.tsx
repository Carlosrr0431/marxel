import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Lead, Seguimiento } from "@/lib/crm/types";
import { MODALIDADES } from "@/lib/crm/types";
import { PageHeader, Avatar, EmptyState, ProductoPill, ChatbotBadge } from "@/components/crm/ui";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
import { WhatsAppLogLink } from "@/components/crm/LeadQuickActions";
import { formatDate } from "@/lib/crm/types";
import { relativeTime, prioridadColor } from "@/lib/crm/utils";
import {
  briefSummary,
  chatbotWhatsAppText,
  isChatbotLead,
  parseChatbotNotas,
} from "@/lib/crm/chatbot-brief";

function modalidadLabel(value: string) {
  return MODALIDADES.find((m) => m.value === value)?.label || value;
}

export default async function InboxPage() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: overdueSegs }, { data: nuevos }, { data: chatbotLeads }, { data: hotByScore }, { data: hotByChat }] =
    await Promise.all([
      supabase
        .from("seguimientos")
        .select("*, leads(id,nombre,celular), afiliados(id,nombre,celular)")
        .eq("estado", "pendiente")
        .lte("programado_para", now)
        .order("programado_para", { ascending: true })
        .limit(30),
      supabase
        .from("leads")
        .select("*")
        .eq("estado", "nuevo")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("leads")
        .select("*")
        .eq("origen_detalle", "chatbot")
        .gte("created_at", since)
        .not("estado", "in", "(ganado,perdido)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("leads")
        .select("*")
        .gte("puntaje", 60)
        .not("estado", "in", "(ganado,perdido)")
        .order("puntaje", { ascending: false })
        .limit(10),
      supabase
        .from("leads")
        .select("*")
        .contains("tags", ["caliente"])
        .not("estado", "in", "(ganado,perdido)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const chatbot = (chatbotLeads || []) as Lead[];
  const newLeads = ((nuevos || []) as Lead[]).filter((l) => !isChatbotLead(l));

  const hotMap = new Map<string, Lead>();
  for (const l of [...(hotByScore || []), ...(hotByChat || [])] as Lead[]) {
    hotMap.set(l.id, l);
  }
  const hotLeads = Array.from(hotMap.values()).slice(0, 10);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Foco"
        title="Inbox del día"
        description="Chatbot listos para cotizar, vencidos y oportunidades calientes."
        actions={
          <Link href="/crm/leads?origen=chatbot" className="crm-btn crm-btn-ghost">
            Ver cola chatbot
          </Link>
        }
      />

      <section className="crm-card overflow-hidden border-cta/20">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line/80 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_60%)] px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cta)]">
              Chatbot · listos para cotizar
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-navy">
              Última semana
            </h2>
          </div>
          <span className="crm-badge bg-indigo-100 text-indigo-800">
            {chatbot.length} abiertos
          </span>
        </div>
        {chatbot.length ? (
          <ul className="divide-y divide-line/70">
            {chatbot.map((l) => {
              const fields = parseChatbotNotas(l.notas_iniciales);
              const summary = briefSummary(fields);
              const wa = chatbotWhatsAppText(l, fields);
              return (
                <li key={l.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={l.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/crm/leads/${l.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        {l.nombre}
                      </Link>
                      <ProductoPill producto={l.producto} />
                      {l.localidad ? (
                        <span className="text-[11px] text-muted">{l.localidad}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {summary || l.plan_interes || l.producto}
                      {l.modalidad && l.modalidad !== "sin_definir"
                        ? ` · ${modalidadLabel(l.modalidad)}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {relativeTime(l.created_at)}
                    </p>
                  </div>
                  <WhatsAppLogLink
                    leadId={l.id}
                    celular={l.celular}
                    text={wa}
                    className="shrink-0 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    WA
                  </WhatsAppLogLink>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-muted">
            No hay leads del chatbot abiertos esta semana.
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-navy">
            Seguimientos vencidos
          </h2>
          {(overdueSegs as Seguimiento[] | null)?.length ? (
            (overdueSegs as Seguimiento[]).map((s) => {
              const persona = s.leads || s.afiliados;
              return (
                <article key={s.id} className="crm-card border-rose-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <Avatar name={persona?.nombre || "?"} />
                      <div>
                        <p className="font-semibold text-navy">{s.titulo}</p>
                        <p className="text-sm text-muted">
                          {persona?.nombre} · {formatDate(s.programado_para)}
                        </p>
                        {s.descripcion ? (
                          <p className="mt-1 text-xs text-muted">{s.descripcion}</p>
                        ) : null}
                      </div>
                    </div>
                    <SeguimientoActions
                      id={s.id}
                      leadId={s.lead_id}
                      afiliadoId={s.afiliado_id}
                      celular={persona?.celular}
                      nombre={persona?.nombre}
                      showSnooze
                    />
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              title="Inbox limpio"
              description="No hay seguimientos vencidos. Buen trabajo."
            />
          )}
        </section>

        <div className="space-y-5">
          <section className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Leads nuevos</h2>
            <p className="mt-1 text-xs text-muted">Entraron por web o carga manual</p>
            <ul className="mt-4 space-y-3">
              {newLeads.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <Avatar name={l.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold text-navy hover:underline">
                      {l.nombre}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {l.plan_interes || l.producto} · {relativeTime(l.created_at)}
                    </p>
                  </div>
                  <WhatsAppLogLink
                    leadId={l.id}
                    celular={l.celular}
                    text={`Hola ${l.nombre.split(" ")[0] || l.nombre}, te escribo de MARXEN. Recibimos tu consulta. ¿Seguimos?`}
                    className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    WA
                  </WhatsAppLogLink>
                </li>
              ))}
              {!newLeads.length ? (
                <li className="text-sm text-muted">Sin leads nuevos.</li>
              ) : null}
            </ul>
          </section>

          <section className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              Oportunidades calientes
            </h2>
            <p className="mt-1 text-xs text-muted">Score ≥ 60 o tag caliente</p>
            <ul className="mt-4 space-y-3">
              {hotLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/crm/leads/${l.id}`} className="font-medium text-navy hover:underline">
                        {l.nombre}
                      </Link>
                      {isChatbotLead(l) ? <ChatbotBadge /> : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                      {briefSummary(parseChatbotNotas(l.notas_iniciales)) ||
                        l.plan_interes ||
                        l.producto}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`crm-badge ${prioridadColor(l.prioridad)}`}>
                      {l.prioridad}
                    </span>
                    <span className="font-display text-sm font-bold text-teal">
                      {l.puntaje || 0}
                    </span>
                  </div>
                </li>
              ))}
              {!hotLeads.length ? (
                <li className="text-sm text-muted">Todavía no hay leads calientes.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
