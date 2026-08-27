import { PageHeader } from "@/components/crm/ui";
import { MailingComposer } from "@/components/crm/MailingComposer";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="Mailing"
        description="Cargá un Excel, pegá una lista o usá los mails del CRM. Cada campaña guarda aperturas, clics y rebotes vía webhook de Brevo."
      />
      <MailingComposer />
    </div>
  );
}
