import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHero, MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Integrations — Velotri and the tools your shop already uses" },
      {
        name: "description",
        content:
          "How Velotri connects to QuickBooks, Google Calendar and Gmail, Outlook, HubSpot and GoHighLevel — what flows out, what flows back, and how failures are handled.",
      },
      {
        property: "og:title",
        content: "Integrations — Velotri and the tools your shop already uses",
      },
      {
        property: "og:description",
        content:
          "QuickBooks, Google, Outlook, HubSpot and GoHighLevel — outbound sync, selective two-way, retries and an activity log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConnectPage,
});

const PROVIDERS = [
  {
    name: "QuickBooks",
    out: "Invoices, payments, deposits, customers and tax lines leave Velotri as they are created, so the books match the bay.",
    back: "Payment status from QuickBooks updates the job, so a balance settled in accounting closes out in the shop.",
  },
  {
    name: "Google Calendar & Gmail",
    out: "Booked bay slots become calendar events on the right installer's calendar, and customer email sends from the shop's own address.",
    back: "Personal blocks and reschedules on the calendar show as unavailable time in the bay scheduler.",
  },
  {
    name: "Microsoft Outlook",
    out: "The same calendar and email behaviour for shops running Microsoft: appointments, reminders and customer correspondence.",
    back: "Calendar changes and email replies come back onto the deal thread.",
  },
  {
    name: "HubSpot",
    out: "New leads, contacts, vehicles, quote values and stage changes push into HubSpot as deals so marketing keeps one view.",
    back: "Contact edits and inbound HubSpot leads create or update the matching Velotri customer.",
  },
  {
    name: "GoHighLevel",
    out: "Leads, pipeline stage moves and won/lost outcomes push to GHL to drive the shop's existing campaigns.",
    back: "Inbound GHL leads land on the pipeline with their source and tags intact.",
  },
];

const MECHANICS = [
  {
    title: "Per-shop connections",
    body: "Each shop connects its own accounts. Nothing is shared between shops, and disconnecting one shop never touches another.",
  },
  {
    title: "Queued, not fire-and-forget",
    body: "Every outbound change becomes a queued event. If a provider is down the event waits and retries rather than disappearing.",
  },
  {
    title: "Deduplicated writes",
    body: "Repeat syncs of the same record update in place instead of creating a second contact, invoice or deal.",
  },
  {
    title: "Visible activity log",
    body: "A log shows what was sent, when, and what came back — with a retry button on anything that failed.",
  },
  {
    title: "Scoped two-way",
    body: "Data flows out broadly; it flows back only where a shop genuinely wants it — payment status, calendar availability and contact details.",
  },
  {
    title: "Toggle by object",
    body: "Turn individual sync types on or off per provider, so a shop that only wants invoices in QuickBooks gets only that.",
  },
];

function ConnectPage() {
  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow="VELOTRI / INTEGRATIONS"
        title="Fits the stack you already run."
        body="A shop system that demands you abandon your accounting, calendar and CRM does not get adopted. Velotri pushes clean data out to the tools already in use, and accepts back only what is genuinely useful."
      />

      <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <p className="velotri-label inline-block border border-primary/40 px-2 py-1 text-primary">PROTOTYPE PREVIEW — SIMULATED, NO LIVE CONNECTIONS</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">Provider connections and synchronization are simulated. The flows below describe the intended production integrations, not live account connections.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/for-sales">Explore both dynamic sales workspaces</Link></Button>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid border-y border-border md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <article key={p.name} className="border-border py-7 md:pr-8 md:[&:nth-child(odd)]:border-r md:[&:nth-child(even)]:pl-8 max-md:[&:not(:last-child)]:border-b md:[&:not(:nth-last-child(-n+2))]:border-b">
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="velotri-label text-primary">OUT OF VELOTRI</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.out}</p>
                </div>
                <div>
                  <p className="velotri-label text-muted-foreground">BACK INTO VELOTRI</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.back}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="velotri-livery" data-livery="titanium">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <p className="velotri-label">02 / SYNC BEHAVIOUR</p>
          <h2 className="mt-5 text-3xl font-semibold uppercase sm:text-4xl">How the sync behaves.</h2>
          <div className="mt-10 grid border-t border-current/20 md:grid-cols-3">
            {MECHANICS.map((m) => (
              <div key={m.title} className="border-b border-current/20 py-6 md:pr-8">
                <h3 className="font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="velotri-label text-primary">IN THE DEMO</p>
            <h2 className="mt-3 text-3xl font-semibold">Open the integrations hub.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Connection health, sync scope toggles, the event queue and the activity log are all in the demo workspace.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
