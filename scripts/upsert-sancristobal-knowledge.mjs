import fs from "fs";
import path from "path";
import { SOURCE, CHUNKS } from "./sancristobal-knowledge.mjs";

const outFile = path.join(process.cwd(), "src/data/chatbot-knowledge.json");
const kb = JSON.parse(fs.readFileSync(outFile, "utf8"));

const chunks = CHUNKS.map((c) => ({
  id: c.id,
  sourceId: SOURCE.id,
  sourceTitle: c.sourceTitle,
  content: c.content.trim(),
}));

const chars = chunks.reduce((n, c) => n + c.content.length, 0);

kb.generatedAt = new Date().toISOString();
kb.sources = (kb.sources || []).map((s) =>
  s.id === SOURCE.id
    ? {
        ...s,
        title: SOURCE.title,
        file: SOURCE.file,
        pages: SOURCE.pages,
        chars,
        chunks: chunks.length,
      }
    : s
);
if (!kb.sources.some((s) => s.id === SOURCE.id)) {
  kb.sources.push({
    id: SOURCE.id,
    title: SOURCE.title,
    file: SOURCE.file,
    pages: SOURCE.pages,
    chars,
    chunks: chunks.length,
  });
}

kb.chunks = (kb.chunks || []).filter((c) => c.sourceId !== SOURCE.id);
kb.chunks.push(...chunks);

fs.writeFileSync(outFile, JSON.stringify(kb, null, 2) + "\n");
console.log("sancristobal chunks", chunks.length, "chars", chars);
console.log("total chunks", kb.chunks.length);
