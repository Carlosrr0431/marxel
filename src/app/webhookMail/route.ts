import { NextResponse, type NextRequest } from "next/server";
import { ingestBrevoWebhook } from "@/lib/mailing/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = String(process.env.BREVO_WEBHOOK_SECRET || "").trim();
  if (!expected) return true;
  const header =
    request.headers.get("x-brevo-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";
  const query = request.nextUrl.searchParams.get("secret") || "";
  return header === expected || query === expected;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "https://www.marxen.com.ar/webhookMail",
  });
}

function looksLikeBrevo(body: unknown) {
  const item = Array.isArray(body) ? body[0] : body;
  if (!item || typeof item !== "object") return false;
  const rec = item as Record<string, unknown>;
  return Boolean(rec.event && (rec.email || rec["message-id"] || rec.messageId));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body == null) {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!authorized(request) && !looksLikeBrevo(body)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await ingestBrevoWebhook(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "ingest_error" },
      { status: 500 }
    );
  }
}
