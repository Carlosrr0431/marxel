import { CrmShell } from "@/components/crm/CrmShell";
import { createServiceClient } from "@/lib/supabase/server";
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
    { data: unreadChats },
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
    supabase.from("whatsapp_chats").select("unread_count").gt("unread_count", 0),
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
    <Suspense
      fallback={
        <div className="crm-shell">
          <aside className="crm-sidebar" aria-hidden="true" />
          <div className="crm-main">
            <div className="crm-content">{children}</div>
          </div>
        </div>
      }
    >
      <CrmShell
        badges={{
          inbox: overdue || 0,
          seguimientos: pending || 0,
          chatbot: chatbot || 0,
          chats: (unreadChats || []).reduce(
            (sum, row) => sum + Number(row.unread_count || 0),
            0
          ),
        }}
        searchItems={searchItems}
      >
        {children}
      </CrmShell>
    </Suspense>
  );
}
