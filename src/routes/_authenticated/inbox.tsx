import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SalesInbox } from "@/components/sales-inbox";
import { LeadWorkspace } from "@/components/lead-workspace";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Messages — Systemize" },
      { name: "description", content: "Customer context, conversations and quotes in one workspace." },
      { property: "og:title", content: "Messages — Systemize" },
      { property: "og:description", content: "Customer context, conversations and quotes in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesInboxPage,
});

function SalesInboxPage() {
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Messages" subtitle="Customer history, conversation and quoting in one workspace." />
      <SalesInbox onOpenRecord={setOpenDealId} />
      <LeadWorkspace dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
}