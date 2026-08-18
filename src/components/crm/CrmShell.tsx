"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { CrmSidebar } from "@/components/crm/CrmSidebar";
import { CrmSearch } from "@/components/crm/CrmSearch";

type SearchItem = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  kind: "lead" | "afiliado";
};

export function CrmShell({
  badges,
  searchItems,
  children,
}: {
  badges: { inbox: number; seguimientos: number; chatbot: number };
  searchItems: SearchItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const onOpenChange = useCallback((next: boolean) => setOpen(next), []);
  const pathname = usePathname();
  const exportHref = pathname.startsWith("/crm/afiliados")
    ? "/api/crm/export?type=afiliados"
    : "/api/crm/export?type=leads";

  return (
    <div className="crm-shell">
      <a href="#crm-content" className="crm-skip">
        Saltar al contenido
      </a>
      <CrmSidebar badges={badges} open={open} onOpenChange={onOpenChange} />
      <div className="crm-main">
        <header className="crm-topbar">
          <button
            type="button"
            className="crm-icon-btn crm-icon-btn--light lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={open}
            aria-controls="crm-sidebar"
            onClick={() => setOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <CrmSearch items={searchItems} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href={exportHref} className="crm-btn crm-btn-ghost hidden sm:inline-flex">
              Exportar
            </Link>
            <Link href="/crm/leads/nuevo" className="crm-btn crm-btn-primary" aria-label="Nuevo lead">
              <span className="sm:hidden" aria-hidden="true">
                +
              </span>
              <span className="hidden sm:inline">+ Lead</span>
            </Link>
          </div>
        </header>
        <main id="crm-content" className="crm-content">
          {children}
        </main>
      </div>
    </div>
  );
}
