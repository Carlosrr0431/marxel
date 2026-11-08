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

export type VisitTrail = {
  landing: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pages: string[];
  visits: number;
  lastSeen: number;
};

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

export function readTrail(): VisitTrail | null {
  try {
    const raw = localStorage.getItem(TRAIL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as VisitTrail;
    if (!data || !Array.isArray(data.pages)) return null;
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
  const trail: VisitTrail = {
    landing: current?.landing || pathname,
    referrer: current?.referrer || externalReferrer(document.referrer),
    utmSource: current?.utmSource || params.get("utm_source"),
    utmMedium: current?.utmMedium || params.get("utm_medium"),
    utmCampaign: current?.utmCampaign || params.get("utm_campaign"),
    pages: pages.slice(-8),
    visits: (current?.visits || 0) + (freshVisit ? 1 : 0),
    lastSeen: now,
  };
  localStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  return trail;
}

export function postCookieVisit(
  visitorId: string,
  trail: VisitTrail,
  extra?: Record<string, unknown>,
) {
  void fetch("/api/cookies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      choice: "aceptado",
      visitorId,
      page: trail.pages[trail.pages.length - 1] || trail.landing,
      landing: trail.landing,
      pages: trail.pages.join(" · "),
      visitas: trail.visits,
      referrer: trail.referrer,
      utm_source: trail.utmSource,
      utm_medium: trail.utmMedium,
      utm_campaign: trail.utmCampaign,
      ...extra,
    }),
  }).catch(() => undefined);
}
