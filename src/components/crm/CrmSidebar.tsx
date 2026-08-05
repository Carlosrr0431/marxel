"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutCrm } from "@/lib/crm/actions";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/crm", label: "Dashboard", exact: true },
  { href: "/crm/inbox", label: "Inbox" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/afiliados", label: "Afiliados" },
  { href: "/crm/seguimientos", label: "Agenda" },
  { href: "/crm/plantillas", label: "Plantillas" },
];

export function CrmSidebar({
  badges,
}: {
  badges?: { inbox?: number; seguimientos?: number };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-white/10 bg-[linear-gradient(180deg,#051e36_0%,#0a355c_100%)] text-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="px-5 py-5">
        <Link href="/crm" className="block">
          <Logo href={null} light size="sm" />
          <span className="mt-1.5 flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-white/45">
            CRM
            <span className="crm-pulse inline-block h-1.5 w-1.5 rounded-full bg-teal-soft" />
          </span>
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const badge =
            link.href === "/crm/inbox"
              ? badges?.inbox
              : link.href === "/crm/seguimientos"
                ? badges?.seguimientos
                : undefined;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/14 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="flex-1 whitespace-nowrap">{link.label}</span>
              {badge && badge > 0 ? (
                <span className="rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-bold text-navy-deep">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-1 border-t border-white/10 p-4 lg:block">
        <Link
          href="/crm/leads/nuevo"
          className="mb-3 flex w-full items-center justify-center rounded-xl bg-teal px-3 py-2.5 text-sm font-semibold text-white"
        >
          + Nuevo lead
        </Link>
        <Link
          href="/"
          className="block rounded-xl px-3 py-2 text-sm text-white/50 transition hover:bg-white/8 hover:text-white"
        >
          ← Sitio
        </Link>
        <form action={logoutCrm}>
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/50 transition hover:bg-white/8 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
