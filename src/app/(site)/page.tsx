import type { Metadata } from "next";
import Link from "next/link";
import { HomeAutoQuote } from "@/components/HomeAutoQuote";
import { CompanyMarquee } from "@/components/CompanyMarquee";
import { Icon, seguroIconMap } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { faqHome, productor, site, seguros } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const HOME_TITLE = "Empresa de seguros en Salta | MARXEN";
const HOME_DESCRIPTION =
  "MARXEN es una empresa de seguros y productor asesor en Salta Capital. Cotizá seguro de auto, moto y hogar, prepaga y asistencia al viajero.";

export const metadata: Metadata = pageMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
  keywords: [
    "seguro de auto Salta",
    "seguro de moto Salta",
    "prepaga Salta",
    "obra social Salta",
    "seguro de salud Salta",
    "asistencia al viajero Salta",
    "MARXEN Salta",
    "empresa de seguros Salta",
    "empresa de seguros",
    "productor de seguros Salta",
    "seguros en Salta",
    "agente de seguros Salta",
    "San Cristóbal Seguros",
    "Prevención Salud",
  ],
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/",
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
          crumbs: [{ name: "Inicio", path: "/" }],
          faqs: faqHome,
          service: { name: "Empresa de seguros en Salta", serviceType: "Insurance agency" },
        })}
      />
      {/* ——— HERO ——— */}
      <section className="hero-section hero-section--wizard">
        <div className="container-mx hero-section__inner hero-section__inner--quote hero-section__inner--wizard">
          <div id="cotizar-auto" className="hero-visual hero-visual--quote hero-visual--wizard">
            <HomeAutoQuote />
          </div>
        </div>
      </section>

      <CompanyMarquee />

      <section className="about-band">
        <div className="container-mx about-band__inner">
          <img src={productor.foto} alt={productor.nombre} />
          <div>
            <p className="eyebrow">Quiénes somos</p>
            <h2 className="font-display text-2xl font-semibold text-navy sm:text-3xl">
              {productor.nombre}, productor de seguros en Salta
            </h2>
            <p className="mt-1 text-sm text-muted">
              {productor.rol} · Matrícula {productor.matricula}
            </p>
          </div>
          <Link href="/quienes-somos" className="btn btn-outline">
            Conocer al productor
          </Link>
        </div>
      </section>

      {/* ——— QUÉ HACEMOS ——— */}
      <section className="section-pillars">
        <div className="container-mx py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Qué hacemos"
              title="Todo lo que necesitás, en un solo lugar"
              description="Tres áreas claras para cuidarte a vos, a tu familia y a tu patrimonio."
              align="center"
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {(
              [
                {
                  href: "/seguro-de-auto",
                  icon: "shield",
                  title: "MARXEN Seguros",
                  text: "Seguro de auto y de moto en Salta, más hogar, comercios, ART y accidentes personales. El cotizador del inicio compara San Cristóbal y SMG.",
                  cta: "Cotizar auto",
                  tone: "navy",
                  delay: 0,
                },
                {
                  href: "/salud",
                  icon: "heart",
                  title: "MARXEN Salud",
                  text: "Prepaga y seguro de salud en Salta. Planes de Prevención Salud y derivación de aportes de obra social si sos monotributista o estás en relación de dependencia.",
                  cta: "Explorar",
                  tone: "teal",
                  delay: 80,
                },
                {
                  href: "/viajero",
                  icon: "plane",
                  title: "Seguro de viaje",
                  text: "Asistencia al viajero desde Salta: cobertura médica internacional, Schengen y equipaje. Se contrata antes de salir.",
                  cta: "Ver coberturas",
                  tone: "sky",
                  delay: 160,
                },
              ] as const
            ).map((p) => (
              <Reveal key={p.href} delay={p.delay}>
                <PillarCard
                  href={p.href}
                  icon={p.icon}
                  title={p.title}
                  text={p.text}
                  cta={p.cta}
                  tone={p.tone}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ——— SEGUROS GRID ——— */}
      <section className="section-alt">
        <div className="container-mx py-20 sm:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Reveal>
              <SectionHeading
                eyebrow="Coberturas"
                title="Protección para cada etapa"
                description="Elegí la cobertura que encaja con tu vida o tu negocio."
              />
            </Reveal>
            <Reveal delay={100}>
              <Link
                href="/seguros"
                className="btn btn-outline shrink-0"
              >
                Ver todas
              </Link>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seguros.map((item, i) => (
              <Reveal key={item.slug} delay={i * 50}>
                <Link
                  href={item.href}
                  className="seguro-card group"
                >
                  <span className="seguro-card__icon">
                    <Icon name={seguroIconMap[item.slug] || "shield"} />
                  </span>
                  <h3 className="seguro-card__title">{item.title}</h3>
                  <p className="seguro-card__text">{item.short}</p>
                  <span className="seguro-card__arrow">→</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ——— COTIZÁ ——— */}
      <section className="bg-atmosphere">
        <div className="container-mx grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="Cotización"
                title="Empezá hoy, sin compromiso"
                description="Dejanos tus datos y te contactamos por WhatsApp con una propuesta clara."
              />
              <p className="mt-6 text-sm text-muted">
                También:{" "}
                <a
                  className="font-medium text-navy underline-offset-2 hover:underline"
                  href={`mailto:${site.email}`}
                >
                  {site.email}
                </a>
              </p>

              {/* Feature list */}
              <ul className="mt-8 flex flex-col gap-3">
                {[
                  "Respuesta en menos de 24 horas",
                  "Sin costo ni compromiso",
                  "Asesoramiento personalizado",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="surface p-6 sm:p-8">
              <p className="font-display text-2xl font-semibold text-navy">¿Necesitás otra cobertura?</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                El cotizador de esta página es solo para autos. Para el resto, escribinos y te orientamos.
              </p>
              <Link href="/contacto" className="btn btn-primary mt-6">
                Contactar para más información
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line/60 bg-cloud">
        <div className="container-mx py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              title="Seguros y prepagas en Salta, sin vueltas"
              description="Lo que más preguntan antes de cotizar con MARXEN."
            />
          </Reveal>
          <div className="mt-10">
            <FaqAccordion items={faqHome} />
          </div>
        </div>
      </section>
    </>
  );
}

function PillarCard({
  href,
  icon,
  title,
  text,
  cta,
  tone,
}: {
  href: string;
  icon: "shield" | "heart" | "plane";
  title: string;
  text: string;
  cta: string;
  tone: "navy" | "teal" | "sky";
}) {
  const toneMap = {
    navy: "pillar-card--navy",
    teal: "pillar-card--teal",
    sky: "pillar-card--sky",
  };

  return (
    <Link href={href} className={`pillar-card group ${toneMap[tone]}`}>
      <div className="pillar-card__icon-wrap">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="pillar-card__title">{title}</h3>
      <p className="pillar-card__text">{text}</p>
      <span className="pillar-card__link">
        {cta}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
