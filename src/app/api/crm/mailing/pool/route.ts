import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { mergeRecipients, normalizeEmail, type MailRecipient } from "@/lib/mailing/recipients";
import { loadSentEmailSet, poolStats, splitUnsent, takeUnusedFromPool } from "@/lib/mailing/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TAKE = 2000;

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = createServiceClient();
    const sent = await loadSentEmailSet(supabase);
    return NextResponse.json({ ok: true, ...poolStats(sent) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo leer la base" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    count?: number;
    exclude?: string[];
    emails?: string[];
    recipients?: MailRecipient[];
  };

  try {
    const supabase = createServiceClient();
    const sent = await loadSentEmailSet(supabase);
    const stats = poolStats(sent);

    if (body.action === "filter") {
      const list = mergeRecipients([body.recipients || []]);
      const extra = (body.emails || []).map((email) => ({
        email: normalizeEmail(email),
        name: "",
      }));
      const { kept, skipped } = splitUnsent(mergeRecipients([list, extra]), sent);
      return NextResponse.json({
        ok: true,
        recipients: kept,
        skipped: skipped.length,
        ...stats,
      });
    }

    const count = Math.min(MAX_TAKE, Math.max(0, Number(body.count) || 0));
    if (!count) {
      return NextResponse.json({ ok: false, error: "Indicá cuántos mails tomar." }, { status: 400 });
    }

    const exclude = new Set((body.exclude || []).map(normalizeEmail));
    const recipients = takeUnusedFromPool({ count, sent, exclude });
    return NextResponse.json({
      ok: true,
      recipients,
      taken: recipients.length,
      asked: count,
      exhausted: recipients.length < count,
      ...poolStats(sent),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo extraer de la base" },
      { status: 400 }
    );
  }
}
