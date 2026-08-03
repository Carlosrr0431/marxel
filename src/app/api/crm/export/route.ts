import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/crm/utils";

function expectedSession() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return null;
  return Buffer.from(`marxel:${password}`).toString("base64url");
}

export async function GET(request: NextRequest) {
  const store = await cookies();
  const session = store.get("marxel_crm_session")?.value;
  const expected = expectedSession();
  if (!expected || session !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") || "leads";
  const supabase = createServiceClient();

  if (type === "afiliados") {
    const { data } = await supabase.from("afiliados").select("*").order("created_at", { ascending: false });
    const csv = toCsv((data || []) as Record<string, unknown>[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="marxel-afiliados.csv"',
      },
    });
  }

  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  const csv = toCsv((data || []) as Record<string, unknown>[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="marxel-leads.csv"',
    },
  });
}
