import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing-layout";
import { marketingHead, PRODUCT_PAGES, productShots, Screenshot } from "@/components/product-showcase";
import studio from "@/assets/marketing-studio.jpg";
export const Route = createFileRoute("/")({
  head: () => marketingHead("Systemize — The automotive restyling operating system", "Explore the Systemize prototype through real product screenshots: connected sales, technician work orders, shop operations, marketing and administration."),
  component: Landing,
});
function Landing() {
  return <MarketingLayout>
    <section className="marketing-hero relative isolate overflow-hidden border-b border-border">
      <img src={studio} alt="Paint protection film installation in an automotive restyling studio" width={1920} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]" />
      <div className="marketing-hero-shade absolute inset-0 -z-10" />
      <div className="mx-auto flex min-h-[540px] max-w-7xl flex-col justify-center px-5 py-16 sm:min-h-[570px] sm:px-8">
        <p className="text-xs font-semibold uppercase text-primary">The automotive restyling operating system</p>
        <h1 className="mt-5 text-6xl font-semibold leading-none sm:text-8xl">SYSTEMIZE<span className="text-primary">.</span></h1>
        <p className="mt-6 max-w-lg text-2xl font-medium leading-snug sm:text-3xl">One shop. One connected story.</p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-marketing-copy">From the first enquiry to the final keys. Bring sales, installers and operations together—around the vehicle.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/demo">Explore the demo <ArrowUpRight className="size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="border-marketing-copy/30 bg-background/20"><Link to="/for-sales">See sales in action <ArrowRight className="size-4" /></Link></Button></div>
        <p className="mt-6 text-xs text-marketing-copy">PPF / Tint / Wrap / Ceramic / Detail / PDR</p>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase text-primary">Built around the people doing the work</p><h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Explore your side of the shop.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">A closer look at each workspace. Actual screens, connected workflows, no guesswork.</p></div>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4">{PRODUCT_PAGES.map(p => <Link key={p.to} to={p.to} className="group border-t border-border py-6 pr-6 md:odd:pr-8 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0"><div className="flex items-center justify-between gap-4"><span className="text-xs text-muted-foreground">{p.number} / {p.label}</span><ArrowUpRight className="size-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" /></div><h3 className="mt-6 max-w-xs text-xl font-semibold leading-snug">{p.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p></Link>)}</div>
    </section>
    <section className="border-y border-border"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><div className="mb-8 flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase text-primary">Inside Systemize</p><h2 className="mt-3 text-3xl font-semibold">The next action. Not another dashboard.</h2></div><p className="max-w-md text-sm leading-relaxed text-muted-foreground">The Command Center brings leads needing attention, today's schedule and recent activity into focus. Then each team has its own place to work.</p></div><Screenshot src={productShots.command} title="Command Center" caption="Actual Systemize screen · Sample shop data. Explore the product pages above for each team's workspace." /></div></section>
    <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-16 sm:px-8"><div><p className="text-xs font-semibold uppercase text-primary">Follow the vehicle</p><h2 className="mt-3 text-3xl font-semibold">No lost context between teams.</h2><p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">Customer → Quote → Schedule → Install → QC → Delivery. The same vehicle story, from the front counter to the final handoff.</p></div><Button asChild variant="outline" size="lg"><Link to="/workflow">Explore the full journey <ArrowRight className="size-4" /></Link></Button></section>
  </MarketingLayout>;
}
