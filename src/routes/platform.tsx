import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHero, MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "The Systemize platform — every module explained" },
      {
        name: "description",
        content:
          "A module-by-module breakdown of Systemize: pipeline, service catalog, proposals, bay scheduling, inspections, shop floor, film stock, quality control, warranty and reporting.",
      },
      { property: "og:title", content: "The Systemize platform — every module explained" },
      {
        property: "og:description",
        content:
          "Pipeline, catalog, proposals, scheduling, inspections, shop floor, stock, QC, warranty and reporting — what each part does.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformPage,
});

const MODULES = [
  {
    group: "Sales",
    items: [
      {
        name: "Pipeline",
        body: "Every enquiry is a card on a board, grouped by stage. Cards show the customer, the vehicle, the services they asked about and a tap-to-call or text button. New leads deliberately carry no dollar figure — nothing is priced until the vehicle is understood.",
        points: [
          "Search by name, plate, vehicle or service tag",
          "Service tags drive bulk messaging and automations",
          "Stages move when something real happens, not by hand",
        ],
      },
      {
        name: "Sales desk",
        body: "Opening a card opens the place the sale is made: the full service catalog, options and add-ons, one-off line items, booking availability, deposits and the conversation thread — all on one screen.",
        points: [
          "Click a service to drop it straight onto the quote",
          "Custom line items for anything the menu does not cover",
          "Availability strip shows which hours are actually open",
        ],
      },
      {
        name: "Service catalog",
        body: "Your menu, your categories. Services carry a description, photo, estimated hours, base price and optional pricing tiers by vehicle size. PPF and tint services carry coverage maps, film tiers and shade options.",
        points: [
          "Flat price or per-vehicle-size tiers",
          "Flat-rate or hourly add-ons linked to any service",
          "Per-service deposit rules and internal vs public visibility",
        ],
      },
      {
        name: "Interactive proposals",
        body: "Send a link rather than a flat PDF. The customer toggles Good / Better / Best and optional add-ons, and price, labour hours and film footage recalculate live. They sign and pay the deposit in the same link.",
        points: [
          "Configurable deposit percentage",
          "Electronic signature captured with the accepted option",
          "Accepted proposals feed straight into scheduling",
        ],
      },
    ],
  },
  {
    group: "Installation",
    items: [
      {
        name: "Bay scheduler",
        body: "Drag accepted work onto a bay and an hour. The schedule knows each bay's daily labour capacity and which certification a bay requires, and warns before you double-book a tech or overrun the day.",
        points: [
          "Bays defined per discipline — PPF, tint, wrap, flex",
          "Installer certification levels checked on assignment",
          "Film rolls soft-reserved when the job is booked",
        ],
      },
      {
        name: "Digital vehicle inspection",
        body: "Before tear-down, a tech taps panels on a vehicle map to pin existing chips, scratches, swirls and repainted panels, with photos and video attached to each pin. A waiver link goes to the customer for signature.",
        points: [
          "Panel-level damage pins with media",
          "Customer-signed waiver stored on the job",
          "Findings visible to whoever installs the vehicle",
        ],
      },
      {
        name: "Shop floor kiosk",
        body: "A tablet view for the bay. Each vehicle card shows the cut file, inspection notes, assigned roll and coverage instructions, with large buttons to start, pause and complete each phase.",
        points: [
          "Phases: wash/prep, plot/cut, install, reassembly",
          "Actual time recorded against the estimate per tech",
          "No paper job sheets to lose",
        ],
      },
      {
        name: "Quality control",
        body: "A vehicle cannot reach Ready for Pickup until the checklist passes. Post-heat edge temperature is logged, bubbles and glass function are checked, and a lead installer or foreman signs off.",
        points: [
          "Edge temperature recorded in the 190–200°F window",
          "Failed checks send the vehicle back to the installer",
          "Key release and final invoicing stay locked until sign-off",
        ],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        name: "Film and material stock",
        body: "Film is tracked by roll, not by guess. Each roll carries a code, brand, product line, width, remaining linear feet, lot number and cost per foot. Usage and scrap are logged as they happen.",
        points: [
          "Lot numbers attach to the job for warranty claims",
          "Low-roll thresholds flag what to reorder",
          "Purchase orders generate and receive back into stock",
        ],
      },
      {
        name: "Warranty and aftercare",
        body: "On completion a branded warranty certificate is generated with the roll lot numbers and coverage terms, and an aftercare sequence is queued: cure rules, an edge-check invitation and a review request.",
        points: [
          "Certificate tied to the vehicle and the film used",
          "Day 3, day 14 and day 15 aftercare touches",
          "Queue shows what is due and what has been sent",
        ],
      },
      {
        name: "Command center and reporting",
        body: "A configurable home screen. Widgets can be moved, resized, hidden and restored, covering today's bays, the schedule, pipeline health, technician output and loss reasons.",
        points: [
          "Compact or executive layouts",
          "Layout saved per user and per shop",
          "Quick-add actions and deep links into any module",
        ],
      },
      {
        name: "Access, locations and audit",
        body: "Multi-location by design. Roles carry permissions, records are scoped to the shop that owns them, and changes are recorded so you can see who did what.",
        points: [
          "Role-based permissions per shop",
          "Data isolated per organisation at the database level",
          "Brand highlight colour set per shop",
        ],
      },
    ],
  },
];

function PlatformPage() {
  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow="Platform"
        title="Every part of the shop, in one record"
        body="Systemize is organised the way a restyling shop actually runs: sales, installation and operations. Each module writes to the same vehicle record, so nothing is re-typed between the front counter and the bay."
      />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        {MODULES.map((section) => (
          <section key={section.group}>
            <h2 className="display-title text-3xl font-bold uppercase tracking-tight">
              {section.group}
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {section.items.map((m) => (
                <article key={m.name} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-xl font-semibold">{m.name}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{m.body}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold">See it with a shop already loaded</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            The demo workspace has customers, vehicles, quotes, booked bays, film rolls and
            completed jobs so every module has something in it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
