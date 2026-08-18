import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  getAgenteWebhookUrl,
  getMarxenLinePhone,
  getWhatsmeowAgentCode,
  getWhatsmeowApiKey,
  getWhatsmeowWebhookSecret,
} from "@/lib/whatsmeow/config";
import {
  configureWhatsmeowWebhook,
  connectWhatsmeowSession,
  disconnectWhatsmeowSession,
  extractWhatsmeowQr,
  fetchWhatsmeowQr,
  fetchWhatsmeowStatus,
  logoutWhatsmeowSession,
} from "@/lib/whatsmeow/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function expectedSession() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return null;
  return Buffer.from(`marxel:${password}`).toString("base64url");
}

async function requireCrm() {
  const store = await cookies();
  const expected = expectedSession();
  const session = store.get("marxel_crm_session")?.value;
  return Boolean(expected && session === expected);
}

function normalizeStatus(raw: unknown) {
  const v = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!v) return "unknown";
  if (v === "needscan" || v === "qr" || v === "waiting_qr") return "need_scan";
  if (v === "loggedout") return "logged_out";
  return v;
}

function isConnected(statusData: Record<string, unknown> | null) {
  if (!statusData) return false;
  if (statusData.connected === true) return true;
  return normalizeStatus(statusData.status) === "connected";
}

const DISCONNECTED = new Set([
  "need_scan",
  "connecting",
  "disconnected",
  "logged_out",
  "expired",
  "unknown",
]);

async function getSnapshot({ includeQr = false, ensureWebhook = false } = {}) {
  const agentCode = getWhatsmeowAgentCode();
  const phone = getMarxenLinePhone();
  const webhookUrl = getAgenteWebhookUrl();
  const label = "MARXEN · 3876348199";

  if (!getWhatsmeowApiKey()) {
    return {
      ok: false,
      error: "Falta WHATSMEOW_API_KEY en el entorno.",
      agentCode,
      phone,
      label,
      webhookUrl,
      status: "disconnected",
      connected: false,
      qr: null,
    };
  }

  try {
    const statusData = await fetchWhatsmeowStatus(agentCode);
    const connected = isConnected(statusData);
    let status = normalizeStatus(connected ? "connected" : statusData?.status || "disconnected");
    let qr: string | null = null;
    if (includeQr && !connected && DISCONNECTED.has(status)) {
      qr = await fetchWhatsmeowQr(agentCode).catch(() => null);
    }
    if (!connected && !qr && (status === "need_scan" || status === "unknown" || status === "connecting")) {
      status = "disconnected";
    }
    if (ensureWebhook) {
      const current = String(statusData?.webhook_url || "").replace(/\/+$/, "");
      if (!current || current !== webhookUrl.replace(/\/+$/, "")) {
        await configureWhatsmeowWebhook(agentCode, webhookUrl, getWhatsmeowWebhookSecret()).catch(
          () => null
        );
      }
    }
    return {
      ok: true,
      agentCode,
      phone,
      label,
      webhookUrl,
      status,
      connected,
      qr,
      livePhone: statusData?.phone ? String(statusData.phone) : null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "status_error",
      agentCode,
      phone,
      label,
      webhookUrl,
      status: "disconnected",
      connected: false,
      qr: null,
    };
  }
}

async function waitForQr(agentCode: string) {
  let qr: string | null = null;
  for (let i = 0; i < 12; i += 1) {
    qr = await fetchWhatsmeowQr(agentCode);
    if (qr) break;
    await new Promise((r) => setTimeout(r, 700));
  }
  return qr;
}

export async function GET() {
  if (!(await requireCrm())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const snapshot = await getSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(request: NextRequest) {
  if (!(await requireCrm())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String((body as { action?: string }).action || "connect")
    .trim()
    .toLowerCase();
  const agentCode = getWhatsmeowAgentCode();
  const webhookUrl = getAgenteWebhookUrl();
  const secret = getWhatsmeowWebhookSecret();

  try {
    if (action === "reset" || action === "logout" || action === "disconnect") {
      await logoutWhatsmeowSession(agentCode).catch(() => null);
      await new Promise((r) => setTimeout(r, 350));
      await disconnectWhatsmeowSession(agentCode).catch(() => null);
      await new Promise((r) => setTimeout(r, 250));
      const snapshot = await getSnapshot({ includeQr: false });
      return NextResponse.json({
        ...snapshot,
        ok: true,
        reset: true,
        status: snapshot.connected ? snapshot.status : "disconnected",
      });
    }

    const forceNewQr = action === "refresh-qr";
    if (forceNewQr) {
      await disconnectWhatsmeowSession(agentCode).catch(() => null);
      await new Promise((r) => setTimeout(r, 400));
    }

    await configureWhatsmeowWebhook(agentCode, webhookUrl, secret);
    const connectResult = await connectWhatsmeowSession(agentCode, webhookUrl);
    if (!connectResult.ok && connectResult.data?.success === false) {
      return NextResponse.json(
        { ok: false, error: String(connectResult.data?.message || "connect_failed") },
        { status: 400 }
      );
    }

    const qr =
      extractWhatsmeowQr(connectResult.data) || (await waitForQr(agentCode));
    if (forceNewQr && !qr) {
      return NextResponse.json(
        { ok: false, error: "No se pudo regenerar el QR. Intentá de nuevo." },
        { status: 400 }
      );
    }

    const snapshot = await getSnapshot({ includeQr: Boolean(qr) });
    return NextResponse.json({ ...snapshot, qr: qr || snapshot.qr });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
