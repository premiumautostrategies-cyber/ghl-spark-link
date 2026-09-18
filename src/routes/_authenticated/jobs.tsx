import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — Systemize" },
      { name: "description", content: "Production board and job workspace." },
      { property: "og:title", content: "Jobs — Systemize" },
      { property: "og:description", content: "Production board and job workspace." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Production jobs</h1>
        <p className="text-sm text-muted-foreground">Track vehicles through production stages.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The production board is coming next. Each job will show vehicle, services, technician,
          stage, and blockers.
        </p>
      </div>
    </div>
  );
}
