import type { Lead } from "@/lib/crm/types";
import {
  briefSummary,
  chatbotWhatsAppText,
  parseChatbotNotas,
  qualificationGaps,
} from "@/lib/crm/chatbot-brief";
import { CopyTextButton } from "@/components/crm/CopyTextButton";
import { WhatsAppLogLink } from "@/components/crm/LeadQuickActions";

export function ChatbotBriefCard({
  lead,
  compact = false,
}: {
  lead: Lead;
  compact?: boolean;
}) {
  const fields = parseChatbotNotas(lead.notas_iniciales);
  if (!fields.length && !lead.notas_iniciales) return null;

  const wa = chatbotWhatsAppText(lead, fields);
  const gaps = qualificationGaps(lead, fields);
  const ready = gaps.length === 0;
  const summary = briefSummary(fields);

  if (compact) {
    return (
      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
        {summary || lead.plan_interes || lead.producto}
      </p>
    );
  }

  return (
    <section className="crm-card overflow-hidden border-cta/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_55%)] px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cta)]">
            Ficha del chatbot
          </p>
          <p className="mt-1 text-sm text-muted">
            {ready
              ? "Datos listos para cotizar y contactar."
              : `Faltan: ${gaps.join(", ")}.`}
          </p>
        </div>
        <span
          className={`crm-badge ${
            ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {ready ? "Listo para cotizar" : "Incompleto"}
        </span>
      </div>

      {fields.length ? (
        <dl className="grid gap-px bg-line/60 sm:grid-cols-2">
          {fields
            .filter((f) => f.key !== "Estado")
            .map((f) => (
              <div key={f.key} className="bg-white px-5 py-3">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {f.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-navy">{f.value}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <pre className="whitespace-pre-wrap px-5 py-4 font-sans text-sm text-navy">
          {lead.notas_iniciales}
        </pre>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line/80 px-5 py-4">
        <WhatsAppLogLink
          leadId={lead.id}
          celular={lead.celular}
          text={wa}
          className="crm-btn bg-[#25D366] text-white"
        >
          WhatsApp con contexto
        </WhatsAppLogLink>
        <CopyTextButton
          text={fields.map((f) => `${f.label}: ${f.value}`).join("\n") || lead.notas_iniciales || ""}
        />
      </div>
    </section>
  );
}
