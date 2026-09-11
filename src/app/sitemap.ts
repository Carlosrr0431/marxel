import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/indexable-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
