import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { runWhatsappDigest } from "@/lib/crm/whatsapp-digest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const bearer = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(bearer);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron diario (7:00 hora de Salta = 10:00 UTC). Vercel manda `Authorization: Bearer $CRON_SECRET`.
 * Manual: ?dry=1 analiza sin enviar ni guardar · ?phone=549... limita a un solo chat.
 */
export async function GET(request: Request) {
  if (!String(process.env.CRON_SECRET || "").trim()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const phone = normalizeArPhone(params.get("phone") || "") || undefined;
  try {
    return NextResponse.json(await runWhatsappDigest({ dry: params.get("dry") === "1", onlyPhone: phone }));
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
