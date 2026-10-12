import { createFileRoute } from "@tanstack/react-router";
import { MarketingDraft } from "@/components/marketing-draft";
import { marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/privacy")({ head: () => marketingHead("VELTRIX — Privacy Policy · Draft", "The VELTRIX privacy policy is awaiting review. No finalized privacy terms are published on this page."), component: Page });
function Page() { return <MarketingDraft category="Privacy Policy · Draft" title="Privacy policy." body="The VELTRIX privacy policy is awaiting review. No finalized privacy terms are published on this page."/>; }
