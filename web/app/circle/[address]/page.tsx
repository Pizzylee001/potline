import { CircleView } from "@/components/circle-view";

export default async function CirclePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <CircleView address={address} />;
}
