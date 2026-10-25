import { createFileRoute } from "@tanstack/react-router";
import { MarketingDraft } from "@/components/marketing-draft";
import { marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/contact")({ head: () => marketingHead("VELOTRI — Contact", "Demo requests and Get Started are not connected yet. For now, explore the product preview or contact the person who shared this website with you."), component: Page });
function Page() { return <MarketingDraft category="Contact" title="Let’s talk about your next chapter." body="Demo requests and Get Started are not connected yet. For now, explore the product preview or contact the person who shared this website with you."/>; }
