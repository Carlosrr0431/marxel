import { PageHeader } from "@/components/crm/ui";
import { WhatsappLinkPanel } from "@/components/crm/WhatsappLinkPanel";

export default function WhatsappCrmPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Canal"
        title="WhatsApp"
        description="Generá un QR cuando quieras vincular el 3876348199 y mirá en vivo si el chatbot está conectado."
      />
      <WhatsappLinkPanel />
    </div>
  );
}
