import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { fetchWhatsmeowMediaBytes } from "@/lib/whatsmeow/crm-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { messageId } = await context.params;
  const type = request.nextUrl.searchParams.get("type") || "image";
  const downloaded = await fetchWhatsmeowMediaBytes(messageId, type);
  if (!downloaded) {
    return NextResponse.json({ ok: false, error: "Media no disponible" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(downloaded.buffer), {
    headers: {
      "Content-Type": downloaded.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
