import { PageHeader } from "@/components/crm/ui";
import { MailingComposer } from "@/components/crm/MailingComposer";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="Mailing"
        description="Tomá contactos de la base Norte, sumá mails extra y enviá. Cada envío queda registrado: no se reenvía al mismo correo."
      />
      <MailingComposer />
    </div>
  );
}
