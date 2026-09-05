import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import {
  isChatAgentEnabled,
  isWhatsappAgentEnabled,
  resetWhatsappChatForReplay,
  setChatAgentEnabled,
} from "@/lib/whatsmeow/agent-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const phone = normalizeArPhone(request.nextUrl.searchParams.get("phone") || "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Falta el teléfono" }, { status: 400 });
  }
  const [agentEnabled, globalEnabled] = await Promise.all([
    isChatAgentEnabled(phone),
    isWhatsappAgentEnabled(),
  ]);
  return NextResponse.json({ ok: true, phone, agentEnabled, globalEnabled });
}

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    phone?: unknown;
    action?: unknown;
    enabled?: unknown;
  };
  const phone = normalizeArPhone(String(body.phone || ""));
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Falta el teléfono" }, { status: 400 });
  }

  try {
    if (body.action === "reset") {
      const result = await resetWhatsappChatForReplay(phone);
      return NextResponse.json({
        ok: true,
        phone: result.phone,
        leadId: result.leadId,
        agentEnabled: true,
      });
    }
    if (body.action === "ai") {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ ok: false, error: "Enviá enabled true o false" }, { status: 400 });
      }
      await setChatAgentEnabled(phone, body.enabled);
      return NextResponse.json({ ok: true, phone, agentEnabled: body.enabled });
    }
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo actualizar el chat" },
      { status: 500 }
    );
  }
}
