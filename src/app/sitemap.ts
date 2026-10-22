import type { MetadataRoute } from "next";
import { SITEMAP_LASTMOD, sitemapEntries } from "@/lib/indexable-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(SITEMAP_LASTMOD);
}
