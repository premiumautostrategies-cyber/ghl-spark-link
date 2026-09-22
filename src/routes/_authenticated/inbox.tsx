import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SalesInbox } from "@/components/sales-inbox";
import { LeadWorkspace } from "@/components/lead-workspace";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Sales Inbox — Systemize" },
      { name: "description", content: "Customer conversations with vehicle and opportunity context." },
      { property: "og:title", content: "Sales Inbox — Systemize" },
      { property: "og:description", content: "Customer conversations with vehicle and opportunity context." },
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
      <PageHeader title="Sales Inbox" subtitle="Customer conversations with the opportunity context needed to act." />
      <SalesInbox onOpenRecord={setOpenDealId} />
      <LeadWorkspace dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
}