import type { Metadata } from "next";
import { ContactLeadForm } from "@/components/ContactLeadForm";
import { pageMetadata } from "@/lib/seo";

const TITLE = "Dejanos tu teléfono | MARXEN";
const DESCRIPTION = "Dejá tu teléfono y un asesor de MARXEN en Salta te contacta. Mensaje opcional.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/formulario",
});

export default async function FormularioPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="bg-cloud">
      <div className="container-mx max-w-xl py-14 sm:py-20">
        <ContactLeadForm sent={params.enviado === "1"} invalid={params.error === "1"} />
      </div>
    </section>
  );
}
