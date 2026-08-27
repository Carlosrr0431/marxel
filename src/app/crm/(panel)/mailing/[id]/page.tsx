import { CampaignDetail } from "@/components/crm/CampaignDetail";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetail id={id} />;
}
