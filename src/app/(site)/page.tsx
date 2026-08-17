import Link from "next/link";
import { QuoteForm } from "@/components/QuoteForm";
import { HeroProtectionVisual } from "@/components/HeroProtectionVisual";
import { Icon, seguroIconMap } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { site, seguros } from "@/lib/content";

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
      {/* ——— HERO ——— */}
      <section className="hero-section relative overflow-hidden">
        <div className="hero-bg" aria-hidden />
        <div className="container-mx grid items-center gap-12 py-16 sm:py-20 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-12">
          {/* Left */}
          <div className="relative z-10 max-w-2xl">
            <p className="animate-rise eyebrow">Productores de seguros - Salta</p>
            <h1 className="animate-rise-delay-1 mt-5 font-display text-[2.65rem] font-semibold leading-[1.06] tracking-tight text-navy sm:text-5xl lg:text-[3.5rem]">
              Tu protección,
              <br />
              <span className="hero-gradient-text">sin vueltas.</span>
            </h1>
            <p className="animate-rise-delay-2 mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              Seguros, prepagas y asistencia al viajero con asesoramiento claro,
              humano y a tu medida.
            </p>

            <div className="animate-rise-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/cotizar" className="btn btn-primary btn-lg">
                Cotizar ahora
              </Link>
              <Link href="/salud" className="btn btn-secondary btn-lg">
                Prepagas A2 / A4
              </Link>
            </div>

            {/* Trust badges */}
            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="stat-badge">
                  <span className="stat-badge__value">{s.value}</span>
                  <span className="stat-badge__label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — orbit card */}
          <div className="animate-rise-delay-2 relative mx-auto w-full max-w-[22rem] lg:max-w-none">
            <div className="hero-card animate-float">
              <div className="hero-card__glow" aria-hidden />
              <div className="hero-card__inner">
                <div className="hero-card__badge">
                  <span className="hero-card__badge-icon">
                    <Icon name="star" className="h-3.5 w-3.5" />
                  </span>
                  <span>Confianza personal</span>
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <HeroProtectionVisual />
                </div>
                <p className="font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
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
                  href: "/seguros",
                  icon: "shield",
                  title: "MARXEN Seguros",
                  text: "Autos, motos, hogar, comercios, ART, AP y mala praxis. Cobertura para cada etapa de tu vida.",
                  tone: "navy",
                  delay: 0,
                },
                {
                  href: "/salud",
                  icon: "heart",
                  title: "MARXEN Salud",
                  text: "Planes A2 y A4 de Prevención Salud, con guía de aportes según tu modalidad laboral.",
                  tone: "teal",
                  delay: 80,
                },
                {
                  href: "/viajero",
                  icon: "plane",
                  title: "MARXEN Viajero",
                  text: "GoAssistance y New Travel. Cobertura nacional e internacional para cada viaje.",
                  tone: "sky",
                  delay: 160,
                },
              ] as const
            ).map((p) => (
              <Reveal key={p.href} delay={p.delay}>
                <PillarCard {...p} />
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
                className="shrink-0 text-sm font-semibold text-navy underline-offset-4 hover:underline"
              >
                Ver todas →
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
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Prevención Salud,
                <br />
                <span className="text-teal-soft">explicada en claro.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                Compará A2 y A4, resolvé dudas de aportes y avanzá con
                acompañamiento real.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {[
                  "Comparador interactivo A2 / A4",
                  "Monotributo, sueldo o particular",
                  "FAQ sin letra chica confusa",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-white/85">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/30 text-teal-soft text-[10px] font-bold">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/salud#planes-a2-a4" className="btn mt-8 bg-white text-navy hover:bg-mist">
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
    </>
  );
}

function PillarCard({
  href,
  icon,
  title,
  text,
  tone,
}: {
  href: string;
  icon: "shield" | "heart" | "plane";
  title: string;
  text: string;
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
        Explorar
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
