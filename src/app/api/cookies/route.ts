import { NextResponse } from "next/server";
import { saveCookieVisit } from "@/lib/cookies/save-visit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.choice !== "aceptado") {
      return NextResponse.json({ ok: true });
    }
    const page = new URL(request.url);
    const id = await saveCookieVisit({
      visitorId: String(body.visitorId || ""),
      nombre: body.nombre,
      celular: body.celular,
      email: body.email,
      edad: Number(body.edad) || null,
      patente: body.patente,
      interes: body.interes,
      pagePath: body.page || null,
      referrer: request.headers.get("referer"),
      utmSource: body.utm_source || page.searchParams.get("utm_source"),
      utmMedium: body.utm_medium || page.searchParams.get("utm_medium"),
      utmCampaign: body.utm_campaign || page.searchParams.get("utm_campaign"),
      userAgent: request.headers.get("user-agent"),
      leadId: body.leadId || null,
    });
    return NextResponse.json({ ok: Boolean(id) || true, leadId: id });
  } catch (err) {
    console.error("[cookies]", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
