import { after, NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isValidEmail,
  mergeRecipients,
  normalizeEmail,
  type MailRecipient,
} from "@/lib/mailing/recipients";
import { brevoAccountStatus, ensureTransactionalWebhook, sendBrevoCampaign } from "@/lib/mailing/brevo";
import { campaignTagFromId } from "@/lib/mailing/events";
import { loadSentEmailSet, splitUnsent } from "@/lib/mailing/pool";
import { buildMailHtml, greetingFor } from "@/lib/mailing/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    allowRepeat?: string[];
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
  const supabase = createServiceClient();
  let skippedSent = 0;
  if (testEmail) {
    if (!isValidEmail(testEmail)) {
      return NextResponse.json({ ok: false, error: "El mail de prueba no es válido." }, { status: 400 });
    }
    recipients = [{ email: testEmail, name: "Prueba" }];
  } else {
    const sent = await loadSentEmailSet(supabase);
    const allowRepeat = new Set((body.allowRepeat || []).map(normalizeEmail).filter(isValidEmail));
    const split = splitUnsent(recipients, sent, allowRepeat);
    skippedSent = split.skipped.length;
    recipients = split.kept;
  }
  if (!recipients.length) {
    return NextResponse.json(
      {
        ok: false,
        error: skippedSent
          ? "Esos mails de la base ya recibieron una campaña. Tomá contactos nuevos o pegá mails para reenviar."
          : "Agregá al menos un destinatario.",
        skippedSent,
      },
      { status: 400 }
    );
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
  await ensureTransactionalWebhook().catch(() => undefined);

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

  async function runSend() {
    const result = await sendBrevoCampaign({
      subject,
      html,
      recipients,
      greetings,
      tags: ["crm-mailing", tag],
      onChunk: async ({ sent, slice, messageIds }) => {
        await Promise.all(
          slice.map((row, index) =>
            supabase
              .from("mailing_recipients")
              .update({
                message_id: messageIds[index] || null,
                last_event: "sent",
              })
              .eq("campaign_id", campaignId)
              .eq("email", row.email)
          )
        );
        await supabase.from("mailing_campaigns").update({ sent_count: sent }).eq("id", campaignId);
      },
    });

    await supabase
      .from("mailing_campaigns")
      .update({
        sent_count: result.sent,
        status: testEmail ? "test" : "sent",
        brevo_message_ids: result.messageIds.slice(0, 80),
        error: null,
      })
      .eq("id", campaignId);

    return result;
  }

  if (testEmail) {
    try {
      const result = await runSend();
      return NextResponse.json({
        ok: true,
        sent: result.sent,
        test: true,
        campaignId,
        skippedSent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo enviar";
      await supabase.from("mailing_campaigns").update({ status: "failed", error: message }).eq("id", campaignId);
      return NextResponse.json({ ok: false, error: message, campaignId }, { status: 400 });
    }
  }

  after(async () => {
    try {
      await runSend();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo enviar";
      await supabase.from("mailing_campaigns").update({ status: "failed", error: message }).eq("id", campaignId);
    }
  });

  return NextResponse.json({
    ok: true,
    campaignId,
    total: recipients.length,
    skippedSent,
    status: "sending",
  });
}
