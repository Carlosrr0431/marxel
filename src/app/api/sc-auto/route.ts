import { NextResponse } from "next/server";

const API = "https://api.sancristobal.com.ar/marketing-marketing/api/InfoAuto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const year = url.searchParams.get("year") || "";
  const brandId = url.searchParams.get("brandId") || "";
  const modelId = url.searchParams.get("modelId") || "";

  let target = "";
  if (kind === "brands" && year) {
    target = `${API}/brands-highlight-by-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A`;
  } else if (kind === "models" && year && brandId) {
    target = `${API}/model-by-brand-year-and-portal-category?year=${encodeURIComponent(year)}&portalCategory=A&brandId=${encodeURIComponent(brandId)}`;
  } else if (kind === "versions" && year && brandId && modelId) {
    const params = new URLSearchParams({
      year,
      brandId,
      modelId,
      portalCategory: "A",
    });
    target = `${API}/versions-by-brand-model-year-and-portal-category?${params}`;
  } else {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    const res = await fetch(target, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar InfoAuto" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de red" }, { status: 502 });
  }
}
