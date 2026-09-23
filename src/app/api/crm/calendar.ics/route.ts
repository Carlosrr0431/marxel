import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildCalendarIcs, calendarTokenMatches, type FeedEvent } from "@/lib/crm/calendar-feed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token || !calendarTokenMatches(token)) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("seguimientos")
    .select("id,titulo,descripcion,tipo,estado,programado_para,lead_id,afiliado_id,leads(nombre,celular),afiliados(nombre,celular)")
    .neq("estado", "cancelado")
    .gte("programado_para", from)
    .lte("programado_para", to)
    .order("programado_para", { ascending: true })
    .limit(500);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const events: FeedEvent[] = (data || []).map((row) => {
    const lead = row.leads as { nombre?: string; celular?: string } | null;
    const afiliado = row.afiliados as { nombre?: string; celular?: string } | null;
    const persona = lead || afiliado;
    return {
      id: String(row.id),
      titulo: String(row.titulo),
      descripcion: row.descripcion ? String(row.descripcion) : null,
      tipo: String(row.tipo),
      estado: String(row.estado),
      programado_para: String(row.programado_para),
      lead_id: row.lead_id ? String(row.lead_id) : null,
      afiliado_id: row.afiliado_id ? String(row.afiliado_id) : null,
      persona: persona?.nombre || null,
      celular: persona?.celular || null,
    };
  });

  return new NextResponse(buildCalendarIcs(events), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=marxel-crm.ics",
      "Cache-Control": "public, max-age=900",
    },
  });
}
