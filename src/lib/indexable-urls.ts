import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

export type IndexablePage = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
  images?: string[];
};

/** URLs públicas a indexar (Search Console + sitemap). No incluir /crm ni /api. */
export const INDEXABLE_PAGES: IndexablePage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1, images: [`${SITE_URL}/opengraph-image`] },
  { path: "/seguro-de-auto", changeFrequency: "weekly", priority: 0.95 },
  { path: "/salud", changeFrequency: "weekly", priority: 0.9 },
  { path: "/viajero", changeFrequency: "weekly", priority: 0.9 },
  { path: "/seguros", changeFrequency: "weekly", priority: 0.85 },
  { path: "/cotizar", changeFrequency: "weekly", priority: 0.85 },
  { path: "/seguro-de-moto", changeFrequency: "monthly", priority: 0.8 },
  { path: "/seguro-de-hogar", changeFrequency: "monthly", priority: 0.8 },
  { path: "/salud/cartilla-medica", changeFrequency: "monthly", priority: 0.75 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.65 },
];

export function sitemapEntries(lastModified = new Date()): MetadataRoute.Sitemap {
  return INDEXABLE_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.images ? { images: page.images } : {}),
  }));
}

export const INDEXABLE_URLS = INDEXABLE_PAGES.map((page) => absoluteUrl(page.path));
