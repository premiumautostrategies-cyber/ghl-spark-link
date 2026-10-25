import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing-layout";
import { marketingHead, productShots, Screenshot } from "@/components/product-showcase";

export const Route = createFileRoute("/")({ head: () => marketingHead("VELOTRI — Built to Run. Built to Grow.", "Sales performance, operational control and the freedom to run your shop your way. Built first for automotive restyling."), component: Landing });

const PILLARS = [
  { n: "01", t: "Sales performance", b: "Every lead ranked by what needs you next — not by where it sits in a column." },
  { n: "02", t: "Operational control", b: "Schedule, capacity, payments and QC visible to the owner in one glance." },
  { n: "03", t: "Your way of working", b: "Pipeline or pipeline-free. Our CRM or yours. Configured, not forced." },
];

const MODES = [
  { k: "Dynamic Pipeline", who: "For teams that think in stages", b: "A Kanban board where each card also carries activity temperature and focus priority, so stalled deals surface on their own.", status: "Prototype" },
  { k: "Dynamic Activity", who: "For teams that think in conversations", b: "No columns. One prioritized list — needs attention, recent, going cold, upcoming. Work the top and move on.", status: "Prototype" },
  { k: "Connected CRM context", who: "For shops already on a CRM", b: "Keep your existing CRM as the record. Velotri is designed to bring its context into the closing workflow.", status: "Simulated — no live connection" },
  { k: "Internal CRM", who: "For shops starting fresh", b: "Customers, vehicles, quotes and messages held natively, entered once and reused through delivery.", status: "Prototype" },
  { k: "Owner visibility", who: "For the person accountable", b: "Open pipeline, today's schedule, QC alerts and balances — the decisions, not vanity charts.", status: "Prototype" },
  { k: "Technician execution", who: "For the people on the vehicle", b: "Phone-first: clock in, today's work order, checklist, photos, one handoff to QC.", status: "Prototype" },
];

const STORY = {
  sales: { label: "Sales", title: "Prioritized, not just organized.", body: "The lead that needs a reply rises to the top. Respond, quote and collect a deposit from the same thread.", shot: productShots.sales, shotTitle: "Dynamic Pipeline", to: "/for-sales" },
  operations: { label: "Operations", title: "The shop day, at a glance.", body: "Bays, mobile vans, overlaps and capacity in one schedule. Conflicts are visible before they cost a day.", shot: productShots.schedule, shotTitle: "Shop Schedule", to: "/for-operations" },
  technician: { label: "Technician", title: "Only what the installer needs.", body: "Current job, instructions, checklist and photos. Work live or bundle documentation at the end of a phase.", shot: productShots.tech, shotTitle: "Technician Work Order", to: "/for-technicians" },
} as const;
type StoryKey = keyof typeof STORY;

function Landing() {
  const [tab, setTab] = useState<StoryKey>("sales");
  const s = STORY[tab];
  return <MarketingLayout>
    {/* STEALTH — hero */}
    <section className="overflow-hidden border-b border-border">
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pt-24">
        <div className="flex items-center gap-4"><span className="h-px w-10 bg-primary" /><p className="velotri-label text-primary">VELOTRI / SHOP OPERATING SYSTEM</p></div>
        <h1 className="velotri-headline mt-8 font-semibold">BUILT TO RUN.<br /><span className="text-primary">BUILT TO GROW.</span></h1>
        <div className="mt-12 grid gap-px border-y border-border sm:grid-cols-3">
          {PILLARS.map(p => <div key={p.n} className="py-6 sm:px-6 sm:first:pl-0 sm:[&:not(:first-child)]:border-l sm:border-border"><span className="velotri-label text-muted-foreground">{p.n}</span><h2 className="mt-2 text-lg font-semibold">{p.t}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.b}</p></div>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/platform">Explore the platform <ArrowUpRight className="size-4" /></Link></Button><Button asChild variant="outline" size="lg"><Link to="/contact">Request a demo <ArrowRight className="size-4" /></Link></Button></div>
        <div className="mt-14 velotri-product"><Screenshot src={productShots.command} title="Command Center" caption="Actual prototype screen · fictional sample shop data." eager /></div>
      </div>
    </section>

    {/* TITANIUM — philosophy */}
    <section className="velotri-livery" data-livery="titanium">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <p className="velotri-label">02 / PHILOSOPHY</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1fr]"><h2 className="text-4xl font-semibold leading-tight sm:text-6xl">YOUR BUSINESS.<br />YOUR WORKFLOW.</h2><p className="max-w-lg self-end text-lg leading-relaxed">A tint studio with two installers doesn't sell like a multi-bay PPF shop with a sales desk. Velotri lets each team choose how it works — and keeps one record underneath.</p></div>
        <div className="mt-14 grid border-t border-current/20 md:grid-cols-2 lg:grid-cols-3">
          {MODES.map(m => <article key={m.k} className="velotri-mode border-b border-current/20 py-7 md:pr-8"><p className="velotri-label opacity-70">{m.who}</p><h3 className="mt-3 text-xl font-semibold">{m.k}</h3><p className="mt-3 text-sm leading-relaxed opacity-85">{m.b}</p><p className="velotri-label mt-4 inline-block border border-current/30 px-2 py-0.5">{m.status}</p></article>)}
        </div>
      </div>
    </section>

    {/* STEALTH — interactive story */}
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <p className="velotri-label text-primary">03 / ONE RECORD, THREE SEATS</p>
        <h2 className="mt-5 text-4xl font-semibold sm:text-5xl">SEE IT FROM EVERY SEAT.</h2>
        <div role="tablist" aria-label="Product story" className="mt-10 flex gap-6 border-b border-border">
          {(Object.keys(STORY) as StoryKey[]).map(k => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{STORY[k].label}</button>)}
        </div>
        <div key={tab} role="tabpanel" className="velotri-fade mt-10 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div><h3 className="text-3xl font-semibold">{s.title}</h3><p className="mt-4 leading-relaxed text-muted-foreground">{s.body}</p><Link to={s.to} className="mt-6 inline-flex items-center gap-2 text-sm text-primary">Explore {s.label.toLowerCase()} <ArrowUpRight className="size-4" /></Link></div>
          <Screenshot src={s.shot} title={s.shotTitle} caption="Actual prototype screen · fictional sample shop data." />
        </div>
      </div>
    </section>

    {/* ARCTIC — industries */}
    <section className="velotri-livery" data-livery="arctic">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
        <div><p className="velotri-label">04 / STARTING LINE</p><h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">ENGINEERED FOR RESTYLING.<br />BUILT TO SCALE BEYOND IT.</h2><p className="mt-5 max-w-md leading-relaxed opacity-80">Service-based businesses share the same shape: a conversation, a quote, a booked slot, skilled work, a handoff. Restyling is where we start.</p><Link to="/industries" className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">Industries <ArrowUpRight className="size-4" /></Link></div>
        <ul className="grid content-start">
          {[["PPF · Tint · Wrap · Ceramic · Detail", "Available focus"], ["Mobile services & PDR", "Prototype"], ["Marine", "Future direction"], ["Studio services", "Future direction"]].map(([a, b]) => <li key={a} className="flex items-baseline justify-between gap-4 border-b border-current/20 py-5"><span className="text-lg font-medium">{a}</span><span className="velotri-label opacity-70">{b}</span></li>)}
        </ul>
      </div>
    </section>
  </MarketingLayout>;
}
