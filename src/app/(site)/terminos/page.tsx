import type { Metadata } from "next";
import { PageHero } from "@/components/SectionHeading";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const TITLE = "Términos del servicio";
const DESCRIPTION = "Condiciones de uso del sitio y del asesoramiento de MARXEN en Salta.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Términos del servicio"
        description="Cotizar en MARXEN no obliga a contratar. La póliza la emite la compañía."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/terminos", label: "Términos" },
        ]}
      />
      <section className="bg-cloud">
        <div className="container-mx max-w-3xl space-y-8 py-14 text-sm leading-relaxed text-navy sm:py-16">
          <p>
            El sitio marxen.com.ar es de MARXEN, productor asesor de seguros en Salta Capital. Al
            usarlo aceptás estas condiciones y la política de privacidad.
          </p>
          <div>
            <h2 className="font-display text-xl font-semibold">Qué ofrece el sitio</h2>
            <p className="mt-2 text-muted">
              Información y cotizaciones de seguros, prepagas y asistencia al viajero. Una cotización
              es una propuesta: no es una póliza hasta que la compañía la emita y se pague. MARXEN
              no es la aseguradora.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Uso correcto</h2>
            <p className="mt-2 text-muted">
              Los datos que cargues tienen que ser tuyos o de alguien que te autorizó. El CRM y la
              conexión con Google Calendar son herramientas internas del asesor.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Contacto</h2>
            <p className="mt-2 text-muted">
              {site.email} · WhatsApp {site.phoneLocal} · {site.location} Rige la ley argentina. Los
              reclamos de pólizas de San Cristóbal también pueden canalizarse ante la Superintendencia
              de Seguros de la Nación.
            </p>
          </div>
          <p className="text-muted">Vigente desde el 22 de septiembre de 2026.</p>
        </div>
      </section>
    </>
  );
}
