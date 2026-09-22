import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowRight, MessageSquare, Phone, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterPills, Tag } from "@/components/os-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import {
  CLOSED_STAGES,
  leadSignal,
  PIPELINE_STAGES,
  sinceLabel,
  stageLabel,
  TEMP_META,
  type LeadEvent,
  type LeadSignal,
} from "@/lib/pipeline";

import { useSalesConfig } from "@/lib/sales-mode";
import { DynamicActivity } from "@/components/dynamic-activity";

type Deal = {
  id: string;
  title: string;
  stage: string;
  value: number | string;
  probability: number;
  source: string | null;
  owner_name: string | null;
  expected_close: string | null;
  last_activity_at: string | null;
  speed_to_lead_at: string | null;
  notes: string | null;
  created_at: string;
  service_tags: string[] | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
};

type FilterKey = "all" | "new" | "live" | "followup" | "cooling";

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "new" as const, label: "New leads" },
  { value: "live" as const, label: "Live now" },
  { value: "followup" as const, label: "Follow-up due" },
  { value: "cooling" as const, label: "Cooling off" },
];

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({
    meta: [
      { title: "Sales Pipeline — Systemize" },
      {
        name: "description",
        content: "A dynamic restyling pipeline that shows who is engaging right now.",
      },
      { property: "og:title", content: "Sales Pipeline — Systemize" },
      {
        property: "og:description",
        content: "A dynamic restyling pipeline that shows who is engaging right now.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesRoute,
});

/** The selected Sales Workspace decides what the Sales nav item shows. */
function SalesRoute() {
  const { config, ready } = useSalesConfig();
  if (!ready) return null;
  if (config.workspace === "activity") return <DynamicActivity config={config} />;
  return <SalesPage />;
}

function SalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { orgId, locId } = useOrg();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name, phone, email), vehicles(year, make, model)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Deal[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["pipeline-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("id,deal_id,actor,kind,detail,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as LeadEvent[];
    },
    refetchInterval: 60_000,
  });


  const signals = useMemo(() => {
    const byDeal = new Map<string, LeadEvent[]>();
    for (const e of events) {
      const list = byDeal.get(e.deal_id);
      if (list) list.push(e);
      else byDeal.set(e.deal_id, [e]);
    }
    const map = new Map<string, LeadSignal>();
    for (const d of deals) map.set(d.id, leadSignal(d, byDeal.get(d.id) ?? []));
    return map;
  }, [deals, events]);


  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      const deal = deals.find((d) => d.id === id);
      await supabase.from("lead_events").insert({
        organization_id: orgId,
        deal_id: id,
        actor: "shop",
        kind: "stage_moved",
        detail: `Moved to ${stageLabel(stage)}${deal ? "" : ""}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["pipeline-events"] });
    },
  });

  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));

  const focusList = useMemo(
    () =>
      activeDeals
        .filter((d) => !snoozed.includes(d.id))
        .map((d) => ({ deal: d, signal: signals.get(d.id)! }))
        .filter((x) => x.signal && x.signal.focusScore >= 50)
        .sort((a, b) => b.signal.focusScore - a.signal.focusScore),
    [activeDeals, signals, snoozed],
  );

  const counts = useMemo(() => {
    const list = activeDeals.map((d) => signals.get(d.id)).filter(Boolean) as LeadSignal[];
    return {
      untouched: list.filter((s) => s.temperature === "new").length,
      live: list.filter((s) => s.live).length,
      followup: list.filter((s) => s.awaitingReply || s.focusScore >= 70).length,
      cooling: list.filter((s) => s.temperature === "cool" || s.temperature === "dormant").length,
    };
  }, [activeDeals, signals]);

  const visible = useMemo(() => {
    let list = deals;
    if (filter === "new") list = list.filter((d) => signals.get(d.id)?.temperature === "new");
    if (filter === "live") list = list.filter((d) => signals.get(d.id)?.live);
    if (filter === "followup")
      list = list.filter((d) => {
        const s = signals.get(d.id);
        return s ? s.awaitingReply || s.focusScore >= 70 : false;
      });
    if (filter === "cooling")
      list = list.filter((d) => {
        const t = signals.get(d.id)?.temperature;
        return t === "cool" || t === "dormant";
      });
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const hay = [
          d.title,
          d.customers?.name,
          d.source,
          d.notes,
          d.vehicles
            ? `${d.vehicles.year ?? ""} ${d.vehicles.make ?? ""} ${d.vehicles.model ?? ""}`
            : "",
          ...(d.service_tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [deals, filter, search, signals]);

  const columns = showClosed ? [...PIPELINE_STAGES, ...CLOSED_STAGES] : PIPELINE_STAGES;
  const focusTotal = counts.untouched + counts.live + counts.followup;
  const openDeal = (dealId: string) => navigate({ to: "/sales/$dealId", params: { dealId } });

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Where every opportunity is — and who is engaging right now."
        action={
          <div className="flex items-center gap-2">
            <Button variant={focusMode ? "default" : "secondary"} onClick={() => setFocusMode((v) => !v)}>
              <Target className="mr-1.5 h-4 w-4" />
              Focus {focusTotal}
            </Button>
            <Button asChild>
              <Link to="/sales/new">New lead</Link>
            </Button>

          </div>
        }
      />

      {focusMode && (
        <FocusPanel
          list={focusList}
          counts={counts}
          onOpen={openDeal}
          onSnooze={(id) => setSnoozed((s) => [...s, id])}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills options={FILTERS} value={filter} onChange={(v) => setFilter(v as FilterKey)} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, vehicle, service…"
              className="h-8 w-60 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="rounded-full border border-elevated px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {showClosed ? "Hide closed" : "Show closed"}
          </button>
        </div>
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          body="Every call, DM and walk-in becomes an opportunity you can work."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setDragging(String(e.active.id))}
          onDragEnd={(e) => {
            setDragging(null);
            const over = e.over?.id ? String(e.over.id) : null;
            const id = String(e.active.id);
            const deal = deals.find((d) => d.id === id);
            if (over && deal && deal.stage !== over) moveStage.mutate({ id, stage: over });
          }}
        >
          <div className="no-scrollbar -mx-1 flex w-full max-w-full items-start gap-3 overflow-x-auto px-1 pb-3">
            {columns.map((stage) => {
              const list = visible
                .filter((d) => d.stage === stage.key)
                .sort(
                  (a, b) =>
                    (signals.get(b.id)?.focusScore ?? 0) - (signals.get(a.id)?.focusScore ?? 0),
                );
              const total = list.reduce((t, d) => t + Number(d.value), 0);
              return (
                <StageColumn key={stage.key} stage={stage.key} count={list.length} total={total}>
                  {list.map((d) => (
                    <DealCard
                      key={d.id}
                      deal={d}
                      signal={signals.get(d.id)}
                      dragging={dragging === d.id}
                      onOpen={() => openDeal(d.id)}
                      onTag={(t) => setSearch(t)}
                    />
                  ))}
                </StageColumn>
              );
            })}
          </div>
          <DragOverlay>
            {dragging ? (
              <div className="w-[200px] rotate-2 rounded-lg border border-bronze/50 bg-surface-2 p-2 shadow-lux">
                <p className="text-xs font-semibold leading-tight">
                  {deals.find((d) => d.id === dragging)?.title}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function FocusPanel({
  list,
  counts,
  onOpen,
  onSnooze,
}: {
  list: { deal: Deal; signal: LeadSignal }[];
  counts: { untouched: number; live: number; followup: number; cooling: number };
  onOpen: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-bronze/30 bg-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-elevated px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-bronze">Focus</p>
        <FocusCount n={counts.untouched} text="new leads awaiting response" />
        <FocusCount n={counts.live} text="customers active right now" />
        <FocusCount n={counts.followup} text="follow-ups due" />
        <FocusCount n={counts.cooling} text="cooling off" />
      </div>
      <div className="divide-y divide-elevated">
        {list.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nothing needs you right now. Every lead has been answered.
          </p>
        )}
        {list.slice(0, 8).map(({ deal, signal }) => {
          const vehicle = deal.vehicles
            ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model]
                .filter(Boolean)
                .join(" ")
            : null;
          const phone = deal.customers?.phone ?? null;
          return (
            <div key={deal.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", TEMP_META[signal.temperature].dot)} />
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {deal.customers?.name ?? "No customer"}
                  {vehicle && (
                    <span className="font-normal text-muted-foreground"> · {vehicle}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deal.title}
                  {Number(deal.value) > 0 && deal.stage !== "new_lead"
                    ? ` · ${money(deal.value)}`
                    : ""}
                </p>
              </div>
              <div className="min-w-[180px]">
                <p className={cn("text-xs font-medium", TEMP_META[signal.temperature].text)}>
                  {signal.focusReason}
                </p>
                {signal.nextAction && (
                  <p className="text-xs text-muted-foreground">Next: {signal.nextAction}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {phone && (
                  <>
                    <IconLink href={`sms:${phone}`} label="Text">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </IconLink>
                    <IconLink href={`tel:${phone}`} label="Call">
                      <Phone className="h-3.5 w-3.5" />
                    </IconLink>
                  </>
                )}
                <Button size="sm" variant="secondary" onClick={() => onOpen(deal.id)}>
                  Work it <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={() => onSnooze(deal.id)}
                  className="text-[11px] text-muted-foreground underline"
                >
                  Snooze
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FocusCount({ n, text }: { n: number; text: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      <span className="font-semibold tabular-nums text-foreground">{n}</span> {text}
    </span>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-elevated text-muted-foreground transition-colors hover:border-bronze/60 hover:text-bronze"
    >
      {children}
    </a>
  );
}

const STAGE_TONE: Record<string, "bronze" | "comms" | "urgent" | "revenue" | "critical" | "muted" | "rig"> = {
  new_lead: "revenue",
  contacted: "rig",
  quoted: "bronze",
  negotiating: "urgent",
  scheduled: "comms",
  won: "revenue",
  lost: "critical",
};

function StageColumn({
  stage,
  count,
  total,
  children,
}: {
  stage: string;
  count: number;
  total: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[268px] shrink-0 flex-col rounded-xl border bg-surface transition-colors",
        isOver ? "border-bronze/60 bg-surface-2" : "border-elevated",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-elevated px-2.5 py-1.5">
        <Tag tone={STAGE_TONE[stage] ?? "muted"}>{stageLabel(stage)}</Tag>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {count}
          {total > 0 ? ` · ${money(total)}` : ""}
        </span>
      </div>
      <div className="flex min-h-[72px] flex-col gap-1.5 p-2">
        {count === 0 ? (
          <p className="py-5 text-center text-[11px] text-muted-foreground">Drop a deal here</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  signal,
  dragging,
  onOpen,
  onTag,
}: {
  deal: Deal;
  signal: LeadSignal | undefined;
  dragging: boolean;
  onOpen: () => void;
  onTag: (tag: string) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: deal.id });
  const temp = signal?.temperature ?? "dormant";
  const meta = TEMP_META[temp];
  const vehicle = deal.vehicles
    ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model].filter(Boolean).join(" ")
    : null;
  const phone = deal.customers?.phone ?? null;
  const showValue = deal.stage !== "new_lead" && Number(deal.value) > 0;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "relative cursor-grab touch-none overflow-hidden rounded-xl border border-elevated pl-3 pr-3 py-2.5 transition-colors hover:border-hairline active:cursor-grabbing",
        meta.tint || "bg-surface-2",
        meta.tint !== "bg-transparent" ? meta.tint : "bg-surface-2",
        signal?.live && "border-critical/40 shadow-[0_0_0_1px_var(--critical)]",
        dragging && "opacity-40",
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", meta.dot, signal?.live && "animate-pulse")}
      />

      {signal?.live && (
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-critical">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical" />
          Live · now
        </p>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{deal.title}</p>
        {showValue && (
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-bronze">
            {money(deal.value)}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {deal.customers?.name ?? "No customer"}
        {deal.source ? ` · ${deal.source}` : ""}
      </p>

      {vehicle && <p className="mt-0.5 text-xs font-medium text-foreground/90">{vehicle}</p>}

      {(deal.service_tags ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(deal.service_tags ?? []).map((t) => (
            <button
              key={t}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onTag(t);
              }}
              className="rounded-full border border-elevated bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-bronze/60 hover:text-bronze"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className={cn("truncate text-[11px]", meta.text)}>
          {temp === "new"
            ? "Untouched — no first contact"
            : `${signal?.lastCustomerLabel ?? "No customer activity"} · ${sinceLabel(signal?.lastCustomerAt)}`}
        </p>
        {phone && (
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`tel:${phone}`}
              aria-label={`Call ${deal.customers?.name ?? "customer"}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="grid h-7 w-7 place-items-center rounded-full border border-elevated text-muted-foreground transition-colors hover:border-bronze/60 hover:text-bronze"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a
              href={`sms:${phone}`}
              aria-label={`Text ${deal.customers?.name ?? "customer"}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="grid h-7 w-7 place-items-center rounded-full border border-elevated text-muted-foreground transition-colors hover:border-bronze/60 hover:text-bronze"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {signal && signal.quoteOpens >= 2 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Quote opened {signal.quoteOpens}×
        </p>
      )}
    </div>
  );
}
