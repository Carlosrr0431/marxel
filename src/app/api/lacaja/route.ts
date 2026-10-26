import { NextResponse } from "next/server";
import {
  listCajaBrands,
  listCajaLocations,
  listCajaModels,
  listCajaVersions,
  quoteCajaAuto,
} from "@/lib/lacaja/public-auto";

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo consultar La Caja.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const code = String(url.searchParams.get("code") || "");
  const year = String(url.searchParams.get("year") || "");
  try {
    if (type === "brands") return NextResponse.json({ items: await listCajaBrands() });
    if (type === "models" && /^\d+$/.test(code) && /^\d{4}$/.test(year)) {
      return NextResponse.json({ items: await listCajaModels(code, year) });
    }
    if (type === "versions" && /^\d+$/.test(code) && /^\d{4}$/.test(year)) {
      return NextResponse.json({ items: await listCajaVersions(code, year) });
    }
    if (type === "locations" && /^\d{4}$/.test(String(url.searchParams.get("cp") || ""))) {
      return NextResponse.json({ items: await listCajaLocations(String(url.searchParams.get("cp"))) });
    }
    return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const quote = await quoteCajaAuto({
      versionCode: String(body.versionCode || ""),
      brand: String(body.brand || "").slice(0, 40),
      model: String(body.model || "").slice(0, 60),
      version: String(body.version || "").slice(0, 80),
      year: String(body.year || ""),
      gnc: Boolean(body.gnc),
      locationCode: String(body.locationCode || ""),
      prefix: String(body.prefix || ""),
      phone: String(body.phone || ""),
      email: String(body.email || ""),
      startDate: String(body.startDate || ""),
    });
    return NextResponse.json(quote);
  } catch (error) {
    return fail(error);
  }
}
