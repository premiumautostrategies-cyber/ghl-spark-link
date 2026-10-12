import { createFileRoute } from "@tanstack/react-router";
import { MarketingDraft } from "@/components/marketing-draft";
import { marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/pricing")({ head: () => marketingHead("VELTRIX — Pricing", "VELTRIX pricing has not been finalized. Plans, prices and availability will be published when confirmed."), component: Page });
function Page() { return <MarketingDraft category="Pricing" title="Pricing, when it’s ready." body="VELTRIX pricing has not been finalized. Plans, prices and availability will be published when confirmed."/>; }
