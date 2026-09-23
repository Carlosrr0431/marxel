import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { SITE_URL } from "@/lib/seo";

const CONNECTION_COOKIE = "marxel_google_cal";
const STATE_COOKIE = "marxel_google_oauth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const TZ = "America/Argentina/Salta";

export const GOOGLE_REDIRECT_URI = `${SITE_URL}/api/crm/google/callback`;

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function secretKey() {
  return createHash("sha256").update(process.env.CRM_PASSWORD || "marxel").digest();
}

function seal(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function open(value: string) {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function signOAuthState(state: string) {
  return createHmac("sha256", process.env.CRM_PASSWORD || "marxel").update(state).digest("hex");
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: `openid email ${CALENDAR_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type Connection = { email: string; refreshToken: string };

export async function readGoogleConnection(): Promise<Connection | null> {
  const raw = (await cookies()).get(CONNECTION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(open(raw)) as Connection;
    if (!parsed.email || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function connectionCookie(email: string, refreshToken: string) {
  return {
    name: CONNECTION_COOKIE,
    value: seal(JSON.stringify({ email, refreshToken })),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    },
  };
}

export const oauthStateCookieName = STATE_COOKIE;

async function accessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || "No se pudo renovar el acceso de Google");
  }
  return json.access_token;
}

export async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(json.error || "Google no devolvió permiso para el calendario");
  }
  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${json.access_token}` },
  });
  const user = (await profile.json()) as { email?: string };
  if (!user.email) throw new Error("No pudimos leer el Gmail");
  return { email: user.email, refreshToken: json.refresh_token, accessToken: json.access_token };
}

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  htmlLink: string;
};

export async function listGoogleEvents(from: Date, to: Date): Promise<GoogleCalendarEvent[]> {
  const connection = await readGoogleConnection();
  if (!connection || !googleConfigured()) return [];
  const token = await accessToken(connection.refreshToken);
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: { id?: string; summary?: string; htmlLink?: string; start?: { dateTime?: string; date?: string } }[];
  };
  return (json.items || [])
    .map((item) => {
      const start = item.start?.dateTime || (item.start?.date ? `${item.start.date}T09:00:00-03:00` : "");
      if (!item.id || !start) return null;
      return {
        id: item.id,
        title: item.summary || "(Sin título)",
        start,
        htmlLink: item.htmlLink || "https://calendar.google.com",
      };
    })
    .filter((item): item is GoogleCalendarEvent => Boolean(item));
}

export async function upsertGoogleEvent(input: {
  eventId?: string | null;
  title: string;
  description?: string | null;
  start: string;
}) {
  const connection = await readGoogleConnection();
  if (!connection || !googleConfigured()) return null;
  const token = await accessToken(connection.refreshToken);
  const start = new Date(input.start);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const payload = {
    summary: input.title,
    description: input.description || "Seguimiento MARXEN CRM",
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
  };
  const path = input.eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId)}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const res = await fetch(path, {
    method: input.eventId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { id?: string };
  return json.id || null;
}
