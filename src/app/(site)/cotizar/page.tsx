import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHero } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Cotizar",
  description:
    "Cotizá seguros, prepagas o asistencia al viajero con Marxel. Completá tus datos y te contactamos.",
};

type SearchParams = Promise<{ interes?: string }>;

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const interes = params.interes || "";

  return (
    <>
      <PageHero
        eyebrow="Cotización"
        title="Contanos qué necesitás"
        description="Nombre, provincia, edad y celular. Con eso armamos una orientación inicial y seguimos por WhatsApp."
      />

      <section className="mx-auto max-w-xl px-5 py-14 sm:px-8 sm:py-16">
        <QuoteForm defaultInterest={interes} />
      </section>
    </>
  );
}
