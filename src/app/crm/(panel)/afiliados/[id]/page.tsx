import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Actividad, Afiliado, Seguimiento } from "@/lib/crm/types";
import {
  AFILIADO_ESTADOS,
  formatDate,
  formatMoney,
  MODALIDADES,
  whatsappLink,
} from "@/lib/crm/types";
import { SeguimientoActions } from "@/components/crm/SeguimientoActions";
import {
  addNota,
  createSeguimiento,
  updateAfiliado,
  updateAfiliadoEstado,
} from "@/lib/crm/actions";

export default async function AfiliadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: afiliado }, { data: actividades }, { data: seguimientos }] =
    await Promise.all([
      supabase.from("afiliados").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("actividades")
        .select("*")
        .eq("afiliado_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("seguimientos")
        .select("*")
        .eq("afiliado_id", id)
        .order("programado_para", { ascending: true }),
    ]);

  if (!afiliado) notFound();
  const a = afiliado as Afiliado;
  const estado = AFILIADO_ESTADOS.find((e) => e.value === a.estado);

  async function save(formData: FormData) {
    "use server";
    await updateAfiliado(id, {
      email: String(formData.get("email") || "") || null,
      dni: String(formData.get("dni") || "") || null,
      plan: String(formData.get("plan") || "") || null,
      modalidad: String(formData.get("modalidad") || "sin_definir"),
      numero_afiliado: String(formData.get("numero_afiliado") || "") || null,
      grupo_familiar: formData.get("grupo_familiar")
        ? Number(formData.get("grupo_familiar"))
        : 1,
      cuota_estimada: formData.get("cuota_estimada")
        ? Number(formData.get("cuota_estimada"))
        : null,
      fecha_vigencia: String(formData.get("fecha_vigencia") || "") || null,
      fecha_alta: String(formData.get("fecha_alta") || "") || null,
      obra_social_convenio: String(formData.get("obra_social_convenio") || "") || null,
      docs_completos: formData.get("docs_completos") === "on",
      notas: String(formData.get("notas") || "") || null,
    });
  }

  async function changeEstado(formData: FormData) {
    "use server";
    await updateAfiliadoEstado(id, String(formData.get("estado")) as Afiliado["estado"]);
  }

  async function saveNota(formData: FormData) {
    "use server";
    await addNota(null, id, formData);
  }

  async function saveSeg(formData: FormData) {
    "use server";
    formData.set("afiliado_id", id);
    await createSeguimiento(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/afiliados" className="text-sm text-teal hover:underline">
          ← Afiliados
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-navy">
              {a.nombre}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {a.celular}
              {a.email ? ` · ${a.email}` : ""}
            </p>
            <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-medium ${estado?.color}`}>
              {estado?.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={whatsappLink(a.celular, `Hola ${a.nombre}, te escribo de MARXEN.`)}
              target="_blank"
              className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
            >
              WhatsApp
            </Link>
            <form action={changeEstado} className="flex gap-2">
              <select
                name="estado"
                defaultValue={a.estado}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
              >
                {AFILIADO_ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-xl bg-navy px-3 text-sm font-semibold text-white">
                Actualizar
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={save} className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy">
            Ficha del afiliado
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Email" name="email" defaultValue={a.email || ""} />
            <Field label="DNI" name="dni" defaultValue={a.dni || ""} />
            <Field label="Plan" name="plan" defaultValue={a.plan || ""} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Modalidad</span>
              <select
                name="modalidad"
                defaultValue={a.modalidad}
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Nº afiliado"
              name="numero_afiliado"
              defaultValue={a.numero_afiliado || ""}
            />
            <Field
              label="Grupo familiar"
              name="grupo_familiar"
              type="number"
              defaultValue={String(a.grupo_familiar ?? 1)}
            />
            <Field
              label="Cuota estimada"
              name="cuota_estimada"
              type="number"
              defaultValue={a.cuota_estimada != null ? String(a.cuota_estimada) : ""}
            />
            <Field
              label="Obra social convenio"
              name="obra_social_convenio"
              defaultValue={a.obra_social_convenio || ""}
            />
            <Field
              label="Fecha vigencia"
              name="fecha_vigencia"
              type="date"
              defaultValue={a.fecha_vigencia || ""}
            />
            <Field
              label="Fecha alta"
              name="fecha_alta"
              type="date"
              defaultValue={a.fecha_alta || ""}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="docs_completos"
                defaultChecked={a.docs_completos}
              />
              Documentación completa
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Notas</span>
              <textarea
                name="notas"
                rows={3}
                defaultValue={a.notas || ""}
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">
            Cuota actual: {formatMoney(a.cuota_estimada)}
          </p>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"
          >
            Guardar
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              Seguimientos
            </h2>
            <ul className="mt-4 space-y-3">
              {(seguimientos as Seguimiento[] | null)?.map((s) => (
                <li key={s.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-semibold text-navy">{s.titulo}</p>
                  <p className="text-xs text-muted">
                    {formatDate(s.programado_para)} · {s.estado}
                  </p>
                  {s.estado === "pendiente" ? (
                    <div className="mt-2">
                      <SeguimientoActions
                        id={s.id}
                        afiliadoId={a.id}
                        celular={a.celular}
                        nombre={a.nombre}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <form action={saveSeg} className="mt-4 space-y-2 border-t border-line pt-4">
              <input
                name="titulo"
                required
                placeholder="Nuevo seguimiento"
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
              />
              <input
                name="programado_para"
                type="datetime-local"
                required
                className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm"
              />
              <select name="tipo" className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5 text-sm">
                <option value="documentacion">Documentación</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="llamada">Llamada</option>
                <option value="otro">Otro</option>
              </select>
              <button type="submit" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white">
                Programar
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-navy">Timeline</h2>
            <ul className="mt-4 space-y-3">
              {(actividades as Actividad[] | null)?.map((act) => (
                <li key={act.id} className="border-l-2 border-sky/50 pl-3">
                  <p className="text-sm font-semibold text-navy">{act.titulo}</p>
                  {act.detalle ? (
                    <p className="text-sm text-muted">{act.detalle}</p>
                  ) : null}
                  <p className="text-[11px] text-muted">{formatDate(act.created_at)}</p>
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
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
      />
    </label>
  );
}
