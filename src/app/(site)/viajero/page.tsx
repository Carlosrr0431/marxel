import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/Icon";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { faqViajero } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Asistencia al viajero desde Salta";
const DESCRIPTION =
  "Asistencia médica internacional, pérdida de equipaje y cobertura 24 hs. Contratá asistencia al viajero con MARXEN desde Salta.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/viajero",
  keywords: [
    "asistencia al viajero Salta",
    "seguro de viaje",
    "GoAssistance",
    "MARXEN Viajero",
  ],
});

const partners = [
  {
    name: "GoAssistance",
    tag: "Asistencia 24 hs",
    text: "Cobertura de emergencias médicas, orientación telefónica y acompañamiento durante tu viaje.",
  },
  {
    name: "New Travel",
    tag: "Viajes con respaldo",
    text: "Planes pensados para turismo y desplazamientos, con asistencia clara y alcance internacional.",
  },
];

export default function ViajeroPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/viajero",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Viajero", path: "/viajero" },
          ],
          faqs: faqViajero,
        })}
      />
      <PageHero
        eyebrow="MARXEN Viajero"
        title="Asistencia al viajero desde Salta"
        description="Asistencia médica global, pérdida de equipaje y orientación 24 hs. Elegí tu plan y viajá sin preocupaciones."
        cta={{
          href: "/cotizar?interes=Asistencia%20al%20viajero",
          label: "Ver coberturas",
        }}
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/viajero", label: "Viajero" },
        ]}
      />

      <section className="bg-cloud">
        <div className="container-mx py-14 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <SectionHeading
                eyebrow="Por qué importa"
                title="Un imprevisto no tiene que arruinar el viaje"
                description="La asistencia al viajero cubre emergencias médicas, orientación y logística cuando estás lejos de casa."
              />
              <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
                {[
                  "Asistencia médica global",
                  "Pérdida de equipaje",
                  "Orientación telefónica las 24 horas",
                  "Cobertura según destino y duración",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-teal">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="viajero-panel">
              <Icon name="plane" className="h-10 w-10 text-white" />
              <p className="mt-6 font-display text-3xl font-semibold leading-tight">
                Destino listo.
                <br />
                Asistencia lista.
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                Contanos a dónde vas y por cuántos días. Te proponemos la opción
                más conveniente.
              </p>
            </div>
          </div>

          <div className="mt-16">
            <SectionHeading
              eyebrow="Alianzas"
              title="Partners de confianza"
              description="Trabajamos con asistencias reconocidas para que viajes con tranquilidad."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
              {partners.map((p) => (
                <article key={p.name} className="surface p-6 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                    {p.tag}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-navy">
                    {p.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{p.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-14 rounded-[1.5rem] border border-line/80 bg-mist/50 px-6 py-8 text-center sm:px-10">
            <p className="font-display text-2xl font-semibold text-navy">
              ¿Próximo viaje en agenda?
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Cotizá en minutos y recibí el asesoramiento por WhatsApp.
            </p>
            <Link
              href="/cotizar?interes=Asistencia%20al%20viajero"
              className="btn btn-primary mt-6"
            >
              Cotizar ahora
            </Link>
          </div>

          <div className="mt-14">
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              title="Antes de viajar"
            />
            <div className="mt-8">
              <FaqAccordion items={faqViajero} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
