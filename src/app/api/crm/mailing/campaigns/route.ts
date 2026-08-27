import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("mailing_campaigns")
    .select("id,created_at,subject,template_id,recipient_count,sent_count,status,error")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: true, campaigns: [], setup: error.message });
  }
  return NextResponse.json({ ok: true, campaigns: data || [] });
}
