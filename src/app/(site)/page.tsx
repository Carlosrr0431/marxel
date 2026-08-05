import Link from "next/link";
import { QuoteForm } from "@/components/QuoteForm";
import { Icon, seguroIconMap } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { site, seguros } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-wave">
        <div className="container-mx grid items-center gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-10">
          <div className="relative z-10 max-w-xl">
            <p className="animate-rise eyebrow">Productora de seguros</p>
            <h1 className="animate-rise-delay-1 mt-4 font-display text-[clamp(2.6rem,9vw,5rem)] font-bold leading-[0.94] tracking-[-0.045em] text-navy">
              Mar<span className="text-teal">X</span>el
            </h1>
            <p className="animate-rise-delay-2 mt-5 text-base leading-relaxed text-muted sm:text-xl">
              {site.tagline}. Seguros, prepagas y asistencia al viajero, con
              asesoramiento claro.
            </p>
            <div className="animate-rise-delay-3 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/cotizar" className="btn btn-primary w-full sm:w-auto">
                Cotizar ahora
              </Link>
              <Link href="/salud" className="btn btn-secondary w-full sm:w-auto">
                Ver prepagas A2 / A4
              </Link>
            </div>
          </div>

          <div className="animate-rise-delay-2 relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="animate-float relative aspect-[5/6] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-navy via-blue to-teal-soft shadow-[0_28px_70px_rgba(10,53,92,0.28)] sm:aspect-[4/5] sm:rounded-[2rem]">
              <div className="absolute inset-0 opacity-35">
                <div className="absolute -left-8 top-14 h-40 w-40 rounded-full bg-sky blur-3xl" />
                <div className="absolute bottom-8 right-0 h-48 w-48 rounded-full bg-teal-soft blur-3xl" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-between p-6 text-white sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold">
                    <Icon name="star" className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    Confianza personal
                  </span>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold leading-tight sm:text-4xl">
                    Tres pilares.
                    <br />
                    Un solo equipo.
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                    Seguros · Salud · Viajero.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line/60 bg-cloud">
        <div className="container-mx py-16 sm:py-20">
          <SectionHeading
            eyebrow="Qué hacemos"
            title="Todo lo que necesitás, en un solo lugar"
            description="Tres áreas claras para cuidarte a vos, a tu familia y a tu patrimonio."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <Pillar
              href="/seguros"
              icon="shield"
              tone="navy"
              title="Seguros"
              text="Autos, motos, hogar, comercios, ART, AP y mala praxis."
            />
            <Pillar
              href="/salud"
              icon="heart"
              tone="sky"
              title="Salud · Prepagas"
              text="Planes A2 y A4 de Prevención Salud, con guía de aportes."
            />
            <Pillar
              href="/viajero"
              icon="plane"
              tone="teal"
              title="Asistencia al viajero"
              text="GoAssistance y New Travel. Cobertura nacional e internacional."
            />
          </div>
        </div>
      </section>

      <section className="bg-mist/40">
        <div className="container-mx py-16 sm:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seguros.map((item) => (
              <Link
                key={item.slug}
                href={`/seguros#${item.slug}`}
                className="group surface p-5 transition hover:border-sky/35"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-navy transition group-hover:bg-aqua group-hover:text-teal">
                  <Icon name={seguroIconMap[item.slug] || "shield"} />
                </span>
                <h3 className="mt-3.5 font-display text-lg font-semibold text-navy">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.short}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy text-white">
        <div className="container-mx grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-teal-soft">MarXel Salud</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Prevención Salud, explicada en claro
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/65">
              Compará A2 y A4, resolvé dudas de aportes y avanzá con
              acompañamiento real.
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-sm text-white/85">
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> Comparador interactivo A2 / A4
              </li>
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> Monotributo, sueldo o particular
              </li>
              <li className="flex gap-2">
                <span className="text-teal-soft">✓</span> FAQ sin letra chica confusa
              </li>
            </ul>
            <Link
              href="/salud#planes-a2-a4"
              className="btn mt-8 bg-white text-navy hover:bg-mist"
            >
              Comparar planes
            </Link>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="font-display text-xl font-semibold">¿Cómo empezar?</p>
            <ol className="mt-5 flex flex-col gap-4">
              {[
                "Contanos tu situación laboral.",
                "Te orientamos al plan adecuado.",
                "Te guiamos en el alta digital.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-white/70">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/25 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-atmosphere">
        <div className="container-mx grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-start">
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
      className="group surface flex h-full flex-col p-5 transition hover:border-sky/30 sm:p-6"
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon name={icon} />
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold text-navy">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
      <span className="mt-4 text-sm font-semibold text-navy/70 transition group-hover:text-navy">
        Explorar →
      </span>
    </Link>
  );
}
