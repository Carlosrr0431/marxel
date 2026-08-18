/**
 * Webhook parametrizado por teléfono de negocio (línea whatsmeow).
 * Mismo handler que /api/Agente_IA.
 *   POST /api/Agente_IA/5493876348199
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export { POST, GET } from "../route";
