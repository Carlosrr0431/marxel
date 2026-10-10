import type { Metadata } from "next";
import Link from "next/link";
import { CompanyMark } from "@/components/CompanyMark";
import { JsonLd } from "@/components/JsonLd";
import { companias, productor, site } from "@/lib/content";
import { pageJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Quiénes somos | Marcos González, productor de seguros";
const DESCRIPTION =
  "Marcos González es productor asesor de seguros en Salta, matrícula 100282. Conocé las compañías con las que trabaja MARXEN.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/quienes-somos",
});

export default function QuienesSomosPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola Marcos, quiero asesoramiento."
  )}`;

  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/quienes-somos",
          title: TITLE,
          description: DESCRIPTION,
          crumbs: [
            { name: "Inicio", path: "/" },
            { name: "Quiénes somos", path: "/quienes-somos" },
          ],
        })}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: productor.nombre,
          jobTitle: productor.rol,
          identifier: productor.matricula,
          image: `https://www.marxen.com.ar${productor.foto}`,
          telephone: site.phone,
          email: site.email,
          address: site.location,
          worksFor: { "@type": "Organization", name: "MARXEN", url: "https://www.marxen.com.ar" },
        }}
      />

      <section className="about-hero">
        <div className="container-mx about-hero__grid">
          <figure className="about-portrait">
            <img src={productor.foto} alt={`${productor.nombre}, ${productor.rol}`} />
            <figcaption>
              <span>Matrícula</span>
              <strong>{productor.matricula}</strong>
            </figcaption>
          </figure>

          <div>
            <p className="eyebrow">Quiénes somos</p>
            <h1 className="about-hero__name">{productor.nombre}</h1>
            <p className="about-hero__role">{productor.rol}</p>
            <p className="about-hero__text">
              Marcos asesora en Salta a personas, familias y comercios. Compara coberturas,
              explica las condiciones y acompaña el trámite con las compañías con las que trabaja.
            </p>
            <dl className="about-facts">
              <div>
                <dt>Matrícula</dt>
                <dd>{productor.matricula}</dd>
              </div>
              <div>
                <dt>Zona</dt>
                <dd>Salta Capital</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>
                  <Link href="/contacto">Más información</Link>
                </dd>
              </div>
            </dl>
            <div className="about-hero__actions">
              <Link href="/contacto" className="btn btn-primary">
                Contactar para más información
              </Link>
              <a href={wa} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
              <Link href="/#cotizar-auto" className="btn btn-outline">
                Cotizar auto
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cloud" aria-labelledby="companias-marcos">
        <div className="container-mx py-16 sm:py-20">
          <p className="eyebrow">Compañías</p>
          <h2 id="companias-marcos" className="mt-3 font-display text-3xl font-semibold text-navy">
            Con las que trabaja
          </h2>
          <p className="mt-3 max-w-xl text-muted">
            El mismo productor matriculado cotiza y gestiona estas compañías.
          </p>
          <ul className="about-companies">
            {companias.map((company) => (
              <li key={company.slug}>
                <CompanyMark company={company} />
                <Link href={`/companias#${company.slug}`}>{company.name} en Salta</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
