import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Systemize" },
      { name: "description", content: "Native sales pipeline for leads and opportunities." },
      { property: "og:title", content: "Sales — Systemize" },
      { property: "og:description", content: "Native sales pipeline for leads and opportunities." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Sales pipeline</h1>
        <p className="text-sm text-muted-foreground">Track leads from first contact to sold job.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The native CRM pipeline is coming next. Leads will flow here from HubSpot, GoHighLevel, or
          manual entry.
        </p>
      </div>
    </div>
  );
}
