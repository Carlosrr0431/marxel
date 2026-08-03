import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Asistencia al viajero",
  description:
    "Asistencia al viajero con GoAssistance y New Travel. Viajá con respaldo médico y logística.",
};

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
      <PageHero
        eyebrow="Asistencia al viajero"
        title="Viajá con la espalda cubierta"
        description="Antes de salir, armamos la asistencia adecuada a tu destino, duración y acompañantes. Alianzas con GoAssistance y New Travel."
        cta={{
          href: "/cotizar?interes=Asistencia%20al%20viajero",
          label: "Cotizar asistencia",
        }}
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <SectionHeading
              eyebrow="Por qué importa"
              title="Un imprevisto no tiene que arruinar el viaje"
              description="La asistencia al viajero cubre emergencias médicas, orientación y logística cuando estás lejos de casa."
            />
            <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
              {[
                "Emergencias médicas y odontológicas",
                "Orientación telefónica las 24 horas",
                "Cobertura según destino y duración",
                "Asesoramiento previo a comprar tu pasaje",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-teal">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal via-teal-soft to-sky p-8 text-white shadow-[0_24px_60px_rgba(26,155,150,0.28)] sm:p-10">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
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
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {partners.map((p) => (
              <article
                key={p.name}
                className="rounded-2xl border border-line bg-white p-6 sm:p-7"
              >
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

        <div className="mt-14 rounded-2xl border border-line bg-mist/60 px-6 py-8 text-center sm:px-10">
          <p className="font-display text-2xl font-semibold text-navy">
            ¿Próximo viaje en agenda?
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Cotizá en minutos y recibí el asesoramiento por WhatsApp.
          </p>
          <Link
            href="/cotizar?interes=Asistencia%20al%20viajero"
            className="mt-6 inline-flex rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Cotizar ahora
          </Link>
        </div>
      </section>
    </>
  );
}
