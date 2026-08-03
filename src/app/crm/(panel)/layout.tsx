import { CrmSidebar } from "@/components/crm/CrmSidebar";
import { CrmSearch } from "@/components/crm/CrmSearch";
import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CrmPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const dayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: overdue },
    { count: pending },
    { data: leads },
    { data: afiliados },
  ] = await Promise.all([
    supabase
      .from("seguimientos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .lte("programado_para", nowIso),
    supabase
      .from("seguimientos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .lte("programado_para", dayAhead),
    supabase.from("leads").select("id,nombre,celular").order("created_at", { ascending: false }).limit(80),
    supabase.from("afiliados").select("id,nombre,celular").order("created_at", { ascending: false }).limit(80),
  ]);

  const searchItems = [
    ...(leads || []).map((l) => ({
      id: l.id,
      label: l.nombre,
      sub: l.celular,
      href: `/crm/leads/${l.id}`,
      kind: "lead" as const,
    })),
    ...(afiliados || []).map((a) => ({
      id: a.id,
      label: a.nombre,
      sub: a.celular,
      href: `/crm/afiliados/${a.id}`,
      kind: "afiliado" as const,
    })),
  ];

  return (
    <div className="crm-shell flex min-h-screen flex-col lg:flex-row">
      <CrmSidebar
        badges={{
          inbox: overdue || 0,
          seguimientos: pending || 0,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-line/70 bg-white/75 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <CrmSearch items={searchItems} />
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <Link href="/api/crm/export?type=leads" className="crm-btn crm-btn-ghost text-xs">
                Export CSV
              </Link>
              <Link href="/crm/leads/nuevo" className="crm-btn crm-btn-primary text-xs">
                + Lead
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
