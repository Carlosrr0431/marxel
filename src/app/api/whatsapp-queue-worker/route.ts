import { NextResponse } from "next/server";
import {
  processWhatsappOutboundBatch,
  queueWorkerAuthOk,
  WHATSAPP_OUTBOUND_INTERVAL_MS,
} from "@/lib/whatsmeow/outbound-queue";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(request: Request) {
  if (!queueWorkerAuthOk(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const batch = await processWhatsappOutboundBatch({
    claimer: "queue-worker",
    maxMessages: 3,
    deadlineMs: 55_000,
  });

  if (batch.results.some((row) => "missingTable" in row && row.missingTable)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta migrar supabase/whatsapp_outbound_queue.sql en Supabase",
        intervalMs: WHATSAPP_OUTBOUND_INTERVAL_MS,
        ...batch,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    intervalMs: WHATSAPP_OUTBOUND_INTERVAL_MS,
    ...batch,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
