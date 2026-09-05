import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { ensureCrmChatContact, isCrmChatSchemaMissing } from "@/lib/whatsmeow/crm-chat";

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

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: unknown;
    name?: unknown;
    leadId?: unknown;
  };

  const supabase = createServiceClient();
  let phone = String(body.phone || "");
  let name = String(body.name || "").trim();
  const leadId = String(body.leadId || "").trim();

  if (leadId) {
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id,nombre,celular")
      .eq("id", leadId)
      .maybeSingle();
    if (error || !lead) {
      return NextResponse.json({ ok: false, error: "No encontramos ese lead" }, { status: 404 });
    }
    phone = String(lead.celular || "");
    name = String(lead.nombre || "").trim() || name;
  }

  const result = await ensureCrmChatContact(phone, name);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  if (leadId) {
    await supabase.from("actividades").insert({
      lead_id: leadId,
      tipo: "sistema",
      titulo: result.created ? "Contacto creado en Chats" : "Chat abierto desde el CRM",
      detalle: `WhatsApp ${normalizeArPhone(result.phone)}`,
      autor: "asesor",
    });
  }

  return NextResponse.json({
    ok: true,
    phone: result.phone,
    created: result.created,
    chat: result.chat,
  });
}
