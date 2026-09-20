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
import { MessageSquare, Phone, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterPills, Tag } from "@/components/os-ui";
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
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/shop";

const SPEED_TO_LEAD_BODY = DEFAULT_MESSAGE_TEMPLATES[0].body;

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
  service_tags: string[] | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
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
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name, phone, email), vehicles(year, make, model)")
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
      let customerId = String(form.get("customer_id") || "") || null;
      const newName = String(form.get("new_customer_name") || "").trim();
      const newPhone = String(form.get("new_customer_phone") || "").trim();

      if (!customerId && newName) {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: newName,
            phone: newPhone || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = cust.id;
      }
      if (!customerId) throw new Error("Pick a customer or add a new one");

      const year = String(form.get("vehicle_year") || "").trim();
      const make = String(form.get("vehicle_make") || "").trim();
      const model = String(form.get("vehicle_model") || "").trim();
      let vehicleId: string | null = null;
      if (make || model || year) {
        const { data: veh, error: vehErr } = await supabase
          .from("vehicles")
          .insert({
            customer_id: customerId,
            owner_id: customerId,
            year: year ? Number(year) : null,
            make: make || null,
            model: model || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (vehErr) throw vehErr;
        vehicleId = veh.id;
      }

      const wants = String(form.get("title") || "").trim();
      const { data: created, error } = await supabase.from("deals").insert({
        title: wants || "New enquiry",
        stage: "new_lead",
        value: 0,
        probability: 25,
        notes: String(form.get("notes") || "") || null,
        customer_id: customerId,
        vehicle_id: vehicleId,
        organization_id: orgId,
        location_id: locId,
      }).select("id,stage,customer_id").single();
      if (error) throw error;

      // Speed to lead: fire the first text automatically on brand-new leads.
      if (created?.stage === "new_lead") {
        const now = new Date().toISOString();
        await supabase.from("messages").insert({
          organization_id: orgId,
          location_id: locId,
          deal_id: created.id,
          customer_id: created.customer_id,
          channel: "sms",
          direction: "out",
          is_automated: true,
          body: SPEED_TO_LEAD_BODY,
        });
        await supabase.from("deals").update({ speed_to_lead_at: now }).eq("id", created.id);
      }
    },
    onSuccess: () => {
      toast.success("Lead added — first text sent");
      setOpen(false);
      setAddingCustomer(false);
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-lite"] });
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
    let list = deals;
    if (filter === "untouched")
      list = list.filter(
        (d) =>
          !d.last_activity_at ||
          Date.now() - new Date(d.last_activity_at).getTime() > 3 * 86400000,
      );
    if (filter === "high") list = list.filter((d) => Number(d.value) >= 2500);
    if (filter === "closing") list = list.filter((d) => d.probability >= 60);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const hay = [
          d.title,
          d.customers?.name,
          d.source,
          d.notes,
          d.vehicles ? `${d.vehicles.year ?? ""} ${d.vehicles.make ?? ""} ${d.vehicles.model ?? ""}` : "",
          ...(d.service_tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [deals, filter, search]);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Leads, quotes and negotiations — the money before it hits a bay."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setAddingCustomer(false);
                setCustomerId("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>New lead</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New lead</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDeal.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label>Customer</Label>
                  {addingCustomer ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="new_customer_name" placeholder="Name" required autoFocus />
                      <Input name="new_customer_phone" placeholder="Phone" />
                      <button
                        type="button"
                        className="justify-self-start text-xs text-muted-foreground underline sm:col-span-2"
                        onClick={() => setAddingCustomer(false)}
                      >
                        Pick an existing customer instead
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input type="hidden" name="customer_id" value={customerId} />
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => {
                          setAddingCustomer(true);
                          setCustomerId("");
                        }}
                      >
                        + New customer
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Vehicle (optional)</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name="vehicle_year" type="number" placeholder="Year" />
                    <Input name="vehicle_make" placeholder="Make" />
                    <Input name="vehicle_model" placeholder="Model" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">What do they want?</Label>
                  <Input id="title" name="title" placeholder="Full front PPF + ceramic" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>

                <Button type="submit" className="w-full" disabled={addDeal.isPending}>
                  Save lead
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-elevated bg-surface px-4 py-2.5">
        <Stat label="Open pipeline" value={money(openValue)} hint={`${openDeals.length} live`} className="text-bronze" />
        <Stat label="Weighted forecast" value={money(weighted)} className="text-rig" />
        <Stat label="Won" value={money(won.reduce((t, d) => t + Number(d.value), 0))} className="text-revenue" />
        <Stat label="Close rate" value={`${closeRate}%`} className="text-urgent" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills
          options={FILTERS}
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, vehicle, service tag…"
            className="h-8 w-64 pl-8 text-xs"
          />
        </div>
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
          <div className="no-scrollbar -mx-1 flex w-full max-w-full items-start gap-3 overflow-x-auto px-1 pb-3">
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
        "flex w-[264px] shrink-0 flex-col rounded-xl border bg-surface transition-colors",
        isOver ? "border-bronze/60 bg-surface-2" : "border-elevated",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-elevated px-2.5 py-1.5">
        <Tag tone={STAGE_TONE[stage] ?? "muted"}>{label(stage)}</Tag>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {count} · {money(total)}
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
  dragging,
  onOpen,
  onTag,
}: {
  deal: Deal;
  dragging: boolean;
  onOpen: () => void;
  onTag: (tag: string) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: deal.id });
  const age = deal.last_activity_at
    ? Math.round((Date.now() - new Date(deal.last_activity_at).getTime()) / 86400000)
    : null;
  const isNewLead = deal.stage === "new_lead";
  const vehicle = deal.vehicles
    ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model].filter(Boolean).join(" ")
    : null;
  const phone = deal.customers?.phone ?? null;
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
        <p className="text-sm font-semibold leading-snug">{deal.title}</p>
        {!isNewLead && (
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-bronze">
            {money(deal.value)}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {deal.customers?.name ?? "No customer"}
        {deal.source ? ` · ${deal.source}` : ""}
      </p>

      {vehicle && (
        <p className="mt-1 text-xs font-medium text-foreground/90">{vehicle}</p>
      )}

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

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {age !== null && age > 3 ? (
            <Tag tone="critical" className="text-[10px]">{age}d</Tag>
          ) : (
            !isNewLead && <Tag tone="muted" className="text-[10px]">{deal.probability}%</Tag>
          )}
          {deal.expected_close && (
            <Tag tone="muted" className="text-[10px]">{dayDate(deal.expected_close)}</Tag>
          )}
        </div>
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
    </div>
  );
}


function Stat({
  label: statLabel,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{statLabel}</span>
      <span className={cn("text-sm font-semibold tabular-nums", className)}>{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
