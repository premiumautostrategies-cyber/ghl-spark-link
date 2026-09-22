import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  UserPlus,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { LeadWorkspace } from "@/components/lead-workspace";
import { useOrg } from "@/lib/use-org";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  RECURRENCES,
} from "@/lib/finance";
import {
  eventLabel,
  leadSignal,
  sinceLabel,
  TEMP_META,
  type LeadEvent,
} from "@/lib/pipeline";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — Systemize" },
      { name: "description", content: "Prioritized sales work, today’s schedule, and customer activity." },
      { property: "og:title", content: "Command Center — Systemize" },
      { property: "og:description", content: "Prioritized sales work, today’s schedule, and customer activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandCenter,
});

type QuickAction = "lead" | "job" | "appointment" | "payment" | "expense" | null;
type DealRow = {
  id: string;
  title: string;
  stage: string;
  value: number | string;
  probability: number | null;
  created_at: string;
  last_activity_at: string | null;
  speed_to_lead_at: string | null;
  customer_id: string | null;
  customers: { name: string } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
};
type JobRow = {
  id: string;
  title: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  bay: string | null;
  installer: string | null;
  customers: { name: string } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
};

function sameDay(value: string | null, date: Date) {
  if (!value) return false;
  const candidate = new Date(value);
  return candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
}

function vehicleName(vehicle: DealRow["vehicles"] | JobRow["vehicles"]) {
  return vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "Vehicle not assigned";
}

function primaryAction(signal: ReturnType<typeof leadSignal>) {
  if (!signal.firstContact) return "Contact";
  if (signal.awaitingReply) return "Reply";
  if (signal.live || signal.quoteOpens > 1) return "Text / Call";
  return "Follow up";
}

function CommandCenter() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const historyStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 60);
    return date;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["command-center-action", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [jobs, deals, events, customers] = await Promise.all([
        supabase
          .from("jobs")
          .select("id,title,status,scheduled_start,scheduled_end,bay,installer,customers(name),vehicles(year,make,model)")
          .gte("created_at", historyStart.toISOString())
          .order("scheduled_start", { ascending: true, nullsFirst: false }),
        supabase
          .from("deals")
          .select("id,title,stage,value,probability,created_at,last_activity_at,speed_to_lead_at,customer_id,customers(name),vehicles(year,make,model)")
          .gte("created_at", historyStart.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("lead_events")
          .select("id,deal_id,actor,kind,detail,created_at")
          .gte("created_at", historyStart.toISOString())
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name").order("name"),
      ]);
      const error = [jobs, deals, events, customers].find((result) => result.error)?.error;
      if (error) throw error;
      return {
        jobs: (jobs.data ?? []) as JobRow[],
        deals: (deals.data ?? []) as DealRow[],
        events: (events.data ?? []) as LeadEvent[],
        customers: customers.data ?? [],
      };
    },
  });

  const quickMutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !quickAction) throw new Error("No workspace selected");
      if (quickAction === "lead") {
        const { error } = await supabase.from("deals").insert({ title: String(form.get("title")), value: Number(form.get("value") || 0), probability: 25, stage: "new_lead", source: String(form.get("source") || "Command Center"), owner_name: String(form.get("owner_name") || "") || null, customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      } else if (quickAction === "payment") {
        const { error } = await supabase.from("payments").insert({ amount: Number(form.get("amount") || 0), kind: String(form.get("kind") || "payment"), method: "card", status: "paid", paid_at: new Date().toISOString(), customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      } else if (quickAction === "expense") {
        const status = String(form.get("expense_status") || "paid");
        const date = String(form.get("expense_date") || "") || new Date().toISOString().slice(0, 10);
        const { error } = await supabase.from("expenses").insert({ amount: Number(form.get("amount") || 0), category: String(form.get("category") || "other"), vendor: String(form.get("vendor") || "") || null, description: String(form.get("description") || "") || null, recurrence: String(form.get("recurrence") || "one_off"), status, expense_date: date, due_date: status === "due" ? date : null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      } else {
        const start = String(form.get("scheduled_start") || "");
        const { error } = await supabase.from("jobs").insert({ title: String(form.get("title")), service_type: "other", status: "scheduled", price: Number(form.get("price") || 0), bay: String(form.get("bay") || "") || null, installer: String(form.get("installer") || "") || null, scheduled_start: start ? new Date(start).toISOString() : null, customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Added to the shop");
      setQuickAction(null);
      qc.invalidateQueries({ queryKey: ["command-center-action"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const jobs = data?.jobs ?? [];
  const deals = data?.deals ?? [];
  const events = data?.events ?? [];
  const activeDeals = deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const closedDeals = deals.filter((deal) => ["won", "lost"].includes(deal.stage));
  const wonDeals = closedDeals.filter((deal) => deal.stage === "won");
  const eventsByDeal = new Map<string, LeadEvent[]>();
  for (const event of events) eventsByDeal.set(event.deal_id, [...(eventsByDeal.get(event.deal_id) ?? []), event]);
  const focusedDeals = activeDeals
    .map((deal) => ({ deal, signal: leadSignal(deal, eventsByDeal.get(deal.id) ?? []) }))
    .sort((a, b) => b.signal.focusScore - a.signal.focusScore);
  const attentionDeals = focusedDeals.filter(({ signal }) => signal.focusScore >= 50);
  const todayJobs = jobs.filter((job) => sameDay(job.scheduled_start, now));
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const recentCustomerEvents = events.filter((event) => event.actor === "customer").slice(0, 5);

  const metrics = [
    { label: "Open Pipeline", value: money(activeDeals.reduce((sum, deal) => sum + Number(deal.value), 0)) },
    { label: "Close Rate", value: `${closedDeals.length ? Math.round(wonDeals.length / closedDeals.length * 100) : 0}%` },
    { label: "New Leads", value: String(activeDeals.filter((deal) => deal.stage === "new_lead").length) },
    { label: "Needs Attention", value: String(attentionDeals.length), attention: attentionDeals.length > 0 },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Everything that needs your attention to keep sales moving."
        action={<QuickAddMenu onChoose={setQuickAction} />}
      />

      <section className="grid overflow-hidden rounded-xl border border-elevated bg-surface sm:grid-cols-2 lg:grid-cols-4" aria-label="Sales overview">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={cn("px-4 py-3 lg:px-5", index > 0 && "border-t border-elevated sm:border-l", index === 2 && "sm:border-l-0 lg:border-l", index > 1 && "lg:border-t-0")}>
            <p className="micro-label">{metric.label}</p>
            <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", metric.attention && "text-critical")}>{metric.value}</p>
          </div>
        ))}
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-elevated bg-surface p-12 text-center text-sm text-muted-foreground">Loading priorities…</div>
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_296px]">
          <main className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="micro-label text-bronze">Priority queue</p>
                <h2 className="mt-1 font-display text-xl font-semibold">Work my leads</h2>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/sales">View pipeline</Link></Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-elevated bg-surface">
              <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.65fr)_88px_72px_104px] gap-3 border-b border-elevated px-4 py-2.5 text-[10px] font-semibold uppercase text-muted-foreground md:grid">
                <span>Customer</span><span>Vehicle</span><span>Needs attention</span><span className="text-right">Value</span><span className="text-right">Activity</span><span className="text-right">Action</span>
              </div>
              <div className="divide-y divide-elevated">
                {focusedDeals.slice(0, 12).map(({ deal, signal }) => {
                  const meta = TEMP_META[signal.temperature];
                  const activityAt = signal.lastCustomerAt ?? deal.created_at;
                  return (
                    <div key={deal.id} className={cn("relative grid min-w-0 gap-3 px-4 py-3 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:bg-surface-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.65fr)_88px_72px_104px] md:items-center", meta.edge, signal.live && meta.tint)}>
                      <button type="button" onClick={() => setOpenDealId(deal.id)} className="min-w-0 text-left">
                        <span className="block truncate text-sm font-semibold">{deal.customers?.name ?? deal.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground md:hidden">{vehicleName(deal.vehicles)}</span>
                      </button>
                      <p className="hidden truncate text-xs text-muted-foreground md:block">{vehicleName(deal.vehicles)}</p>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{signal.focusReason ?? signal.nextAction ?? "Continue follow-up"}</p>
                        {signal.live && <p className="mt-0.5 truncate text-[10px] font-semibold uppercase text-critical">Live · {signal.liveLabel}</p>}
                      </div>
                      <p className="text-xs font-semibold tabular-nums md:text-right">{money(deal.value)}</p>
                      <p className={cn("text-[11px] tabular-nums md:text-right", meta.text)}>{sinceLabel(activityAt)}</p>
                      <div className="flex items-center gap-1 md:justify-end">
                        {primaryAction(signal) === "Text / Call" ? (
                          <>
                            <Button size="icon" variant="ghost" aria-label={`Text ${deal.customers?.name ?? "customer"}`} onClick={() => setOpenDealId(deal.id)}><MessageSquare /></Button>
                            <Button size="icon" variant="ghost" aria-label={`Call ${deal.customers?.name ?? "customer"}`} onClick={() => setOpenDealId(deal.id)}><Phone /></Button>
                          </>
                        ) : (
                          <Button size="sm" variant={signal.focusScore >= 85 ? "default" : "outline"} onClick={() => setOpenDealId(deal.id)}>{primaryAction(signal)}</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {focusedDeals.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No active leads need attention.</p>}
              </div>
            </div>
          </main>

          <aside className="min-w-0 border-t border-elevated pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <RailSection title="Today’s schedule" action={{ label: "Open schedule", to: "/calendar" }}>
              {todayJobs.slice(0, 5).map((job) => (
                <Link key={job.id} to="/calendar" className="flex gap-3 py-2.5">
                  <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-bronze">{job.scheduled_start ? new Date(job.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD"}</span>
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{vehicleName(job.vehicles)}</span><span className="block truncate text-[11px] text-muted-foreground">{job.title} · {job.installer || job.bay || "Unassigned"}</span></span>
                </Link>
              ))}
              {todayJobs.length === 0 && <EmptyRail text="No appointments today." />}
            </RailSection>

            <RailSection title="Recent activity">
              {recentCustomerEvents.map((event) => {
                const deal = dealById.get(event.deal_id);
                return (
                  <button key={event.id} type="button" onClick={() => setOpenDealId(event.deal_id)} className="block w-full py-2.5 text-left">
                    <span className="block truncate text-xs font-semibold">{deal?.customers?.name ?? deal?.title ?? "Customer"}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{eventLabel(event)} · {sinceLabel(event.created_at)}</span>
                  </button>
                );
              })}
              {recentCustomerEvents.length === 0 && <EmptyRail text="No recent customer activity." />}
            </RailSection>

            <RailSection title="Tasks / follow-ups" action={{ label: "Open pipeline", to: "/sales" }}>
              {attentionDeals.slice(0, 5).map(({ deal, signal }) => (
                <button key={deal.id} type="button" onClick={() => setOpenDealId(deal.id)} className="flex w-full gap-2.5 py-2.5 text-left">
                  <Clock3 className={cn("mt-0.5 size-3.5 shrink-0", signal.focusScore >= 85 ? "text-critical" : "text-urgent")} />
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{deal.customers?.name ?? deal.title}</span><span className="block text-[11px] leading-4 text-muted-foreground">{signal.nextAction ?? "Follow up"}</span></span>
                </button>
              ))}
              {attentionDeals.length === 0 && <EmptyRail text="Follow-ups are clear." />}
            </RailSection>
          </aside>
        </div>
      )}

      <QuickAddDialog action={quickAction} onOpenChange={(open) => !open && setQuickAction(null)} customers={data?.customers ?? []} pending={quickMutation.isPending} onSubmit={(form) => quickMutation.mutate(form)} />
      <LeadWorkspace dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
}

function RailSection({ title, action, children }: { title: string; action?: { label: string; to: string }; children: React.ReactNode }) {
  return (
    <section className="border-b border-elevated py-5 first:pt-0 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <Link to={action.to as never} className="text-[11px] text-muted-foreground hover:text-bronze">{action.label}</Link>}
      </div>
      <div className="mt-2 divide-y divide-elevated">{children}</div>
    </section>
  );
}

function EmptyRail({ text }: { text: string }) {
  return <p className="py-4 text-xs text-muted-foreground">{text}</p>;
}

function QuickAddMenu({ onChoose }: { onChoose: (action: Exclude<QuickAction, null>) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button><Plus /> Quick add <ChevronDown /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => onChoose("lead")}><UserPlus /> New lead</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("job")}><Wrench /> New work order</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("appointment")}><CalendarPlus /> Schedule appointment</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("payment")}><CircleDollarSign /> Log payment</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("expense")}><Receipt /> Log expense</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickAddDialog({ action, onOpenChange, customers, pending, onSubmit }: { action: QuickAction; onOpenChange: (open: boolean) => void; customers: { id: string; name: string }[]; pending: boolean; onSubmit: (form: FormData) => void }) {
  const titles = { lead: "New lead", job: "New work order", appointment: "Schedule appointment", payment: "Log payment", expense: "Log expense" };
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{action ? titles[action] : "Quick add"}</DialogTitle></DialogHeader>
        {action && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}>
          {action !== "payment" && action !== "expense" && <div className="space-y-2"><Label htmlFor="quick-title">{action === "lead" ? "Opportunity" : "Work"}</Label><Input id="quick-title" name="title" placeholder={action === "lead" ? "Full front PPF — Porsche 911" : "Full vehicle tint"} required /></div>}
          {action !== "expense" && <div className="space-y-2"><Label>Customer</Label><Select name="customer_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>}
          {action === "lead" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-value">Potential value</Label><Input id="quick-value" name="value" type="number" min="0" step="0.01" /></div><div className="space-y-2"><Label htmlFor="quick-source">Source</Label><Input id="quick-source" name="source" placeholder="Walk-in" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="quick-owner">Salesperson</Label><Input id="quick-owner" name="owner_name" /></div></div>}
          {(action === "job" || action === "appointment") && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-date">Start</Label><Input id="quick-date" name="scheduled_start" type="datetime-local" required={action === "appointment"} /></div><div className="space-y-2"><Label htmlFor="quick-price">Value</Label><Input id="quick-price" name="price" type="number" min="0" step="0.01" /></div><div className="space-y-2"><Label htmlFor="quick-bay">Bay</Label><Input id="quick-bay" name="bay" placeholder="Bay 2" /></div><div className="space-y-2"><Label htmlFor="quick-installer">Installer</Label><Input id="quick-installer" name="installer" /></div></div>}
          {action === "payment" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-amount">Amount</Label><Input id="quick-amount" name="amount" type="number" min="0" step="0.01" required /></div><div className="space-y-2"><Label>Type</Label><Select name="kind" defaultValue="deposit"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="payment">Payment</SelectItem></SelectContent></Select></div></div>}
          {action === "expense" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expense-amount">Amount</Label><Input id="expense-amount" name="amount" type="number" min="0" step="0.01" required /></div><div className="space-y-2"><Label>Category</Label><Select name="category" defaultValue="materials"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((category) => <SelectItem key={category.key} value={category.key}>{category.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="expense-vendor">Paid to</Label><Input id="expense-vendor" name="vendor" /></div><div className="space-y-2"><Label htmlFor="expense-date">Date</Label><Input id="expense-date" name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div><div className="space-y-2"><Label>Status</Label><Select name="expense_status" defaultValue="paid"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="due">Bill due</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Repeats</Label><Select name="recurrence" defaultValue="one_off"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RECURRENCES.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="expense-note">What it was for</Label><Input id="expense-note" name="description" /></div></div>}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
