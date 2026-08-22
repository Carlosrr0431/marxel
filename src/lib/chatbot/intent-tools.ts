import { site } from "@/lib/content";
import { formatContext, retrieveChunks } from "@/lib/chatbot/retrieve";
import {
  listAutoBrands,
  listAutoLocations,
  listAutoModels,
  listAutoVersions,
  type AutoCatalogItem,
  type AutoLocation,
  type AutoVersion,
} from "@/lib/sc-auto";

const BRAND_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  volks: "volkswagen",
  chevy: "chevrolet",
  chevro: "chevrolet",
  merca: "mercedes",
  mb: "mercedes",
  bmw: "bmw",
  peug: "peugeot",
  citro: "citroen",
  renau: "renault",
};

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function aliased(query: string) {
  const n = fold(query);
  return BRAND_ALIASES[n] || n;
}

function filterByQuery<T>(
  items: T[],
  query: string,
  label: (item: T) => string,
  limit = 8
): T[] {
  const q = aliased(query);
  if (!q) return items.slice(0, limit);
  const scored = items
    .map((item) => {
      const hay = fold(label(item));
      let score = 0;
      if (hay === q) score = 100;
      else if (hay.startsWith(q) || q.startsWith(hay)) score = 80;
      else if (hay.includes(q) || q.includes(hay)) score = 50;
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return (scored.length ? scored.map((row) => row.item) : items).slice(0, limit);
}

export async function runQuoteIntentTool(
  name: string,
  args: Record<string, unknown> = {}
) {
  if (name === "lookup_auto_brands") {
    const year = Number(args.year);
    if (!year) return { error: "year_required", matches: [] };
    const brands = await listAutoBrands(year);
    const matches = filterByQuery(
      brands,
      String(args.query || ""),
      (b: AutoCatalogItem) => b.description
    );
    return {
      year,
      found: matches.length > 0,
      matches: matches.map((b) => ({ brand_id: b.id, name: b.description })),
    };
  }

  if (name === "lookup_auto_models") {
    const year = Number(args.year);
    const brandId = Number(args.brand_id);
    if (!year || !brandId) return { error: "year_and_brand_id_required", matches: [] };
    const models = await listAutoModels(year, brandId);
    const matches = filterByQuery(
      models,
      String(args.query || ""),
      (m: AutoCatalogItem) => m.description
    );
    return {
      year,
      brand_id: brandId,
      found: matches.length > 0,
      matches: matches.map((m) => ({ model_id: m.id, name: m.description })),
    };
  }

  if (name === "lookup_auto_versions") {
    const year = Number(args.year);
    const brandId = Number(args.brand_id);
    const modelId = Number(args.model_id);
    if (!year || !brandId || !modelId) {
      return { error: "year_brand_model_required", matches: [] };
    }
    const versions = await listAutoVersions(year, brandId, modelId);
    const matches = filterByQuery(
      versions,
      String(args.query || ""),
      (v: AutoVersion) => String(v.description || v.fullCarDescripcion || v.id)
    );
    return {
      year,
      brand_id: brandId,
      model_id: modelId,
      found: matches.length > 0,
      matches: matches.map((v) => ({
        version_id: Number(v.id),
        name: String(v.description || v.fullCarDescripcion || v.id),
      })),
    };
  }

  if (name === "lookup_locations") {
    const cp = String(args.cp || "").replace(/\D/g, "").slice(0, 4);
    if (cp.length !== 4) return { error: "cp_4_digits", matches: [] };
    const locations = await listAutoLocations(cp);
    const matches = filterByQuery(
      locations,
      String(args.query || ""),
      (loc: AutoLocation) => loc.description
    );
    return {
      cp,
      found: matches.length > 0,
      matches: matches.map((loc) => ({
        location_id: loc.locationId,
        name: loc.description,
        zip: loc.zipCode,
        state: loc.state || null,
      })),
    };
  }

  if (name === "search_knowledge") {
    const query = String(args.query || "").trim();
    const chunks = retrieveChunks(query, 4);
    return {
      query,
      found: chunks.length > 0,
      context: formatContext(chunks),
    };
  }

  if (name === "get_contact_info") {
    return {
      name: site.lockup,
      whatsapp: site.whatsapp,
      phone: site.phone,
      email: site.email,
      location: site.location,
      note: "Productores asesores en Salta. Un asesor humano confirma cotizaciones y afiliaciones.",
    };
  }

  return { error: `unknown_tool:${name}` };
}
