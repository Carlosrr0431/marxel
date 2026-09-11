import type { Metadata } from "next";
import { ProductSeoLanding } from "@/components/ProductSeoLanding";
import { productLandings } from "@/lib/product-landings";
import { pageMetadata } from "@/lib/seo";

const landing = productLandings.auto;

export const metadata: Metadata = pageMetadata({
  title: landing.title,
  description: landing.description,
  path: landing.path,
  keywords: landing.keywords,
});

export default function SeguroDeAutoPage() {
  return <ProductSeoLanding landing={landing} />;
}
