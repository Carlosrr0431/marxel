import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contactá a MARXEN por email, teléfono o WhatsApp.",
};

export default function ContactoPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, quiero asesoramiento."
  )}`;

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos"
        description="Estamos para asesorarte en seguros, salud y asistencia al viajero."
      />

      <section className="bg-cloud">
        <div className="container-mx py-14 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <a
              href={`mailto:${site.email}`}
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Email
              </p>
              <p className="mt-3 break-all font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                {site.email}
              </p>
            </a>
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Teléfono
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                {site.phone}
              </p>
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group p-6 transition hover:border-sky/40 sm:col-span-2 lg:col-span-1"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                WhatsApp
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                {site.phone}
              </p>
            </a>
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/cotizar" className="btn btn-primary">
              Ir a cotizar
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
