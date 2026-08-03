import { createLeadManual } from "@/lib/crm/actions";
import { MODALIDADES, PRIORIDADES, PRODUCTOS } from "@/lib/crm/types";
import { provincias } from "@/lib/content";
import Link from "next/link";

export default function NuevoLeadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/crm/leads" className="text-sm text-teal hover:underline">
          ← Volver a leads
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy">
          Nuevo lead
        </h1>
      </div>

      <form action={createLeadManual} className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre y apellido" name="nombre" required />
          <Field label="Celular" name="celular" required />
          <Field label="Email" name="email" type="email" />
          <Field label="DNI" name="dni" />
          <Field label="Edad" name="edad" type="number" />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Provincia</span>
            <select name="provincia" className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5">
              <option value="">—</option>
              {provincias.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <Field label="Localidad" name="localidad" />
          <Select label="Producto" name="producto" options={PRODUCTOS} />
          <Field label="Plan de interés" name="plan_interes" />
          <Select label="Modalidad" name="modalidad" options={MODALIDADES} />
          <Select label="Prioridad" name="prioridad" options={PRIORIDADES} />
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">Notas</span>
          <textarea
            name="notas"
            rows={3}
            className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          Guardar lead
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <select name={name} className="w-full rounded-xl border border-line bg-cloud px-3 py-2.5">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
