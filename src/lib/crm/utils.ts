import type { Lead, Prioridad, ProductoInteres } from "./types";

export function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (Number.isNaN(mins)) return "—";
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

export function isToday(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function scoreLead(lead: Partial<Lead>): number {
  let score = 20;
  if (lead.email) score += 10;
  if (lead.dni) score += 10;
  if (lead.edad) score += 5;
  if (lead.plan_interes) score += 15;
  if (lead.modalidad && lead.modalidad !== "sin_definir") score += 15;
  if (lead.producto === "salud") score += 10;
  if (lead.prioridad === "alta") score += 10;
  if (lead.prioridad === "urgente") score += 20;
  if (lead.origen === "referido") score += 10;
  if (lead.estado === "interesado" || lead.estado === "cotizado") score += 15;
  if (lead.estado === "documentacion") score += 20;
  return Math.min(100, score);
}

export function prioridadColor(p: Prioridad) {
  switch (p) {
    case "urgente":
      return "bg-rose-100 text-rose-700";
    case "alta":
      return "bg-orange-100 text-orange-700";
    case "media":
      return "bg-sky/20 text-blue";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function productoLabel(p: ProductoInteres) {
  switch (p) {
    case "salud":
      return "Salud";
    case "seguros":
      return "Seguros";
    case "viajero":
      return "Viajero";
    default:
      return "General";
  }
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join(
    "\n"
  );
}

export const DOC_CHECKLIST_SALUD = [
  "DNI frente y dorso",
  "Declaración Jurada de Salud",
  "Constancia monotributo / recibo de sueldo",
  "Comprobante opción de cambio (Mi SSSalud)",
  "CBU o tarjeta para débito",
];
