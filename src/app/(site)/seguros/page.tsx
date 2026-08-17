import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { Icon, seguroIconMap } from "@/components/Icon";
import { seguros } from "@/lib/content";

export const metadata: Metadata = {
  title: "MARXEN Seguros",
  description:
    "Autos y motos, accidentes personales, comercios, ART, mala praxis y hogar. Coberturas claras con MARXEN.",
};

export default function SegurosPage() {
  return (
    <>
      <PageHero
        eyebrow="MARXEN Seguros"
        title="Coberturas pensadas para tu día a día"
        description="Elegí la protección que necesitás. Te explicamos cada opción con claridad y te acompañamos en la contratación."
        cta={{ href: "/cotizar?interes=Seguros", label: "Cotizar un seguro" }}
      />

      <section className="bg-cloud">
        <div className="container-mx flex flex-col gap-5 py-14 sm:py-16 lg:gap-6 lg:py-20">
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
                <Link
                  href={`/cotizar?interes=${encodeURIComponent(item.title)}`}
                  className="btn btn-primary mt-7 w-full sm:w-auto"
                >
                  Pedir cotización
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
