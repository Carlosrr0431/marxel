import { NextResponse } from "next/server";
import { AutoQuoteError, fetchAutoCatalog, quoteAutoVehicle } from "@/lib/sc-auto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const data = await fetchAutoCatalog({
      kind: url.searchParams.get("kind"),
      year: url.searchParams.get("year") || "",
      brandId: url.searchParams.get("brandId") || "",
      modelId: url.searchParams.get("modelId") || "",
      postalCode: url.searchParams.get("postalCode") || "",
    });
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof AutoQuoteError ? err.status : 502;
    const message =
      err instanceof AutoQuoteError ? err.message : "Error de red";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await quoteAutoVehicle({
      year: Number(body.year),
      is0km: Boolean(body.is0km),
      brand: body.brand,
      model: body.model,
      version: body.version,
      location: body.location,
      nombre: String(body.nombre || ""),
      celular: String(body.celular || ""),
      source: "web",
    });
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof AutoQuoteError ? err.status : 502;
    const message =
      err instanceof AutoQuoteError ? err.message : "No se pudo cotizar";
    return NextResponse.json({ error: message }, { status });
  }
}
