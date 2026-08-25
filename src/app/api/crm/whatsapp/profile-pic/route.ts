import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { fetchWhatsmeowProfilePicUrl } from "@/lib/whatsmeow/client";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const phone = request.nextUrl.searchParams.get("phone") || "";
  if (!phone) {
    return NextResponse.json({ ok: false, error: "phone requerido" }, { status: 400 });
  }

  const url = await fetchWhatsmeowProfilePicUrl(phone);

  // Persistir en BD para no volver a pedirla en cada recarga
  if (url !== null) {
    const supabase = createServiceClient();
    await supabase
      .from("whatsapp_chats")
      .update({ profile_pic_url: url || null })
      .eq("phone", phone);
  }

  return NextResponse.json({ ok: true, url: url ?? "" });
}
