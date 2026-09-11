import type { Metadata } from "next";
import { CoverageSeoLanding } from "@/components/CoverageSeoLanding";
import { AUTO_COVERAGES } from "@/lib/auto-coverages";
import { pageMetadata } from "@/lib/seo";

const coverage = AUTO_COVERAGES["terceros-basico"];

export const metadata: Metadata = pageMetadata({
  title: coverage.title,
  description: coverage.description,
  path: coverage.path,
  keywords: coverage.keywords,
});

export default function TercerosBasicoPage() {
  return <CoverageSeoLanding coverage={coverage} />;
}
