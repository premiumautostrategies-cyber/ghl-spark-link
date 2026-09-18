import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Systemize" },
      { name: "description", content: "Film rolls, products and stock levels." },
      { property: "og:title", content: "Inventory — Systemize" },
      { property: "og:description", content: "Film rolls, products and stock levels." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Track film, products and material usage.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Inventory management is coming next. Track film rolls, products, low-stock warnings and
          usage against jobs.
        </p>
      </div>
    </div>
  );
}
