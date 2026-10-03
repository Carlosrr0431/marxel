import { CrmWhatsappInbox } from "@/components/crm/chat/CrmWhatsappInbox";
import { Suspense } from "react";

export default async function CrmChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  return (
    <Suspense fallback={null}>
      <CrmWhatsappInbox initialPhone={phone} />
    </Suspense>
  );
}
