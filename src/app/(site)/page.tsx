import Link from "next/link";
import { QuoteForm } from "@/components/QuoteForm";
import { Icon } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { site, seguros } from "@/lib/content";
import { seguroIconMap } from "@/components/Icon";

export default function HomePage() {
  return (
    <>
      {/* Hero — una sola composición */}
      <section className="relative overflow-hidden bg-wave">
        <div className="mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:py-10">
          <div className="relative z-10">
            <p className="animate-rise text-xs font-semibold uppercase tracking-[0.24em] text-teal">
              Productora de seguros
            </p>
            <h1 className="animate-rise-delay-1 mt-4 font-display text-[clamp(2.8rem,8vw,5.2rem)] font-bold leading-[0.95] tracking-[-0.04em] text-navy">
              Mar
              <span className="text-teal">X</span>
              el
            </h1>
            <p className="animate-rise-delay-2 mt-5 max-w-md text-lg leading-relaxed text-muted sm:text-xl">
              {site.tagline}. Seguros, prepagas y asistencia al viajero, con
              asesoramiento claro y cercano.
            </p>
            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/cotizar"
                className="rounded-xl bg-navy px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                Cotizar ahora
              </Link>
              <Link
                href="/salud"
                className="rounded-xl border border-line bg-white/70 px-5 py-3.5 text-sm font-semibold text-navy transition hover:border-sky/40 hover:bg-white"
              >
                Ver prepagas
              </Link>
            </div>
          </div>

          <div className="animate-rise-delay-2 relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="animate-float relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy via-blue to-teal-soft shadow-[0_30px_80px_rgba(10,61,107,0.28)]">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -left-10 top-16 h-48 w-48 rounded-full bg-sky blur-3xl" />
                <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-teal-soft blur-3xl" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-between p-7 text-white sm:p-9">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-gold/20 text-gold">
                    <Icon name="star" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                    Confianza personal
                  </span>
                </div>
                <div>
                  <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                    Tres pilares.
                    <br />
                    Un solo equipo.
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
                    Seguros · Salud · Viajero. Te acompañamos a elegir con
                    tranquilidad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="border-b border-line/70 bg-cloud">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading
            eyebrow="Qué hacemos"
            title="Todo lo que necesitás, en un solo lugar"
            description="Tres áreas claras para cuidarte a vos, a tu familia y a tu patrimonio."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Pillar
              href="/seguros"
              icon="shield"
              tone="navy"
              title="Seguros"
              text="Autos, motos, hogar, comercios, ART, AP y mala praxis. Coberturas sólidas, explicadas sin vueltas."
            />
            <Pillar
              href="/salud"
              icon="heart"
              tone="sky"
              title="Salud · Prepagas"
              text="Planes a medida con Prevención Salud: cartilla, aportes, monotributo y acompañamiento en cada paso."
            />
            <Pillar
              href="/viajero"
              icon="plane"
              tone="teal"
              title="Asistencia al viajero"
              text="Viajá tranquilo con alianzas como GoAssistance y New Travel. Cobertura nacional e internacional."
            />
          </div>
        </div>
      </section>

      {/* Seguros preview */}
      <section className="bg-mist/50">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Seguros"
              title="Protección para cada etapa"
              description="Elegí la cobertura que encaja con tu vida o tu negocio."
            />
            <Link
              href="/seguros"
              className="shrink-0 text-sm font-semibold text-navy underline-offset-4 hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seguros.map((item) => (
              <Link
                key={item.slug}
                href={`/seguros#${item.slug}`}
                className="group rounded-2xl border border-line bg-white p-5 transition hover:border-sky/40 hover:shadow-[0_16px_40px_rgba(10,61,107,0.06)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-navy transition group-hover:bg-aqua group-hover:text-teal">
                  <Icon name={seguroIconMap[item.slug] || "shield"} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-navy">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {item.short}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Salud highlight */}
      <section className="border-y border-line/70 bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-soft">
              MarXel Salud
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Prevención Salud, con asesoramiento real
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70">
              Planes a medida, coberturas especiales y guía paso a paso para
              monotributistas, relación de dependencia o ingreso particular.
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-sm text-white/85">
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> Cartilla médica y app
                digital
              </li>
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> Derivación de aportes
              </li>
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> FAQ claras, sin letra
                chica confusa
              </li>
            </ul>
            <Link
              href="/salud"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-mist"
            >
              Conocer planes de salud
            </Link>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
            <p className="font-display text-xl font-semibold">
              ¿Cómo empezar?
            </p>
            <ol className="mt-5 flex flex-col gap-4">
              {[
                "Contanos tu situación (monotributo, sueldo o particular).",
                "Te orientamos al plan que mejor se adapta a tu presupuesto.",
                "Te guiamos en el alta digital y el seguimiento.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-white/75">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/30 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA + form */}
      <section className="bg-atmosphere">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Cotización"
              title="Empezá hoy, sin compromiso"
              description="Dejanos tus datos y te contactamos por WhatsApp para armar una propuesta personalizada."
            />
            <p className="mt-8 text-sm text-muted">
              También podés escribirnos a{" "}
              <a className="font-medium text-navy underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </p>
          </div>
          <QuoteForm />
        </div>
      </section>
    </>
  );
}

function Pillar({
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
  tone: "navy" | "sky" | "teal";
}) {
  const tones = {
    navy: "bg-navy/8 text-navy",
    sky: "bg-sky/15 text-blue",
    teal: "bg-teal/12 text-teal",
  };

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition hover:border-sky/35 hover:shadow-[0_18px_44px_rgba(10,61,107,0.07)]"
    >
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon name={icon} />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold text-navy">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
      <span className="mt-5 text-sm font-semibold text-navy opacity-70 transition group-hover:opacity-100">
        Explorar →
      </span>
    </Link>
  );
}
