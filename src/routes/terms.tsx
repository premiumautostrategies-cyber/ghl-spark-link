import { createFileRoute } from "@tanstack/react-router";
import { MarketingDraft } from "@/components/marketing-draft";
import { marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/terms")({ head: () => marketingHead("VELOTRI — Terms of Service · Draft", "The VELOTRI terms of service are awaiting review. This draft does not establish contractual terms."), component: Page });
function Page() { return <MarketingDraft category="Terms of Service · Draft" title="Terms of service." body="The VELOTRI terms of service are awaiting review. This draft does not establish contractual terms."/>; }
