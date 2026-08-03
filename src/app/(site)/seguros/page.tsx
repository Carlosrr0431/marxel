import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { Icon, seguroIconMap } from "@/components/Icon";
import { seguros } from "@/lib/content";

export const metadata: Metadata = {
  title: "Seguros",
  description:
    "Autos y motos, accidentes personales, comercios, ART, mala praxis y hogar. Coberturas claras con Marxel.",
};

export default function SegurosPage() {
  return (
    <>
      <PageHero
        eyebrow="Seguros"
        title="Coberturas pensadas para tu día a día"
        description="Elegí la protección que necesitás. Te explicamos cada opción con claridad y te acompañamos en la contratación."
        cta={{ href: "/cotizar?interes=Seguros", label: "Cotizar un seguro" }}
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-8">
          {seguros.map((item, index) => (
            <article
              key={item.slug}
              id={item.slug}
              className="scroll-mt-28 grid gap-6 rounded-[1.75rem] border border-line bg-white p-6 sm:p-8 lg:grid-cols-[0.9fr_1.3fr] lg:gap-10"
            >
              <div className="flex flex-col justify-between rounded-2xl bg-atmosphere p-6">
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
                      className="rounded-lg border border-line bg-mist/70 px-3 py-1.5 text-xs font-medium text-navy"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/cotizar?interes=${encodeURIComponent(item.title)}`}
                  className="mt-7 inline-flex w-fit rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
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
