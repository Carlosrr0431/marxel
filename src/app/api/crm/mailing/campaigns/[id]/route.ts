import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { emptyStats, statsFromRecipients } from "@/lib/mailing/stats";
import { syncCampaignFromBrevo } from "@/lib/mailing/ingest";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data: campaign, error } = await supabase
    .from("mailing_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!campaign) {
    return NextResponse.json({ ok: false, error: "Campaña no encontrada" }, { status: 404 });
  }

  const { data: seedRecipients } = await supabase
    .from("mailing_recipients")
    .select("email,message_id")
    .eq("campaign_id", id);

  await syncCampaignFromBrevo({
    campaignId: id,
    tag: campaign.tag,
    createdAt: campaign.created_at,
    emails: (seedRecipients || []).map((row) => String(row.email || "")),
    messageIds: (seedRecipients || []).map((row) => String(row.message_id || "")).filter(Boolean),
  }).catch(() => undefined);

  const [{ data: recipients }, { data: events }] = await Promise.all([
    supabase
      .from("mailing_recipients")
      .select("*")
      .eq("campaign_id", id)
      .order("email", { ascending: true }),
    supabase
      .from("mailing_events")
      .select("id,email,event,link,reason,device,occurred_at,message_id")
      .eq("campaign_id", id)
      .order("occurred_at", { ascending: false })
      .limit(400),
  ]);

  return NextResponse.json({
    ok: true,
    campaign,
    recipients: recipients || [],
    events: events || [],
    stats: statsFromRecipients(recipients || [], campaign.sent_count || campaign.recipient_count),
  });
}
