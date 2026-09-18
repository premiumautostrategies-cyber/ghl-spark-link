import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — Systemize" },
      { name: "description", content: "Employees, roles and permissions." },
      { property: "og:title", content: "Team — Systemize" },
      { property: "og:description", content: "Employees, roles and permissions." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">Employees, technicians, roles and schedules.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Team management is coming next. Add installers, salespeople and managers with role-based
          access.
        </p>
      </div>
    </div>
  );
}
