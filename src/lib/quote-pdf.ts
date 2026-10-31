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

function tick(doc: jsPDF, x: number, y: number, scale = 1) {
  doc.setDrawColor(32, 148, 96);
  doc.setLineWidth(0.4);
  doc.line(x, y - 0.7 * scale, x + 1.15 * scale, y + 0.55 * scale);
  doc.line(x + 1.15 * scale, y + 0.55 * scale, x + 2.9 * scale, y - 1.55 * scale);
  doc.setLineWidth(0.2);
}

function clip(doc: jsPDF, text: string, width: number) {
  if (doc.getTextWidth(text) <= width) return text;
  let next = text;
  while (next.length > 1 && doc.getTextWidth(`${next}...`) > width) next = next.slice(0, -1);
  return `${next}...`;
}

export function renderQuotePdf(doc: jsPDF, input: QuotePdfInput, images: { logo?: string }) {
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

  let y = boxY + boxH + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 96, 112);
  doc.text(`Fecha de cotización: ${stamp(today)}`, margin, y);
  y += 5;

  const plans = input.plans;
  const note =
    "La presente cotización tiene una validez de siete (7) días corridos desde su emisión y está sujeta a confirmación de la compañía. No implica aceptación del riesgo. La prima puede modificarse si cambian los datos al emitir.";
  doc.setFontSize(6.5);
  const noteLines = doc.splitTextToSize(note, boxW);
  const noteBlock = noteLines.length * 2.8 + 3;
  if (plans.length) {
    const count = plans.length;
    const labelW = count >= 7 ? 28 : 34;
    const colW = (boxW - labelW) / count;
    const font = colW < 16 ? 5.2 : colW < 22 ? 6 : 6.6;
    const lineH = Math.max(2.5, font * 0.46);
    const headH = 4 + lineH * 4 + 4.4;
    const room = pageH - 10 - noteBlock - y;
    const rowH = Math.min(7.2, (room - headH) / COVER_ROWS.length);
    const tableH = headH + COVER_ROWS.length * rowH;
    const tableTop = y;
    doc.setDrawColor(196, 202, 214);
    doc.setLineWidth(0.2);
    doc.setFillColor(244, 246, 251);
    doc.rect(margin, tableTop, boxW, headH, "FD");
    COVER_ROWS.forEach((row, index) => {
      const rowY = tableTop + headH + index * rowH;
      if (index % 2 === 0) {
        doc.setFillColor(250, 251, 253);
        doc.rect(margin, rowY, boxW, rowH, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(Math.min(7, font + 0.4));
      doc.setTextColor(45, 50, 78);
      doc.text(clip(doc, row.label, labelW - 3), margin + 1.5, rowY + rowH * 0.62);
    });
    plans.forEach((plan, index) => {
      const x = margin + labelW + index * colW;
      doc.setDrawColor(220, 224, 232);
      doc.line(x, tableTop, x, tableTop + tableH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(font - 0.4);
      doc.setTextColor(110, 116, 132);
      doc.text(clip(doc, plan.company, colW - 1.6), x + colW / 2, tableTop + 3.5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(font);
      doc.setTextColor(32, 40, 78);
      const title = doc.splitTextToSize(plan.title, colW - 2).slice(0, 3);
      doc.text(title, x + colW / 2, tableTop + 3.5 + lineH, { align: "center" });
      doc.setFontSize(font + 0.5);
      doc.text(money(plan.monthly), x + colW / 2, tableTop + headH - 2.3, { align: "center" });
      COVER_ROWS.forEach((row, rowIndex) => {
        const value = plan.covers?.[row.key];
        const rowY = tableTop + headH + rowIndex * rowH;
        const midY = rowY + rowH * 0.62;
        if (!value || value === "no") {
          doc.setDrawColor(176, 180, 190);
          doc.setLineWidth(0.35);
          doc.line(x + colW / 2 - 1.3, midY - 0.4, x + colW / 2 + 1.3, midY - 0.4);
          doc.setLineWidth(0.2);
          return;
        }
        if (value === "si") {
          tick(doc, x + colW / 2 - 1.4, midY, colW < 18 ? 0.8 : 1);
          return;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(Math.max(4.8, font - 0.8));
        doc.setTextColor(29, 111, 138);
        doc.text(clip(doc, value, colW - 1.4), x + colW / 2, midY, { align: "center" });
      });
    });
    doc.setDrawColor(196, 202, 214);
    doc.rect(margin, tableTop, boxW, tableH);
    doc.line(margin + labelW, tableTop, margin + labelW, tableTop + tableH);
    doc.line(margin, tableTop + headH, margin + boxW, tableTop + headH);
    y = tableTop + tableH + 4;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(90, 96, 112);
  doc.text(noteLines, margin, y + 2);
  return y + 2 + noteLines.length * 2.8;
}

export async function downloadQuotePdf(input: QuotePdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await raster("/brand/marxel-logo.svg", 640, 148).catch(() => "");
  renderQuotePdf(doc, input, { logo });
  doc.save(fileName(input.car));
}
