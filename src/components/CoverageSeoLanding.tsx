import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SanCristobalEmbed } from "@/components/SanCristobalEmbed";
import { JsonLd } from "@/components/JsonLd";
import { PasLegalNote } from "@/components/PasLegalNote";
import { howToNode, pageJsonLd } from "@/lib/seo";
import { AUTO_COVERAGES, AUTO_QUOTE_STEPS, type AutoCoverage } from "@/lib/auto-coverages";

export function CoverageSeoLanding({ coverage }: { coverage: AutoCoverage }) {
  const siblings = Object.values(AUTO_COVERAGES).filter((item) => item.key !== coverage.key);

  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: coverage.path,
          title: coverage.title,
          description: coverage.description,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Seguro de auto", path: "/seguro-de-auto" },
            { name: coverage.crumbLabel, path: coverage.path },
          ],
          faqs: coverage.faqs,
          service: {
            name: coverage.h1,
            serviceType: "Seguro de automóviles",
            brand: "San Cristóbal Seguros",
          },
          extra: [
            howToNode({
              name: `Cómo cotizar ${coverage.crumbLabel.toLowerCase()} en Salta`,
              description: coverage.description,
              path: coverage.path,
              steps: AUTO_QUOTE_STEPS,
            }),
          ],
        })}
      />
      <PageHero
        eyebrow="Seguro de auto · San Cristóbal · Salta"
        title={coverage.h1}
        description={coverage.lede}
        cta={{ href: "#cotizar-online", label: "Cotizar este plan" }}
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/seguro-de-auto", label: "Seguro de auto" },
          { href: coverage.path, label: coverage.crumbLabel },
        ]}
      />

      <section className="border-b border-line/70 bg-cloud">
        <div className="container-mx grid gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <SectionHeading title="Para quién es" description={coverage.ideal} />
            <h2 className="mt-8 font-display text-xl font-semibold text-navy">Qué cubre</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              {coverage.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-teal">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-navy">Qué no cubre</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              {coverage.excludes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-navy">–</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">
              Compará con{" "}
              {siblings.map((item, index) => (
                <span key={item.path}>
                  {index > 0 ? " y " : null}
                  <Link href={item.path} className="font-medium text-navy underline-offset-2 hover:underline">
                    {item.crumbLabel.toLowerCase()}
                  </Link>
                </span>
              ))}
              . Guía:{" "}
              <Link
                href="/guias/seguro-de-auto-en-salta"
                className="font-medium text-navy underline-offset-2 hover:underline"
              >
                cómo elegir seguro de auto en Salta
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="cotizar-online" className="scroll-mt-24 bg-mist/40">
        <div className="container-mx py-10 sm:py-14">
          <SectionHeading
            title="Cotizá online en Salta"
            description="El cotizador muestra primas de San Cristóbal. MARXEN te acompaña para emitir."
          />
          <div className="mt-8">
            <SanCristobalEmbed initialProduct="auto" />
          </div>
          <div className="mt-8">
            <PasLegalNote />
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-cloud">
        <div className="container-mx py-14 sm:py-16 lg:py-20">
          <SectionHeading title="Preguntas frecuentes" />
          <div className="mt-8">
            <FaqAccordion items={coverage.faqs} />
          </div>
        </div>
      </section>
    </>
  );
}
