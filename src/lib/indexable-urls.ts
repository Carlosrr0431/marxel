import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export type IndexablePage = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

/** URLs públicas a indexar (Search Console + sitemap). No incluir /crm ni /api. */
export const INDEXABLE_PAGES: IndexablePage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/seguro-de-auto", changeFrequency: "weekly", priority: 0.95 },
  { path: "/seguro-de-auto/terceros-completo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/seguro-de-auto/todo-riesgo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/salud", changeFrequency: "weekly", priority: 0.9 },
  { path: "/viajero", changeFrequency: "weekly", priority: 0.9 },
  { path: "/seguro-de-auto/terceros-basico", changeFrequency: "monthly", priority: 0.85 },
  { path: "/seguros", changeFrequency: "weekly", priority: 0.85 },
  { path: "/cotizar", changeFrequency: "weekly", priority: 0.85 },
  { path: "/guias/seguro-de-auto-en-salta", changeFrequency: "monthly", priority: 0.8 },
  { path: "/guias/prepaga-en-salta", changeFrequency: "monthly", priority: 0.8 },
  { path: "/guias/seguro-de-viaje-schengen", changeFrequency: "monthly", priority: 0.8 },
  { path: "/seguro-de-moto", changeFrequency: "monthly", priority: 0.8 },
  { path: "/seguro-de-hogar", changeFrequency: "monthly", priority: 0.8 },
  { path: "/salud/cartilla-medica", changeFrequency: "monthly", priority: 0.75 },
  { path: "/guias", changeFrequency: "monthly", priority: 0.7 },
  { path: "/preguntas-frecuentes", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.65 },
];

export function sitemapEntries(lastModified = new Date()): MetadataRoute.Sitemap {
  const lastmod = lastModified.toISOString().slice(0, 10);
  return INDEXABLE_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: lastmod,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

export const INDEXABLE_URLS = INDEXABLE_PAGES.map((page) => absoluteUrl(page.path));
