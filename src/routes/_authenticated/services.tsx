import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "Services — Systemize" },
      { name: "description", content: "Service catalog, packages and pricing rules." },
      { property: "og:title", content: "Services — Systemize" },
      { property: "og:description", content: "Service catalog, packages and pricing rules." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Service catalog</h1>
        <p className="text-sm text-muted-foreground">Build your restyling menu with options and packages.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The service catalog is coming next. Define tint, PPF, wrap, ceramic, detail and custom
          services with modifiers and pricing rules.
        </p>
      </div>
    </div>
  );
}
