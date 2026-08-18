import { CrmSidebar } from "@/components/crm/CrmSidebar";
import { CrmSearch } from "@/components/crm/CrmSearch";
import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

export default async function CrmPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const dayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: overdue },
    { count: pending },
    { count: chatbot },
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
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("origen_detalle", "chatbot")
      .gte("created_at", since)
      .not("estado", "in", "(ganado,perdido)"),
    supabase
      .from("leads")
      .select("id,nombre,celular")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("afiliados")
      .select("id,nombre,celular")
      .order("created_at", { ascending: false })
      .limit(80),
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
      <Suspense
        fallback={
          <aside className="flex w-full flex-col border-b border-white/10 bg-[linear-gradient(180deg,#051e36_0%,#0a355c_100%)] text-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r" />
        }
      >
        <CrmSidebar
          badges={{
            inbox: overdue || 0,
            seguimientos: pending || 0,
            chatbot: chatbot || 0,
          }}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-line/60 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center">
            <CrmSearch items={searchItems} />
            <div className="flex items-center gap-2 sm:ml-auto">
              <Link href="/api/crm/export?type=leads" className="crm-btn crm-btn-ghost text-xs">
                Export
              </Link>
              <Link href="/crm/leads/nuevo" className="crm-btn crm-btn-primary text-xs">
                + Lead
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
