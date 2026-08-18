"use client";

import { useMemo, useState } from "react";
import { WA_TEMPLATES, fillTemplate } from "@/lib/crm/templates";
import { whatsappLink } from "@/lib/crm/types";
import { PageHeader } from "@/components/crm/ui";

export default function PlantillasPage() {
  const [nombre, setNombre] = useState("María");
  const [interes, setInteres] = useState("consulta de salud");
  const [localidad, setLocalidad] = useState("Salta Capital");
  const [celular, setCelular] = useState("");
  const [filtro, setFiltro] = useState<string>("todas");
  const [copied, setCopied] = useState<string | null>(null);

  const list = useMemo(() => {
    if (filtro === "todas") return WA_TEMPLATES;
    return WA_TEMPLATES.filter((t) => t.categoria === filtro);
  }, [filtro]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Comunicación"
        title="Plantillas WhatsApp"
        description="Mensajes listos para apertura, seguimiento, documentación y cierre."
      />

      <div className="crm-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink">Nombre</span>
          <input className="crm-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink">Interés</span>
          <input className="crm-input" value={interes} onChange={(e) => setInteres(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink">Localidad</span>
          <input className="crm-input" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink">Celular</span>
          <input
            className="crm-input"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="387..."
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["todas", "Todas"],
          ["apertura", "Apertura"],
          ["seguimiento", "Seguimiento"],
          ["documentacion", "Documentación"],
          ["cierre", "Cierre"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              filtro === value ? "bg-navy text-white" : "border border-line bg-white text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => {
          const text = fillTemplate(t.cuerpo, { nombre, interes, localidad });
          return (
            <article key={t.id} className="crm-card crm-card-hover flex flex-col p-5">
              <p className="font-display text-lg font-semibold text-navy">{t.titulo}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-teal">
                {t.categoria}
                {t.producto ? ` · ${t.producto}` : ""}
              </p>
              <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {text}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="crm-btn crm-btn-ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(text);
                    setCopied(t.id);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === t.id ? "Copiado ✓" : "Copiar"}
                </button>
                {celular ? (
                  <a
                    href={whatsappLink(celular, text)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="crm-btn bg-[#25D366] text-white"
                  >
                    Abrir WhatsApp
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
