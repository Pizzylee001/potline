import type { Metadata } from "next";
import { ReceiptsView } from "@/components/receipts-view";

export const metadata: Metadata = {
  title: "Receipts",
  description:
    "Every savings circle deployed on Arbitrum Sepolia, read from the factory, with your position in each one.",
};

export default function ReceiptsPage() {
  return <ReceiptsView />;
}