import { PageHeader } from "@/components/crm/ui";
import { WhatsappAgentToggle } from "@/components/crm/WhatsappAgentToggle";
import { WhatsappLinkPanel } from "@/components/crm/WhatsappLinkPanel";

export default function WhatsappCrmPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Canal"
        title="WhatsApp"
        description="Activá o pausá el agente, generá un QR para vincular el 3876348199 y controlá si la línea está conectada."
      />
      <WhatsappAgentToggle />
      <WhatsappLinkPanel />
    </div>
  );
}
