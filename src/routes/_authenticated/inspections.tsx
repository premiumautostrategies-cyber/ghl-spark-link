import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterPills, Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
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
import { cn } from "@/lib/utils";
import { dayDate } from "@/lib/format";
import { toast } from "sonner";
import { makeToken } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/inspections")({
  head: () => ({
    meta: [
      { title: "Vehicle Inspections — Systemize" },
      {
        name: "description",
        content: "Digital check-in inspections with panel damage mapping and customer sign-off.",
      },
      { property: "og:title", content: "Vehicle Inspections — Systemize" },
      {
        property: "og:description",
        content: "Digital check-in inspections with panel damage mapping and customer sign-off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InspectionsPage,
});

type Panel = { id: string; label: string; x: number; y: number; w: number; h: number; r?: number };

/** Top-down vehicle blueprint, coordinates in a 0-100 x 0-200 space. */
const PANELS: Panel[] = [
  { id: "front_bumper", label: "Front bumper", x: 22, y: 8, w: 56, h: 16, r: 8 },
  { id: "hood", label: "Hood", x: 20, y: 26, w: 60, h: 30, r: 6 },
  { id: "windshield", label: "Windshield", x: 24, y: 58, w: 52, h: 18, r: 6 },
  { id: "roof", label: "Roof", x: 22, y: 78, w: 56, h: 46, r: 6 },
  { id: "rear_glass", label: "Rear glass", x: 24, y: 126, w: 52, h: 16, r: 6 },
  { id: "trunk", label: "Trunk", x: 20, y: 144, w: 60, h: 28, r: 6 },
  { id: "rear_bumper", label: "Rear bumper", x: 22, y: 174, w: 56, h: 16, r: 8 },
  { id: "driver_side", label: "Driver side", x: 4, y: 40, w: 14, h: 120, r: 7 },
  { id: "passenger_side", label: "Passenger side", x: 82, y: 40, w: 14, h: 120, r: 7 },
];

const DEFECT_TYPES = ["chip", "scratch", "dent", "swirl", "rust", "prior_film", "crack"] as const;
const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "open" as const, label: "Open" },
  { value: "flagged" as const, label: "Critical damage" },
  { value: "signed" as const, label: "Signed off" },
];
type FilterKey = (typeof FILTERS)[number]["value"];

function InspectionsPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const { data: inspections = [] } = useQuery({
    queryKey: ["inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("*, customers(name), vehicles(year,make,model,plate)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: defects = [] } = useQuery({
    queryKey: ["inspection-defects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_defects").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,year,make,model,plate,customer_id")
        .order("make");
      if (error) throw error;
      return data;
    },
  });

  const createInspection = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const vehicleId = String(form.get("vehicle_id") || "");
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const { data, error } = await supabase
        .from("inspections")
        .insert({
          organization_id: orgId,
          location_id: locId,
          vehicle_id: vehicleId || null,
          customer_id: vehicle?.customer_id ?? null,
          stage: String(form.get("stage") || "check_in"),
          inspector: String(form.get("inspector") || "") || null,
          mileage: Number(form.get("mileage") || 0) || null,
          notes: String(form.get("notes") || "") || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Inspection started");
      setOpen(false);
      setSelected(id);
      qc.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addDefect = useMutation({
    mutationFn: async (v: {
      panel: string;
      defect_type: string;
      severity: string;
      note: string;
      pos_x: number;
      pos_y: number;
      media_urls: string[];
      video_url: string | null;
    }) => {
      if (!orgId || !selected) throw new Error("Select an inspection first");
      const { error } = await supabase
        .from("inspection_defects")
        .insert({ ...v, organization_id: orgId, inspection_id: selected });
      if (error) throw error;
    },
    onSuccess: () => {
      setActivePanel(null);
      qc.invalidateQueries({ queryKey: ["inspection-defects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDefect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inspection_defects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection-defects"] }),
  });

  const signOff = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("inspections")
        .update({ status: "signed", acknowledged_by: name, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer acknowledgment recorded");
      qc.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendWaiver = useMutation({
    mutationFn: async (inspection: { id: string; waiver_token: string | null; customer_id: string | null }) => {
      let token = inspection.waiver_token;
      if (!token) {
        token = makeToken();
        const { error } = await supabase
          .from("inspections")
          .update({ waiver_token: token })
          .eq("id", inspection.id);
        if (error) throw error;
      }
      const link = `${window.location.origin}/p/waiver/${token}`;
      if (orgId) {
        await supabase.from("messages").insert({
          organization_id: orgId,
          location_id: locId,
          customer_id: inspection.customer_id,
          channel: "sms",
          direction: "out",
          is_automated: true,
          body: `Here is the check-in report for your vehicle. Please review the pre-existing condition and sign before we start: ${link}`,
        });
      }
      await navigator.clipboard?.writeText(link).catch(() => undefined);
      return link;
    },
    onSuccess: () => {
      toast.success("Waiver link texted and copied");
      qc.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const defectsFor = (id: string) => defects.filter((d) => d.inspection_id === id);
  const criticalCount = (id: string) =>
    defectsFor(id).filter((d) => d.severity === "critical").length;

  const visible = inspections.filter((i) => {
    if (filter === "open") return i.status !== "signed";
    if (filter === "signed") return i.status === "signed";
    if (filter === "flagged") return criticalCount(i.id) > 0;
    return true;
  });

  const current = inspections.find((i) => i.id === selected) ?? visible[0] ?? null;
  const currentDefects = current ? defectsFor(current.id) : [];
  const vehicleName = (v: { year: number | null; make: string | null; model: string | null } | null) =>
    v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "Unassigned vehicle";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        subtitle="Photograph, map and sign off every panel before the car enters a bay."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Start check-in</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New vehicle check-in</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createInspection.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Select name="vehicle_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                          {v.plate ? ` · ${v.plate}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select name="stage" defaultValue="check_in">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check_in">Check-in</SelectItem>
                        <SelectItem value="pre_production">Pre-production</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage" name="mileage" type="number" placeholder="18400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspector">Inspector</Label>
                  <Input id="inspector" name="inspector" placeholder="Marcus Webb" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Vehicle arrived dirty, wash first." />
                </div>
                <Button type="submit" className="w-full" disabled={createInspection.isPending}>
                  Start inspection
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Inspections" value={String(inspections.length)} />
        <Kpi
          label="Awaiting sign-off"
          value={String(inspections.filter((i) => i.status !== "signed").length)}
          tone="urgent"
        />
        <Kpi
          label="Critical damage found"
          value={String(defects.filter((d) => d.severity === "critical").length)}
          tone="critical"
        />
        <Kpi label="Defects logged" value={String(defects.length)} tone="rig" />
      </div>

      <FilterPills options={FILTERS} value={filter} onChange={(v) => setFilter(v as FilterKey)} />

      {inspections.length === 0 ? (
        <EmptyState
          title="No inspections yet"
          body="Start a check-in to map existing damage before any film touches the paint."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Panel className="overflow-hidden">
            <SectionTitle title="Check-ins" hint={`${visible.length} shown`} />
            <div className="max-h-[640px] divide-y divide-elevated overflow-y-auto">
              {visible.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelected(i.id)}
                  className={cn(
                    "block w-full px-5 py-3 text-left transition-colors hover:bg-surface-2",
                    current?.id === i.id && "bg-surface-2",
                  )}
                >
                  <p className="text-sm font-semibold">{vehicleName(i.vehicles)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.customers?.name ?? "No customer"} · {dayDate(i.created_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag tone={i.status === "signed" ? "revenue" : "urgent"}>
                      {i.status === "signed" ? "Signed" : "Open"}
                    </Tag>
                    {criticalCount(i.id) > 0 && (
                      <Tag tone="critical">{criticalCount(i.id)} critical</Tag>
                    )}
                    <Tag tone="muted">{defectsFor(i.id).length} marks</Tag>
                  </div>
                </button>
              ))}
              {visible.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                  Nothing in this filter.
                </p>
              )}
            </div>
          </Panel>

          {current && (
            <div className="space-y-4">
              <Panel className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="micro-label">{current.stage.replace(/_/g, " ")}</p>
                    <h2 className="display-title mt-1 text-xl font-semibold">
                      {vehicleName(current.vehicles)}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {current.customers?.name ?? "No customer"}
                      {current.vehicles?.plate ? ` · ${current.vehicles.plate}` : ""}
                      {current.mileage ? ` · ${current.mileage.toLocaleString()} mi` : ""}
                      {current.inspector ? ` · ${current.inspector}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      sendWaiver.mutate({
                        id: current.id,
                        waiver_token: current.waiver_token,
                        customer_id: current.customer_id,
                      })
                    }
                    disabled={sendWaiver.isPending}
                  >
                    {current.waiver_token ? "Resend waiver link" : "Send waiver link"}
                  </Button>
                  {current.acknowledged_at || current.status === "signed" ? (
                    <Tag tone="revenue">Acknowledged by {current.acknowledged_by}</Tag>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const name = window.prompt("Customer name for acknowledgment");
                        if (name) signOff.mutate({ id: current.id, name });
                      }}
                    >
                      Capture customer sign-off
                    </Button>
                  )}
                  </div>
                </div>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_1fr]">
                <Panel className="p-5">
                  <p className="micro-label">Damage map</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tap a panel to log what you found.
                  </p>
                  <svg viewBox="0 0 100 200" className="mt-4 w-full">
                    <rect
                      x="2"
                      y="2"
                      width="96"
                      height="196"
                      rx="26"
                      className="fill-surface-2 stroke-elevated"
                      strokeWidth="0.7"
                    />
                    {PANELS.map((p) => {
                      const marks = currentDefects.filter((d) => d.panel === p.id);
                      const hasCritical = marks.some((d) => d.severity === "critical");
                      return (
                        <g key={p.id}>
                          <rect
                            x={p.x}
                            y={p.y}
                            width={p.w}
                            height={p.h}
                            rx={p.r ?? 4}
                            onClick={() => setActivePanel(p.id)}
                            className={cn(
                              "cursor-pointer stroke-hairline transition-all",
                              marks.length === 0
                                ? "fill-surface hover:fill-elevated"
                                : hasCritical
                                  ? "fill-critical/25"
                                  : "fill-urgent/20",
                              activePanel === p.id && "stroke-bronze",
                            )}
                            strokeWidth="0.6"
                          />
                          {marks.map((d, idx) => (
                            <circle
                              key={d.id}
                              cx={p.x + 4 + ((idx * 6) % Math.max(p.w - 8, 6))}
                              cy={p.y + p.h / 2}
                              r="2.2"
                              className={
                                d.severity === "critical"
                                  ? "fill-critical stroke-background"
                                  : "fill-urgent stroke-background"
                              }
                              strokeWidth="0.5"
                            />
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-3 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-critical" /> Critical
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-urgent" /> Minor
                    </span>
                  </div>
                </Panel>

                <div className="space-y-4">
                  {activePanel && (
                    <Panel className="p-5">
                      <p className="micro-label">
                        New mark · {PANELS.find((p) => p.id === activePanel)?.label}
                      </p>
                      <form
                        className="mt-3 space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          addDefect.mutate({
                            panel: activePanel,
                            defect_type: String(f.get("defect_type")),
                            severity: String(f.get("severity")),
                            note: String(f.get("note") || ""),
                            pos_x: 0,
                            pos_y: 0,
                            media_urls: String(f.get("photo_url") || "")
                              .split(",")
                              .map((u) => u.trim())
                              .filter(Boolean),
                            video_url: String(f.get("video_url") || "") || null,
                          });
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select name="defect_type" defaultValue="chip">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEFECT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select name="severity" defaultValue="minor">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minor">Minor</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Input name="note" placeholder="Rock chip cluster above badge" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input name="photo_url" placeholder="Photo link(s), comma separated" />
                          <Input name="video_url" placeholder="Video clip link" />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={addDefect.isPending}>
                            Log mark
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setActivePanel(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Panel>
                  )}

                  <Panel>
                    <SectionTitle
                      title="Findings"
                      hint={`${currentDefects.length} logged on this vehicle`}
                    />
                    <div className="divide-y divide-elevated">
                      {currentDefects.length === 0 && (
                        <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                          No damage recorded yet.
                        </p>
                      )}
                      {currentDefects.map((d) => (
                        <div key={d.id} className="flex items-start justify-between gap-3 px-5 py-3">
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {d.defect_type.replace(/_/g, " ")} ·{" "}
                              {PANELS.find((p) => p.id === d.panel)?.label ?? d.panel}
                            </p>
                            {d.note && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{d.note}</p>
                            )}
                            {((d.media_urls ?? []).length > 0 || d.video_url) && (
                              <p className="mt-0.5 text-xs text-comms">
                                {(d.media_urls ?? []).length} photo(s)
                                {d.video_url ? " · video attached" : ""}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag tone={d.severity === "critical" ? "critical" : "urgent"}>
                              {d.severity}
                            </Tag>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-critical"
                              onClick={() => removeDefect.mutate(d.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {current.notes && (
                    <Panel className="p-5">
                      <p className="micro-label">Inspector notes</p>
                      <p className="mt-2 text-sm text-muted-foreground">{current.notes}</p>
                    </Panel>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
