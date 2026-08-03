"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutCrm } from "@/lib/crm/actions";

const links = [
  { href: "/crm", label: "Dashboard", exact: true },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/afiliados", label: "Afiliados" },
  { href: "/crm/seguimientos", label: "Seguimientos" },
];

export function CrmSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-line bg-navy-deep text-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="px-5 py-5">
        <Link href="/crm" className="font-display text-xl font-bold tracking-tight">
          Mar<span className="text-gold">X</span>el
          <span className="mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/55">
            CRM
          </span>
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-2 p-4 lg:flex">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ← Sitio web
        </Link>
        <form action={logoutCrm}>
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
