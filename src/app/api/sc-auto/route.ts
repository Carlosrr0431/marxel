import { NextResponse } from "next/server";
import {
  AutoQuoteError,
  fetchAutoCatalog,
  lookupPersonByDni,
  quoteAutoVehicle,
  registerAutoQuoteWithProducer,
} from "@/lib/sc-auto";

function fail(err: unknown) {
  const status = err instanceof AutoQuoteError ? err.status : 502;
  const message = err instanceof AutoQuoteError ? err.message : "No se pudo cotizar";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  try {
    if (kind === "dni") {
      const person = await lookupPersonByDni(url.searchParams.get("dni") || "");
      return NextResponse.json({ person });
    }
    const data = await fetchAutoCatalog({
      kind,
      year: url.searchParams.get("year") || "",
      brandId: url.searchParams.get("brandId") || "",
      modelId: url.searchParams.get("modelId") || "",
      postalCode: url.searchParams.get("postalCode") || "",
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "register") {
      const result = await registerAutoQuoteWithProducer({
        opportunityId: Number(body.opportunityId),
        quoteId: Number(body.quoteId),
        dni: String(body.dni || ""),
        nombre: String(body.nombre || ""),
        email: String(body.email || ""),
        celular: String(body.celular || ""),
        age: Number(body.age),
        gender: String(body.gender || ""),
        location: body.location,
        is0km: Boolean(body.is0km),
        licensePlate: String(body.licensePlate || ""),
        vin: String(body.vin || ""),
        engineNumber: String(body.engineNumber || ""),
      });
      return NextResponse.json(result);
    }

    const result = await quoteAutoVehicle({
      year: Number(body.year),
      is0km: Boolean(body.is0km),
      brand: body.brand,
      model: body.model,
      version: body.version,
      location: body.location,
      nombre: String(body.nombre || ""),
      celular: String(body.celular || ""),
      email: String(body.email || ""),
      age: Number(body.age) || undefined,
      hasGnc: Boolean(body.hasGnc),
      hasTracker: Boolean(body.hasTracker),
      source: "web",
    });
    return NextResponse.json(result);
  } catch (err) {
    return fail(err);
  }
}
