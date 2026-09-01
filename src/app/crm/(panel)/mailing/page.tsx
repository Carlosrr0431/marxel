import { PageHeader } from "@/components/crm/ui";
import { MailingComposer } from "@/components/crm/MailingComposer";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="Mailing"
        description="La base Norte no se reenvía. Los mails pegados a mano sí se pueden repetir en otra campaña."
      />
      <MailingComposer />
    </div>
  );
}
