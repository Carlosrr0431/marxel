/** Respuestas fijas de A2/A4 (brochure Prevención Salud en chatbot-knowledge.json). */

const PLAN_RE = /\b(?:plan\s*)?a\s*([24])\b/i;
const ASK_RE =
  /\b(cubre|cubr[eí]|cobertura|incluye|incluyen|qu[eé]\s+(me\s+)?(cubre|incluye)|tiene|tienen|como\s+es|c[oó]mo\s+es|diferencia)\b/i;

export function mentionedHealthPlan(text: string): "A2" | "A4" | "both" | null {
  const t = String(text || "").toLowerCase();
  const a2 = /\b(?:plan\s*)?a\s*2\b/.test(t);
  const a4 = /\b(?:plan\s*)?a\s*4\b/.test(t);
  if (a2 && a4) return "both";
  if (a2) return "A2";
  if (a4) return "A4";
  return null;
}

export function looksLikeHealthPlanQuestion(text: string) {
  const plan = mentionedHealthPlan(text);
  if (!plan) return false;
  const t = String(text || "").trim();
  if (PLAN_RE.test(t) && t.length <= 18) return true;
  return ASK_RE.test(t);
}

const A2 =
  "El A2 de Prevención Salud tiene cartilla abierta con reintegros y habitación individual. Farmacia 40%, prótesis nacionales 100% e importadas 50%, odontología amplia y ortodoncia al 100% en prestadores seleccionados (con auditoría y 12 meses de antigüedad). También cubre kinesio y fono (30 sesiones) y asistencia al viajero nacional e internacional.";

const A4 =
  "El A4 suma cartilla de mayor prestigio, vademécum más amplio y reintegros superadores: más óptica, odontología, kinesio/fisioterapia (40 sesiones) y cubre cirugías estéticas. Prótesis e implantes con menos espera que el A2, y ortodoncia al 100% hasta los 35 años en prestadores designados. También tiene asistencia al viajero nacional e internacional.";

const FOOTER =
  "Cartilla completa: https://www.marxen.com.ar/salud/cartilla-medica\nSi querés, te armo la cotización. Un asesor confirma el detalle de tu caso (387 634-8199).";

export function answerHealthPlanQuestion(text: string): string | null {
  if (!looksLikeHealthPlanQuestion(text)) return null;
  const plan = mentionedHealthPlan(text);
  if (plan === "A4") return `${A4}\n\n${FOOTER}`;
  if (plan === "both") return `${A2}\n\n${A4}\n\n${FOOTER}`;
  return `${A2}\n\n${FOOTER}`;
}
