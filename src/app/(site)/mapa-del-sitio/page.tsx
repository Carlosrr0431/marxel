import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/SectionHeading";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Mapa del sitio | MARXEN seguros en Salta";
const DESCRIPTION =
  "Todas las páginas públicas de MARXEN, empresa de seguros en Salta: auto, moto, hogar, prepaga y asistencia al viajero.";

const GROUPS = [
  {
    title: "Seguros",
    links: [
      { href: "/seguro-de-auto", label: "Seguro de auto en Salta" },
      { href: "/seguro-de-auto/terceros-basico", label: "Terceros básico" },
      { href: "/seguro-de-auto/terceros-completo", label: "Terceros completo" },
      { href: "/seguro-de-auto/todo-riesgo", label: "Todo riesgo" },
      { href: "/seguro-de-moto", label: "Seguro de moto" },
      { href: "/seguro-de-hogar", label: "Seguro de hogar" },
      { href: "/seguros", label: "Todos los seguros" },
      { href: "/cotizar", label: "Cotizar" },
      { href: "/cotizador-la-caja", label: "Cotizador La Caja" },
    ],
  },
  {
    title: "Salud y viajero",
    links: [
      { href: "/salud", label: "Prepaga y obra social" },
      { href: "/salud/cartilla-medica", label: "Cartilla médica" },
      { href: "/guias/prepaga-en-salta", label: "Guía de prepaga en Salta" },
      { href: "/guias/obra-social-y-prepaga-en-salta", label: "Derivar aportes" },
      { href: "/viajero", label: "Asistencia al viajero" },
      { href: "/guias/seguro-de-viaje-schengen", label: "Seguro de viaje Schengen" },
    ],
  },
  {
    title: "La empresa",
    links: [
      { href: "/", label: "Inicio" },
      { href: "/quienes-somos", label: "Quiénes somos" },
      { href: "/companias", label: "Compañías" },
      { href: "/guias", label: "Guías" },
      { href: "/guias/seguro-de-auto-en-salta", label: "Guía de seguro de auto" },
      { href: "/guias/seguro-de-moto-en-salta", label: "Guía de seguro de moto" },
      { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
];

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/mapa-del-sitio",
});

export default function MapaDelSitioPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/mapa-del-sitio",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Mapa del sitio", path: "/mapa-del-sitio" },
          ],
        })}
      />
      <PageHero eyebrow="MARXEN" title="Mapa del sitio" description={DESCRIPTION} />
      <section className="container-mx grid gap-8 py-14 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="font-display text-xl font-semibold text-navy">{group.title}</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-navy hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
