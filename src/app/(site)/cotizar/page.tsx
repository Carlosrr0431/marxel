import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHero } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Cotizar",
  description:
    "Cotizá seguros, prepagas o asistencia al viajero con MARXEN. Completá tus datos y te contactamos.",
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
        description="Nombre, provincia, edad y celular. Si es asistencia al viajero, también destino, motivo y fechas."
      />

      <section className="bg-atmosphere">
        <div className="container-mx max-w-xl py-14 sm:py-16">
          <QuoteForm defaultInterest={interes} />
        </div>
      </section>
    </>
  );
}
