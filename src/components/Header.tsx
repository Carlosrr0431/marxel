"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { CompanyMark } from "./CompanyMark";
import { companias, seguros } from "@/lib/content";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"seguros" | "companias" | null>(null);

  useEffect(() => {
    setOpen(false);
    setPanel(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="site-header">
        <div className="container-mx site-header__bar">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            <NavMenu label="Seguros">
              <ul className="nav-menu__list">
                {seguros.map((item) => (
                  <li key={item.slug}>
                    <Link href={item.href}>{item.title}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/seguros">Ver todos los seguros</Link>
                </li>
              </ul>
            </NavMenu>
            <NavMenu label="Compañías" wide>
              <div className="nav-menu__companies">
                {companias.map((company) => (
                  <Link key={company.slug} href="/#companias">
                    <CompanyMark company={company} />
                    <span>{company.name}</span>
                  </Link>
                ))}
              </div>
            </NavMenu>
            <TopLink href="/salud" pathname={pathname}>
              Salud
            </TopLink>
            <TopLink href="/viajero" pathname={pathname}>
              Viajero
            </TopLink>
            <TopLink href="/quienes-somos" pathname={pathname}>
              Quiénes somos
            </TopLink>
            <TopLink href="/contacto" pathname={pathname}>
              Contacto
            </TopLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/#cotizar-auto" className="btn btn-primary hidden !min-h-10 !px-5 lg:inline-flex">
              Cotizar auto
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-navy lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {open ? (
        <div id="menu-movil" className="site-mobile-nav lg:hidden">
          <nav
            className="container-mx flex flex-col gap-1 py-5"
            aria-label="Móvil"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <button type="button" className="mobile-acc" onClick={() => setPanel(panel === "seguros" ? null : "seguros")}>
              Seguros
            </button>
            {panel === "seguros" ? (
              <div className="mobile-acc__body">
                {seguros.map((item) => (
                  <Link key={item.slug} href={item.href}>
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
            <button type="button" className="mobile-acc" onClick={() => setPanel(panel === "companias" ? null : "companias")}>
              Compañías
            </button>
            {panel === "companias" ? (
              <div className="mobile-acc__body">
                {companias.map((company) => (
                  <Link key={company.slug} href="/#companias">
                    {company.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <Link href="/salud" className="rounded-xl px-4 py-3.5 text-base font-medium text-navy">
              Salud
            </Link>
            <Link href="/viajero" className="rounded-xl px-4 py-3.5 text-base font-medium text-navy">
              Viajero
            </Link>
            <Link href="/quienes-somos" className="rounded-xl px-4 py-3.5 text-base font-medium text-navy">
              Quiénes somos
            </Link>
            <Link href="/contacto" className="rounded-xl px-4 py-3.5 text-base font-medium text-navy">
              Contacto
            </Link>
            <Link href="/#cotizar-auto" className="btn btn-primary mt-3 w-full py-3.5">
              Cotizar auto
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}

function TopLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
        active ? "bg-mist text-navy" : "text-muted hover:bg-mist/70 hover:text-navy"
      }`}
    >
      {children}
    </Link>
  );
}

function NavMenu({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <div className="nav-menu" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="nav-menu__btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {open ? <div className={`nav-menu__panel${wide ? " is-wide" : ""}`}>{children}</div> : null}
    </div>
  );
}
