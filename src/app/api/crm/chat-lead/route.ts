import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export const dynamic = "force-dynamic";

function phoneFilter(phone: string) {
  const n = normalizeArPhone(phone);
  if (!n) return { n: "", last8: "", or: "" };
  const last8 = n.slice(-8);
  const parts = [`celular.eq.${n}`];
  if (n.startsWith("549") && n.length > 5) parts.push(`celular.eq.${n.slice(3)}`);
  if (last8.length >= 8) parts.push(`celular.ilike.%${last8}`);
  return { n, last8, or: parts.join(",") };
}

export async function GET(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const phone = String(request.nextUrl.searchParams.get("phone") || "");
  const { n, last8, or } = phoneFilter(phone);
  if (!n || !or) {
    return NextResponse.json({ ok: true, lead: null, seguimientos: [], actividades: [] });
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("*")
    .or(or)
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const lead =
    (rows || []).find((row) => {
      const other = normalizeArPhone(String(row.celular || ""));
      return other === n || (last8 && other.slice(-8) === last8);
    }) || null;

  if (!lead) {
    return NextResponse.json({ ok: true, lead: null, seguimientos: [], actividades: [] });
  }

  const [{ data: seguimientos }, { data: actividades }] = await Promise.all([
    supabase
      .from("seguimientos")
      .select("*")
      .eq("lead_id", lead.id)
      .order("programado_para", { ascending: true })
      .limit(20),
    supabase
      .from("actividades")
      .select("id,created_at,titulo,detalle,tipo,autor")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return NextResponse.json({
    ok: true,
    lead,
    seguimientos: seguimientos || [],
    actividades: actividades || [],
  });
}
