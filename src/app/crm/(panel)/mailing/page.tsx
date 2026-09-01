import { PageHeader } from "@/components/crm/ui";
import { MailingComposer } from "@/components/crm/MailingComposer";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="Mailing"
        description="Armá el lote, enviá y seguí el avance en la ficha de cada campaña."
      />
      <MailingComposer />
    </div>
  );
}
