import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterPills, Kpi, Tag } from "@/components/os-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STAGES, dayDate, label, money } from "@/lib/format";
import { toast } from "sonner";

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
  notes: string | null;
  created_at: string;
  customers: { name: string } | null;
};

type FilterKey = "all" | "untouched" | "high" | "closing";

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "untouched" as const, label: "Untouched 3d+" },
  { value: "high" as const, label: "High value" },
  { value: "closing" as const, label: "Closing" },
];

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({
    meta: [
      { title: "Sales Pipeline — Systemize" },
      { name: "description", content: "Every restyling opportunity from first call to closed won." },
      { property: "og:title", content: "Sales Pipeline — Systemize" },
      {
        property: "og:description",
        content: "Every restyling opportunity from first call to closed won.",
      },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addDeal = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const customerId = String(form.get("customer_id") || "");
      const close = String(form.get("expected_close") || "");
      const { error } = await supabase.from("deals").insert({
        title: String(form.get("title")),
        stage: String(form.get("stage")),
        value: Number(form.get("value") || 0),
        probability: Number(form.get("probability") || 25),
        source: String(form.get("source") || "") || null,
        owner_name: String(form.get("owner_name") || "") || null,
        notes: String(form.get("notes") || "") || null,
        expected_close: close || null,
        customer_id: customerId || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opportunity added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const openValue = openDeals.reduce((t, d) => t + Number(d.value), 0);
  const weighted = openDeals.reduce((t, d) => t + (Number(d.value) * d.probability) / 100, 0);
  const won = deals.filter((d) => d.stage === "won");
  const closeRate = deals.length
    ? Math.round((won.length / deals.filter((d) => ["won", "lost"].includes(d.stage)).length || 1) * 100)
    : 0;

  const visible = useMemo(() => {
    if (filter === "untouched")
      return deals.filter(
        (d) =>
          !d.last_activity_at ||
          Date.now() - new Date(d.last_activity_at).getTime() > 3 * 86400000,
      );
    if (filter === "high") return deals.filter((d) => Number(d.value) >= 2500);
    if (filter === "closing") return deals.filter((d) => d.probability >= 60);
    return deals;
  }, [deals, filter]);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Leads, quotes and negotiations — the money before it hits a bay."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New opportunity</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New opportunity</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDeal.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="Full body PPF — GT3" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select name="customer_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select name="stage" defaultValue="new_lead">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input id="value" name="value" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability %</Label>
                    <Input id="probability" name="probability" type="number" defaultValue="25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input id="source" name="source" placeholder="Instagram" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_close">Expected close</Label>
                    <Input id="expected_close" name="expected_close" type="date" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="owner_name">Owner</Label>
                    <Input id="owner_name" name="owner_name" placeholder="Advisor name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full" disabled={addDeal.isPending}>
                  Save opportunity
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open pipeline" value={money(openValue)} hint={`${openDeals.length} live opportunities`} />
        <Kpi label="Weighted forecast" value={money(weighted)} tone="rig" hint="Value × probability" />
        <Kpi
          label="Won"
          value={money(won.reduce((t, d) => t + Number(d.value), 0))}
          tone="revenue"
        />
        <Kpi label="Close rate" value={`${closeRate}%`} tone="urgent" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills
          options={FILTERS}
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
        />
        <p className="text-xs text-muted-foreground">Drag a card between stages to move the deal.</p>
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          body="Every call, DM and walk-in becomes an opportunity you can forecast."
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
          <div className="no-scrollbar -mx-1 flex w-full max-w-full gap-4 overflow-x-auto px-1 pb-4">
            {DEAL_STAGES.map((stage) => {
              const list = visible.filter((d) => d.stage === stage);
              const total = list.reduce((t, d) => t + Number(d.value), 0);
              return (
                <StageColumn key={stage} stage={stage} count={list.length} total={total}>
                  {list.map((d) => (
                    <DealCard
                      key={d.id}
                      deal={d}
                      dragging={dragging === d.id}
                      onOpen={() => navigate({ to: "/sales/$dealId", params: { dealId: d.id } })}
                    />
                  ))}
                </StageColumn>
              );
            })}
          </div>
          <DragOverlay>
            {dragging ? (
              <div className="w-[248px] rotate-2 rounded-xl border border-bronze/50 bg-surface-2 p-3 shadow-lux">
                <p className="text-sm font-semibold">
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

const STAGE_TONE: Record<string, "bronze" | "comms" | "urgent" | "revenue" | "critical" | "muted"> = {
  new_lead: "comms",
  contacted: "rig" as never,
  quoted: "bronze",
  negotiating: "urgent",
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
        "flex w-[280px] shrink-0 flex-col rounded-2xl border bg-surface transition-colors",
        isOver ? "border-bronze/60 bg-surface-2" : "border-elevated",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-elevated px-4 py-3">
        <Tag tone={STAGE_TONE[stage] ?? "muted"}>{label(stage)}</Tag>
        <span className="text-xs tabular-nums text-muted-foreground">
          {count} · {money(total)}
        </span>
      </div>
      <div className="flex min-h-[140px] flex-col gap-2 p-3">
        {count === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Drop a deal here</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  dragging,
  onOpen,
}: {
  deal: Deal;
  dragging: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: deal.id });
  const age = deal.last_activity_at
    ? Math.round((Date.now() - new Date(deal.last_activity_at).getTime()) / 86400000)
    : null;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "cursor-grab touch-none rounded-xl border border-elevated bg-surface-2 p-3 transition-colors hover:border-hairline active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight">{deal.title}</p>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-bronze">
          {money(deal.value)}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {deal.customers?.name ?? "No customer"} · {deal.source || "Direct"}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag tone="muted">{deal.probability}%</Tag>
        {deal.expected_close && <Tag tone="muted">Close {dayDate(deal.expected_close)}</Tag>}
        {age !== null && age > 3 && <Tag tone="critical">{age}d untouched</Tag>}
        {deal.owner_name && <Tag tone="bronze">{deal.owner_name}</Tag>}
      </div>
    </div>
  );
}

