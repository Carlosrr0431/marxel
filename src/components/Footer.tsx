import Link from "next/link";
import { Logo } from "./Logo";
import { site, navLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-line bg-navy-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo href="/" light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {site.tagline}. Asesoramiento en seguros, prepagas y asistencia al
            viajero, con foco en claridad y acompañamiento real.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Navegación
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 transition hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contacto"
                className="text-sm text-white/80 transition hover:text-white"
              >
                Contacto
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Contacto
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/80">
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-white">
                {site.email}
              </a>
            </li>
            <li>
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {site.phone}
              </a>
            </li>
            <li>{site.location}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Marxel. Todos los derechos reservados.</p>
          <p>Productora de seguros · Salud · Viajero</p>
        </div>
      </div>
    </footer>
  );
}
