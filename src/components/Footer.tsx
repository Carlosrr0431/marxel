import Link from "next/link";
import { Logo } from "./Logo";
import { site, navLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-deep text-white">
      <div className="container-mx grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo href="/" light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
            {site.tagline}. Seguros, prepagas y asistencia al viajero, con
            asesoramiento claro.
          </p>
        </div>

        <div>
          <p className="eyebrow !text-white/40">Navegación</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/75 transition hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contacto" className="text-sm text-white/75 transition hover:text-white">
                Contacto
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow !text-white/40">Contacto</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/75">
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
        <div className="container-mx flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <p>Seguros · Salud · Viajero</p>
        </div>
      </div>
    </footer>
  );
}
