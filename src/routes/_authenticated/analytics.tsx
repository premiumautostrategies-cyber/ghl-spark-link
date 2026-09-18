import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Systemize" },
      { name: "description", content: "Operational analytics and shop health." },
      { property: "og:title", content: "Analytics — Systemize" },
      { property: "og:description", content: "Operational analytics and shop health." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Revenue, utilization, conversion and shop health.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Operational analytics and Shop Health are coming next. Track revenue, lead conversion,
          technician utilization and material waste.
        </p>
      </div>
    </div>
  );
}
