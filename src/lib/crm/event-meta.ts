export const EVENT_COLORS = [
  { id: "naranja", label: "Naranja", hex: "#F97316", googleId: "6" },
  { id: "amarillo", label: "Amarillo", hex: "#EAB308", googleId: "5" },
  { id: "verde", label: "Verde", hex: "#16A34A", googleId: "10" },
  { id: "azul", label: "Azul", hex: "#2563EB", googleId: "9" },
  { id: "violeta", label: "Violeta", hex: "#7C3AED", googleId: "3" },
] as const;

export type EventColorId = (typeof EVENT_COLORS)[number]["id"];

const COLOR_RE = /\[MARXEN-COLOR:(naranja|amarillo|verde|azul|violeta)\]/g;
const SERIE_RE = /\[MARXEN-SERIE:([0-9a-f-]{36})\]/i;

export function eventColor(id: string | null | undefined) {
  return EVENT_COLORS.find((item) => item.id === id) || null;
}

export function eventColorFromGoogle(googleId: string | null | undefined) {
  return EVENT_COLORS.find((item) => item.googleId === googleId) || null;
}

export function readEventSeries(text: string | null | undefined) {
  return (text || "").match(SERIE_RE)?.[1] || null;
}

export function stripEventMeta(text: string | null | undefined) {
  return (text || "").replace(COLOR_RE, "").replace(SERIE_RE, "").replace(/\n{2,}/g, "\n").trim();
}

export function readEventColor(text: string | null | undefined): EventColorId | null {
  const match = (text || "").match(/\[MARXEN-COLOR:(naranja|amarillo|verde|azul|violeta)\]/);
  return (match?.[1] as EventColorId) || null;
}

export function packEventColor(text: string | null | undefined, color: string | null | undefined) {
  const serie = readEventSeries(text);
  const clean = stripEventMeta(text);
  const chosen = eventColor(color);
  return [clean, chosen ? `[MARXEN-COLOR:${chosen.id}]` : "", serie ? `[MARXEN-SERIE:${serie}]` : ""]
    .filter(Boolean)
    .join("\n") || null;
}

export function withEventSeries(text: string | null | undefined, serieId: string) {
  const base = stripEventMeta(text);
  const color = readEventColor(text);
  const packed = packEventColor(base, color);
  return [packed, `[MARXEN-SERIE:${serieId}]`].filter(Boolean).join("\n");
}

export type RepeatEvery = "semanal" | "quincenal" | "mensual";

const SALTA_OFFSET_MS = 3 * 60 * 60 * 1000;

export function repeatEveryOf(value: string): RepeatEvery | null {
  if (value === "semanal" || value === "quincenal" || value === "mensual") return value;
  return null;
}

/** Día y hora de Salta, que no tiene horario de verano. */
function saltaParts(date: Date) {
  const shifted = new Date(date.getTime() - SALTA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function fromSalta(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month, day, hour + 3, minute)).toISOString();
}

/** Fechas de una serie. `times` incluye la primera y tiene un tope de 36. El mensual cae el mismo día del mes. */
export function repeatDates(startIso: string, every: number | RepeatEvery | null, times = 1) {
  const start = new Date(startIso);
  const count = Math.min(36, Math.max(1, Math.floor(times) || 1));
  if (!Number.isFinite(start.getTime()) || count < 2 || !every) return [startIso];
  if (every === "mensual") return monthlyDates(start, count);
  const days = every === "semanal" ? 7 : every === "quincenal" ? 14 : Math.floor(every);
  if (days < 1) return [startIso];
  const dates = [start.toISOString()];
  const cursor = new Date(start);
  while (dates.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + days);
    dates.push(cursor.toISOString());
  }
  return dates;
}

function monthlyDates(start: Date, count: number) {
  const { year, month, day, hour, minute } = saltaParts(start);
  const dates = [start.toISOString()];
  for (let step = 1; dates.length < count; step += 1) {
    const target = new Date(Date.UTC(year, month + step, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    dates.push(fromSalta(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last), hour, minute));
  }
  return dates;
}
