import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SanCristobalEmbed } from "@/components/SanCristobalEmbed";
import { JsonLd } from "@/components/JsonLd";
import { CoverageCompare } from "@/components/CoverageCompare";
import { HowToQuote } from "@/components/HowToQuote";
import { PasLegalNote } from "@/components/PasLegalNote";
import { howToNode, itemListNode, pageJsonLd } from "@/lib/seo";
import { AUTO_COVERAGES, AUTO_QUOTE_STEPS } from "@/lib/auto-coverages";
import type { ProductLanding } from "@/lib/product-landings";

export function ProductSeoLanding({ landing }: { landing: ProductLanding }) {
  const isAuto = landing.embed === "auto";

  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: landing.path,
          title: landing.title,
          description: landing.description,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Seguros", path: "/seguros" },
            { name: landing.crumbLabel, path: landing.path },
          ],
          faqs: landing.faqs,
          service: {
            name: landing.serviceName,
            brand: "San Cristóbal Seguros",
          },
          extra: isAuto
            ? [
                howToNode({
                  name: "Cómo cotizar un seguro de auto en Salta",
                  description: landing.description,
                  path: landing.path,
                  steps: AUTO_QUOTE_STEPS,
                }),
                itemListNode({
                  name: "Planes de seguro de auto",
                  items: Object.values(AUTO_COVERAGES).map((coverage) => ({
                    name: coverage.crumbLabel,
                    path: coverage.path,
                  })),
                }),
              ]
            : [],
        })}
      />
      <PageHero
        eyebrow={landing.eyebrow}
        title={landing.h1}
        description={landing.lede}
        cta={{ href: "#cotizar-online", label: "Cotizar ahora" }}
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/seguros", label: "Seguros" },
          { href: landing.path, label: landing.crumbLabel },
        ]}
      />

      <section className="border-b border-line/70 bg-cloud">
        <div className="container-mx grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-20">
          <div>
            <SectionHeading title={landing.introTitle} description={landing.intro} />
            {isAuto ? (
              <ul className="mt-5 flex flex-col gap-2 text-sm">
                {Object.values(AUTO_COVERAGES).map((coverage) => (
                  <li key={coverage.path}>
                    <Link href={coverage.path} className="font-medium text-navy underline-offset-2 hover:underline">
                      {coverage.crumbLabel}
                    </Link>
                    <span className="text-muted"> — {coverage.ideal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">
                También cotizamos{" "}
                <Link href="/seguro-de-auto" className="font-medium text-navy underline-offset-2 hover:underline">
                  auto
                </Link>
                ,{" "}
                <Link href="/seguro-de-moto" className="font-medium text-navy underline-offset-2 hover:underline">
                  moto
                </Link>{" "}
                y{" "}
                <Link href="/seguro-de-hogar" className="font-medium text-navy underline-offset-2 hover:underline">
                  hogar
                </Link>
                . Prepaga:{" "}
                <Link href="/salud" className="font-medium text-navy underline-offset-2 hover:underline">
                  salud
                </Link>
                . Viajes:{" "}
                <Link href="/viajero" className="font-medium text-navy underline-offset-2 hover:underline">
                  seguro de viaje
                </Link>
                .
              </p>
            )}
          </div>
          <ul className="flex flex-col gap-3">
            {landing.points.map((point) => (
              <li key={point.title} className="surface p-5">
                <h2 className="font-display text-lg font-semibold text-navy">{point.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{point.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {isAuto ? <CoverageCompare /> : null}
      {isAuto ? <HowToQuote /> : null}

      <section id="cotizar-online" className="scroll-mt-24 bg-mist/40">
        <div className="container-mx py-10 sm:py-14">
          <SectionHeading
            title="Cotizá online"
            description="Completá los datos y ves planes de San Cristóbal. Después te contactamos por WhatsApp para emitir en Salta."
          />
          <div className="mt-8">
            <SanCristobalEmbed initialProduct={landing.embed} />
          </div>
          <div className="mt-8">
            <PasLegalNote />
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-cloud">
        <div className="container-mx py-14 sm:py-16 lg:py-20">
          <SectionHeading
            title="Preguntas frecuentes"
            description={`Consultas habituales sobre ${landing.serviceName.toLowerCase()} en Salta.`}
          />
          <div className="mt-8">
            <FaqAccordion items={landing.faqs} />
          </div>
          <ul className="mt-10 flex flex-wrap gap-3 text-sm">
            {landing.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="btn btn-outline">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/preguntas-frecuentes" className="btn btn-outline">
                Ver todas las FAQ
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
