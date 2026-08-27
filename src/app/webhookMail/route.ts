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

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body == null) {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
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
