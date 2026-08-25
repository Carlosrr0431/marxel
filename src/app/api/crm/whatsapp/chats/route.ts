import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isCrmChatSchemaMissing } from "@/lib/whatsmeow/crm-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_chats")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(400);

  if (error) {
    if (isCrmChatSchemaMissing(error)) {
      return NextResponse.json({
        ok: false,
        error: "Falta aplicar el SQL supabase/whatsapp_crm_chat.sql en Supabase.",
        missingTable: true,
        chats: [],
      });
    }
    return NextResponse.json({ ok: false, error: error.message, chats: [] }, { status: 500 });
  }

  return NextResponse.json({ ok: true, chats: data || [] });
}
