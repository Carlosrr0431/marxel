import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Actividad, Lead, Seguimiento } from "@/lib/crm/types";
import {
  formatDate,
  LEAD_ESTADOS,
  MODALIDADES,
  PRODUCTOS,
} from "@/lib/crm/types";
import { LeadEstadoSelect } from "@/components/crm/LeadEstadoSelect";
import { LeadQuickActions } from "@/components/crm/LeadQuickActions";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
import { Avatar, ScoreRing } from "@/components/crm/ui";
import {
  addLeadTag,
  addNota,
  createSeguimiento,
  updateLead,
} from "@/lib/crm/actions";
import { DOC_CHECKLIST_SALUD, scoreLead } from "@/lib/crm/utils";
import { fillTemplate, WA_TEMPLATES } from "@/lib/crm/templates";
import { whatsappLink } from "@/lib/crm/types";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: lead }, { data: actividades }, { data: seguimientos }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("actividades")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("seguimientos")
        .select("*")
        .eq("lead_id", id)
        .order("programado_para", { ascending: true }),
    ]);

  if (!lead) notFound();
  const l = lead as Lead;
  const estado = LEAD_ESTADOS.find((e) => e.value === l.estado);
  const puntaje = l.puntaje || scoreLead(l);
  const tips: string[] = [];
  if (l.estado === "nuevo") tips.push("Hacé el WhatsApp inicial con plantilla de apertura.");
  if (!l.email) tips.push("Pedí el email para enviar propuestas formales.");
  if (l.producto === "salud" && l.modalidad === "sin_definir") {
    tips.push("Definí si es monotributo, relación de dependencia o particular.");
  }
  if (l.estado === "interesado" || l.estado === "cotizado") {
    tips.push("Programá pedido de documentación y fecha de alta.");
  }
  if (puntaje >= 70) tips.push("Lead caliente: priorizá contacto hoy.");

  async function saveLead(formData: FormData) {
    "use server";
    await updateLead(id, {
      email: String(formData.get("email") || "") || null,
      dni: String(formData.get("dni") || "") || null,
      localidad: String(formData.get("localidad") || "") || null,
      provincia: String(formData.get("provincia") || "") || null,
      plan_interes: String(formData.get("plan_interes") || "") || null,
      coberturas: String(formData.get("coberturas") || "") || null,
      modalidad: String(formData.get("modalidad") || "sin_definir"),
      producto: String(formData.get("producto") || "general"),
      prioridad: String(formData.get("prioridad") || "media"),
      asignado_a: String(formData.get("asignado_a") || "") || null,
      notas_iniciales: String(formData.get("notas_iniciales") || "") || null,
    });
  }

  async function saveNota(formData: FormData) {
    "use server";
    await addNota(id, null, formData);
  }

  async function saveSeguimiento(formData: FormData) {
    "use server";
    formData.set("lead_id", id);
    await createSeguimiento(formData);
  }

  async function saveTag(formData: FormData) {
    "use server";
    await addLeadTag(id, String(formData.get("tag") || ""));
  }

  const quickWa = WA_TEMPLATES.filter((t) => t.categoria === "apertura").slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="crm-card p-5 sm:p-6">
        <Link href="/crm/leads" className="text-sm text-teal hover:underline">
          ← Leads
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <Avatar name={l.nombre} size="lg" />
            <div>
              <h1 className="font-display text-3xl font-semibold text-navy">
                {l.nombre}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {l.celular}
                {l.email ? ` · ${l.email}` : ""}
                {l.provincia ? ` · ${l.provincia}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`crm-badge ${estado?.color}`}>{estado?.label}</span>
                <LeadEstadoSelect leadId={l.id} value={l.estado} />
                {(l.tags || []).map((t) => (
                  <span key={t} className="crm-badge bg-mist text-navy">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <ScoreRing score={puntaje} />
            <LeadQuickActions
              leadId={l.id}
              nombre={l.nombre}
              celular={l.celular}
              estado={l.estado}
            />
          </div>
        </div>
      </div>

      {tips.length ? (
        <div className="rounded-2xl border border-teal/25 bg-gradient-to-r from-aqua/80 to-mist p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">
            Sugerencias inteligentes
          </p>
          <ul className="mt-2 space-y-1">
            {tips.map((t) => (
              <li key={t} className="text-sm text-navy">
                → {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {l.origen_detalle === "chatbot" && l.notas_iniciales ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
            Datos del chatbot
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-navy">
            {l.notas_iniciales}
          </pre>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <form action={saveLead} className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Datos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Email" name="email" defaultValue={l.email || ""} />
              <Input label="DNI" name="dni" defaultValue={l.dni || ""} />
              <Input label="Provincia" name="provincia" defaultValue={l.provincia || ""} />
              <Input label="Localidad" name="localidad" defaultValue={l.localidad || ""} />
              <Input label="Plan interés" name="plan_interes" defaultValue={l.plan_interes || ""} />
              <Input label="Coberturas" name="coberturas" defaultValue={l.coberturas || ""} />
              <Input label="Asignado a" name="asignado_a" defaultValue={l.asignado_a || ""} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Producto</span>
                <select name="producto" defaultValue={l.producto} className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5">
                  {PRODUCTOS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Modalidad</span>
                <select name="modalidad" defaultValue={l.modalidad} className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5">
                  {MODALIDADES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Notas</span>
                <textarea
                  name="notas_iniciales"
                  rows={3}
                  defaultValue={l.notas_iniciales || ""}
                  className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
                />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">
              Guardar cambios
            </button>
          </form>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Timeline</h2>
            <ul className="mt-4 space-y-3">
              {(actividades as Actividad[] | null)?.map((a) => (
                <li key={a.id} className="border-l-2 border-teal/40 pl-3">
                  <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                  {a.detalle ? <p className="text-sm text-muted">{a.detalle}</p> : null}
                  <p className="mt-1 text-[11px] text-muted">
                    {formatDate(a.created_at)} · {a.autor || "sistema"}
                  </p>
                </li>
              ))}
            </ul>
            <form action={saveNota} className="mt-4 flex gap-2">
              <input
                name="nota"
                required
                placeholder="Agregar nota…"
                className="flex-1 rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
              />
              <button type="submit" className="rounded-xl bg-navy px-4 text-sm font-semibold text-white">
                Nota
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              Seguimientos
            </h2>
            <ul className="mt-4 space-y-3">
              {(seguimientos as Seguimiento[] | null)?.map((s) => (
                <li key={s.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-navy">{s.titulo}</p>
                      <p className="text-xs text-muted">
                        {s.tipo} · {formatDate(s.programado_para)} · {s.estado}
                      </p>
                    </div>
                  </div>
                  {s.estado === "pendiente" ? (
                    <div className="mt-2">
                      <SeguimientoActions
                        id={s.id}
                        leadId={l.id}
                        celular={l.celular}
                        nombre={l.nombre}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <form action={saveSeguimiento} className="mt-4 space-y-2 border-t border-line pt-4">
              <p className="text-sm font-medium text-navy">Nuevo seguimiento</p>
              <input
                name="titulo"
                required
                placeholder="Título"
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
              />
              <input
                name="programado_para"
                type="datetime-local"
                required
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
              />
              <select name="tipo" className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="llamada">Llamada</option>
                <option value="email">Email</option>
                <option value="documentacion">Documentación</option>
                <option value="cotizacion">Cotización</option>
                <option value="otro">Otro</option>
              </select>
              <button type="submit" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white">
                Programar
              </button>
            </form>
          </div>

          <div className="crm-card p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              WhatsApp rápido
            </h2>
            <ul className="mt-3 space-y-2">
              {quickWa.map((t) => {
                const text = fillTemplate(t.cuerpo, {
                  nombre: l.nombre,
                  interes: l.plan_interes || l.producto,
                });
                return (
                  <li key={t.id}>
                    <a
                      href={whatsappLink(l.celular, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-line px-3 py-2 text-sm font-medium text-navy hover:bg-mist"
                    >
                      {t.titulo} →
                    </a>
                  </li>
                );
              })}
              <li>
                <Link href="/crm/plantillas" className="text-sm font-semibold text-teal hover:underline">
                  Ver todas las plantillas
                </Link>
              </li>
            </ul>
          </div>

          {l.producto === "salud" ? (
            <div className="crm-card p-5">
              <h2 className="font-display text-lg font-semibold text-navy">
                Checklist docs salud
              </h2>
              <ul className="mt-3 space-y-2">
                {DOC_CHECKLIST_SALUD.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted">
                    <span className="text-teal">☐</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={saveTag} className="crm-card flex gap-2 p-4">
            <input
              name="tag"
              placeholder="Agregar tag…"
              className="crm-input"
              required
            />
            <button type="submit" className="crm-btn crm-btn-ghost shrink-0">
              Tag
            </button>
          </form>

          <div className="rounded-2xl border border-line bg-mist/50 p-5 text-sm text-muted">
            <p>
              <strong className="text-navy">Origen:</strong> {l.origen}
            </p>
            <p className="mt-1">
              <strong className="text-navy">Creado:</strong> {formatDate(l.created_at)}
            </p>
            <p className="mt-1">
              <strong className="text-navy">Último contacto:</strong>{" "}
              {formatDate(l.ultimo_contacto_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
      />
    </label>
  );
}
