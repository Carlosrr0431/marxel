import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync } from "crypto";
import { cookies } from "next/headers";
import { SITE_URL } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/server";

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

function seal(value: string, key: Buffer = secretKey()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function open(value: string, key: Buffer = secretKey()) {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
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

/**
 * Copia cifrada de la conexión en la base, para que el cron pueda leer el calendario
 * sin que haya una sesión abierta. La clave mezcla CRM_PASSWORD y GOOGLE_CLIENT_SECRET,
 * que solo existen en el servidor: leer la fila con la clave pública no alcanza.
 * Sigue la misma convención que la fila "__agent__" de whatsapp_conversations.
 */
const SERVER_ROW = "__google_calendar__";

function serverKey() {
  return scryptSync(
    `${process.env.CRM_PASSWORD || "marxel"}|${process.env.GOOGLE_CLIENT_SECRET || ""}`,
    "marxel-google-server",
    32,
  );
}

export async function readServerConnection(): Promise<Connection | null> {
  if (!process.env.GOOGLE_CLIENT_SECRET) return null;
  const { data } = await createServiceClient()
    .from("whatsapp_conversations")
    .select("quote_state")
    .eq("phone", SERVER_ROW)
    .maybeSingle();
  const sealed = (data?.quote_state as { sealed?: string } | null)?.sealed;
  if (!sealed) return null;
  try {
    const parsed = JSON.parse(open(sealed, serverKey())) as Connection;
    return parsed.email && parsed.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveServerConnection(connection: Connection) {
  if (!process.env.GOOGLE_CLIENT_SECRET) return;
  const { error } = await createServiceClient().from("whatsapp_conversations").upsert(
    {
      phone: SERVER_ROW,
      quote_state: { sealed: seal(JSON.stringify(connection), serverKey()) },
      history: [],
      pending_poll: null,
      last_message_id: null,
      last_event: "google:calendar",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );
  if (error) throw new Error(error.message);
}

export async function clearServerConnection() {
  await createServiceClient().from("whatsapp_conversations").delete().eq("phone", SERVER_ROW);
}

/** Guarda la conexión del navegador en la base si todavía no está o cambió. */
export async function persistGoogleConnection(connection: Connection) {
  const saved = await readServerConnection();
  if (saved?.email === connection.email && saved.refreshToken === connection.refreshToken) return;
  await saveServerConnection(connection);
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
  description: string;
  colorId: string;
};

export async function listGoogleEvents(
  from: Date,
  to: Date,
  options: { connection?: Connection | null; strict?: boolean } = {},
): Promise<GoogleCalendarEvent[]> {
  const connection = options.connection ?? (await readGoogleConnection());
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
  if (!res.ok) {
    if (options.strict) throw new Error(`Google respondió ${res.status}`);
    return [];
  }
  const json = (await res.json()) as {
    items?: {
      id?: string;
      summary?: string;
      description?: string;
      htmlLink?: string;
      colorId?: string;
      start?: { dateTime?: string; date?: string };
    }[];
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
        description: item.description || "",
        colorId: item.colorId || "",
      };
    })
    .filter((item): item is GoogleCalendarEvent => Boolean(item));
}

export async function findGoogleEventIdByMarker(seguimientoId: string) {
  const connection = await readGoogleConnection();
  if (!connection || !googleConfigured() || !seguimientoId) return null;
  const token = await accessToken(connection.refreshToken);
  const marker = `[MARXEN:${seguimientoId}]`;
  const params = new URLSearchParams({
    q: marker,
    singleEvents: "true",
    maxResults: "8",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { items?: { id?: string; description?: string }[] };
  const hit = (json.items || []).find((item) => (item.description || "").includes(marker));
  return hit?.id || null;
}

export async function upsertGoogleEvent(input: {
  eventId?: string | null;
  title: string;
  description?: string | null;
  start: string;
  reminderMinutes?: number;
  colorId?: string | null;
  everyDays?: number;
}) {
  const connection = await readGoogleConnection();
  if (!connection || !googleConfigured()) return null;
  const token = await accessToken(connection.refreshToken);
  const start = new Date(input.start);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const minutes = input.reminderMinutes ?? 0;
  const everyDays = Math.min(365, Math.floor(input.everyDays || 0));
  const payload = {
    summary: input.title,
    description: input.description || "Seguimiento MARXEN CRM",
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    ...(input.colorId ? { colorId: input.colorId } : {}),
    ...(everyDays >= 1 ? { recurrence: [`RRULE:FREQ=DAILY;INTERVAL=${everyDays}`] } : {}),
    reminders: minutes
      ? {
          useDefault: false,
          overrides: [
            { method: "popup", minutes },
            { method: "email", minutes },
          ],
        }
      : { useDefault: false, overrides: [] },
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

export async function deleteGoogleEvent(eventId: string) {
  const connection = await readGoogleConnection();
  if (!connection || !googleConfigured() || !eventId) return;
  const token = await accessToken(connection.refreshToken);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error("No se pudo eliminar en Google Calendar");
  }
}
