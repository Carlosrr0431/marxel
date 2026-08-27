"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutCrm } from "@/lib/crm/actions";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/crm", label: "Dashboard", exact: true, icon: "grid" as const },
  { href: "/crm/inbox", label: "Inbox", icon: "inbox" as const },
  { href: "/crm/leads?origen=chatbot", label: "Chatbot", chatbot: true, icon: "spark" as const },
  { href: "/crm/whatsapp", label: "WhatsApp", icon: "phone" as const },
  { href: "/crm/chats", label: "Chats", icon: "bubbles" as const },
  { href: "/crm/pipeline", label: "Pipeline", icon: "kanban" as const },
  { href: "/crm/leads", label: "Leads", icon: "users" as const },
  { href: "/crm/afiliados", label: "Afiliados", icon: "badge" as const },
  { href: "/crm/seguimientos", label: "Agenda", icon: "calendar" as const },
  { href: "/crm/plantillas", label: "Plantillas", icon: "chat" as const },
  { href: "/crm/mailing", label: "Mailing", icon: "mail" as const },
];

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px] shrink-0",
    "aria-hidden": true,
  };

  if (name === "grid") {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "inbox") {
    return (
      <svg {...props}>
        <path d="M4 13h4l1.5 2h5L16 13h4v5.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V13z" />
        <path d="M4 13l2.2-7.2A2 2 0 0 1 8.1 4.5h7.8a2 2 0 0 1 1.9 1.3L20 13" />
      </svg>
    );
  }
  if (name === "spark") {
    return (
      <svg {...props}>
        <path d="M12 3.5l1.2 4.3 4.3 1.2-4.3 1.2L12 14.5l-1.2-4.3L6.5 9l4.3-1.2L12 3.5z" />
        <path d="M18 14.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />
      </svg>
    );
  }
  if (name === "kanban") {
    return (
      <svg {...props}>
        <rect x="3.5" y="4" width="5" height="16" rx="1.4" />
        <rect x="9.5" y="4" width="5" height="11" rx="1.4" />
        <rect x="15.5" y="4" width="5" height="8" rx="1.4" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 18.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
        <circle cx="16.5" cy="8.5" r="2.3" />
        <path d="M16 13.6c1.9.4 3.4 1.8 4 4.4" />
      </svg>
    );
  }
  if (name === "badge") {
    return (
      <svg {...props}>
        <circle cx="12" cy="11" r="7.5" />
        <path d="M9.2 11.2l1.8 1.8 3.8-4" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg {...props}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg {...props}>
        <path d="M7.2 3.8h3.2l1.2 3-1.8 1.1a12.5 12.5 0 0 0 5.1 5.1l1.1-1.8 3 1.2v3.2a1.6 1.6 0 0 1-1.7 1.6C9.8 16.8 7.2 8.4 7.3 5.4a1.6 1.6 0 0 1 1.6-1.6z" />
      </svg>
    );
  }
  if (name === "bubbles") {
    return (
      <svg {...props}>
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h7A2.5 2.5 0 0 1 17 6.5v4a2.5 2.5 0 0 1-2.5 2.5H11l-3 2.2V13H7.5A2.5 2.5 0 0 1 5 10.5v-4z" />
        <path d="M8 16.2c.4 1.4 1.8 2.3 3.4 2.3h2.1L16.8 21v-2.2h.7A2.5 2.5 0 0 0 20 16.3v-3.2" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...props}>
        <rect x="3.5" y="6" width="17" height="12" rx="2" />
        <path d="M4 7.5 12 13l8-5.5" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M5 6.5h10M5 12h14M5 17.5h8" />
      <path d="M17 5.5c1.8 1.4 1.8 3.6 0 5" />
    </svg>
  );
}

export function CrmSidebar({
  badges,
  collapsed,
  onCollapsedChange,
}: {
  badges?: { inbox?: number; seguimientos?: number; chatbot?: number; chats?: number };
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const origen = search.get("origen");

  return (
    <aside
      id="crm-sidebar"
      className="crm-sidebar"
      aria-label="Navegación del CRM"
    >
        <div className="crm-sidebar__brand">
          <Link
            href="/crm"
            className="crm-sidebar__brand-copy block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-soft/70"
          >
            <Logo href={null} light size="sm" />
            <span className="mt-2 flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-white/45">
              CRM
              <span className="crm-pulse inline-block h-1.5 w-1.5 rounded-full bg-teal-soft" />
            </span>
          </Link>
          <button
            type="button"
            className="crm-icon-btn"
            aria-label={collapsed ? "Expandir menú" : "Replegar menú"}
            aria-expanded={!collapsed}
            aria-controls="crm-sidebar"
            onClick={() => onCollapsedChange(!collapsed)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              {collapsed ? (
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>

        <nav className="crm-sidebar__nav">
          {links.map((link) => {
            const isChatbot = "chatbot" in link && link.chatbot;
            const active = isChatbot
              ? pathname === "/crm/leads" && origen === "chatbot"
              : link.href === "/crm/leads"
                ? (pathname === "/crm/leads" && origen !== "chatbot") ||
                  pathname.startsWith("/crm/leads/")
                : link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const badge = isChatbot
              ? badges?.chatbot
              : link.href === "/crm/inbox"
                ? badges?.inbox
                : link.href === "/crm/seguimientos"
                  ? badges?.seguimientos
                  : link.href === "/crm/chats"
                    ? badges?.chats
                    : undefined;

            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`crm-nav-link ${active ? "is-active" : ""}`}
              >
                <NavIcon name={link.icon} />
                <span className="crm-nav-link__label min-w-0 flex-1 truncate">{link.label}</span>
                {badge && badge > 0 ? (
                  <span className="crm-nav-badge">{badge > 99 ? "99+" : badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="crm-sidebar__foot">
          <form action={logoutCrm}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="crm-nav-link crm-nav-link--quiet w-full text-left"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17" strokeLinecap="round" />
                <path d="M4 12h10M7 9l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="crm-nav-link__label min-w-0 flex-1 truncate">Cerrar sesión</span>
            </button>
          </form>
        </div>
    </aside>
  );
}
