import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHero, MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "How a vehicle moves through Systemize" },
      {
        name: "description",
        content:
          "Follow one vehicle from first enquiry to warranty: lead, quote, proposal and deposit, booking, inspection, production, quality control, delivery and aftercare.",
      },
      { property: "og:title", content: "How a vehicle moves through Systemize" },
      {
        property: "og:description",
        content:
          "Lead, quote, deposit, booking, inspection, production, QC, delivery and aftercare — one continuous record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowPage,
});

const STEPS = [
  {
    stage: "Enquiry",
    title: "The lead lands and gets answered",
    body: "A call, form or walk-in becomes a card with the customer, the vehicle and the services they mentioned. An automatic first text asks for year, make, model and current paint condition, so the advisor has what they need before they call back.",
  },
  {
    stage: "Quote",
    title: "The vehicle gets priced",
    body: "The advisor opens the card and builds the quote from the catalog: services, options, add-ons and any one-off line items. Pricing follows the vehicle size tier, and hours are totalled alongside the money.",
  },
  {
    stage: "Proposal",
    title: "The customer chooses and commits",
    body: "A proposal link goes out with Good / Better / Best options and toggleable extras. Choices recalculate price, labour and film footage in front of the customer. They sign and pay the deposit in the same place.",
  },
  {
    stage: "Booking",
    title: "The work claims a bay",
    body: "Accepted work is dragged onto a bay and an hour. The schedule checks the bay's daily labour capacity and the certification the work needs, and reserves the film roll the job will consume.",
  },
  {
    stage: "Intake",
    title: "Condition is documented before tear-down",
    body: "On arrival a tech pins existing damage on the vehicle map with photos and video. The customer signs the waiver from their phone. The record is now the shop's evidence and the installer's brief.",
  },
  {
    stage: "Production",
    title: "The bay runs on the tablet",
    body: "The installer opens the vehicle in the kiosk view: cut file, inspection notes, assigned roll and coverage instructions. Start, pause and complete are tapped per phase, so actual hours build up against the estimate.",
  },
  {
    stage: "Quality control",
    title: "Nothing leaves unchecked",
    body: "Post-heat edge temperature is logged, film, glass and electronics are checked, and a foreman signs off. A failed item routes the vehicle back to the installer. Keys and final invoicing stay locked until the gate passes.",
  },
  {
    stage: "Delivery",
    title: "Balance collected, keys released",
    body: "The balance is taken against the same record, the job closes, and a warranty certificate is issued carrying the film lot numbers that were actually used on that vehicle.",
  },
  {
    stage: "Aftercare",
    title: "The relationship keeps going",
    body: "An aftercare sequence queues automatically: cure and wash rules a few days out, an invitation for a post-install edge check, and a review request once the customer has lived with the work.",
  },
];

function WorkflowPage() {
  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow="Workflow"
        title="One vehicle, start to finish"
        body="Most shops lose time in the handoffs — counter to bay, bay to foreman, foreman to invoice. In Systemize each stage writes to the same record, so the next person opens it already informed."
      />

      <div className="mx-auto max-w-4xl px-4 py-16">
        <ol className="relative space-y-8 border-l border-border pl-8">
          {STEPS.map((s, i) => (
            <li key={s.stage} className="relative">
              <span className="absolute -left-[41px] flex size-6 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                {s.stage}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold">Walk the whole flow yourself</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            The demo shop has vehicles sitting at every stage, from untouched leads to jobs waiting
            on a QC signature.
          </p>
          <Button asChild className="mt-6">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
