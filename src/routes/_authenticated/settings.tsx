import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Systemize" },
      { name: "description", content: "Organization, locations and preferences." },
      { property: "og:title", content: "Settings — Systemize" },
      { property: "og:description", content: "Organization, locations and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization, locations and shop preferences.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Settings are coming next. Manage your organization, locations, roles, CRM preference and
          notifications.
        </p>
      </div>
    </div>
  );
}
