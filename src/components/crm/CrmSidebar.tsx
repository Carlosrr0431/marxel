"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutCrm } from "@/lib/crm/actions";

const links = [
  { href: "/crm", label: "Dashboard", icon: "◈", exact: true },
  { href: "/crm/inbox", label: "Inbox", icon: "◎" },
  { href: "/crm/pipeline", label: "Pipeline", icon: "▦" },
  { href: "/crm/leads", label: "Leads", icon: "◉" },
  { href: "/crm/afiliados", label: "Afiliados", icon: "✦" },
  { href: "/crm/seguimientos", label: "Agenda", icon: "◷" },
  { href: "/crm/plantillas", label: "Plantillas", icon: "✎" },
];

export function CrmSidebar({
  badges,
}: {
  badges?: { inbox?: number; seguimientos?: number };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-white/10 bg-[linear-gradient(180deg,#071f35_0%,#0a2f4c_55%,#0b3a55_100%)] text-white lg:min-h-screen lg:w-[17rem] lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="px-5 py-6">
        <Link href="/crm" className="block">
          <span className="font-display text-[1.65rem] font-bold tracking-[-0.04em]">
            Mar<span className="text-[#f0c14b]">X</span>el
          </span>
          <span className="mt-1 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/50">
            CRM Studio
            <span className="crm-pulse inline-block h-1.5 w-1.5 rounded-full bg-teal-soft" />
          </span>
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-3">
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
              className={`group flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="text-xs opacity-70">{link.icon}</span>
              <span className="flex-1">{link.label}</span>
              {badge && badge > 0 ? (
                <span className="rounded-full bg-teal-soft/90 px-1.5 py-0.5 text-[10px] font-bold text-navy-deep">
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
          className="mb-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal to-teal-soft px-3 py-2.5 text-sm font-semibold text-white"
        >
          + Nuevo lead
        </Link>
        <Link
          href="/"
          className="block rounded-xl px-3 py-2 text-sm text-white/55 transition hover:bg-white/8 hover:text-white"
        >
          ← Sitio público
        </Link>
        <form action={logoutCrm}>
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/55 transition hover:bg-white/8 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
