import { CrmWhatsappInbox } from "@/components/crm/chat/CrmWhatsappInbox";

export default async function CrmChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  return <CrmWhatsappInbox initialPhone={phone} />;
}
