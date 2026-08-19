import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/QuoteForm";
import { HeroProtectionVisual } from "@/components/HeroProtectionVisual";
import { Icon, seguroIconMap } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { faqHome, site, seguros } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const HOME_TITLE = "MARXEN | Productores de seguros y prepagas en Salta";
const HOME_DESCRIPTION =
  "Productores asesores en Salta: cotizá seguro de auto, moto y hogar con San Cristóbal, compará prepagas Prevención Salud y contratá asistencia al viajero.";

export const metadata: Metadata = pageMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

const STATS = [
  { value: "+500", label: "Clientes activos" },
  { value: "3", label: "Especialidades" },
  { value: "24 hs", label: "Respuesta garantizada" },
];

const STEPS = [
  "Contanos tu situación laboral.",
  "Te orientamos al plan adecuado.",
  "Te guiamos en el alta digital.",
];

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
        })}
      />
      {/* ——— HERO ——— */}
      <section className="hero-section">
        <div className="hero-bg" aria-hidden />
        <div className="container-mx hero-section__inner">
          <div className="hero-copy">
            <p className="animate-rise eyebrow">Productores de seguros en Salta</p>
            <h1 className="animate-rise-delay-1">
              Tu protección,
              <br />
              <span className="hero-gradient-text">sin vueltas.</span>
            </h1>
            <p className="hero-lede animate-rise-delay-2" data-seo-lede>
              Cotizá seguro de auto, moto y hogar, compará prepagas y armá tu
              asistencia al viajero. Asesoramiento claro, humano y a tu medida
              en Salta.
            </p>

            <div className="hero-actions animate-rise-delay-3">
              <Link href="/seguros#cotizar-online" className="btn btn-primary btn-lg">
                Cotizar seguros
              </Link>
              <Link href="/salud" className="btn btn-secondary btn-lg">
                Prepagas A2 / A4
              </Link>
            </div>

            <div className="hero-stats animate-rise-delay-3">
              {STATS.map((s) => (
                <div key={s.label} className="hero-stats__item">
                  <span className="hero-stats__value">{s.value}</span>
                  <span className="hero-stats__label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual animate-rise-delay-2">
            <div className="hero-card animate-float">
              <div className="hero-card__glow" aria-hidden />
              <div className="hero-card__inner">
                <div className="hero-card__badge">
                  <span className="hero-card__badge-icon">
                    <Icon name="star" className="h-3.5 w-3.5" />
                  </span>
                  <span>Confianza personal</span>
                </div>
                <div className="flex flex-1 items-center justify-center py-2">
                  <HeroProtectionVisual />
                </div>
                <p className="hero-card__title">
                  Tres pilares.
                  <br />
                  Un solo equipo.
                </p>
              </div>
            </div>
          </div>
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
                  href: "/seguros#cotizar-online",
                  icon: "shield",
                  title: "MARXEN Seguros",
                  text: "Autos, motos, hogar, comercios, ART, AP y mala praxis. Cotizá online con San Cristóbal.",
                  cta: "Cotizar online",
                  tone: "navy",
                  delay: 0,
                },
                {
                  href: "/salud",
                  icon: "heart",
                  title: "MARXEN Salud",
                  text: "Tu salud no puede esperar. Accedé a los mejores planes de Prevención Salud con el respaldo que necesitás. Te ayudamos a elegir según tus aportes.",
                  cta: "Explorar",
                  tone: "teal",
                  delay: 80,
                },
                {
                  href: "/viajero",
                  icon: "plane",
                  title: "Asistencia al viajero",
                  text: "Asistencia médica global, pérdida de equipaje y más. Elegí tu plan y disfrutá de tu viaje sin preocupaciones.",
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
                href="/seguros#cotizar-online"
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
                  href={`/seguros#${item.slug}`}
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

      {/* ——— SALUD CTA ——— */}
      <section className="section-salud relative overflow-hidden">
        <div className="section-salud__glow" aria-hidden />
        <div className="container-mx grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="eyebrow !text-teal-soft">MARXEN Salud</p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                Tu plan de salud ideal,
                <br />
                <span className="text-teal-soft">para vos y tu familia.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                Compará diferentes opciones, optimizá tus aportes laborales y
                elegí la mejor cobertura con acompañamiento personalizado.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {[
                  "Comparativa personalizada de planes y cartillas",
                  "Derivación de aportes (Monotributo, Relación de dependencia o Particular)",
                  "Asesoramiento transparente sin letra chica",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-white/85">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/30 text-teal-soft text-[10px] font-bold">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/salud#planes-a2-a4" className="btn btn-lg mt-8 bg-white text-navy hover:bg-mist">
                Comparar planes
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="salud-steps-card">
              <p className="font-display text-xl font-semibold text-white">
                ¿Cómo empezar?
              </p>
              <ol className="mt-6 flex flex-col gap-5">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="step-number">{i + 1}</span>
                    <div>
                      <p className="text-sm leading-relaxed text-white/75">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
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
            <QuoteForm />
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
