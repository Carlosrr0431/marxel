import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isCrmChatSchemaMissing, markCrmChatRead } from "@/lib/whatsmeow/crm-chat";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

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

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_chat_messages")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(400);

  if (error) {
    if (isCrmChatSchemaMissing(error)) {
      return NextResponse.json({
        ok: false,
        error: "Falta aplicar el SQL supabase/whatsapp_crm_chat.sql en Supabase.",
        missingTable: true,
        messages: [],
      });
    }
    return NextResponse.json({ ok: false, error: error.message, messages: [] }, { status: 500 });
  }

  await markCrmChatRead(phone);
  return NextResponse.json({ ok: true, phone, messages: data || [] });
}
