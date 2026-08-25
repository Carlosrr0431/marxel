import knowledge from "@/data/chatbot-knowledge.json";

export type KnowledgeChunk = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
};

const STOP = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "es",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "o",
  "para",
  "por",
  "que",
  "se",
  "si",
  "su",
  "te",
  "tu",
  "un",
  "una",
  "y",
  "ya",
  "como",
  "cual",
  "cuales",
  "hay",
  "tiene",
  "tienen",
  "sobre",
  "esta",
  "este",
  "estos",
  "estas",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function sourceBoost(query: string, sourceId: string): number {
  const q = query.toLowerCase();
  if (/\ba2\b/.test(q) && sourceId.includes("a2")) return 2.2;
  if (/\ba4\b/.test(q) && sourceId.includes("a4")) return 2.2;
  if (/farmac/.test(q) && sourceId.includes("farmac")) return 2.4;
  if (/cartilla|clinica|sanatorio|hospital|prestador|jaraba|instituto/.test(q) && sourceId.includes("cartilla"))
    return 2;
  if (/manual|afili|aporte|monotribut|obra social|pmo|ley/.test(q) && sourceId.includes("manual"))
    return 1.6;
  if (/odont|protesis|pr[oó]tesis|dentista|implante|ortodoncia/.test(q) && (sourceId.startsWith("plan-") || sourceId.includes("odont") || sourceId.includes("manual")))
    return 2.3;
  if (/plan|cobertura|reintegro|odont|kine|fono|optica|viajero/.test(q) && sourceId.startsWith("plan-"))
    return 1.8;
  return 1;
}

export function retrieveChunks(query: string, limit = 8): KnowledgeChunk[] {
  const terms = tokenize(query);
  if (!terms.length) {
    return (knowledge.chunks as KnowledgeChunk[]).slice(0, limit);
  }

  const scored = (knowledge.chunks as KnowledgeChunk[]).map((chunk) => {
    const hay = chunk.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const term of terms) {
      if (!hay.includes(term)) continue;
      const occurrences = hay.split(term).length - 1;
      score += Math.min(occurrences, 4) * (term.length > 4 ? 1.4 : 1);
    }
    score *= sourceBoost(query, chunk.sourceId);
    if (/\ba2\b/i.test(query) && /\ba2\b/i.test(chunk.content)) score += 1.5;
    if (/\ba4\b/i.test(query) && /\ba4\b/i.test(chunk.content)) score += 1.5;
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export function formatContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return "No se encontraron fragmentos relevantes.";
  return chunks
    .map(
      (c, i) =>
        `[Fuente ${i + 1}: ${c.sourceTitle}]\n${c.content}`
    )
    .join("\n\n---\n\n");
}

export const chatbotSources = knowledge.sources;
