import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { mergeRecipients, type MailRecipient } from "@/lib/mailing/recipients";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const [{ data: leads }, { data: afiliados }] = await Promise.all([
    supabase.from("leads").select("nombre,email").not("email", "is", null).limit(2000),
    supabase.from("afiliados").select("nombre,email").not("email", "is", null).limit(2000),
  ]);

  const fromLeads: MailRecipient[] = (leads || [])
    .filter((row) => row.email)
    .map((row) => ({ email: String(row.email), name: String(row.nombre || "") }));
  const fromAfiliados: MailRecipient[] = (afiliados || [])
    .filter((row) => row.email)
    .map((row) => ({ email: String(row.email), name: String(row.nombre || "") }));

  const recipients = mergeRecipients([fromLeads, fromAfiliados]);
  return NextResponse.json({ ok: true, recipients, count: recipients.length });
}
