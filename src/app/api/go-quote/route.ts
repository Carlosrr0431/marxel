import { NextResponse } from "next/server";
import { GoQuoteError, quoteGoTravel } from "@/lib/go-assistance";

function fail(err: unknown) {
  const status = err instanceof GoQuoteError ? err.status : 502;
  const message = err instanceof GoQuoteError ? err.message : "No se pudo cotizar";
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await quoteGoTravel({
      destinationId: Number(body.destinationId),
      dateFrom: String(body.dateFrom || ""),
      dateTo: String(body.dateTo || ""),
      passengers: Number(body.passengers),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
    });
    return NextResponse.json(result);
  } catch (err) {
    return fail(err);
  }
}
