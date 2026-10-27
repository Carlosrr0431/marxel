import type { Metadata } from "next";
import { LaCajaAutoQuote } from "@/components/LaCajaAutoQuote";
import { JsonLd } from "@/components/JsonLd";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Cotizador de auto La Caja en Salta | MARXEN";
const DESCRIPTION =
  "Cotizá el seguro de auto de La Caja desde MARXEN: año, marca, modelo y versión. Ves los planes y el precio con IVA, y Marcos te gestiona el alta en Salta.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cotizador-la-caja",
});

export default function CotizadorLaCajaPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/cotizador-la-caja",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Cotizador La Caja", path: "/cotizador-la-caja" },
          ],
        })}
      />
      <section className="bg-atmosphere">
        <div className="container-mx max-w-6xl py-10 sm:py-14">
          <LaCajaAutoQuote />
        </div>
      </section>
    </>
  );
}
