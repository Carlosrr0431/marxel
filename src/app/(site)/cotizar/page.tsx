import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHero } from "@/components/SectionHeading";
import { SanCristobalEmbed } from "@/components/SanCristobalEmbed";

export const metadata: Metadata = {
  title: "Cotizar",
  description:
    "Cotizá seguros San Cristóbal, prepagas o asistencia al viajero con MARXEN.",
};

type SearchParams = Promise<{ interes?: string }>;

function isSegurosInterest(interes: string) {
  return /seguro|auto|moto|hogar|comercio|art|praxis|accidente/i.test(interes);
}

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const interes = params.interes || "";
  const showSanCristobal = !interes || isSegurosInterest(interes);

  return (
    <>
      <PageHero
        eyebrow="Cotización"
        title={
          showSanCristobal && (!interes || isSegurosInterest(interes))
            ? "Cotizá tu seguro online"
            : "Contanos qué necesitás"
        }
        description={
          showSanCristobal && isSegurosInterest(interes)
            ? "Usá el cotizador de San Cristóbal abajo. Si preferís, también podés dejarnos tus datos y te contactamos."
            : "Nombre, provincia, edad y celular. Si es asistencia al viajero, también destino, motivo y fechas."
        }
      />

      {showSanCristobal ? (
        <section className="bg-cloud">
          <div className="container-mx py-10 sm:py-14">
            <SanCristobalEmbed />
          </div>
        </section>
      ) : null}

      <section className="bg-atmosphere">
        <div className="container-mx max-w-xl py-14 sm:py-16">
          <QuoteForm defaultInterest={interes} />
        </div>
      </section>
    </>
  );
}
