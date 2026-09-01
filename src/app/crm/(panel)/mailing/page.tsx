import { PageHeader } from "@/components/crm/ui";
import { MailingComposer } from "@/components/crm/MailingComposer";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="Mailing"
        description="Estudio de campañas: armá el lote, mirá el mail y seguí el embudo en vivo."
      />
      <MailingComposer />
    </div>
  );
}
