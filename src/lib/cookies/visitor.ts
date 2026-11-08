export const VISITOR_COOKIE = "mx_visita";
export const CHOICE_COOKIE = "mx_cookies";

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVisitorId(value: string) {
  return VISITOR_ID.test(value);
}

export function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const row = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  if (!row) return "";
  return decodeURIComponent(row.slice(name.length + 1));
}

export function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
}

const TRAIL_KEY = "mx_recorrido";
const VISIT_GAP = 30 * 60 * 1000;

export type TrailStep = {
  page: string;
  note: string;
  at: number;
  ms: number | null;
};

export type VisitTrail = {
  landing: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pages: string[];
  steps: TrailStep[];
  visits: number;
  lastSeen: number;
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Inicio",
  "/cotizar": "Cotizar",
  "/contacto": "Contacto",
  "/formulario": "Formulario",
  "/seguro-de-auto": "Seguro de auto",
  "/seguro-de-moto": "Seguro de moto",
  "/seguro-de-hogar": "Hogar",
  "/salud": "Salud",
  "/viajero": "Viajero",
  "/seguros": "Seguros",
  "/quienes-somos": "Quiénes somos",
  "/preguntas-frecuentes": "Preguntas",
  "/companias": "Compañías",
  "/privacidad": "Privacidad",
};

const DOUBT_MS = 30_000;

function externalReferrer(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (!host || host === window.location.hostname.replace(/^www\./, "")) return null;
    if (host.endsWith("marxen.com.ar")) return null;
    return value.slice(0, 240);
  } catch {
    return null;
  }
}

export function savedContact() {
  try {
    const raw = localStorage.getItem("mx_cotizacion_auto");
    if (!raw) return null;
    const data = JSON.parse(raw) as { nombre?: string; celular?: string; plate?: string; age?: string };
    const phone = String(data.celular || "").replace(/\D/g, "");
    if (phone.length < 8) return null;
    return {
      nombre: String(data.nombre || "").trim(),
      celular: String(data.celular || "").trim(),
      patente: String(data.plate || "").trim(),
      edad: Number(data.age) || null,
      interes: "auto",
    };
  } catch {
    return null;
  }
}

export function readTrail(): VisitTrail | null {
  try {
    const raw = localStorage.getItem(TRAIL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as VisitTrail;
    if (!data || !Array.isArray(data.pages)) return null;
    if (!Array.isArray(data.steps)) data.steps = [];
    return data;
  } catch {
    return null;
  }
}

export function touchTrail(pathname: string) {
  const now = Date.now();
  const current = readTrail();
  const freshVisit = !current || now - current.lastSeen > VISIT_GAP;
  const params = new URLSearchParams(window.location.search);
  const pages = current?.pages ? [...current.pages] : [];
  if (pathname && pages[pages.length - 1] !== pathname) pages.push(pathname);
  const steps = (current?.steps || []).slice(-15).map((step) => ({ ...step }));
  const last = steps[steps.length - 1];
  if (last && last.page === pathname) {
    if (last.ms != null) steps[steps.length - 1] = { ...last, at: now - last.ms, ms: null };
  } else {
    if (last && last.ms == null) steps[steps.length - 1] = { ...last, ms: Math.max(0, now - last.at) };
    steps.push({ page: pathname, note: "", at: now, ms: null });
  }
  const trail: VisitTrail = {
    landing: current?.landing || pathname,
    referrer: current?.referrer || externalReferrer(document.referrer),
    utmSource: current?.utmSource || params.get("utm_source"),
    utmMedium: current?.utmMedium || params.get("utm_medium"),
    utmCampaign: current?.utmCampaign || params.get("utm_campaign"),
    pages: pages.slice(-12),
    steps: steps.slice(-16),
    visits: (current?.visits || 0) + (freshVisit ? 1 : 0),
    lastSeen: now,
  };
  localStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  return trail;
}

function writeTrail(trail: VisitTrail) {
  localStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  return trail;
}

export function noteTrail(note: string) {
  const path = window.location.pathname;
  const trail = touchTrail(path);
  const steps = trail.steps.map((step, index) =>
    index === trail.steps.length - 1 ? { ...step, note } : step,
  );
  return writeTrail({ ...trail, steps, lastSeen: Date.now() });
}

export function closeTrail() {
  const current = readTrail();
  if (!current?.steps?.length) return current;
  const now = Date.now();
  const steps = current.steps.map((step, index) => {
    if (index !== current.steps.length - 1 || step.ms != null) return step;
    return { ...step, ms: Math.max(0, now - step.at) };
  });
  return writeTrail({ ...current, steps, lastSeen: now });
}

function pageLabel(path: string) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith("/guias")) return "Guía";
  if (path.startsWith("/seguro-de-auto")) return "Seguro de auto";
  if (path.startsWith("/salud")) return "Salud";
  const last = path.split("/").filter(Boolean).pop();
  return last ? last.replace(/-/g, " ") : "Inicio";
}

function durationLabel(ms: number) {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 5) return "";
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  return min === 1 ? "1 min" : `${min} min`;
}

export function trailSummary(trail: VisitTrail) {
  const now = Date.now();
  return (trail.steps || [])
    .map((step, index) => {
      const spent = step.ms == null ? now - step.at : step.ms;
      const next = trail.steps[index + 1];
      const left = Boolean(next && next.page !== step.page && spent >= DOUBT_MS);
      const parts = [pageLabel(step.page)];
      const time = durationLabel(spent);
      if (time) parts.push(time);
      if (step.note) parts.push(step.note);
      if (left) parts.push("se fue");
      return parts.join(" · ");
    })
    .join(" → ");
}

export function postCookieVisit(
  visitorId: string,
  trail: VisitTrail,
  extra?: Record<string, unknown>,
  keepalive = false,
) {
  const body = JSON.stringify({
    choice: "aceptado",
    visitorId,
    page: trail.pages[trail.pages.length - 1] || trail.landing,
    landing: trail.landing,
    pages: trail.pages.join(" · "),
    recorrido: trailSummary(trail),
    visitas: trail.visits,
    referrer: trail.referrer,
    utm_source: trail.utmSource,
    utm_medium: trail.utmMedium,
    utm_campaign: trail.utmCampaign,
    ...extra,
  });
  if (keepalive && navigator.sendBeacon) {
    navigator.sendBeacon("/api/cookies", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/cookies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
  }).catch(() => undefined);
}
