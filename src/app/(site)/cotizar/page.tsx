import type { Metadata } from "next";
import { AutoMultiQuote } from "@/components/AutoMultiQuote";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHero } from "@/components/SectionHeading";
import { GoAssistanceQuote } from "@/components/GoAssistanceQuote";
import { JsonLd } from "@/components/JsonLd";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Cotizar seguro de auto, prepaga y viajero en Salta";
const DESCRIPTION =
  "Cotizá el seguro de tu auto con las compañías de MARXEN, o pedí prepaga y seguro de viaje. Marcos te responde desde Salta.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cotizar",
});

type SearchParams = Promise<{ interes?: string }>;

function isViajeroInterest(interes: string) {
  return /viajero|viaje/i.test(interes);
}

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const interes = params.interes || "";
  const showViajero = isViajeroInterest(interes);
  const showAutoQuote = !interes || /auto/i.test(interes);

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
      {showViajero ? (
        <GoAssistanceQuote />
      ) : (
        <>
          <PageHero
            eyebrow="Cotización"
            title={showAutoQuote ? "Cotizá tu seguro de auto en Salta" : "Contanos qué necesitás"}
            description={
              showAutoQuote
                ? "Dejá la patente o los datos del auto. Marcos lo compara con las compañías y te escribe."
                : "Nombre, provincia, edad y celular. Para autos usá el cotizador del inicio."
            }
            crumbs={[
              { href: "/", label: "Inicio" },
              { href: "/cotizar", label: "Cotizar" },
            ]}
          />

          <section className="bg-atmosphere">
            <div className="container-mx max-w-xl py-14 sm:py-16">
              {showAutoQuote ? <AutoMultiQuote /> : <QuoteForm defaultInterest={interes} />}
            </div>
          </section>
        </>
      )}
    </>
  );
}
