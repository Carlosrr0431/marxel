import { createServiceClient } from "@/lib/supabase/server";
import type { SavedQuoteListItem, SavedQuoteStatus } from "@/lib/crm/saved-quote";

export type SaveCotizacionInput = {
  nombre: string;
  celular: string;
  dni: string;
  age: number | null;
  plate: string;
  year: number;
  is0km: boolean;
  brand: string;
  model: string;
  version: string;
  localidad: string;
  postal: string;
  gnc: boolean;
  vehiculo: string;
  pedido: Record<string, unknown>;
  resultado: {
    sancristobal?: { plans?: { title?: string; monthly?: number }[] };
    smg?: { plans?: { title?: string; monthly?: number }[] };
    sitio?: { plans?: { title?: string; monthly?: number }[] };
  };
};

const LIST_COLUMNS =
  "id, created_at, estado, nombre, celular, dni, patente, vehiculo, resumen, premio_api, premio_sitio, premio_smg, localidad";

function cheapest(plans: { monthly?: number }[] | undefined) {
  const values = (plans || []).map((plan) => Number(plan.monthly) || 0).filter((value) => value > 0);
  return values.length ? Math.min(...values) : null;
}

function planLine(label: string, plans: { title?: string; monthly?: number }[] | undefined) {
  const bits = (plans || [])
    .filter((plan) => Number(plan.monthly) > 0)
    .slice(0, 3)
    .map((plan) => `${plan.title} $${Math.round(Number(plan.monthly)).toLocaleString("es-AR")}`);
  return bits.length ? `${label}: ${bits.join(" · ")}` : "";
}

function cleanQuery(value: string) {
  return value.replace(/[%*,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function saveCotizacion(input: SaveCotizacionInput) {
  const nombre = input.nombre.trim();
  if (!nombre) return "";
  const premioApi = cheapest(input.resultado.sancristobal?.plans);
  const premioSitio = cheapest(input.resultado.sitio?.plans);
  const premioSmg = cheapest(input.resultado.smg?.plans);
  const resumen = [
    planLine("API", input.resultado.sancristobal?.plans),
    planLine("Sitio Seguro", input.resultado.sitio?.plans),
    planLine("SMG", input.resultado.smg?.plans),
  ]
    .filter(Boolean)
    .join("\n");
  const row = {
    nombre,
    celular: input.celular || null,
    dni: input.dni || null,
    edad: input.age,
    patente: input.plate || null,
    anio: input.year || null,
    cero_km: input.is0km,
    marca: input.brand || null,
    modelo: input.model || null,
    version: input.version || null,
    localidad: input.localidad || null,
    codigo_postal: input.postal || null,
    gnc: input.gnc,
    vehiculo: input.vehiculo || null,
    resumen: resumen || null,
    premio_api: premioApi,
    premio_sitio: premioSitio,
    premio_smg: premioSmg,
    pedido: input.pedido,
    resultado: input.resultado,
    updated_at: new Date().toISOString(),
  };
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  if (input.plate && input.dni) {
    const { data: existing } = await supabase
      .from("cotizaciones")
      .select("id")
      .eq("patente", input.plate)
      .eq("dni", input.dni)
      .eq("version", input.version || "")
      .eq("estado", "guardada")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from("cotizaciones").update(row).eq("id", existing.id);
      if (!error) return String(existing.id);
    }
  }
  const { data, error } = await supabase.from("cotizaciones").insert(row).select("id").single();
  if (error || !data?.id) return "";
  return String(data.id);
}

export async function listCotizaciones(query: string, estado: string) {
  const supabase = createServiceClient();
  let request = supabase.from("cotizaciones").select(LIST_COLUMNS).order("created_at", { ascending: false }).limit(80);
  const allowed = ["guardada", "enviada", "elegida", "emitida"];
  if (allowed.includes(estado)) request = request.eq("estado", estado);
  const q = cleanQuery(query);
  if (q) {
    request = request.or(
      `nombre.ilike.%${q}%,patente.ilike.%${q}%,dni.ilike.%${q}%,celular.ilike.%${q}%,vehiculo.ilike.%${q}%,marca.ilike.%${q}%`
    );
  }
  const { data, error } = await request;
  return { rows: (data || []) as SavedQuoteListItem[], missing: Boolean(error) };
}

export async function getCotizacion(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("cotizaciones").select("id, pedido, resultado").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const pedido = data.pedido && typeof data.pedido === "object" ? data.pedido : null;
  const resultado = data.resultado && typeof data.resultado === "object" ? data.resultado : null;
  if (!pedido || !resultado) return null;
  return { id: String(data.id), pedido, resultado };
}
