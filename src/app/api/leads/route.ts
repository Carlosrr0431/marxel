import { NextResponse } from "next/server";
import { upsertWebLead } from "@/lib/crm/quote-lead";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre || "").trim();
    const celular = String(body.celular || "").trim();
    if (!nombre || !celular) {
      return NextResponse.json(
        { error: "Nombre y celular son obligatorios" },
        { status: 400 }
      );
    }

    const interes = String(body.interes || "");
    const id = await upsertWebLead({
      nombre,
      celular,
      email: body.email || null,
      dni: body.dni || null,
      edad: body.edad ? Number(body.edad) : null,
      provincia: body.provincia || null,
      localidad: body.localidad || null,
      interes,
      notas: body.notas || `Cotización web: ${interes || "general"}`,
      pagePath: body.page_path || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
