import { Link } from "@tanstack/react-router";
import { ArrowRight, Maximize2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MarketingLayout } from "@/components/marketing-layout";
import sales from "@/assets/showcase-sales.webp.asset.json";
import messages from "@/assets/showcase-messages.webp.asset.json";
import tech from "@/assets/showcase-tech-detail.webp.asset.json";
import techList from "@/assets/showcase-tech-list.webp.asset.json";
import operations from "@/assets/showcase-operations.webp.asset.json";
import schedule from "@/assets/showcase-schedule.webp.asset.json";
import marketing from "@/assets/showcase-marketing.webp.asset.json";
import team from "@/assets/showcase-team.webp.asset.json";
import command from "@/assets/showcase-command.webp.asset.json";

export const productShots = { sales: sales.url, messages: messages.url, tech: tech.url, techList: techList.url, operations: operations.url, schedule: schedule.url, marketing: marketing.url, team: team.url, command: command.url };

export const PRODUCT_PAGES = [
  { to: "/for-sales", number: "01", label: "Sales", title: "Move the conversation forward.", body: "Dynamic Pipeline or Activity. Your CRM or Systemize. One connected closing workflow." },
  { to: "/for-technicians", number: "02", label: "Technicians", title: "More time on the vehicle.", body: "A phone-first work order. Clear instructions. One clean QC handoff." },
  { to: "/for-operations", number: "03", label: "Operations", title: "See the whole shop clearly.", body: "Schedules, resources, payments and performance in one connected view." },
  { to: "/marketing-admin", number: "04", label: "Marketing & Admin", title: "Build a more repeatable business.", body: "Follow-ups, campaign performance, team settings and shop standards." },
] as const;

export function Screenshot({ src, title, caption, eager = false }: { src: string; title: string; caption: string; eager?: boolean }) {
  return <figure className="min-w-0">
    <Dialog>
      <div className="overflow-hidden rounded-lg border border-hairline bg-obsidian">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4"><span className="text-xs font-medium text-muted-foreground">SYSTEMIZE / {title}</span><DialogTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Enlarge ${title} screenshot`} title="Enlarge screenshot"><Maximize2 className="size-3.5" /></Button></DialogTrigger></div>
        <DialogTrigger asChild><Button variant="ghost" className="block h-auto w-full overflow-hidden rounded-none p-0 hover:bg-transparent" aria-label={`View ${title} screenshot`}><img src={src} alt={`Actual Systemize ${title} screen with sample shop data`} width={1280} height={900} loading={eager ? "eager" : "lazy"} className="block h-auto w-full" /></Button></DialogTrigger>
      </div>
      <DialogContent className="max-h-[94dvh] max-w-6xl overflow-y-auto bg-background p-4 sm:p-6"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Actual product screen · Sample shop data</DialogDescription></DialogHeader><img src={src} alt={`Enlarged ${title} product screenshot`} width={1280} height={900} className="h-auto w-full" /></DialogContent>
    </Dialog>
    <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">{caption}</figcaption>
  </figure>;
}

type ShowcaseProps = { category: string; title: string; intro: string; image: string; imageTitle: string; caption: string; outcomes: { title: string; body: string }[]; secondary: { image: string; imageTitle: string; title: string; body: string; points: string[] }; next: typeof PRODUCT_PAGES[number] };

export function ProductShowcase({ category, title, intro, image, imageTitle, caption, outcomes, secondary, next }: ShowcaseProps) {
  return <MarketingLayout>
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
      <p className="text-xs font-semibold uppercase text-primary">Systemize / {category}</p>
      <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1.2fr_1fr]"><h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1><p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p></div>
      <div className="mt-10"><Screenshot src={image} title={imageTitle} caption={caption} eager /></div>
    </section>
    <section className="border-y border-border"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">{outcomes.map((o, i) => <div key={o.title}><span className="text-xs font-medium text-primary">0{i+1}</span><h2 className="mt-3 text-xl font-semibold">{o.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{o.body}</p></div>)}</div></section>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.3fr]"><div><p className="text-xs font-semibold uppercase text-primary">Connected by design</p><h2 className="mt-4 text-3xl font-semibold leading-tight">{secondary.title}</h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">{secondary.body}</p><ul className="mt-6 space-y-4">{secondary.points.map(p => <li key={p} className="flex gap-3 text-sm"><Check className="size-4 shrink-0 text-primary" /><span>{p}</span></li>)}</ul></div><Screenshot src={secondary.image} title={secondary.imageTitle} caption="Captured from the Systemize prototype. Sample records shown." /></section>
    <section className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-12 sm:px-8"><div><p className="text-xs text-muted-foreground">Next, explore {next.label.toLowerCase()}</p><Link to={next.to} className="mt-2 inline-flex items-center gap-4 text-2xl font-semibold">{next.title}<ArrowRight className="size-5 shrink-0" /></Link></div><Button asChild size="lg"><Link to="/demo">Explore the live prototype <ArrowRight className="size-4" /></Link></Button></div></section>
  </MarketingLayout>;
}

export function marketingHead(title: string, description: string) {
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}