import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Systemize" },
      { name: "description", content: "Trigger-based workflows for the shop." },
      { property: "og:title", content: "Automations — Systemize" },
      { property: "og:description", content: "Trigger-based workflows for the shop." },
    ],
  }),
  component: AutomationsPage,
});

function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Automations</h1>
        <p className="text-sm text-muted-foreground">Trigger → condition → action workflows.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The automation engine is coming next. Build follow-ups, reminders, task assignments and
          review requests.
        </p>
      </div>
    </div>
  );
}
