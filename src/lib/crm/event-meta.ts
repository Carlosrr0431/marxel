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

/** Fechas de una serie. `times` incluye la primera y tiene un tope de 36. */
export function repeatDates(startIso: string, everyDays: number, times = 1) {
  const start = new Date(startIso);
  const count = Math.min(36, Math.max(1, Math.floor(times) || 1));
  if (!Number.isFinite(start.getTime()) || everyDays < 1 || count < 2) return [startIso];
  const dates = [start.toISOString()];
  const cursor = new Date(start);
  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + everyDays);
    dates.push(cursor.toISOString());
  }
  return dates;
}
