import type { jsPDF } from "jspdf";
import { productor, site } from "@/lib/content";
import { COVER_ROWS } from "@/lib/plan-covers";

export type QuotePdfPlan = {
  company: string;
  logo: string;
  title: string;
  monthly: number;
  covers?: Record<string, string> | null;
};

export type QuotePdfInput = {
  car: string;
  plate?: string;
  customer?: string;
  postal?: string;
  statedAmount?: number;
  hasGnc?: boolean;
  plans: QuotePdfPlan[];
};

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(value: number) {
  return value > 0 ? `$ ${moneyFmt.format(value)}` : "Consultar";
}

function coveredLines(plan: QuotePdfPlan) {
  return COVER_ROWS.flatMap((row) => {
    const value = plan.covers?.[row.key];
    if (!value || value === "no") return [];
    return [value === "si" ? row.label : `${row.label} (${value})`];
  });
}

function stamp(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function fileName(car: string) {
  const slug = car
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return `cotizacion-${slug || "auto"}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

async function raster(url: string, width: number, height: number) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("logo");
  const blob = new Blob([await response.arrayBuffer()], { type: response.headers.get("content-type") || "image/svg+xml" });
  const src = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("logo"));
      next.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(src);
  }
}

function column(doc: jsPDF, x: number, y: number, width: number, title: string, rows: Array<[string, string]>) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(32, 40, 78);
  const titleLines = doc.splitTextToSize(title, width);
  doc.text(titleLines, x, y);
  let cursor = y + titleLines.length * 4.1 + 1.5;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(45, 50, 78);
    doc.text(`${label}: `, x, cursor);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(value, Math.max(12, width - labelWidth));
    doc.text(valueLines[0] || "", x + labelWidth, cursor);
    cursor += 4.3;
    for (const extra of valueLines.slice(1)) {
      doc.text(extra, x, cursor);
      cursor += 3.5;
    }
  }
  return cursor;
}

function tick(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(32, 148, 96);
  doc.setLineWidth(0.45);
  doc.line(x, y - 0.7, x + 1.15, y + 0.55);
  doc.line(x + 1.15, y + 0.55, x + 2.9, y - 1.55);
  doc.setLineWidth(0.2);
}

export function renderQuotePdf(doc: jsPDF, input: QuotePdfInput, images: { logo?: string; marks: string[] }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const today = new Date();
  const until = new Date(today);
  until.setFullYear(until.getFullYear() + 1);

  if (images.logo) doc.addImage(images.logo, "PNG", margin, 8, 50, 12);
  else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(32, 40, 78);
    doc.text("MARXEN", margin, 16);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(32, 40, 78);
  doc.text(productor.nombre, pageW - margin, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Teléfono: ${site.phoneLocal}`, pageW - margin, 15.4, { align: "right" });
  doc.text(`Email: ${site.email}`, pageW - margin, 19.4, { align: "right" });

  const boxY = 28;
  const boxW = pageW - margin * 2;
  const colW = boxW / 3;
  const left = column(
    doc,
    margin + 4,
    boxY + 7,
    colW - 8,
    input.customer ? `Cotización para ${input.customer}` : "Cotización",
    [
      ["IVA", "Consumidor final"],
      ["CP/Localidad", `${input.postal || "4400"} - SALTA`],
    ]
  );
  const vehicleRows: Array<[string, string]> = [["Modelo", input.car || "A confirmar"]];
  if (input.plate) vehicleRows.push(["Patente", input.plate]);
  if (input.statedAmount && input.statedAmount > 0) vehicleRows.push(["Monto asegurado", money(input.statedAmount)]);
  vehicleRows.push(["Uso", "Particular"], ["GNC", input.hasGnc ? "Sí" : "No"]);
  const mid = column(doc, margin + colW + 2, boxY + 7, colW - 6, "Vehículo", vehicleRows);
  const right = column(doc, margin + colW * 2 + 2, boxY + 7, colW - 8, "Vigencia 12 meses", [
    ["Inicio", stamp(today)],
    ["Fin", stamp(until)],
    ["Tipo de contratación", "Refacturación mensual"],
    ["Forma de pago", "Mensual"],
  ]);
  const boxH = Math.max(left, mid, right) - boxY + 4;
  doc.setDrawColor(176, 184, 204);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, boxY, boxW, boxH, 2.2, 2.2, "S");

  let y = boxY + boxH + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 96, 112);
  doc.text(`Fecha de cotización: ${stamp(today)}`, margin, y);
  y += 6;

  const gap = 4;
  const cardW = (boxW - gap) / 2;
  const cardHeight = (plan: QuotePdfPlan, hasLogo: boolean) => {
    const titleLines = Math.min(2, doc.splitTextToSize(plan.title, cardW - 8).length);
    let height = 7 + (hasLogo ? 5 : 0) + 4.2 + titleLines * 3.8 + 1 + 5 + 6 + 3 + 5 + 5;
    for (const item of coveredLines(plan)) {
      height += Math.min(2, doc.splitTextToSize(item, cardW - 14).length) * 3.4 + 1.4;
    }
    return height + 4;
  };
  for (let index = 0; index < input.plans.length; index += 2) {
    const pair = input.plans.slice(index, index + 2);
    const cardH = Math.max(...pair.map((plan, offset) => cardHeight(plan, Boolean(images.marks[index + offset]))), 46);
    if (y + cardH > pageH - 22) {
      doc.addPage();
      y = 16;
    }
    pair.forEach((plan, offset) => {
      const x = margin + offset * (cardW + gap);
      doc.setDrawColor(196, 202, 214);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, cardW, cardH, 2.4, 2.4, "S");
      let line = y + 7;
      if (images.marks[index + offset]) {
        doc.addImage(images.marks[index + offset], "PNG", x + 4, line - 4, 22, 6);
        line += 5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(110, 116, 132);
      doc.text(plan.company, x + 4, line);
      line += 4.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(32, 40, 78);
      const title = doc.splitTextToSize(plan.title, cardW - 8).slice(0, 2);
      doc.text(title, x + 4, line);
      line += title.length * 3.8 + 1;
      doc.setDrawColor(210, 214, 224);
      doc.setLineDashPattern([0.4, 0.8], 0);
      doc.line(x + 4, line, x + cardW - 4, line);
      doc.setLineDashPattern([], 0);
      line += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Primera cuota", x + cardW / 2, line, { align: "center" });
      line += 6;
      doc.setFontSize(16);
      doc.text(money(plan.monthly), x + cardW / 2, line, { align: "center" });
      line += 3;
      doc.setLineDashPattern([0.4, 0.8], 0);
      doc.line(x + 4, line, x + cardW - 4, line);
      doc.setLineDashPattern([], 0);
      line += 5;
      doc.setFontSize(8);
      doc.text("Coberturas", x + 4, line);
      line += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(45, 50, 70);
      for (const item of coveredLines(plan)) {
        tick(doc, x + 4.5, line - 0.4);
        const wrapped = doc.splitTextToSize(item, cardW - 14).slice(0, 2);
        doc.text(wrapped, x + 9, line);
        line += wrapped.length * 3.4 + 1.4;
      }
    });
    y += cardH + gap;
  }

  const note =
    "La presente cotización tiene una validez de siete (7) días corridos desde su emisión y está sujeta a confirmación de la compañía. No implica aceptación del riesgo. La prima puede modificarse si cambian los datos al emitir.";
  const noteLines = doc.splitTextToSize(note, boxW);
  if (y + 8 + noteLines.length * 3.4 > pageH - 8) {
    doc.addPage();
    y = 16;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 96, 112);
  doc.text(noteLines, margin, y + 4);
}

export async function downloadQuotePdf(input: QuotePdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const [logo, ...marks] = await Promise.all([
    raster("/brand/marxel-logo.svg", 640, 148).catch(() => ""),
    ...input.plans.map((plan) => raster(plan.logo, 220, 60).catch(() => "")),
  ]);
  renderQuotePdf(doc, input, { logo, marks });
  doc.save(fileName(input.car));
}
