import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateView } from "@/components/create-view";

export const metadata: Metadata = {
  title: "Create a circle",
  description:
    "Deploy a new savings circle on Arbitrum Sepolia with a USDG contribution amount and a member cap.",
};

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateView />
    </Suspense>
  );
}