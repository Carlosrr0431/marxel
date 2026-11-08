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
