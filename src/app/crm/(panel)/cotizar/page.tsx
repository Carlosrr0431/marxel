import { HomeAutoQuote } from "@/components/HomeAutoQuote";
import { getCotizacion } from "@/lib/crm/saved-quotes";

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const saved = id ? await getCotizacion(id) : null;
  return <HomeAutoQuote variant="crm" saved={saved} />;
}
