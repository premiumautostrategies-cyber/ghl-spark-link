import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, ExternalLink, MessageSquare, Phone, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/os-ui";
import { DealComms } from "@/components/deal-comms";
import { money } from "@/lib/format";
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

type TabKey = "activity" | "conversation" | "quote" | "notes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "conversation", label: "Conversation" },
  { key: "quote", label: "Quote" },
  { key: "notes", label: "Notes" },
];

export function LeadWorkspace({
  dealId,
  onClose,
}: {
  dealId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("activity");

  const { data: deal } = useQuery({
    queryKey: ["lead-workspace", dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "*, customers(id,name,phone,email), vehicles(year,make,model,color)",
        )
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["lead-events", dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("id,deal_id,actor,kind,detail,created_at")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadEvent[];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["lead-proposals", dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id,token,title,status,total,deposit_amount,sent_at,viewed_at,signed_at,paid_at")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStage = useMutation({
    mutationFn: async (stage: string) => {
      if (!deal) return;
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", deal.id);
      if (error) throw error;
      await supabase.from("lead_events").insert({
        organization_id: deal.organization_id,
        deal_id: deal.id,
        actor: "shop",
        kind: "stage_moved",
        detail: `Moved to ${stageLabel(stage)}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["lead-workspace", dealId] });
      qc.invalidateQueries({ queryKey: ["lead-events", dealId] });
      qc.invalidateQueries({ queryKey: ["pipeline-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = Boolean(dealId);
  const signal = deal ? leadSignal(deal, events) : null;
  const vehicle = deal?.vehicles
    ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model].filter(Boolean).join(" ")
    : null;
  const phone = deal?.customers?.phone ?? null;
  const proposal = proposals[0] ?? null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-elevated bg-surface p-0 sm:max-w-[560px]"
      >
        {!deal ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <header className="space-y-3 border-b border-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">
                    {deal.customers?.name ?? "No customer"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {vehicle ?? "No vehicle on file"}
                  </p>
                </div>
                {deal.stage !== "new_lead" && Number(deal.value) > 0 && (
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-bronze">
                    {money(deal.value)}
                  </span>
                )}
              </div>

              <p className="text-sm font-medium">{deal.title}</p>

              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="muted">{stageLabel(deal.stage)}</Tag>
                {signal && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-elevated px-2 py-0.5 text-[11px] font-medium",
                      TEMP_META[signal.temperature].text,
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        TEMP_META[signal.temperature].dot,
                      )}
                    />
                    {TEMP_META[signal.temperature].label}
                  </span>
                )}
                {signal?.lastCustomerAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Customer活 {sinceLabel(signal.lastCustomerAt)}
                  </span>
                )}
              </div>

              {signal?.focusReason && (
                <div className="rounded-lg border border-elevated bg-surface-2 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                  <p className="text-sm font-medium">{signal.focusReason}</p>
                  {signal.nextAction && (
                    <p className="mt-0.5 text-xs text-bronze">Next: {signal.nextAction}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild disabled={!phone}>
                  <a href={phone ? `sms:${phone}` : "#"}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Text
                  </a>
                </Button>
                <Button size="sm" variant="secondary" asChild disabled={!phone}>
                  <a href={phone ? `tel:${phone}` : "#"}>
                    <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                  </a>
                </Button>
                {proposal && (
                  <Button size="sm" variant="secondary" asChild>
                    <a href={`/p/proposal/${proposal.token}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Quote
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/schedule">
                    <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Schedule
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/sales/$dealId" params={{ dealId: deal.id }}>
                    Full deal
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStage.mutate(s.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      deal.stage === s.key
                        ? "border-bronze/60 bg-bronze/10 text-bronze"
                        : "border-elevated text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </header>

            <nav className="flex gap-1 border-b border-elevated px-4">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                    tab === t.key
                      ? "border-bronze text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 p-5">
              {tab === "activity" && (
                <ol className="space-y-2.5">
                  {events.length === 0 && (
                    <li className="text-sm text-muted-foreground">No activity logged yet.</li>
                  )}
                  {events.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {clockTime(e.created_at)}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          e.actor === "customer" ? "bg-bronze" : "bg-muted-foreground/50",
                        )}
                      />
                      <span className={e.actor === "customer" ? "" : "text-muted-foreground"}>
                        {eventLabel(e)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {tab === "conversation" && (
                <DealComms
                  dealId={deal.id}
                  customerId={deal.customer_id}
                  customerName={deal.customers?.name ?? null}
                />
              )}

              {tab === "quote" && (
                <div className="space-y-3">
                  {proposals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No quote yet — build one from the full deal view.
                    </p>
                  ) : (
                    proposals.map((p) => (
                      <div key={p.id} className="rounded-lg border border-elevated bg-surface-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{p.title}</p>
                          <span className="text-sm font-semibold tabular-nums text-bronze">
                            {money(p.total)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                          <Tag tone="muted">{p.status}</Tag>
                          {p.sent_at && <span>Sent {sinceLabel(p.sent_at)}</span>}
                          {p.viewed_at && <span>· Viewed {sinceLabel(p.viewed_at)}</span>}
                          {p.signed_at && <span>· Signed</span>}
                          {p.paid_at && <span>· Deposit paid</span>}
                        </div>
                        <a
                          href={`/p/proposal/${p.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-bronze underline"
                        >
                          Customer link <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "notes" && (
                <div className="space-y-3 text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {deal.notes || "No notes yet."}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" /> Lead created {sinceLabel(deal.created_at)}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
