import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { markCrmChatRead } from "@/lib/whatsmeow/crm-chat";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { phone?: unknown };
  const phone = normalizeArPhone(String(body.phone || ""));
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Falta el teléfono" }, { status: 400 });
  }

  await markCrmChatRead(phone);
  return NextResponse.json({ ok: true });
}
