import { useState } from "react";
import { Columns3, ListOrdered, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicActivity } from "@/components/dynamic-activity";
import { productShots, Screenshot } from "@/components/product-showcase";
import { cn } from "@/lib/utils";
import type { SalesConfig } from "@/lib/sales-mode";

const SOURCES = [
  { id: "systemize", name: "Velotri", detail: "Manage enquiries directly in Velotri." },
  { id: "ghl", name: "GoHighLevel", detail: "Preview CRM-sourced contacts, conversations and opportunity activity." },
  { id: "hubspot", name: "HubSpot", detail: "Preview CRM-sourced contacts, deals and engagement activity." },
] as const;

export function MarketingSalesDemo() {
  const [source, setSource] = useState<typeof SOURCES[number]["id"]>("systemize");
  const [workspace, setWorkspace] = useState<"pipeline" | "activity">("activity");
  const [reset, setReset] = useState(0);
  const selectedSource = SOURCES.find(s => s.id === source) ?? SOURCES[0];
  const config: SalesConfig = { dataSource: source === "systemize" ? "systemize" : "crm", workspace, crm: source === "systemize" ? null : source, connectedAt: null };

  return <section aria-label="Dynamic sales preview" className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div><p className="text-xs font-semibold uppercase text-primary">Two decisions. One sales experience.</p><h2 className="mt-3 text-3xl font-semibold">Your CRM. Your way of working.</h2></div>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Choose where leads originate, then how you work them. Neither decision changes the quote-to-install story.</p>
    </div>
    <div className="mt-8 grid gap-6 border-y border-border py-6 md:grid-cols-2">
      <div><p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">01 / Lead data source</p><div className="flex flex-wrap gap-2" role="group" aria-label="Preview lead source">{SOURCES.map(s => <Button key={s.id} variant={source === s.id ? "default" : "outline"} size="sm" aria-pressed={source === s.id} onClick={() => setSource(s.id)}>{s.name}</Button>)}</div><p className="mt-3 text-sm text-muted-foreground">{selectedSource.detail}</p></div>
      <div><p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">02 / Sales workspace</p><div className="flex flex-wrap gap-2" role="group" aria-label="Preview sales workspace"><Button size="sm" variant={workspace === "pipeline" ? "default" : "outline"} aria-pressed={workspace === "pipeline"} onClick={() => setWorkspace("pipeline")}><Columns3 className="size-4" />Dynamic Pipeline</Button><Button size="sm" variant={workspace === "activity" ? "default" : "outline"} aria-pressed={workspace === "activity"} onClick={() => setWorkspace("activity")}><ListOrdered className="size-4" />Dynamic Activity</Button></div><p className="mt-3 text-sm text-muted-foreground">{workspace === "pipeline" ? "See deal stages and engagement together." : "Work a prioritized list. No pipeline required."}</p></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 py-4"><p className="flex flex-wrap items-center gap-2 text-xs font-medium" aria-live="polite">{selectedSource.name}<ArrowRight className="size-3 text-primary" />Velotri sales layer<ArrowRight className="size-3 text-primary" />{workspace === "pipeline" ? "Dynamic Pipeline" : "Dynamic Activity"}</p><span className="text-xs text-muted-foreground">Interactive preview · No live CRM connection</span></div>
    <div className={cn(workspace !== "pipeline" && "hidden")}>
      <Screenshot src={productShots.sales} title="Dynamic Pipeline" caption="Actual pipeline screen with sample records. Source choices illustrate the intended architecture; this screenshot does not load CRM data." eager />
      <div className="mt-6 grid gap-6 sm:grid-cols-3"><div><h3 className="text-sm font-semibold">Stage tells you where</h3><p className="mt-2 text-sm text-muted-foreground">New enquiry, contacted, quoted or decision. Keep the whole sale visible without losing the next action.</p></div><div><h3 className="text-sm font-semibold">Activity tells you when</h3><p className="mt-2 text-sm text-muted-foreground">Untouched leads, replies, quote engagement and cooling conversations stand apart from the deal stage.</p></div><div><h3 className="text-sm font-semibold">Focus tells you who</h3><p className="mt-2 text-sm text-muted-foreground">Filter new leads, live activity, follow-ups due and cooling opportunities to focus the rep's attention.</p></div></div>
    </div>
    <div className={cn(workspace !== "activity" && "hidden")}>
      <h3 className="mb-3 text-xl font-semibold">Dynamic Activity · Live preview</h3>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Try Contact, Respond or Follow Up. Handled leads leave the attention queue.</p><Button variant="ghost" size="sm" onClick={() => setReset(n => n+1)}><RotateCcw className="size-4" />Reset preview</Button></div>
      <div className="min-w-0 border-y border-border py-6 [&_.grid>*]:min-w-0 [&_li>span:first-child]:min-w-0"><DynamicActivity key={reset} config={config} sourceLabel={`${selectedSource.name} · simulated sample data`} /></div>
      <p className="mt-3 text-xs text-muted-foreground">Sample interactions update this preview only. Messages are not sent and no CRM is contacted.</p>
    </div>
    <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6 text-sm">{["Customer replies first", "Untouched enquiries next", "High-intent quote activity", "Follow-ups before leads go cold"].map(t => <li key={t} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{t}</li>)}</ul>
  </section>;
}