export type SavedQuoteStatus = "guardada" | "enviada" | "elegida" | "emitida";

export type SavedQuoteListItem = {
  id: string;
  created_at: string;
  estado: SavedQuoteStatus;
  nombre: string;
  celular: string | null;
  dni: string | null;
  patente: string | null;
  vehiculo: string | null;
  resumen: string | null;
  premio_api: number | null;
  premio_sitio: number | null;
  premio_smg: number | null;
  localidad: string | null;
};

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function quoteMoney(value: number | null | undefined) {
  return value && value > 0 ? `$ ${moneyFmt.format(value)}` : "";
}

export function quoteStatusLabel(estado: string) {
  if (estado === "enviada") return "Enviada";
  if (estado === "elegida") return "Eligió un plan";
  if (estado === "emitida") return "Emitida";
  return "Guardada";
}

export function quoteShareText(row: { nombre?: string | null; vehiculo?: string | null; patente?: string | null; resumen?: string | null }) {
  const name = String(row.nombre || "").trim().split(/\s+/)[0] || "";
  const car = String(row.vehiculo || "tu auto").trim();
  const plate = String(row.patente || "").trim();
  const hello = name ? `Hola ${name}` : "Hola";
  const lines = [
    `${hello}, te dejo la cotización de ${car}${plate ? ` (${plate})` : ""}.`,
    String(row.resumen || "").trim(),
    "Cuando quieras la seguimos. Marcos, MARXEN.",
  ].filter(Boolean);
  return lines.join("\n");
}
