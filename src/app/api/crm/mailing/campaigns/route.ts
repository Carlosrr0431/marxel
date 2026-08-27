import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { emptyStats, groupStats } from "@/lib/mailing/stats";

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
    .limit(40);

  if (error) {
    return NextResponse.json({ ok: true, campaigns: [], setup: error.message });
  }

  const campaigns = data || [];
  const ids = campaigns.map((row) => row.id);
  let statsMap = groupStats([]);
  if (ids.length) {
    const { data: recipients } = await supabase
      .from("mailing_recipients")
      .select(
        "campaign_id,delivered_at,opened_at,clicked_at,bounced_at,complained_at,unsubscribed_at,proxy_opened_at"
      )
      .in("campaign_id", ids);
    statsMap = groupStats(recipients || []);
  }

  return NextResponse.json({
    ok: true,
    campaigns: campaigns.map((row) => ({
      ...row,
      stats: statsMap.get(row.id) || emptyStats(row.sent_count || row.recipient_count),
    })),
  });
}
