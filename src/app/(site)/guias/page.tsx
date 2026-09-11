import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/SectionHeading";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES } from "@/lib/guides";
import { itemListNode, pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Guías de seguros, prepaga y viajero en Salta";
const DESCRIPTION =
  "Cómo elegir seguro de auto, prepaga A2/A4 y asistencia al viajero Schengen desde Salta. Guías de MARXEN, productor asesor local.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/guias",
  keywords: ["guías seguros Salta", "cómo elegir seguro de auto", "prepaga Salta", "seguro de viaje Schengen"],
});

export default function GuiasIndexPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/guias",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Guías", path: "/guias" },
          ],
          extra: [
            itemListNode({
              name: "Guías MARXEN",
              items: GUIDES.map((guide) => ({ name: guide.h1, path: guide.path })),
            }),
          ],
        })}
      />
      <PageHero
        eyebrow="Contenido útil"
        title="Guías para decidir con claridad"
        description="Lo mismo que mirás en las fichas de las compañías, explicado para Salta: auto, prepaga y viaje."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/guias", label: "Guías" },
        ]}
      />
      <section className="bg-cloud">
        <div className="container-mx grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:py-20">
          {GUIDES.map((guide) => (
            <Link key={guide.path} href={guide.path} className="surface p-6 transition hover:border-sky/40">
              <h2 className="font-display text-xl font-semibold text-navy">{guide.h1}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{guide.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-navy">Leer guía →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
