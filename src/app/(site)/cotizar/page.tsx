import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHero } from "@/components/SectionHeading";
import { SanCristobalEmbed } from "@/components/SanCristobalEmbed";
import { JsonLd } from "@/components/JsonLd";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Cotizar seguro de auto en Salta";
const DESCRIPTION =
  "Cotizá online tu seguro San Cristóbal o pedí una propuesta de prepaga y viajero. MARXEN te responde por WhatsApp.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cotizar",
});

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
      <JsonLd
        data={pageJsonLd({
          path: "/cotizar",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Cotizar", path: "/cotizar" },
          ],
        })}
      />
      <PageHero
        eyebrow="Cotización"
        title={
          showSanCristobal && (!interes || isSegurosInterest(interes))
            ? "Cotizá tu seguro de auto en Salta"
            : "Contanos qué necesitás"
        }
        description={
          showSanCristobal && isSegurosInterest(interes)
            ? "Usá el cotizador de San Cristóbal abajo. Si preferís, también podés dejarnos tus datos y te contactamos."
            : "Nombre, provincia, edad y celular. Si es asistencia al viajero, también destino, motivo y fechas."
        }
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/cotizar", label: "Cotizar" },
        ]}
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
