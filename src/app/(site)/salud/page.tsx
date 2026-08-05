import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { QuoteForm } from "@/components/QuoteForm";
import { PlanesComparador } from "@/components/PlanesComparador";
import {
  faqSalud,
  modalidadesIngreso,
  planesSalud,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Salud · Prepagas",
  description:
    "Compará Plan A2 y Plan A4 de Prevención Salud con Marxel: coberturas, odontología, óptica y cotización.",
};

export default function SaludPage() {
  return (
    <>
      <PageHero
        eyebrow="MarXel Salud"
        title="Prepagas con asesoramiento de verdad"
        description="Te ayudamos a elegir el plan de Prevención Salud que mejor se adapta a vos: monotributo, relación de dependencia o particular."
        cta={{ href: "#planes-a2-a4", label: "Comparar A2 y A4" }}
      />

      <section
        id="planes-a2-a4"
        className="scroll-mt-24 border-b border-line/70 bg-atmosphere"
      >
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeading
            eyebrow="Prevención Salud"
            title="Plan A2 vs Plan A4"
            description="Compará de forma interactiva las coberturas más importantes: rehabilitación, odontología, óptica, farmacia y beneficios familiares."
          />
          <div className="mt-10">
            <PlanesComparador />
          </div>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted">
            La información es orientativa según los folletos de Prevención Salud.
            Topes, carencias y reintegros se confirman al cotizar con tu asesor
            Marxel. Prestaciones sujetas a auditoría médica/odontológica.
          </p>
        </div>
      </section>

      <section className="border-b border-line/70 bg-cloud">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeading
            eyebrow="Líneas comerciales"
            title="Toda la grilla, en simple"
            description="Desde opciones iniciales hasta premium. A2 y A4 son dos de los planes más consultados."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {planesSalud.map((plan) => (
              <article
                key={plan.linea}
                className="flex flex-col rounded-2xl border border-line bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                  Línea {plan.linea}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-navy">
                  {plan.planes}
                </h3>
                <p className="mt-2 text-sm text-muted">{plan.ideal}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {plan.puntos.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-ink/85">
                      <span className="text-teal">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted">
            Cartilla médica:{" "}
            <a
              href="https://www.prevencionsalud.com.ar/cartilla-medica"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-navy underline-offset-2 hover:underline"
            >
              prevencionsalud.com.ar/cartilla-medica
            </a>
          </p>
        </div>
      </section>

      <section className="bg-mist/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeading
            eyebrow="Modalidades de ingreso"
            title="¿Cómo te sumás?"
            description="El camino cambia según tu situación laboral. Te guiamos en cada caso."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {modalidadesIngreso.map((m) => (
              <article
                key={m.title}
                className="rounded-2xl border border-line bg-white p-6"
              >
                <h3 className="font-display text-lg font-semibold text-navy">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line/70 bg-cloud">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeading
            eyebrow="Preguntas frecuentes"
            title="Respuestas claras, sin vueltas"
            description="Lo esencial sobre afiliación, aportes, cartilla, app y coberturas."
          />

          <div className="mt-10 flex flex-col gap-10">
            {faqSalud.map((bloque) => (
              <div key={bloque.titulo}>
                <h3 className="mb-4 font-display text-xl font-semibold text-navy">
                  {bloque.titulo}
                </h3>
                <FaqAccordion items={bloque.items} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-atmosphere">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              title="Pedí tu cotización de salud"
              description="Completá nombre, provincia, edad y celular. Te contactamos para armar la propuesta A2, A4 u otro plan."
            />
            <Link
              href="/cotizar?interes=Prevención%20Salud"
              className="mt-6 inline-flex text-sm font-semibold text-navy underline-offset-4 hover:underline"
            >
              Ir al formulario completo →
            </Link>
          </div>
          <QuoteForm defaultInterest="Prevención Salud" compact />
        </div>
      </section>
    </>
  );
}
