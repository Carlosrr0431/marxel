/**
 * Vista previa del cron de las 7: corre la misma lógica que mañana y manda los mensajes
 * a OTRO número, para ver exactamente qué le va a llegar a Marcos.
 *
 *   npx tsx scripts/preview-whatsapp-digest.mts                  -> manda a 3878630173
 *   npx tsx scripts/preview-whatsapp-digest.mts 3875551234       -> manda a otro número
 *   npx tsx scripts/preview-whatsapp-digest.mts --dry            -> solo analiza y muestra, no envía
 *
 * No guarda estado: la corrida real de mañana sigue siendo la primera. Usa DeepSeek y la
 * cola de WhatsApp reales; los mensajes salen de a uno por minuto (el primero es el encabezado).
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
Object.assign(process.env, env);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const phone = args.find((arg) => !arg.startsWith("--")) || "3878630173";

const { runWhatsappDigest } = await import("../src/lib/crm/whatsapp-digest");
const { normalizeArPhone } = await import("../src/lib/whatsmeow/config");

const to = normalizeArPhone(phone);
if (!to) throw new Error(`Número inválido: ${phone}`);

console.log(dry ? "Modo --dry: analiza y muestra, no envía.\n" : `Se enviará la vista previa a +${to}.\n`);
const started = Date.now();
const result = (await runWhatsappDigest({ dry, preview: !dry, deliverTo: to })) as Record<string, unknown> & {
  detalle?: Array<Record<string, unknown>>;
};
const { detalle, ...resumen } = result;
console.log("Resultado:", JSON.stringify(resumen));
console.log(`Análisis: ${Math.round((Date.now() - started) / 1000)} s`);

if (dry) {
  for (const d of detalle || []) {
    const a = d.analisis as Record<string, unknown> | null;
    console.log(`\n— ${d.nombre} [${d.modo}] avisaría=${d.avisaria}`);
    if (a) console.log(`  ${a.urgencia} · ${a.accion || "(sin acción)"}`);
  }
} else {
  const sent = Number(resumen.enviados || 0) + (resumen.headerSent ? 1 : 0);
  console.log(`\nMensajes en cola: ${sent} (el primero sale ya; después uno por minuto, ~${Math.max(0, sent - 1)} min en total).`);
}
