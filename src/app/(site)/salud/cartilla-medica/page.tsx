import type { Metadata } from "next";
import Link from "next/link";
import { CartillaBuscador } from "./CartillaBuscador";
import { pageMetadata } from "@/lib/seo";
import { PRESTADORES, FARMACIAS } from "@/data/cartilla-prestadores";

export const metadata: Metadata = pageMetadata({
  title: "Cartilla médica Salta — Planes A2 y A4 | MARXEN",
  description:
    "Encontrá todos los prestadores, clínicas, sanatorios, laboratorios y farmacias habilitados para los planes A2 y A4 de Prevención Salud en Salta. Información completa en MARXEN.",
  path: "/salud/cartilla-medica",
  keywords: [
    "cartilla médica Salta",
    "prestadores Salta",
    "Prevención Salud plan A2",
    "Prevención Salud plan A4",
    "clínicas Salta prepaga",
    "farmacias Salta",
    "MARXEN Salud",
  ],
});

export default function CartillaMedicaPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="cartilla-page-hero">
        <div className="container-mx py-16 sm:py-20">
          <nav className="cartilla-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span aria-hidden>›</span>
            <Link href="/salud">Salud</Link>
            <span aria-hidden>›</span>
            <span>Cartilla Médica</span>
          </nav>

          <div className="mt-6">
            <p className="eyebrow">MARXEN Salud — Provincia de Salta</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl lg:text-5xl">
              Cartilla médica
              <span className="block text-teal">Planes A2 y A4</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Todos los prestadores habilitados en la{" "}
              <strong>provincia de Salta</strong> para los planes A2 y A4 de
              Prevención Salud (Grupo Sancor Seguros). Consultá clínicas,
              sanatorios, laboratorios, imágenes y farmacias. Actualizado al{" "}
              <strong>11/07/2026</strong>.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="cartilla-stat">
                <span className="cartilla-stat-num">{PRESTADORES.length}</span>
                <span className="cartilla-stat-label">Clínicas y centros</span>
              </div>
              <div className="cartilla-stat">
                <span className="cartilla-stat-num">{FARMACIAS.length}+</span>
                <span className="cartilla-stat-label">Farmacias adheridas</span>
              </div>
              <div className="cartilla-stat">
                <span className="cartilla-stat-num">2</span>
                <span className="cartilla-stat-label">Planes disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Buscador + listados ── */}
      <section className="cartilla-page-content">
        <div className="container-mx py-6 pb-16">
          <CartillaBuscador />
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="cartilla-page-cta">
        <div className="container-mx py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            ¿Querés afiliarte o consultar costos?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Nuestros asesores en Salta te guían para elegir el plan que más te
            conviene y derivar tus aportes del monotributo o relación de
            dependencia.
          </p>
          <div className="cartilla-cta-actions">
            <a
              href="https://wa.me/543876348199?text=Hola%2C+quiero+consultar+sobre+los+planes+de+salud+y+la+cartilla+m%C3%A9dica."
              target="_blank"
              rel="noopener noreferrer"
              className="cartilla-cta-btn cartilla-cta-btn--wa"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.114 1.524 5.843L.057 23.492a.75.75 0 00.952.93l5.755-1.507A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.948 9.948 0 01-5.035-1.361l-.36-.212-3.734.977.999-3.634-.233-.375A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              Consultar por WhatsApp
            </a>
            <Link href="/salud" className="cartilla-cta-btn cartilla-cta-btn--ghost">
              Ver planes A2 y A4
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted">
            Cartilla válida exclusivamente para la{" "}
            <strong>Provincia de Salta</strong> · Datos provistos por Prevención
            Salud (Grupo Sancor Seguros) · MARXEN es productor asesor inscripto
          </p>
        </div>
      </section>
    </>
  );
}
