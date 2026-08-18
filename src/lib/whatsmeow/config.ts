export const MARXEN_WA_PHONE = "3876348199";
export const MARXEN_WA_AGENT = "MARXEN";

export function getWhatsmeowApiBase() {
  return (
    process.env.WHATSMEOW_API_URL ||
    process.env.NEXT_PUBLIC_WHATSMEOW_API_URL ||
    "https://whatsmeow-api-production.up.railway.app"
  ).replace(/\/$/, "");
}

export function getWhatsmeowApiKey() {
  return String(
    process.env.WHATSMEOW_API_KEY || process.env.NEXT_PUBLIC_WHATSMEOW_API_KEY || ""
  ).trim();
}

export function getWhatsmeowWebhookSecret() {
  return String(process.env.WHATSMEOW_WEBHOOK_SECRET || "").trim();
}

export function getWhatsmeowAgentCode() {
  return String(process.env.WHATSMEOW_AGENT_CODE || MARXEN_WA_AGENT).trim() || MARXEN_WA_AGENT;
}

export function normalizeArPhone(value: string) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@g.us") || raw.includes("@lid") || raw.includes("@broadcast")) return "";
  if (raw.includes("@")) raw = raw.split("@")[0].split(":")[0];
  let clean = raw.replace(/\D/g, "");
  if (!clean) return "";
  if (clean.startsWith("0")) clean = clean.replace(/^0+/, "");
  if (clean.length > 13 && !clean.startsWith("54")) return "";
  if (clean.startsWith("549")) return clean;
  if (clean.startsWith("54") && !clean.startsWith("549")) return `549${clean.slice(2)}`;
  if (clean.length >= 8 && clean.length <= 11) return `549${clean}`;
  return clean;
}

export function getMarxenLinePhone() {
  return normalizeArPhone(process.env.WHATSMEOW_PHONE || MARXEN_WA_PHONE);
}

export function getAppBaseUrl() {
  const explicit = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();
  if (vercel) return `https://${vercel}`.replace(/\/$/, "");
  return "https://marxel-omega.vercel.app";
}

export function getAgenteWebhookUrl() {
  const fromEnv = String(process.env.WHATSMEOW_WEBHOOK_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `${getAppBaseUrl()}/api/Agente_IA/${getMarxenLinePhone()}`;
}
