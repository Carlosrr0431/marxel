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
        <div className="container-mx py-10 pb-20">
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
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/543876348199?text=Hola%2C+quiero+consultar+sobre+los+planes+de+salud+y+la+cartilla+m%C3%A9dica."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Consultar por WhatsApp
            </a>
            <Link href="/salud" className="btn-secondary">
              Ver planes A2 y A4
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
