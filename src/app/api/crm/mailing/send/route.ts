import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidEmail, mergeRecipients, type MailRecipient } from "@/lib/mailing/recipients";
import { brevoAccountStatus, sendBrevoCampaign } from "@/lib/mailing/brevo";
import { campaignTagFromId } from "@/lib/mailing/events";
import { buildMailHtml, greetingFor } from "@/lib/mailing/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_RECIPIENTS = 2000;

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const status = await brevoAccountStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    subject?: string;
    preheader?: string;
    title?: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    templateId?: string;
    recipients?: MailRecipient[];
    testEmail?: string;
  };

  const subject = String(body.subject || "").trim();
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  if (!subject || !title || !text) {
    return NextResponse.json(
      { ok: false, error: "Completá asunto, título y cuerpo del mail." },
      { status: 400 }
    );
  }

  const testEmail = String(body.testEmail || "").trim().toLowerCase();
  let recipients = mergeRecipients([body.recipients || []]);
  if (testEmail) {
    if (!isValidEmail(testEmail)) {
      return NextResponse.json({ ok: false, error: "El mail de prueba no es válido." }, { status: 400 });
    }
    recipients = [{ email: testEmail, name: "Prueba" }];
  }
  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: "Agregá al menos un destinatario." }, { status: 400 });
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { ok: false, error: `Máximo ${MAX_RECIPIENTS} destinatarios por envío.` },
      { status: 400 }
    );
  }

  const html = buildMailHtml({
    preheader: String(body.preheader || subject),
    title,
    body: text,
    ctaLabel: String(body.ctaLabel || "Hablar por WhatsApp"),
    ctaUrl: String(body.ctaUrl || "https://wa.me/5493876348199"),
    theme: String(body.templateId || "institucional"),
  });
  const greetings = recipients.map((r) => greetingFor(r.name));
  const campaignId = crypto.randomUUID();
  const tag = campaignTagFromId(campaignId);
  const supabase = createServiceClient();

  const { error: insertError } = await supabase.from("mailing_campaigns").insert({
    id: campaignId,
    subject,
    preheader: String(body.preheader || ""),
    title,
    body: text,
    cta_label: String(body.ctaLabel || ""),
    cta_url: String(body.ctaUrl || ""),
    template_id: String(body.templateId || "custom"),
    tag,
    recipient_count: recipients.length,
    sent_count: 0,
    status: "sending",
  });
  if (insertError) {
    return NextResponse.json(
      { ok: false, error: `No se pudo guardar la campaña: ${insertError.message}` },
      { status: 400 }
    );
  }

  const { error: recError } = await supabase.from("mailing_recipients").insert(
    recipients.map((row) => ({
      campaign_id: campaignId,
      email: row.email,
      name: row.name || "",
      last_event: "queued",
    }))
  );
  if (recError) {
    await supabase.from("mailing_campaigns").update({ status: "failed", error: recError.message }).eq("id", campaignId);
    return NextResponse.json({ ok: false, error: recError.message }, { status: 400 });
  }

  try {
    const result = await sendBrevoCampaign({
      subject,
      html,
      recipients,
      greetings,
      tags: ["crm-mailing", tag],
    });

    const updates = recipients.map((row, index) => ({
      campaign_id: campaignId,
      email: row.email,
      message_id: result.messageIds[index] || null,
      last_event: "sent",
    }));
    for (const item of updates) {
      if (!item.message_id) continue;
      await supabase
        .from("mailing_recipients")
        .update({ message_id: item.message_id, last_event: "sent" })
        .eq("campaign_id", campaignId)
        .eq("email", item.email);
    }

    await supabase
      .from("mailing_campaigns")
      .update({
        sent_count: result.sent,
        status: testEmail ? "test" : "sent",
        brevo_message_ids: result.messageIds.slice(0, 80),
        error: null,
      })
      .eq("id", campaignId);

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      test: Boolean(testEmail),
      campaignId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo enviar";
    await supabase.from("mailing_campaigns").update({ status: "failed", error: message }).eq("id", campaignId);
    return NextResponse.json({ ok: false, error: message, campaignId }, { status: 400 });
  }
}
