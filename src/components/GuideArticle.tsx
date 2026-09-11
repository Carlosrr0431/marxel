import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { PasLegalNote } from "@/components/PasLegalNote";
import { articleNode, pageJsonLd } from "@/lib/seo";
import type { Guide } from "@/lib/guides";

export function GuideArticle({ guide }: { guide: Guide }) {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: guide.path,
          title: guide.title,
          description: guide.description,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Guías", path: "/guias" },
            { name: guide.h1, path: guide.path },
          ],
          faqs: guide.faqs,
          extra: [
            articleNode({
              path: guide.path,
              title: guide.title,
              description: guide.description,
            }),
          ],
        })}
      />
      <PageHero
        eyebrow="Guías MARXEN · Salta"
        title={guide.h1}
        description={guide.lede}
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/guias", label: "Guías" },
          { href: guide.path, label: guide.h1 },
        ]}
      />
      <article className="bg-cloud">
        <div className="container-mx max-w-3xl py-14 sm:py-16 lg:py-20">
          {guide.paragraphs.map((block) => (
            <section key={block.title} className="mb-10 last:mb-0">
              <h2 className="font-display text-2xl font-semibold text-navy">{block.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{block.text}</p>
            </section>
          ))}
          {guide.faqs.length ? (
            <div className="mt-12">
              <SectionHeading title="Preguntas frecuentes" />
              <div className="mt-6">
                <FaqAccordion items={guide.faqs} />
              </div>
            </div>
          ) : null}
          <ul className="mt-10 flex flex-wrap gap-3">
            {guide.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="btn btn-outline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <PasLegalNote />
          </div>
        </div>
      </article>
    </>
  );
}
