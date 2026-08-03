import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contactá a Marxel por email, teléfono o WhatsApp.",
};

export default function ContactoPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola Marxel, quiero asesoramiento."
  )}`;

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos"
        description="Estamos para asesorarte en seguros, salud y asistencia al viajero."
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <a
            href={`mailto:${site.email}`}
            className="rounded-2xl border border-line bg-white p-6 transition hover:border-sky/40"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              Email
            </p>
            <p className="mt-3 font-display text-xl font-semibold text-navy">
              {site.email}
            </p>
          </a>
          <a
            href={`tel:${site.phone.replace(/\s/g, "")}`}
            className="rounded-2xl border border-line bg-white p-6 transition hover:border-sky/40"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              Teléfono
            </p>
            <p className="mt-3 font-display text-xl font-semibold text-navy">
              {site.phone}
            </p>
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-line bg-white p-6 transition hover:border-sky/40"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              WhatsApp
            </p>
            <p className="mt-3 font-display text-xl font-semibold text-navy">
              Escribinos ahora
            </p>
          </a>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/cotizar"
            className="inline-flex rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Ir a cotizar
          </Link>
        </div>
      </section>
    </>
  );
}
