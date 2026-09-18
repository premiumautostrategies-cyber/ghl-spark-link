import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CalendarRange, FileText, Plug, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Systemize — Shop software for wrap, tint & PPF studios" },
      {
        name: "description",
        content:
          "Estimates, scheduling and customer records for vehicle wrap, tint and PPF shops — with GoHighLevel and HubSpot built in.",
      },
      { property: "og:title", content: "Systemize — Shop software for wrap, tint & PPF studios" },
      {
        property: "og:description",
        content:
          "Quote faster, fill your bays and keep your CRM in sync. Built for wrap, tint and PPF installers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileText,
    title: "Estimates that close",
    body: "Line-item quotes for wrap, tint, PPF and ceramic, priced per vehicle and sent in minutes.",
  },
  {
    icon: CalendarRange,
    title: "Bay-level scheduling",
    body: "See every job by status, installer and bay so nothing sits half-wrapped over the weekend.",
  },
  {
    icon: Users,
    title: "Customers and vehicles",
    body: "Full history per customer and per VIN — what you wrapped, what you charged, what's next.",
  },
  {
    icon: Plug,
    title: "GoHighLevel + HubSpot",
    body: "Every shop connects their own CRM. Leads and contacts stay in sync without copy-paste.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="display-title text-2xl font-bold">
          System<span className="text-primary">ize</span>
        </span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="surface-grid border-y border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Wrap · Tint · PPF
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
            Run the whole shop from one screen
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Systemize replaces the spreadsheet, the whiteboard and the quote app. Estimates,
            schedule and customer history in one place — wired straight into your GoHighLevel or
            HubSpot.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">See the dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-20 md:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        Systemize — shop management for vehicle styling studios.
      </footer>
    </div>
  );
}
