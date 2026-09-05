import {
  FARMACIAS,
  PRESTADORES,
  TIPO_LABEL,
} from "@/data/cartilla-prestadores";

const CARTILLA_URL = "https://www.marxen.com.ar/salud/cartilla-medica";

const GENERIC = new Set([
  "hospital",
  "privado",
  "publico",
  "clinica",
  "sanatorio",
  "centro",
  "imagenes",
  "imagen",
  "instituto",
  "srl",
  "salud",
  "medica",
  "medico",
  "laboratorio",
  "laboratorios",
  "fundacion",
  "servicio",
  "atencion",
  "asociados",
  "grupo",
  "sociedad",
  "estado",
  "privada",
  "general",
  "santa",
  "salta",
  "capital",
  "argentina",
  "provincia",
  "ciudad",
  "localidad",
]);

const PROVIDER_INTENT =
  /\b(atiend|atend|atent|trabajan|cubren|aceptan|instituto|imagenes|diagnostico|prestador|cartilla|clinica|sanatorio|hospital|farmacia|laboratorio)\b/;

export type PrestadorHit = {
  kind: "prestador" | "farmacia";
  nombre: string;
  direccion: string;
  telefono: string;
  whatsapp?: string;
  especialidades?: string[];
  planes: ("A2" | "A4")[];
  tipoLabel: string;
  score: number;
};

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distinctiveKeys(nombre: string): string[] {
  const words = fold(nombre)
    .split(" ")
    .filter((w) => w.length >= 4 && !GENERIC.has(w));
  const keys = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    keys.push(`${words[i]} ${words[i + 1]}`);
  }
  return keys;
}

function scoreAgainst(query: string, nombre: string): number {
  const q = fold(query);
  let score = 0;
  for (const key of distinctiveKeys(nombre)) {
    if (!q.includes(key)) continue;
    score += key.includes(" ") ? 4 : key.length >= 6 ? 3 : 2;
  }
  return score;
}

export function looksLikePrestadorQuery(message: string): boolean {
  const q = fold(message);
  if (PROVIDER_INTENT.test(q)) return true;
  return findPrestadores(message).length > 0;
}

export function findPrestadores(query: string, limit = 3): PrestadorHit[] {
  const hits: PrestadorHit[] = [];
  for (const p of PRESTADORES) {
    const score = scoreAgainst(query, p.nombre);
    if (score < 2) continue;
    hits.push({
      kind: "prestador",
      nombre: p.nombre,
      direccion: p.direccion,
      telefono: p.telefono,
      whatsapp: p.whatsapp,
      especialidades: p.especialidades,
      planes: p.planes,
      tipoLabel: TIPO_LABEL[p.tipo],
      score,
    });
  }

  const q = fold(query);
  if (/\bfarmacia/.test(q)) {
    for (const f of FARMACIAS) {
      const score = scoreAgainst(query, f.nombre);
      if (score < 3) continue;
      hits.push({
        kind: "farmacia",
        nombre: f.nombre,
        direccion: f.direccion,
        telefono: f.telefono,
        planes: f.planes,
        tipoLabel: "Farmacia",
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function formatPrestadorAnswer(hits: PrestadorHit[]): string {
  if (!hits.length) return "";

  const lines: string[] = [];
  if (hits.length === 1) {
    const h = hits[0];
    const planes = h.planes.join(" y ");
    lines.push(`Sí, ${h.nombre} está en la cartilla de los planes ${planes}.`);
    lines.push(`${h.tipoLabel} · ${h.direccion}`);
    if (h.telefono) lines.push(`Tel: ${h.telefono}`);
    if (h.whatsapp) lines.push(`WhatsApp turnos: ${h.whatsapp}`);
    if (h.especialidades?.length) {
      lines.push(`Atiende: ${h.especialidades.slice(0, 6).join(", ")}.`);
    }
  } else {
    lines.push("Encontré estos prestadores en la cartilla A2 y A4:");
    for (const h of hits) {
      const tel = h.telefono ? ` · ${h.telefono}` : "";
      lines.push(`• ${h.nombre} — ${h.direccion}${tel}`);
    }
  }
  lines.push(`Cartilla completa: ${CARTILLA_URL}`);
  return lines.join("\n");
}
