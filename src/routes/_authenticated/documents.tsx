import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Systemize" },
      { name: "description", content: "Templates, forms and signed agreements." },
      { property: "og:title", content: "Documents — Systemize" },
      { property: "og:description", content: "Templates, forms and signed agreements." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">Waivers, agreements, SOPs and signed forms.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Document templates and e-signatures are coming next. Build intake forms, damage
          acknowledgments and care instructions.
        </p>
      </div>
    </div>
  );
}
