import type { Metadata } from "next";
import Link from "next/link";
import { ContactLeadForm } from "@/components/ContactLeadForm";
import { PageHero } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { faqContacto, site } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Contacto y Google Maps | MARXEN Salta";
const DESCRIPTION =
  "MARXEN, agente de seguros en Salta Capital. WhatsApp 0387 572-4473, email y ficha de Google Maps. Autos, motos, prepaga y viajero.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/contacto",
});

export default async function ContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>;
}) {
  const params = await searchParams;
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, quiero asesoramiento."
  )}`;

  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/contacto",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Contacto", path: "/contacto" },
          ],
          faqs: faqContacto,
        })}
      />
      <PageHero
        eyebrow="Contacto"
        title="Hablemos: MARXEN en Salta"
        description="Estamos para asesorarte en seguros de auto, prepagas y asistencia al viajero. WhatsApp, teléfono o email."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/contacto", label: "Contacto" },
        ]}
      />

      <section className="bg-cloud">
        <div className="container-mx py-14 sm:py-16">
          <div className="mx-auto mb-10 max-w-xl">
            <ContactLeadForm sent={params.enviado === "1"} invalid={params.error === "1"} />
          </div>
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
                {site.phoneLocal}
              </p>
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                WhatsApp
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                {site.phoneLocal}
              </p>
            </a>
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Google Maps
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                MARXEN · Salta Capital
              </p>
            </a>
            <a
              href={site.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Instagram
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                @marxen.ok
              </p>
            </a>
            <a
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group p-6 transition hover:border-sky/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Facebook
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-navy transition group-hover:text-blue">
                Marxen Salta
              </p>
            </a>
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/cotizar" className="btn btn-primary">
              Ir a cotizar
            </Link>
          </div>

          <div className="mt-14">
            <h2 className="mb-4 font-display text-2xl font-semibold text-navy">
              Preguntas frecuentes
            </h2>
            <FaqAccordion items={faqContacto} />
          </div>
        </div>
      </section>
    </>
  );
}
