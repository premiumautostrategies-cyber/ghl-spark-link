import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing-layout";
import {
  Briefcase,
  CalendarRange,
  ClipboardList,
  FileSignature,
  Layers,
  Package,
  Plug,
  ScanLine,
  ShieldCheck,
  Tablet,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Systemize — Shop software for wrap, tint & PPF studios" },
      {
        name: "description",
        content:
          "Systemize runs a vehicle restyling shop end to end: quotes and proposals, bay scheduling, inspections, shop-floor tracking, film stock, quality control, warranty and aftercare.",
      },
      { property: "og:title", content: "Systemize — Shop software for wrap, tint & PPF studios" },
      {
        property: "og:description",
        content:
          "Quotes, bays, shop floor, film stock, QC and warranty in one record — with QuickBooks, Google, Outlook, HubSpot and GoHighLevel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Briefcase,
    title: "Sell from one screen",
    body: "Open a lead and the whole sale is there: catalog, options, add-ons, one-off line items, availability, deposit and the message thread.",
  },
  {
    icon: Layers,
    title: "Your own service catalog",
    body: "Categories, photos, descriptions, hours and prices you define — with vehicle-size tiers, add-ons and per-service deposit rules.",
  },
  {
    icon: FileSignature,
    title: "Proposals that configure themselves",
    body: "Good / Better / Best with live add-ons. Price, labour hours and film footage recalculate as the customer toggles, then they sign and pay.",
  },
  {
    icon: CalendarRange,
    title: "Bays booked on real capacity",
    body: "Drag work onto a bay and hour. Labour caps, installer certification and film availability are all checked as you drop it.",
  },
  {
    icon: ScanLine,
    title: "Condition documented first",
    body: "Panel-level damage pins with photos and video, and a waiver the customer signs from their phone before anything is touched.",
  },
  {
    icon: Tablet,
    title: "A tablet in every bay",
    body: "Cut file, notes, assigned roll and coverage instructions, with tap-to-start and tap-to-complete timers per production phase.",
  },
  {
    icon: Package,
    title: "Film tracked to the foot",
    body: "Rolls carry lot numbers, remaining footage and cost. Usage and scrap are logged as they happen, and reorders generate from thresholds.",
  },
  {
    icon: ClipboardList,
    title: "A real quality gate",
    body: "Edge temperature logged, checks signed by a foreman, and key release plus final invoicing locked until the vehicle passes.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty and aftercare",
    body: "A certificate carrying the actual film lot numbers, then a queued sequence of cure rules, an edge check and a review request.",
  },
];

const DIFFERENCES = [
  {
    title: "Built for restyling, not repair",
    body: "PPF, tint, wrap, ceramic, correction and detailing are first-class concepts here — coverage maps, film shades, cure times and post-heat checks. There is no repair-order machinery to work around.",
  },
  {
    title: "One record, no re-typing",
    body: "The quote becomes the booking, the booking becomes the job, the job becomes the invoice and the warranty. Nothing is re-entered at a handoff, so nothing drifts out of sync.",
  },
  {
    title: "The shop floor is a first-class surface",
    body: "Installers get a tablet view designed for glove-on taps, not a desktop screen shrunk down. Labour is measured because it is captured where the work happens.",
  },
  {
    title: "Multi-location and role-aware",
    body: "Locations, bays, staff and stock are scoped per site, and permissions decide what each role can open. Data separation is enforced at the database, not just hidden in the interface.",
  },
];

function Landing() {
  return (
    <MarketingLayout>
      <section className="surface-grid border-b border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            PPF · Tint · Wrap · Ceramic · Detail
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
            Run the whole shop from one screen
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Systemize is an operating system for vehicle restyling studios. A car enters as an
            enquiry and leaves with a warranty certificate, carrying the same record through
            quoting, booking, inspection, install, quality control and aftercare.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/demo">Log in to demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/platform">See the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="display-title text-3xl font-bold uppercase tracking-tight">
          What is inside
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Nine connected areas, each writing to the same vehicle record.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="display-title text-3xl font-bold uppercase tracking-tight">
            Why it is shaped this way
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {DIFFERENCES.map((d) => (
              <div key={d.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 rounded-xl border border-border bg-card p-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <Plug className="size-6 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">Connected to the tools you already run</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Invoices and payments to QuickBooks, appointments and email through Google or Outlook,
              leads and stages to HubSpot or GoHighLevel. Everything queues, retries and logs, so
              you can see exactly what left and what came back.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline">
              <Link to="/connect">How integrations work</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/workflow">Follow a vehicle through</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="display-title text-4xl font-bold uppercase tracking-tight">
            Open the demo shop
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            A loaded workspace with customers, vehicles, quotes, booked bays, film rolls and jobs at
            every stage. No account, no form — it opens straight in.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
