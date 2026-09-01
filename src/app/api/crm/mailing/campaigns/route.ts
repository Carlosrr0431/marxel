import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { addStats, emptyStats, emptyTotals, groupStats } from "@/lib/mailing/stats";

export const dynamic = "force-dynamic";

const PAGE = 1000;

async function loadTotals(supabase: ReturnType<typeof createServiceClient>) {
  const skip = new Set<string>();
  const totals = emptyTotals();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mailing_campaigns")
      .select("id,sent_count,status")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const row of rows) {
      const id = String(row.id);
      const status = String(row.status || "");
      if (status === "test" || status === "failed") {
        skip.add(id);
        continue;
      }
      totals.campaigns += 1;
      totals.sent += Number(row.sent_count) || 0;
    }
    if (rows.length < PAGE) break;
  }

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mailing_recipients")
      .select(
        "campaign_id,delivered_at,opened_at,clicked_at,bounced_at,complained_at,unsubscribed_at,proxy_opened_at"
      )
      .neq("last_event", "queued")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const row of rows) {
      if (skip.has(String(row.campaign_id))) continue;
      if (row.delivered_at) totals.delivered += 1;
      if (row.opened_at) totals.opened += 1;
      if (row.clicked_at) totals.clicked += 1;
      if (row.bounced_at) totals.bounced += 1;
      if (row.complained_at) totals.complained += 1;
      if (row.unsubscribed_at) totals.unsubscribed += 1;
      if (row.proxy_opened_at) totals.proxy += 1;
    }
    if (rows.length < PAGE) break;
  }

  return totals;
}

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
    return NextResponse.json({
      ok: true,
      campaigns: [],
      totals: emptyTotals(),
      setup: error.message,
    });
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

  let totals = emptyTotals();
  try {
    totals = await loadTotals(supabase);
  } catch {
    totals = campaigns.reduce((acc, row) => {
      if (row.status === "test" || row.status === "failed") return acc;
      const stats = statsMap.get(row.id) || emptyStats(row.sent_count || row.recipient_count);
      return addStats(acc, { ...stats, sent: row.sent_count || stats.sent }, 1);
    }, emptyTotals());
  }

  return NextResponse.json({
    ok: true,
    totals,
    campaigns: campaigns.map((row) => ({
      ...row,
      stats: statsMap.get(row.id) || emptyStats(row.sent_count || row.recipient_count),
    })),
  });
}
