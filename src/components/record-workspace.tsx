import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Car,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/os-ui";
import { label, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  clockTime,
  eventLabel,
  leadSignal,
  PIPELINE_STAGES,
  sinceLabel,
  stageLabel,
  TEMP_META,
  type LeadEvent,
} from "@/lib/pipeline";

type TabKey = "overview" | "activity" | "vehicles" | "quotes" | "jobs" | "payments" | "documents";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Activity" },
  { key: "vehicles", label: "Vehicles" },
  { key: "quotes", label: "Quotes" },
  { key: "jobs", label: "Jobs" },
  { key: "payments", label: "Payments" },
  { key: "documents", label: "Documents" },
];

function vehicleName(vehicle: { year?: number | null; make?: string | null; model?: string | null; color?: string | null } | null | undefined) {
  return vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" ") || "Vehicle" : "No vehicle on file";
}

export function RecordWorkspace({
  customerId,
  dealId,
  onClose,
  onOpenDeal,
  onAddVehicle,
}: {
  customerId?: string | null;
  dealId?: string | null;
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
  onAddVehicle?: (customerId: string) => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("overview");
  const enabled = Boolean(customerId || dealId);

  const { data: selectedDeal } = useQuery({
    queryKey: ["record-workspace-deal", dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      if (!dealId) return null;
      const { data, error } = await supabase
        .from("deals")
        .select("*, vehicles(id,year,make,model,color,plate,vin)")
        .eq("id", dealId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const resolvedCustomerId = customerId ?? selectedDeal?.customer_id ?? null;

  const { data: customer } = useQuery({
    queryKey: ["record-workspace-customer", resolvedCustomerId],
    enabled: Boolean(resolvedCustomerId),
    queryFn: async () => {
      if (!resolvedCustomerId) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*, vehicles(id,year,make,model,color,plate,vin)")
        .eq("id", resolvedCustomerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bundle } = useQuery({
    queryKey: ["record-workspace-bundle", resolvedCustomerId],
    enabled: Boolean(resolvedCustomerId),
    queryFn: async () => {
      if (!resolvedCustomerId) return { jobs: [], deals: [], proposals: [], payments: [], documents: [] };
      const [jobs, deals, proposals, payments, documents] = await Promise.all([
        supabase.from("jobs").select("id,title,status,price,scheduled_start,service_type,vehicle_id,installer,is_mobile,qc_status").eq("customer_id", resolvedCustomerId).order("scheduled_start", { ascending: false }),
        supabase.from("deals").select("id,title,stage,value,vehicle_id,last_activity_at,created_at,notes").eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }),
        supabase.from("proposals").select("id,deal_id,token,title,status,total,deposit_amount,sent_at,viewed_at,signed_at,paid_at,customer_id").eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }),
        supabase.from("payments").select("id,amount,kind,status,method,paid_at,created_at,job_id").eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }),
        supabase.from("documents").select("id,name,doc_type,status,signed_at,updated_at,vehicle_id").eq("customer_id", resolvedCustomerId).order("updated_at", { ascending: false }),
      ]);
      const firstError = [jobs.error, deals.error, proposals.error, payments.error, documents.error].find(Boolean);
      if (firstError) throw firstError;
      return { jobs: jobs.data ?? [], deals: deals.data ?? [], proposals: proposals.data ?? [], payments: payments.data ?? [], documents: documents.data ?? [] };
    },
  });

  const dealIds = (bundle?.deals ?? []).map((deal) => deal.id);
  const { data: events = [] } = useQuery({
    queryKey: ["record-workspace-events", resolvedCustomerId, dealIds.join(",")],
    enabled: dealIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("id,deal_id,actor,kind,detail,created_at")
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadEvent[];
    },
  });

  const deals = bundle?.deals ?? [];
  const jobs = bundle?.jobs ?? [];
  const payments = bundle?.payments ?? [];
  const proposals = bundle?.proposals ?? [];
  const documents = bundle?.documents ?? [];
  const vehicles = customer?.vehicles ?? [];
  const primaryDeal = selectedDeal ?? deals.find((deal) => !["won", "lost"].includes(deal.stage ?? "")) ?? deals[0] ?? null;
  const primaryVehicle = selectedDeal?.vehicles ?? vehicles.find((vehicle) => vehicle.id === primaryDeal?.vehicle_id) ?? vehicles[0] ?? null;
  const primaryEvents = primaryDeal ? events.filter((event) => event.deal_id === primaryDeal.id) : [];
  const signal = primaryDeal ? leadSignal(primaryDeal, primaryEvents) : null;
  const primaryProposal = proposals.find((proposal) => proposal.deal_id === primaryDeal?.id) ?? proposals[0] ?? null;
  const nextJob = [...jobs].filter((job) => job.scheduled_start && new Date(job.scheduled_start).getTime() >= Date.now()).sort((a, b) => new Date(a.scheduled_start ?? 0).getTime() - new Date(b.scheduled_start ?? 0).getTime())[0] ?? null;
  const paid = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const outstanding = payments.filter((payment) => payment.status !== "paid").reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const phone = customer?.phone?.trim() || null;

  const setStage = useMutation({
    mutationFn: async (stage: string) => {
      if (!primaryDeal) return;
      const { error } = await supabase.from("deals").update({ stage, last_activity_at: new Date().toISOString() }).eq("id", primaryDeal.id);
      if (error) throw error;
      await supabase.from("lead_events").insert({ organization_id: customer.organization_id, deal_id: primaryDeal.id, actor: "shop", kind: "stage_moved", detail: `Moved to ${stageLabel(stage)}` });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["record-workspace-deal", dealId] });
      qc.invalidateQueries({ queryKey: ["record-workspace-bundle", resolvedCustomerId] });
      qc.invalidateQueries({ queryKey: ["record-workspace-events", resolvedCustomerId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["pipeline-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const totals = useMemo(() => ({ paid, outstanding }), [paid, outstanding]);

  return (
    <Sheet open={enabled} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden border-elevated bg-surface p-0 sm:max-w-[760px]">
        {!customer ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <header className="space-y-4 border-b border-elevated px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">{customer.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[phone, customer.email, customer.created_at ? `Customer since ${shortDate(customer.created_at)}` : null].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" asChild disabled={!phone}><a href={phone ? `sms:${phone}` : "#"}><MessageSquare className="mr-1.5 size-3.5" />Text</a></Button>
                  <Button size="sm" variant="secondary" asChild disabled={!phone}><a href={phone ? `tel:${phone}` : "#"}><Phone className="mr-1.5 size-3.5" />Call</a></Button>
                </div>
              </div>

              {primaryDeal && (
                <div className="border-l-2 border-bronze pl-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{vehicleName(primaryVehicle)}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{primaryDeal.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-bronze">{money(primaryDeal.value ?? 0)}</p>
                      <Tag tone="muted">{stageLabel(primaryDeal.stage ?? "")}</Tag>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {primaryProposal && <Button size="sm" variant="secondary" asChild><a href={`/p/proposal/${primaryProposal.token}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-3.5" />Quote</a></Button>}
                <Button size="sm" variant="secondary" asChild><Link to="/calendar"><CalendarClock className="mr-1.5 size-3.5" />Appointment</Link></Button>
                {customer.portal_token && <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/p/portal/${customer.portal_token}`); toast.success("Customer hub link copied"); }}><LinkIcon className="mr-1.5 size-3.5" />Hub link</Button>}
                {onAddVehicle && <Button size="sm" variant="secondary" onClick={() => onAddVehicle(customer.id)}><Car className="mr-1.5 size-3.5" />Add vehicle</Button>}
                {primaryDeal && <Button size="sm" variant="ghost" asChild><Link to="/sales/$dealId" params={{ dealId: primaryDeal.id }}>Open full deal</Link></Button>}
              </div>

              {primaryDeal && (
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((stage) => (
                    <button key={stage.key} type="button" onClick={() => setStage.mutate(stage.key)} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", primaryDeal.stage === stage.key ? "border-bronze/60 bg-bronze/10 text-bronze" : "border-elevated text-muted-foreground hover:text-foreground")}>{stage.label}</button>
                  ))}
                </div>
              )}
            </header>

            <nav className="no-scrollbar flex shrink-0 overflow-x-auto border-b border-elevated px-4">
              {TABS.map((item) => (
                <button key={item.key} type="button" onClick={() => setTab(item.key)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium", tab === item.key ? "border-bronze text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {tab === "overview" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Summary title="Current opportunity" primary={primaryDeal?.title ?? "No open opportunity"} secondary={primaryDeal ? `${stageLabel(primaryDeal.stage ?? "")} · ${money(primaryDeal.value ?? 0)}` : ""} />
                  <Summary title="Next appointment" primary={nextJob ? shortDate(nextJob.scheduled_start) : "Nothing scheduled"} secondary={nextJob ? `${nextJob.title}${nextJob.installer ? ` · ${nextJob.installer}` : ""}` : ""} />
                  <Summary title="Vehicle" primary={vehicleName(primaryVehicle)} secondary={primaryVehicle?.plate ? `Plate ${primaryVehicle.plate}` : ""} />
                  <Summary title="Quote & payment" primary={primaryProposal ? `${label(primaryProposal.status ?? "")} · ${money(primaryProposal.total ?? 0)}` : "No quote yet"} secondary={`${money(totals.paid)} collected · ${money(totals.outstanding)} outstanding`} />
                  <div className="sm:col-span-2 border-t border-elevated pt-4">
                    <p className="micro-label mb-3">Recent activity</p>
                    <Timeline events={events.slice(0, 6)} />
                  </div>
                </div>
              )}

              {tab === "activity" && <Timeline events={events} />}

              {tab === "vehicles" && <RecordList empty="No vehicles on file.">{vehicles.map((vehicle) => <div key={vehicle.id} className="flex items-center gap-3 px-4 py-3"><Car className="size-4 shrink-0 text-bronze" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{vehicleName(vehicle)}</p><p className="text-xs text-muted-foreground">{[vehicle.plate && `Plate ${vehicle.plate}`, vehicle.vin && `VIN ${vehicle.vin}`].filter(Boolean).join(" · ") || "No plate or VIN"}</p></div></div>)}</RecordList>}

              {tab === "quotes" && <RecordList empty="No quotes or opportunities yet.">{deals.map((deal) => <button key={deal.id} type="button" onClick={() => onOpenDeal?.(deal.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{deal.title}</p><p className="text-xs text-muted-foreground">{stageLabel(deal.stage ?? "")}{deal.last_activity_at ? ` · Activity ${sinceLabel(deal.last_activity_at)}` : ""}</p></div><span className="text-sm font-semibold tabular-nums text-bronze">{money(deal.value ?? 0)}</span></button>)}{proposals.map((proposal) => <div key={proposal.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{proposal.title}</p><p className="text-xs text-muted-foreground">Proposal · {label(proposal.status ?? "")}</p></div><span className="text-sm font-semibold tabular-nums">{money(proposal.total ?? 0)}</span></div>)}</RecordList>}

              {tab === "jobs" && <RecordList empty="No jobs yet.">{jobs.map((job) => <div key={job.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{job.title}</p><p className="text-xs text-muted-foreground">{label(job.status ?? "")} · {shortDate(job.scheduled_start)}{job.installer ? ` · ${job.installer}` : ""}</p></div><span className="text-sm font-semibold tabular-nums">{money(job.price ?? 0)}</span></div>)}</RecordList>}

              {tab === "payments" && <RecordList empty="No payments recorded.">{payments.map((payment) => <div key={payment.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{label(payment.kind ?? "Payment")}</p><p className="text-xs text-muted-foreground">{label(payment.status ?? "")} · {payment.method ?? "Method not recorded"} · {shortDate(payment.paid_at ?? payment.created_at)}</p></div><span className="text-sm font-semibold tabular-nums">{money(payment.amount ?? 0)}</span></div>)}</RecordList>}

              {tab === "documents" && <RecordList empty="No documents yet.">{documents.map((document) => <div key={document.id} className="flex items-center gap-3 px-4 py-3"><FileText className="size-4 shrink-0 text-bronze" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.name}</p><p className="text-xs text-muted-foreground">{label(document.doc_type ?? "")} · {label(document.status ?? "")} · {shortDate(document.updated_at)}</p></div></div>)}</RecordList>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Summary({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return <section className="rounded-xl border border-elevated bg-surface-2 p-4"><p className="micro-label">{title}</p><p className="mt-2 text-sm font-semibold">{primary}</p>{secondary && <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>}</section>;
}

function Timeline({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No activity logged yet.</p>;
  return <ol>{events.map((event, index) => <li key={event.id} className="relative grid grid-cols-[92px_12px_1fr] gap-3 pb-5 text-sm last:pb-0"><span className="text-xs tabular-nums text-muted-foreground">{clockTime(event.created_at)}</span><span className={cn("mt-1.5 size-2 rounded-full", event.actor === "customer" ? "bg-bronze" : "bg-muted-foreground/50")} />{index < events.length - 1 && <span className="absolute bottom-0 left-[102px] top-3 w-px bg-elevated" />}<span className={event.actor === "customer" ? "font-medium" : "text-muted-foreground"}>{eventLabel(event)}</span></li>)}</ol>;
}

function RecordList({ children, empty }: { children: React.ReactNode; empty: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasChildren) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <div className="divide-y divide-elevated overflow-hidden rounded-xl border border-elevated bg-surface">{children}</div>;
}