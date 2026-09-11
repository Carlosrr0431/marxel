import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { AUTO_COVERAGES } from "@/lib/auto-coverages";
import { faqHome, faqSalud, faqSeguros, faqViajero, type FaqItem } from "@/lib/content";
import { GUIDES } from "@/lib/guides";
import { productLandings } from "@/lib/product-landings";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Preguntas frecuentes de seguros, prepaga y viajero en Salta";
const DESCRIPTION =
  "FAQ de MARXEN en Salta: seguro de auto (terceros y todo riesgo), moto, hogar, prepaga A2/A4 y asistencia al viajero Schengen.";

function uniqueFaqs(items: FaqItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.q)) return false;
    seen.add(item.q);
    return true;
  });
}

const viajeGuide = GUIDES.find((guide) => guide.path.endsWith("schengen"));

const BLOQUES = [
  { titulo: "MARXEN en Salta", items: uniqueFaqs(faqHome) },
  {
    titulo: "Seguro de auto",
    items: uniqueFaqs([
      ...productLandings.auto.faqs,
      ...Object.values(AUTO_COVERAGES).flatMap((coverage) => coverage.faqs),
    ]),
  },
  {
    titulo: "Otros seguros",
    items: uniqueFaqs([...faqSeguros, ...productLandings.moto.faqs, ...productLandings.hogar.faqs]),
  },
  { titulo: "Prepaga y salud", items: uniqueFaqs(faqSalud.flatMap((bloque) => bloque.items).slice(0, 8)) },
  { titulo: "Viajero", items: uniqueFaqs([...faqViajero, ...(viajeGuide?.faqs ?? [])]) },
];

const ALL_FAQS = BLOQUES.flatMap((bloque) => bloque.items);

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/preguntas-frecuentes",
  keywords: [
    "preguntas frecuentes seguro auto Salta",
    "FAQ prepaga Salta",
    "FAQ seguro de viaje",
    "MARXEN FAQ",
  ],
});

export default function PreguntasFrecuentesPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/preguntas-frecuentes",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Preguntas frecuentes", path: "/preguntas-frecuentes" },
          ],
          faqs: ALL_FAQS,
        })}
      />
      <PageHero
        eyebrow="Ayuda"
        title="Preguntas frecuentes"
        description="Respuestas de productor asesor en Salta: auto, moto, hogar, prepaga y viajero. Cotizar no tiene costo."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
        ]}
      />
      <section className="bg-cloud">
        <div className="container-mx flex flex-col gap-12 py-14 sm:py-16 lg:py-20">
          {BLOQUES.map((bloque) => (
            <div key={bloque.titulo}>
              <SectionHeading title={bloque.titulo} />
              <div className="mt-6">
                <FaqAccordion items={bloque.items} />
              </div>
            </div>
          ))}
          <p className="text-sm text-muted">
            ¿No está tu consulta?{" "}
            <Link href="/contacto" className="font-medium text-navy underline-offset-2 hover:underline">
              Escribinos
            </Link>{" "}
            o mirá las{" "}
            <Link href="/guias" className="font-medium text-navy underline-offset-2 hover:underline">
              guías
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
