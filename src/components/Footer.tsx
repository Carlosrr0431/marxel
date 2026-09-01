import Link from "next/link";
import { Logo } from "./Logo";
import { site, navLinks } from "@/lib/content";

const AUTOGESTION = "https://autogestion.sancristobal.com.ar";
const ASISTENCIA = "08102228887";

export function Footer() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola MARXEN, quiero asesoramiento."
  )}`;

  return (
    <>
      <section className="baja-band">
        <div className="container-mx py-14 sm:py-16">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            ¿Querés dar de baja tu póliza?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted">
            Podés cancelar tu cobertura cuando lo necesites. Te ayudamos con el trámite, sin vueltas.
          </p>
          <Link href="/contacto" className="btn btn-primary btn-lg mt-7">
            Más info aquí
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container-mx grid gap-10 py-14 md:grid-cols-3">
          <div>
            <p className="footer-heading uppercase">MARXEN Seguros</p>
            <Logo href="/" className="mt-4" />
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-5">
              <WhatsAppIcon />
              Escribinos por WhatsApp
            </a>
            <div className="footer-socials">
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social"
              >
                <InstagramIcon />
                Instagram
              </a>
              <a
                href={site.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social"
              >
                <FacebookIcon />
                Facebook
              </a>
            </div>
            <address className="mt-4 not-italic">
              <p className="text-sm text-muted">{site.location}</p>
              <p className="mt-2 text-sm text-muted">
                E-mail:{" "}
                <a href={`mailto:${site.email}`} className="footer-link">
                  {site.email}
                </a>
              </p>
              <p className="mt-2 text-sm text-muted">
                WhatsApp:{" "}
                <a href={wa} className="footer-link" target="_blank" rel="noopener noreferrer">
                  {site.phone}
                </a>
              </p>
            </address>
          </div>

          <div>
            <p className="footer-heading">Link de interés</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="footer-heading">Autogestión</p>
            <p className="mt-4 text-sm text-muted">
              Asistencia 24hs:{" "}
              <a href={`tel:${ASISTENCIA}`} className="footer-link">
                0810 222 8887
              </a>
            </p>
            <a
              href={AUTOGESTION}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline mt-5"
            >
              Acceso al Sitio del Asegurado
            </a>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="container-mx flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {site.name}
            </p>
            <p>Seguros · Salud · Viajero</p>
            <p className="flex flex-wrap gap-3">
              <a href={site.instagram} className="footer-link" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href={site.facebook} className="footer-link" target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.5 3.5A11 11 0 0 0 2.4 17.1L1.5 22l5-1.3A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 21Zm5-6.6c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5c.1-.2.1-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4s-1 1-1 2.4 1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.3.7 3.1.6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3s-.3-.2-.6-.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 8.5V6.8c0-.9.6-1.3 1.4-1.3H17V3h-2.4C12.1 3 11 4.4 11 6.6V8.5H9v3h2V21h3v-9.5h2.4l.4-3H14Z" />
    </svg>
  );
}
