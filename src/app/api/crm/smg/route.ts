import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import {
  buildQuoteBody,
  smgAsegurado,
  smgArchivos,
  smgCertificado,
  smgConductos,
  smgCotizar,
  smgLoginInfo,
  smgMunicipios,
  smgPlanes,
  smgProductos,
  smgRecuperarSolicitud,
  smgUbicaciones,
  smgVehiculos,
  withEmission,
} from "@/lib/smg/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberOf(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  if (!(await requireCrmSession())) {
    return NextResponse.json({ ok: false, error: "Sesión del CRM vencida" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || "");
  const input = body && typeof body.input === "object" && body.input ? (body.input as Record<string, unknown>) : {};

  try {
    if (action === "login") {
      return NextResponse.json({ ok: true, status: 200, data: await smgLoginInfo() });
    }
    if (action === "productos") {
      const result = await smgProductos(numberOf(input.codAgente) || undefined);
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "municipios") {
      const result = await smgMunicipios(numberOf(input.codProvincia));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "vehiculos") {
      const result = await smgVehiculos({
        codAgente: numberOf(input.codAgente) || undefined,
        codProducto: numberOf(input.codProducto),
        codProvincia: numberOf(input.codProvincia),
        codLocalidad: numberOf(input.codLocalidad),
        txtModelo: String(input.txtModelo || ""),
        anio: numberOf(input.anio),
      });
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "ubicaciones") {
      const result = await smgUbicaciones({
        txtLocalidad: String(input.txtLocalidad || ""),
        codPostal: numberOf(input.codPostal),
      });
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "planes") {
      const result = await smgPlanes(String(input.txtPlanCobertura || ""));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "asegurado") {
      const result = await smgAsegurado({
        codtipodocumento: String(input.tipoDoc || ""),
        nrodoc: String(input.nroDoc || ""),
      });
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "conductos") {
      const result = await smgConductos(String(input.codAseg || ""));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "cotizar") {
      const result = await smgCotizar(buildQuoteBody(input, false));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "recotizar") {
      const result = await smgCotizar(input.quote);
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "archivos") {
      const result = await smgArchivos({
        idCotizacion: numberOf(input.idCotizacion),
        nombre: String(input.nombre || "archivo.jpg"),
        datosBase64: String(input.datosBase64 || ""),
      });
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "emitir") {
      const quote = input.quote ? withEmission(input.quote, input) : buildQuoteBody(input, true);
      const result = await smgCotizar(quote);
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "solicitud") {
      const result = await smgRecuperarSolicitud(numberOf(input.nroSolicitud));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    if (action === "certificado") {
      const result = await smgCertificado(numberOf(input.nroSolicitud));
      return NextResponse.json({ ok: result.status < 400, ...result });
    }
    return NextResponse.json({ ok: false, error: "Acción desconocida" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo hablar con Swiss Medical";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
