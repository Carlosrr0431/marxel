import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { Icon, seguroIconMap } from "@/components/Icon";
import { SanCristobalEmbed } from "@/components/SanCristobalEmbed";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { faqSeguros, seguros } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Seguro de auto, moto y hogar en Salta";
const DESCRIPTION =
  "Cotizá online seguro de auto, moto, hogar y comercio con San Cristóbal a través de MARXEN en Salta. También ART, accidentes personales y mala praxis.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/seguros",
  keywords: [
    "seguro de auto Salta",
    "cotizar seguro San Cristóbal",
    "seguro de moto Salta",
    "seguro de hogar Salta",
    "MARXEN Seguros",
  ],
});

export default function SegurosPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/seguros",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Seguros", path: "/seguros" },
          ],
          faqs: faqSeguros,
        })}
      />
      <PageHero
        eyebrow="MARXEN Seguros"
        title="Seguros de auto, moto y hogar en Salta"
        description="Cotizá online con San Cristóbal: año, marca y modelo. También te asesoramos en comercio, ART, accidentes personales y mala praxis."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/seguros", label: "Seguros" },
        ]}
      />

      <section id="cotizar-online" className="scroll-mt-24 bg-cloud">
        <div className="container-mx py-10 sm:py-14">
          <SanCristobalEmbed />
        </div>
      </section>

      <section className="border-t border-line/60 bg-mist/30">
        <div className="container-mx flex flex-col gap-5 py-14 sm:py-16 lg:gap-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">También te asesoramos</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
              Otras coberturas con MARXEN
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              ART, mala praxis y más. Si no está en el cotizador online, te
              armamos la propuesta a medida.
            </p>
          </div>

          {seguros.map((item, index) => (
            <article
              key={item.slug}
              id={item.slug}
              className="surface scroll-mt-28 grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.85fr_1.35fr] lg:gap-10 lg:p-8"
            >
              <div className="flex flex-col justify-between rounded-2xl bg-mist/80 p-5 sm:p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-navy shadow-sm">
                  <Icon name={seguroIconMap[item.slug] || "shield"} />
                </span>
                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                    0{index + 1}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
                    {item.title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-base leading-relaxed text-muted">
                  {item.description}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {item.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-lg border border-line/80 bg-mist/60 px-3 py-1.5 text-xs font-medium text-navy"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                  <a href="#cotizar-online" className="btn btn-primary w-full sm:w-auto">
                    Cotizar online
                  </a>
                  <Link
                    href={`/cotizar?interes=${encodeURIComponent(item.title)}`}
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    Pedir asesoramiento
                  </Link>
                </div>
              </div>
            </article>
          ))}

          <div className="mt-6">
            <h2 className="mb-4 font-display text-2xl font-semibold text-navy sm:text-3xl">
              Preguntas frecuentes de seguros
            </h2>
            <FaqAccordion items={faqSeguros} />
          </div>
        </div>
      </section>
    </>
  );
}
