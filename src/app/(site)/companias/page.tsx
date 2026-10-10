import type { Metadata } from "next";
import Link from "next/link";
import { CompanyMark } from "@/components/CompanyMark";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/SectionHeading";
import { companyProfiles } from "@/lib/company-profiles";
import { companias, site } from "@/lib/content";
import { itemListNode, pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Compañías de seguros en Salta | Productor MARXEN";
const DESCRIPTION =
  "MARXEN es productor asesor en Salta Capital y trabaja con San Cristóbal, Sancor, CNP, SMG, Nivel, Mista, Caruso, Alba Caución, Prevención y Go Assistance. No somos la compañía: te representamos.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/companias",
  keywords: companyProfiles.flatMap((company) => [company.name, ...company.searches]),
});

export default function CompaniasPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, quiero cotizar con una compañía."
  )}`;

  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/companias",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Compañías", path: "/companias" },
          ],
          faqs: [
            {
              q: "¿MARXEN es Sancor, San Cristóbal o Prevención Salud?",
              a: "No. MARXEN es el productor asesor en Salta Capital. Esas compañías emiten la póliza o el plan. Marcos te asesora y hace el trámite.",
            },
            {
              q: "¿Dónde cotizo San Cristóbal, SMG o Sancor en Salta?",
              a: "En marxen.com.ar. El auto se cotiza en el inicio con San Cristóbal y SMG. El resto de las compañías se pide por WhatsApp al 0387 572-4473.",
            },
          ],
          extra: [
            itemListNode({
              name: "Compañías con las que trabaja MARXEN en Salta",
              items: companyProfiles.map((company) => ({
                name: `${company.name} en Salta`,
                path: `/companias#${company.slug}`,
              })),
            }),
          ],
        })}
      />
      <PageHero
        eyebrow="Salta Capital"
        title="Compañías con las que trabaja MARXEN"
        description="Si buscás una de estas compañías en Salta, MARXEN es el productor asesor. La póliza o el plan lo emite la compañía."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/companias", label: "Compañías" },
        ]}
      />
      <section className="bg-cloud">
        <div className="container-mx grid gap-4 py-14 sm:py-16">
          {companyProfiles.map((company) => {
            const logo = companias.find((item) => item.slug === company.slug);
            return (
              <article id={company.slug} key={company.slug} className="surface scroll-mt-24 p-6">
                <div className="flex items-center gap-4">
                  {logo ? <CompanyMark company={logo} /> : null}
                  <h2 className="font-display text-2xl font-semibold text-navy">{company.name} en Salta</h2>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{company.text}</p>
                {company.href && company.hrefLabel ? (
                  <Link href={company.href} className="mt-4 inline-flex text-sm font-semibold text-navy underline-offset-4 hover:underline">
                    {company.hrefLabel}
                  </Link>
                ) : null}
              </article>
            );
          })}
          <p className="text-sm text-muted">
            Zona: {site.location} Teléfono {site.phoneLocal}.{" "}
            <a href={wa} className="font-semibold text-navy underline-offset-4 hover:underline">
              Escribir por WhatsApp
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
