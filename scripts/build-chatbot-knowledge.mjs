/**
 * Rebuild chatbot knowledge from PDFs in Downloads.
 * Usage: node scripts/build-chatbot-knowledge.mjs
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const downloads = path.join(process.env.USERPROFILE || "", "Downloads");
const outFile = path.join(process.cwd(), "src/data/chatbot-knowledge.json");

const sources = [
  { file: "PLAN A2.pdf", id: "plan-a2", title: "Plan A2 Prevención Salud" },
  { file: "PLAN A4.pdf", id: "plan-a4", title: "Plan A4 Prevención Salud" },
  {
    file: "MANUAL-DE-PRODUCTO-tiene toda la informacion(1).pdf",
    id: "manual-producto",
    title: "Manual de Producto Prevención Salud",
  },
  {
    file: "PrevenciónSalud-Cartilla a2 clinicas y sanatorios.pdf",
    id: "cartilla-a2-clinicas",
    title: "Cartilla A2 clínicas y sanatorios",
  },
  {
    file: "PrevenciónSalud-Cartilla a4 clinicas y sanatorios.pdf",
    id: "cartilla-a4-clinicas",
    title: "Cartilla A4 clínicas y sanatorios",
  },
  {
    file: "PrevenciónSalud-Cartilla farmacias.pdf",
    id: "cartilla-farmacias",
    title: "Cartilla de farmacias Prevención Salud",
  },
];

function chunkText(text, source, size = 1100, overlap = 180) {
  const clean = text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const chunks = [];
  let i = 0;
  let n = 0;
  while (i < clean.length) {
    let end = Math.min(i + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const br = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("\n")
      );
      if (br > size * 0.45) end = i + br + 1;
    }
    const content = clean.slice(i, end).trim();
    if (content.length > 40) {
      chunks.push({
        id: `${source.id}-${String(n).padStart(4, "0")}`,
        sourceId: source.id,
        sourceTitle: source.title,
        content,
      });
      n += 1;
    }
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks;
}

const all = [];
const meta = [];
for (const s of sources) {
  const p = path.join(downloads, s.file);
  if (!fs.existsSync(p)) {
    console.warn("missing", s.file);
    continue;
  }
  const data = await pdf(fs.readFileSync(p));
  const chunks = chunkText(data.text, s);
  all.push(...chunks);
  meta.push({
    id: s.id,
    title: s.title,
    file: s.file,
    pages: data.numpages,
    chars: data.text.length,
    chunks: chunks.length,
  });
  console.log(s.id, chunks.length);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(
  outFile,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    sources: meta,
    chunks: all,
  })
);
console.log("wrote", outFile, "chunks", all.length);
