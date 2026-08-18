import { PageHeader } from "@/components/crm/ui";
import { WhatsappLinkPanel } from "@/components/crm/WhatsappLinkPanel";

export default function WhatsappCrmPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Canal"
        title="WhatsApp"
        description="Vinculá el 3876348199 con whatsmeow y mirá en vivo si el chatbot está conectado."
      />
      <WhatsappLinkPanel />
    </div>
  );
}
