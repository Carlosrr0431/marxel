import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  isWhatsappAgentEnabled,
  setWhatsappAgentEnabled,
  WHATSAPP_AGENT_ALLOWLIST,
  WHATSAPP_TEST_PHONE,
} from "@/lib/whatsmeow/agent-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireCrm() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return false;
  const expected = Buffer.from(`marxel:${password}`).toString("base64url");
  const session = (await cookies()).get("marxel_crm_session")?.value;
  return session === expected;
}

function payload(enabled: boolean) {
  return {
    ok: true,
    enabled,
    testPhone: WHATSAPP_TEST_PHONE,
    allowlist: WHATSAPP_AGENT_ALLOWLIST,
  };
}

export async function GET() {
  if (!(await requireCrm())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const enabled = await isWhatsappAgentEnabled();
  return NextResponse.json(payload(enabled));
}

export async function POST(request: NextRequest) {
  if (!(await requireCrm())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Enviá { enabled: true } o { enabled: false }" },
      { status: 400 }
    );
  }
  const enabled = body.enabled;
  try {
    await setWhatsappAgentEnabled(enabled);
    return NextResponse.json(payload(enabled));
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo guardar. Creá la tabla whatsapp_conversations en Supabase.",
      },
      { status: 500 }
    );
  }
}
