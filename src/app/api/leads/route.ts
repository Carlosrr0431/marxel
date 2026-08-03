import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { mapInteresToProducto } from "@/lib/crm/types";

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
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        nombre,
        celular,
        email: body.email || null,
        edad: body.edad ? Number(body.edad) : null,
        provincia: body.provincia || null,
        localidad: body.localidad || null,
        producto: mapInteresToProducto(interes),
        plan_interes: interes || null,
        origen: "web",
        page_path: body.page_path || null,
        user_agent: request.headers.get("user-agent"),
        notas_iniciales: body.notas || `Cotización web: ${interes || "general"}`,
        prioridad: "alta",
      })
      .select("id")
      .single();

    if (error) {
      console.error("lead insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
