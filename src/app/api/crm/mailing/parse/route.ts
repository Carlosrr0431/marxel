import { NextResponse, type NextRequest } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { parseRecipientsFromRows, parseRecipientsFromText } from "@/lib/mailing/recipients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as { text?: string };
      const recipients = parseRecipientsFromText(String(body.text || ""));
      return NextResponse.json({ ok: true, recipients, count: recipients.length });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Subí un Excel o CSV." }, { status: 400 });
    }
    if (file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "El archivo supera 6 MB." }, { status: 400 });
    }

    const { read, utils } = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ ok: false, error: "El archivo no tiene hojas." }, { status: 400 });
    }
    const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: "",
      raw: false,
    });
    const recipients = parseRecipientsFromRows(rows);
    return NextResponse.json({
      ok: true,
      recipients,
      count: recipients.length,
      rows: rows.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo leer el archivo" },
      { status: 400 }
    );
  }
}
