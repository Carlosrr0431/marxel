"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { navLinks } from "@/lib/content";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-cloud/80 backdrop-blur-xl">
      <div className="container-mx flex h-16 items-center justify-between gap-4 sm:h-[4.25rem]">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-mist text-navy"
                    : "text-muted hover:bg-mist/70 hover:text-navy"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/crm/login" className="btn btn-secondary !min-h-10 !px-3.5 text-xs">
            CRM
          </Link>
          <Link href="/cotizar" className="btn btn-primary !min-h-10">
            Cotizar
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-navy lg:hidden"
          aria-expanded={open}
          aria-controls="menu-movil"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div
          id="menu-movil"
          className="fixed inset-x-0 top-16 bottom-0 z-40 border-t border-line bg-cloud/97 backdrop-blur-xl lg:hidden"
        >
          <nav className="container-mx flex flex-col gap-1 py-5" aria-label="Móvil">
            {navLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    active ? "bg-mist text-navy" : "text-navy hover:bg-mist/80"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/contacto" className="rounded-xl px-4 py-3.5 text-base font-medium text-navy">
              Contacto
            </Link>
            <div className="mt-4 grid gap-2">
              <Link href="/cotizar" className="btn btn-primary w-full py-3.5">
                Cotizar ahora
              </Link>
              <Link href="/crm/login" className="btn btn-secondary w-full py-3.5">
                Entrar al CRM
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
