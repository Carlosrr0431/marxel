import { createServiceClient } from "@/lib/supabase/server";
import {
  campaignIdFromTags,
  dedupeKey,
  parseBrevoEvents,
  type NormalizedBrevoEvent,
} from "@/lib/mailing/events";

type RecipientRow = {
  id: string;
  campaign_id: string;
  email: string;
  last_event: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_type: string | null;
  unsubscribed_at: string | null;
  complained_at: string | null;
  proxy_opened_at: string | null;
  open_count: number;
  click_count: number;
  last_link: string | null;
};

function patchFromEvent(row: RecipientRow, event: NormalizedBrevoEvent) {
  const at = event.occurredAt;
  const next = { ...row, last_event: event.event };
  if (event.event === "delivered") next.delivered_at = next.delivered_at || at;
  if (event.event === "opened") {
    next.opened_at = next.opened_at || at;
    next.open_count = (next.open_count || 0) + 1;
  }
  if (event.event === "proxy_open") {
    next.proxy_opened_at = next.proxy_opened_at || at;
  }
  if (event.event === "clicked") {
    next.clicked_at = next.clicked_at || at;
    next.click_count = (next.click_count || 0) + 1;
    next.last_link = event.link || next.last_link;
  }
  if (event.event === "soft_bounce" || event.event === "hard_bounce") {
    next.bounced_at = next.bounced_at || at;
    next.bounce_type = event.event;
  }
  if (event.event === "unsubscribed") next.unsubscribed_at = next.unsubscribed_at || at;
  if (event.event === "complaint") next.complained_at = next.complained_at || at;
  return next;
}

async function findRecipient(
  supabase: ReturnType<typeof createServiceClient>,
  event: NormalizedBrevoEvent
) {
  const taggedId = campaignIdFromTags(event.tags);
  if (taggedId && event.email) {
    const { data } = await supabase
      .from("mailing_recipients")
      .select("*")
      .eq("campaign_id", taggedId)
      .eq("email", event.email)
      .maybeSingle();
    if (data) return data as RecipientRow;
  }
  if (event.messageId) {
    const { data } = await supabase
      .from("mailing_recipients")
      .select("*")
      .eq("message_id", event.messageId)
      .maybeSingle();
    if (data) return data as RecipientRow;
  }
  if (event.email) {
    const { data } = await supabase
      .from("mailing_recipients")
      .select("*")
      .eq("email", event.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as RecipientRow;
  }
  return null;
}

export async function ingestBrevoWebhook(body: unknown) {
  const events = parseBrevoEvents(body);
  if (!events.length) return { ok: true, ingested: 0 };
  const supabase = createServiceClient();
  let ingested = 0;

  for (const event of events) {
    const recipient = await findRecipient(supabase, event);
    const campaignId = recipient?.campaign_id || campaignIdFromTags(event.tags) || null;
    const { error: eventError } = await supabase.from("mailing_events").insert({
      campaign_id: campaignId,
      recipient_id: recipient?.id || null,
      email: event.email || recipient?.email || "",
      event: event.event,
      message_id: event.messageId || null,
      link: event.link || null,
      reason: event.reason || null,
      user_agent: event.userAgent || null,
      device: event.device || null,
      occurred_at: event.occurredAt,
      dedupe_key: dedupeKey(event),
      payload: event.raw,
    });
    if (eventError && !/duplicate|unique/i.test(eventError.message)) {
      throw new Error(eventError.message);
    }
    if (eventError) continue;
    ingested += 1;
    if (!recipient) continue;
    const patched = patchFromEvent(recipient, event);
    await supabase
      .from("mailing_recipients")
      .update({
        last_event: patched.last_event,
        delivered_at: patched.delivered_at,
        opened_at: patched.opened_at,
        clicked_at: patched.clicked_at,
        bounced_at: patched.bounced_at,
        bounce_type: patched.bounce_type,
        unsubscribed_at: patched.unsubscribed_at,
        complained_at: patched.complained_at,
        proxy_opened_at: patched.proxy_opened_at,
        open_count: patched.open_count,
        click_count: patched.click_count,
        last_link: patched.last_link,
      })
      .eq("id", recipient.id);
  }

  return { ok: true, ingested };
}
