import { HomeAutoQuote } from "@/components/HomeAutoQuote";
import { PageHeader } from "@/components/crm/ui";

export default function CotizarPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Cotizar"
        description="Patente, planes de San Cristóbal y Swiss Medical, detalle de coberturas y emisión."
      />
      <HomeAutoQuote variant="crm" />
    </div>
  );
}
