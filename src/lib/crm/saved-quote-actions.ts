"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { SavedQuoteStatus } from "@/lib/crm/saved-quote";

const rank: Record<SavedQuoteStatus, number> = {
  guardada: 0,
  enviada: 1,
  elegida: 2,
  emitida: 3,
};

export async function markCotizacion(id: string, estado: SavedQuoteStatus) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(estado in rank)) return;
  const supabase = createServiceClient();
  const { data } = await supabase.from("cotizaciones").select("estado").eq("id", id).maybeSingle();
  const current = String(data?.estado || "guardada") as SavedQuoteStatus;
  if (rank[current] > rank[estado]) return;
  await supabase.from("cotizaciones").update({ estado, updated_at: new Date().toISOString() }).eq("id", id);
}
