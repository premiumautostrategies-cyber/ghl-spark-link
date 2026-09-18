import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles — Systemize" },
      { name: "description", content: "Vehicle records and service history." },
      { property: "og:title", content: "Vehicles — Systemize" },
      { property: "og:description", content: "Vehicle records and service history." },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Vehicles</h1>
        <p className="text-sm text-muted-foreground">Every vehicle the shop has ever touched.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Vehicle history view is coming next. For now, vehicles are managed from the customer record.
        </p>
      </div>
    </div>
  );
}
