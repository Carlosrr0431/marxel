import { handleWhatsappInbound, webhookSecretOk } from "@/lib/whatsmeow/handle-inbound";
import { ACCUMULATION_MS } from "@/lib/whatsmeow/conversations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return Response.json({
    ok: true,
    service: "Agente_IA",
    line: "MARXEN",
    accumulationMs: ACCUMULATION_MS,
  });
}

export async function POST(request: Request) {
  if (!webhookSecretOk(request)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await handleWhatsappInbound(body);
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[Agente_IA]", err);
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
