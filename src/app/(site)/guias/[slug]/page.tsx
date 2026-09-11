import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/GuideArticle";
import { GUIDES } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

function findGuide(slug: string) {
  return GUIDES.find((guide) => guide.path === `/guias/${slug}`);
}

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.path.replace("/guias/", "") }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.path,
    keywords: guide.keywords,
  });
}

export default async function GuiaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} />;
}
