import Link from "next/link";
import { site } from "@/lib/content";

const PRESTADORES = [
  {
    name: "Hospital Privado Santa Clara de Asís",
    address: "Urquiza 964, Salta",
    phone: "0387-4321440",
    tags: ["Cardiología", "Pediatría", "Diagnóstico por imágenes"],
  },
  {
    name: "Hospital Privado Tres Cerritos",
    address: "Av. Juan B. Justo 93, Salta",
    phone: "0387-4163500",
    tags: ["Guardia 24 hs", "Cirugía", "Unidad coronaria"],
  },
  {
    name: "Sanatorio El Carmen",
    address: "Salta Capital",
    phone: "0387-4311555",
    tags: ["Oncología", "Neurología", "Terapia intensiva"],
  },
  {
    name: "Sanatorio San Roque S.A.",
    address: "Av. Reyes Católicos 1518, Salta",
    phone: "0387-4394000",
    tags: ["Guardia general", "Ginecología", "Traumatología"],
  },
  {
    name: "Clínica Luis Güemes S.A.",
    address: "Adolfo Güemes 287, Salta",
    phone: "0387-4210033",
    tags: ["Neonatología", "Neurología", "Clínica médica"],
  },
  {
    name: "Vitae Medical SRL",
    address: "Zabala 432, Salta",
    phone: "0387-4237373",
    tags: ["Cardiología", "Diagnóstico por imágenes", "Laboratorio"],
  },
  {
    name: "Diagnóstico Salta S.A.",
    address: "Dr. Mariano Boedo 62, Salta",
    phone: "0387-4215529",
    tags: ["Ecografía", "Mamografía", "Tomografía"],
  },
  {
    name: "Imagen Clara SRL",
    address: "Gral. Urquiza 968, Salta",
    phone: "387-4026562 (WhatsApp)",
    tags: ["Eco doppler", "Diagnóstico por imágenes", "Tomografía"],
  },
] as const;

export function CartillaMedicaSection() {
  const waUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hola, quiero consultar sobre los prestadores de Prevención Salud en Salta.")}`;

  return (
    <section className="cartilla-section" id="cartilla-medica">
      <div className="container-mx py-20 sm:py-24">

        {/* Encabezado */}
        <div className="cartilla-header">
          <div>
            <p className="eyebrow">MARXEN Salud</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Cartilla médica
              <span className="block text-teal"> en Salta</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Planes <strong>A2</strong> y <strong>A4</strong> de Prevención Salud con cobertura en
              la <strong>provincia de Salta</strong>. Más de 30 prestadores entre clínicas, sanatorios,
              laboratorios y especialistas en toda la provincia.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/salud/cartilla-medica"
                className="btn btn-outline gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                Ver cartilla completa
              </Link>
              <Link
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.114 1.524 5.843L.057 23.492a.75.75 0 00.952.93l5.755-1.507A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.948 9.948 0 01-5.035-1.361l-.36-.212-3.734.977.999-3.634-.233-.375A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Consultar con MARXEN
              </Link>
            </div>
          </div>

          {/* Mapa */}
          <div className="cartilla-map-wrap">
            <iframe
              title="Prestadores de salud en Salta"
              src="https://maps.google.com/maps?q=hospitales+cl%C3%ADnicas+Salta+Provincia+Argentina&t=&z=8&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>

        {/* Grid de prestadores */}
        <div className="mt-12">
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-muted">
            Prestadores destacados — Provincia de Salta · Planes A2 y A4
          </p>
          <div className="cartilla-grid">
            {PRESTADORES.map((p) => (
              <div key={p.name} className="cartilla-card">
                <div className="cartilla-card__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </div>
                <div className="cartilla-card__body">
                  <p className="cartilla-card__name">{p.name}</p>
                  <p className="cartilla-card__address">{p.address}</p>
                  <p className="cartilla-card__phone">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden>
                      <path
                        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.22 2.84 2 2 0 012.22.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {p.phone}
                  </p>
                  <div className="cartilla-card__tags">
                    {p.tags.map((t) => (
                      <span key={t} className="cartilla-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota al pie */}
        <p className="mt-8 text-center text-xs leading-relaxed text-muted">
          Cartilla actualizada al 11/07/2026 · Prestadores habilitados en <strong>Provincia de Salta</strong> · Datos provistos por Prevención Salud (Grupo Sancor Seguros).{" "}
          <Link
            href="/salud/cartilla-medica"
            className="font-medium underline underline-offset-2 hover:text-teal"
          >
            Ver listado completo
          </Link>{" "}
          · Afiliaciones y consultas:{" "}
          <Link href={waUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-teal">
            MARXEN WhatsApp
          </Link>
        </p>
      </div>
    </section>
  );
}
