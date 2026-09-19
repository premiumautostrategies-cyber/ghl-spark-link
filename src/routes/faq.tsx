import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHero, MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Systemize FAQ — how the system works" },
      {
        name: "description",
        content:
          "Straight answers about Systemize: which shops it suits, how pricing and catalogs are configured, how film and warranty tracking work, access control and multi-location setup.",
      },
      { property: "og:title", content: "Systemize FAQ — how the system works" },
      {
        property: "og:description",
        content:
          "Who it is for, how the catalog and pricing work, film and warranty tracking, permissions and multiple locations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "What kind of shop is this built for?",
    a: "Vehicle restyling and protection studios: paint protection film, window tint, colour change wraps, commercial graphics, ceramic coatings, paint correction, detailing and accessories. It is not a mechanical repair system — there are no repair orders, parts catalogs or diagnostic workflows.",
  },
  {
    q: "Can I use my own service menu and pricing?",
    a: "Yes. Categories, services, descriptions, photos, estimated hours and prices are all yours to define. A service can carry one flat price or tiered pricing by vehicle size, its own deposit rule, its own add-ons, and a setting for whether customers can see it or it stays internal.",
  },
  {
    q: "How is film tracked?",
    a: "By roll. Each roll has a code, brand, product line, width, starting and remaining linear feet, lot number and cost per foot. Booking a job reserves a roll, installing deducts the footage used, and scrap is logged separately so waste is visible rather than absorbed.",
  },
  {
    q: "What goes on a warranty certificate?",
    a: "The vehicle, the work performed, the coverage terms and the lot numbers of the film actually used on that car. Because usage is recorded at the roll level during the install, a claim years later can be traced back to a specific batch.",
  },
  {
    q: "How does the quality gate work?",
    a: "Before a vehicle can be marked ready for pickup, a checklist has to pass: post-heat edge temperature logged in range, bubble and edge inspection, glass and electronics function, and a lead installer or foreman signature. Until it passes, key release and final invoicing stay blocked.",
  },
  {
    q: "Who can see what?",
    a: "Access is role-based. Roles carry permissions, and every record belongs to the shop that created it — enforced in the database, not only in the interface. An installer on the tablet sees the work in their bay; an owner sees the whole operation.",
  },
  {
    q: "Does it handle more than one location?",
    a: "Yes. A shop can run multiple locations under one organisation, with bays, staff, stock and schedules held per location, and reporting that can look at one site or all of them.",
  },
  {
    q: "What happens on the customer's phone?",
    a: "Customers receive links rather than attachments: an interactive proposal they can configure, sign and pay a deposit on; an inspection waiver to review and sign; and a warranty certificate after delivery. No app download, no login to remember.",
  },
  {
    q: "Is the demo a real working system?",
    a: "The demo is the real application with a sample shop loaded — customers, vehicles, quotes, booked bays, film rolls, inspections and completed jobs. You can create, edit and move things; nothing you do there affects anyone else's shop.",
  },
];

function FaqPage() {
  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow="Questions"
        title="Straight answers"
        body="What Systemize does, how it is configured, and where its edges are. No claims about results — just how the system behaves."
      />

      <div className="mx-auto max-w-3xl px-4 py-16">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold">Still easier to just look</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            The demo opens straight into a loaded shop — no account, no form.
          </p>
          <Button asChild className="mt-6">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
