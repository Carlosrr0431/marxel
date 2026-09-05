export class ScB2bError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status = 502, body: unknown = null) {
    super(message);
    this.name = "ScB2bError";
    this.status = status;
    this.body = body;
  }
}

export type ScB2bBinary = {
  kind: "binary";
  contentType: string;
  filename: string;
  base64: string;
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export type ScB2bConfig = {
  baseUrl: string;
  username: string;
  password: string;
  producerCode: string;
  clientApp: string;
};

export function scB2bConfig(): ScB2bConfig {
  return {
    baseUrl: (process.env.SC_B2B_BASE_URL || "https://api-uat.sancristobalonline.com.ar/b2b-gateway").replace(
      /\/$/,
      ""
    ),
    username: process.env.SC_B2B_USERNAME || "",
    password: process.env.SC_B2B_PASSWORD || "",
    producerCode: process.env.SC_B2B_PRODUCER_CODE || "08-006051",
    clientApp: process.env.SC_B2B_CLIENT_APP || "MarxenPI",
  };
}

export function isScB2bConfigured() {
  const cfg = scB2bConfig();
  return Boolean(cfg.username && cfg.password);
}

export function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function messageFromBody(body: unknown, status: number) {
  if (!body || typeof body !== "object") return `San Cristóbal ${status}`;
  const row = body as Record<string, unknown>;
  if (typeof row.Message === "string" && row.Message) return row.Message;
  if (typeof row.message === "string" && row.message) return row.message;
  if (typeof row.failureReason === "string" && row.failureReason) return row.failureReason;
  if (typeof row.errorMessage === "string" && row.errorMessage) return row.errorMessage;
  if (Array.isArray(row.Messages)) {
    const parts = row.Messages.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const msg = item as Record<string, unknown>;
        return String(msg.Description || msg.Message || msg.description || "").trim();
      }
      return "";
    }).filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }
  return `San Cristóbal ${status}`;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function login(): Promise<TokenCache> {
  const cfg = scB2bConfig();
  if (!cfg.username || !cfg.password) {
    throw new ScB2bError("Faltan SC_B2B_USERNAME y SC_B2B_PASSWORD", 503);
  }

  const res = await fetch(`${cfg.baseUrl}/api/Auth/LoginAsync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ UserName: cfg.username, Password: cfg.password }),
    cache: "no-store",
  });
  const body = parseJson(await res.text());
  if (!res.ok) {
    throw new ScB2bError(messageFromBody(body, res.status), res.status, body);
  }

  const auth = (body || {}) as Record<string, unknown>;
  const token = String(auth.Auth_Token || auth.auth_Token || auth.token || "");
  if (!token) {
    throw new ScB2bError("San Cristóbal no devolvió token", 502, body);
  }
  const expiresIn = Number(auth.Expires_In || auth.expires_In || 90);
  const ttlMs = Math.max(30, expiresIn - 20) * 1000;
  return { token, expiresAt: Date.now() + ttlMs };
}

async function bearerToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  tokenCache = await login();
  return tokenCache.token;
}

export function clearScB2bToken() {
  tokenCache = null;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  binary?: boolean;
};

async function rawRequest(path: string, options: RequestOptions, retried = false): Promise<Response> {
  const cfg = scB2bConfig();
  const token = await bearerToken();
  const headers: Record<string, string> = {
    Accept: options.binary ? "*/*" : "application/json",
    Authorization: `Bearer ${token}`,
    "X-Client-App": cfg.clientApp,
    ...options.headers,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${cfg.baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (res.status === 401 && !retried) {
    clearScB2bToken();
    return rawRequest(path, options, true);
  }
  return res;
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] || fallback;
}

export async function scB2bGet(path: string): Promise<unknown> {
  const res = await rawRequest(path, { method: "GET" });
  const text = await res.text();
  const body = parseJson(text);
  if (!res.ok) {
    throw new ScB2bError(messageFromBody(body, res.status), res.status, body);
  }
  if (body && typeof body === "object" && (body as { HasError?: boolean }).HasError) {
    throw new ScB2bError(messageFromBody(body, res.status), 422, body);
  }
  return body;
}

export async function scB2bPost(path: string, body: unknown): Promise<unknown> {
  const res = await rawRequest(path, { method: "POST", body });
  const text = await res.text();
  const parsed = parseJson(text);
  if (!res.ok) {
    throw new ScB2bError(messageFromBody(parsed, res.status), res.status, parsed);
  }
  if (parsed && typeof parsed === "object" && (parsed as { HasError?: boolean }).HasError) {
    throw new ScB2bError(messageFromBody(parsed, res.status), 422, parsed);
  }
  return parsed;
}

export async function scB2bDownload(path: string, filename: string): Promise<ScB2bBinary> {
  const res = await rawRequest(path, { method: "GET", binary: true });
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("json") || contentType.includes("text/plain")) {
    const parsed = parseJson(buffer.toString("utf8"));
    if (!res.ok) {
      throw new ScB2bError(messageFromBody(parsed, res.status), res.status, parsed);
    }
    throw new ScB2bError(messageFromBody(parsed, res.status || 422), res.status || 422, parsed);
  }

  if (!res.ok) {
    throw new ScB2bError(`No se pudo descargar el reporte (${res.status})`, res.status);
  }

  return {
    kind: "binary",
    contentType: contentType || "application/pdf",
    filename: filenameFromDisposition(res.headers.get("content-disposition"), filename),
    base64: buffer.toString("base64"),
  };
}

export async function scB2bLoginProbe() {
  clearScB2bToken();
  const cache = await login();
  tokenCache = cache;
  return {
    ok: true,
    expiresAt: cache.expiresAt,
    producerCode: scB2bConfig().producerCode,
  };
}
