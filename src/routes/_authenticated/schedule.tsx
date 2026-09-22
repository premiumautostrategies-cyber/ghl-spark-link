import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { JOB_STATUSES, label, money, SERVICE_TYPES, shortDate, STATUS_LABELS } from "@/lib/format";
import { Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BAY_DISCIPLINES, certForService, estimateFilmFeet } from "@/lib/shop";

const BAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

type Bay = {
  id: string;
  name: string;
  discipline: string;
  daily_hours_cap: number | string;
  required_certification: string | null;
  sort_order: number;
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Smart bay scheduler — Systemize" },
      {
        name: "description",
        content: "Bay capacity, certified installer routing and material reservations in one board.",
      },
      { property: "og:title", content: "Smart bay scheduler — Systemize" },
      {
        property: "og:description",
        content: "Bay capacity, certified installer routing and material reservations in one board.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
  const [dragJob, setDragJob] = useState<string | null>(null);
  const { organization, location } = useRouteContext({ from: "/_authenticated" });
  const orgId = organization?.id;
  const locId = location?.id;

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name)")
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bayRows = [] } = useQuery({
    queryKey: ["bays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bays")
        .select("id,name,discipline,daily_hours_cap,required_certification,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Bay[];
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team-certs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name,specialties,is_active,tech_certifications(certification,level)")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: rolls = [] } = useQuery({
    queryKey: ["rolls-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_rolls")
        .select("id,roll_code,material_type,remaining_feet,reserved_feet,lot_number")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("roll_code");
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

  const createJob = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No organization selected");
      const start = String(form.get("scheduled_start") || "");
      const customerId = String(form.get("customer_id") || "");
      const { error } = await supabase.from("jobs").insert({
        title: String(form.get("title")),
        service_type: String(form.get("service_type")),
        status: String(form.get("status")),
        bay: String(form.get("bay") || "") || null,
        installer: String(form.get("installer") || "") || null,
        price: Number(form.get("price") || 0),
        notes: String(form.get("notes") || "") || null,
        scheduled_start: start ? new Date(start).toISOString() : null,
        customer_id: customerId || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedBays = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization selected");
      const rows = [
        { name: "Bay 1 — PPF", discipline: "ppf", daily_hours_cap: 9, required_certification: "ppf", sort_order: 0 },
        { name: "Bay 2 — Tint", discipline: "tint", daily_hours_cap: 9, required_certification: "tint", sort_order: 1 },
        { name: "Bay 3 — Wrap / Detail", discipline: "wrap", daily_hours_cap: 9, required_certification: "wrap", sort_order: 2 },
        { name: "Prep bay", discipline: "flex", daily_hours_cap: 9, required_certification: null, sort_order: 3 },
      ].map((b) => ({ ...b, organization_id: orgId, location_id: locId }));
      const { error } = await supabase.from("bays").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bays created");
      qc.invalidateQueries({ queryKey: ["bays"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchBay = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Bay> }) => {
      const { error } = await supabase.from("bays").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bays"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);
  const day = (days[dayIndex] ?? days[0]) as Date;

  const dayJobs = jobs.filter((j) => sameDay(j.scheduled_start, day));
  const unscheduled = jobs.filter(
    (j) => !j.scheduled_start && !["completed", "invoiced"].includes(j.status),
  );

  const virtualBay = (name: string, i: number): Bay => ({
    id: `virtual-${name}`,
    name,
    discipline: "flex",
    daily_hours_cap: 9,
    required_certification: null,
    sort_order: 100 + i,
    is_active: true,
  });

  const baseBays: Bay[] = bayRows.length
    ? bayRows
    : Array.from(new Set([...dayJobs.map((j) => j.bay || "Unassigned"), "Bay 1", "Bay 2", "Bay 3"]))
        .sort()
        .map(virtualBay);

  // Any job sitting on a bay name that no longer exists (or none at all) still needs a row,
  // otherwise it silently disappears from the board.
  const orphanNames = Array.from(
    new Set(dayJobs.map((j) => j.bay || "Unassigned").filter((n) => !baseBays.some((b) => b.name === n))),
  ).sort();
  const bays: Bay[] = [...baseBays, ...orphanNames.map(virtualBay)];

  const hoursFor = (j: { scheduled_start: string | null; scheduled_end: string | null }) => {
    if (!j.scheduled_start) return 0;
    const s = new Date(j.scheduled_start).getTime();
    const e = j.scheduled_end ? new Date(j.scheduled_end).getTime() : s + 2 * 3600000;
    return (e - s) / 3600000;
  };

  const bayLoad = (bay: Bay) =>
    dayJobs.filter((j) => (j.bay || "Unassigned") === bay.name).reduce((t, j) => t + hoursFor(j), 0);

  const certifiedFor = (cert: string | null) =>
    !cert
      ? team
      : team.filter((t) => {
          const certs = (t.tech_certifications ?? []) as Array<{ certification: string }>;
          return (
            certs.some((c) => c.certification === cert) ||
            (t.specialties ?? []).some((s: string) => s.toLowerCase().includes(cert))
          );
        });

  /* -------- warnings -------- */
  const conflictIds = new Set<string>();
  const warnings: string[] = [];
  for (const a of dayJobs) {
    for (const b of dayJobs) {
      if (a.id >= b.id || !a.scheduled_start || !b.scheduled_start) continue;
      const aS = new Date(a.scheduled_start).getTime();
      const aE = a.scheduled_end ? new Date(a.scheduled_end).getTime() : aS + 2 * 3600000;
      const bS = new Date(b.scheduled_start).getTime();
      const bE = b.scheduled_end ? new Date(b.scheduled_end).getTime() : bS + 2 * 3600000;
      if (!(aS < bE && bS < aE)) continue;
      if ((a.bay || "Unassigned") === (b.bay || "Unassigned")) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        warnings.push(`${a.bay || "Unassigned"}: "${a.title}" overlaps "${b.title}"`);
      } else if (a.installer && a.installer === b.installer) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        warnings.push(`${a.installer} is double-booked on "${a.title}" and "${b.title}"`);
      }
    }
  }
  for (const bay of bays) {
    const load = bayLoad(bay);
    if (load > Number(bay.daily_hours_cap)) {
      warnings.push(
        `${bay.name} is booked to ${load.toFixed(1)} h against a ${Number(bay.daily_hours_cap)} h cap`,
      );
    }
  }
  for (const j of dayJobs) {
    const bay = bays.find((b) => b.name === (j.bay || ""));
    const cert = bay?.required_certification ?? certForService(j.service_type);
    if (!cert || !j.installer) continue;
    const ok = certifiedFor(cert).some((t) => t.full_name === j.installer);
    if (!ok) warnings.push(`${j.installer} is not certified for ${label(cert)} on "${j.title}"`);
  }

  const bookedHours = dayJobs.reduce((t, j) => t + hoursFor(j), 0);
  const capacity = bays.reduce((t, b) => t + Number(b.daily_hours_cap), 0) || BAY_HOURS.length;
  const utilisation = Math.round((bookedHours / Math.max(capacity, 1)) * 100);
  const dayValue = dayJobs.reduce((t, j) => t + Number(j.price), 0);
  const inspectJob = jobs.find((j) => j.id === inspect) ?? null;

  /* -------- drag & drop scheduling -------- */
  const dropJob = useMutation({
    mutationFn: async ({ jobId, bay, hour }: { jobId: string; bay: Bay; hour: number }) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) throw new Error("Job not found");
      const hours = Number(job.estimated_hours) > 0 ? Number(job.estimated_hours) : hoursFor(job) || 3;
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + hours * 3600000);

      const load = bayLoad(bay) + hours;
      if (load > Number(bay.daily_hours_cap)) {
        toast.warning(
          `${bay.name} will be at ${load.toFixed(1)} h against a ${Number(bay.daily_hours_cap)} h cap`,
        );
      }
      const cert = bay.required_certification ?? certForService(job.service_type);
      if (cert && job.installer && !certifiedFor(cert).some((t) => t.full_name === job.installer)) {
        toast.warning(`${job.installer} is not certified for ${label(cert)} — reassign before drop-off`);
      }

      const feet = estimateFilmFeet(job.service_type, hours);
      const roll = rolls.find(
        (r) => r.material_type === certForService(job.service_type) && Number(r.remaining_feet) - Number(r.reserved_feet) >= feet,
      );

      const { error } = await supabase
        .from("jobs")
        .update({
          bay: bay.name,
          ...(bay.id.startsWith("virtual-") ? {} : { bay_id: bay.id }),
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          estimated_hours: hours,
          film_feet_estimate: feet,
          ...(roll ? { roll_id: roll.id } : {}),
          status: job.status === "lead" || !job.status ? "scheduled" : job.status,
        })
        .eq("id", jobId);
      if (error) throw error;

      if (roll && feet > 0) {
        await supabase
          .from("inventory_rolls")
          .update({ reserved_feet: Number(roll.reserved_feet) + feet })
          .eq("id", roll.id);
        await supabase.from("roll_transactions").insert({
          organization_id: orgId!,
          roll_id: roll.id,
          job_id: jobId,
          kind: "reserve",
          feet,
          note: `Soft reserve for ${job.title}`,
        });
        toast.success(`Booked · ${feet} ft soft-reserved from ${roll.roll_code}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["rolls-lite"] });
      qc.invalidateQueries({ queryKey: ["rolls"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-elevated pb-5">
        <div>
          <p className="micro-label">Systemize</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">Bays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag unscheduled work onto a bay — capacity, certifications and film are checked as you drop.
          </p>
        </div>
        <div className="flex gap-2">
          {bayRows.length === 0 && (
            <Button variant="outline" onClick={() => seedBays.mutate()} disabled={seedBays.isPending}>
              Set up bays
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New job</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New job</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createJob.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Job title</Label>
                  <Input id="title" name="title" placeholder="Full gloss black wrap" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Select name="service_type" defaultValue="wrap">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((s) => (
                          <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue="scheduled">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOB_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select name="customer_id">
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_start">Start</Label>
                    <Input id="scheduled_start" name="scheduled_start" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input id="price" name="price" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bay">Bay</Label>
                    <Input id="bay" name="bay" placeholder="Bay 2 — Tint" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installer">Installer</Label>
                    <Input id="installer" name="installer" placeholder="Marcus" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={createJob.isPending}>
                  Save job
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Booked today" value={String(dayJobs.length)} />
        <Kpi label="Booked value" value={money(dayValue)} tone="revenue" />
        <Kpi
          label="Capacity used"
          value={`${utilisation}%`}
          tone={utilisation > 95 ? "critical" : "rig"}
          hint={`${bookedHours.toFixed(1)} of ${capacity} labour hours`}
        />
        <Kpi
          label="Warnings"
          value={String(warnings.length)}
          tone={warnings.length ? "critical" : "muted"}
        />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {days.map((d) => {
          const count = jobs.filter((j) => sameDay(j.scheduled_start, d)).length;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setDayIndex(days.indexOf(d))}
              className={cn(
                "min-w-[92px] rounded-xl border px-3 py-2 text-left transition-colors",
                sameDay(day.toISOString(), d)
                  ? "border-bronze/60 bg-surface-2"
                  : "border-elevated bg-surface hover:bg-surface-2",
              )}
            >
              <p className="micro-label">{d.toLocaleDateString("en-US", { weekday: "short" })}</p>
              <p className="mt-1 font-display text-lg font-semibold">{d.getDate()}</p>
              <p className="text-[11px] text-muted-foreground">{count} booked</p>
            </button>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <Panel className="border-critical/40 bg-critical/5 p-4">
          <p className="micro-label text-critical">Scheduling warnings</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Array.from(new Set(warnings)).map((c) => (
              <li key={c} className="text-muted-foreground">{c}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <SectionTitle
          title="Bay board"
          hint={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          right={dragJob ? <Tag tone="bronze">Drop onto an hour</Tag> : undefined}
        />
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className="grid border-b border-elevated"
              style={{ gridTemplateColumns: `190px repeat(${BAY_HOURS.length}, minmax(64px, 1fr))` }}
            >
              <div className="px-4 py-2 micro-label">Bay</div>
              {BAY_HOURS.map((h) => (
                <div key={h} className="border-l border-elevated px-2 py-2 micro-label">
                  {h % 12 === 0 ? 12 : h % 12}
                  {h < 12 ? "a" : "p"}
                </div>
              ))}
            </div>
            {bays.map((bay) => {
              const load = bayLoad(bay);
              const cap = Number(bay.daily_hours_cap);
              const over = load > cap;
              return (
                <div
                  key={bay.id}
                  className="grid border-b border-elevated last:border-0"
                  style={{ gridTemplateColumns: `190px repeat(${BAY_HOURS.length}, minmax(64px, 1fr))` }}
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold">{bay.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {label(bay.discipline)}
                      {bay.required_certification ? ` · ${label(bay.required_certification)} cert` : ""}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className={cn("h-full", over ? "bg-critical" : "bg-bronze")}
                        style={{ width: `${Math.min((load / Math.max(cap, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className={cn("mt-1 text-[11px]", over ? "text-critical" : "text-muted-foreground")}>
                      {load.toFixed(1)} / {cap} h
                    </p>
                  </div>
                  <div
                    className="relative col-span-full col-start-2 min-h-[80px]"
                    style={{ gridColumn: `2 / span ${BAY_HOURS.length}` }}
                  >
                    <div
                      className="absolute inset-0 grid"
                      style={{ gridTemplateColumns: `repeat(${BAY_HOURS.length}, 1fr)` }}
                    >
                      {BAY_HOURS.map((h) => (
                        <div
                          key={h}
                          onDragOver={(e) => {
                            if (dragJob) e.preventDefault();
                          }}
                          onDrop={() => {
                            if (!dragJob) return;
                            dropJob.mutate({ jobId: dragJob, bay, hour: h });
                            setDragJob(null);
                          }}
                          className={cn(
                            "border-l border-elevated/60",
                            dragJob && "hover:bg-bronze/15",
                          )}
                        />
                      ))}
                    </div>
                    {dayJobs
                      .filter((j) => (j.bay || "Unassigned") === bay.name)
                      .map((j) => {
                        const start = new Date(j.scheduled_start as string);
                        const end = j.scheduled_end ? new Date(j.scheduled_end) : null;
                        const startH = start.getHours() + start.getMinutes() / 60;
                        const endH = end ? end.getHours() + end.getMinutes() / 60 : startH + 2;
                        const left = ((startH - (BAY_HOURS[0] as number)) / BAY_HOURS.length) * 100;
                        const width = (Math.max(endH - startH, 0.75) / BAY_HOURS.length) * 100;
                        const clash = conflictIds.has(j.id);
                        return (
                          <button
                            key={j.id}
                            type="button"
                            draggable
                            onDragStart={() => setDragJob(j.id)}
                            onDragEnd={() => setDragJob(null)}
                            onClick={() => setInspect(j.id === inspect ? null : j.id)}
                            className={cn(
                              "absolute top-2 h-[62px] overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors",
                              clash
                                ? "border-critical/60 bg-critical/15"
                                : "border-elevated bg-surface-2 hover:border-bronze/50",
                            )}
                            style={{ left: `${Math.max(left, 0)}%`, width: `${Math.min(width, 100)}%` }}
                          >
                            <p className="truncate text-xs font-semibold">{j.title}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {j.installer || "Unassigned"} · {label(j.service_type)}
                            </p>
                            {Number(j.film_feet_estimate) > 0 && (
                              <p className="truncate text-[11px] text-bronze">
                                {Number(j.film_feet_estimate)} ft reserved
                              </p>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {bayRows.length > 0 && (
        <Panel>
          <SectionTitle title="Bay setup" hint="Discipline, daily labour-hour cap and the certification required" />
          <div className="divide-y divide-elevated">
            {bayRows.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Input
                  className="h-8 w-48"
                  defaultValue={b.name}
                  onBlur={(e) => e.target.value !== b.name && patchBay.mutate({ id: b.id, patch: { name: e.target.value } })}
                />
                <Select
                  value={b.discipline}
                  onValueChange={(discipline) => {
                    const d = BAY_DISCIPLINES.find((x) => x.key === discipline);
                    patchBay.mutate({
                      id: b.id,
                      patch: { discipline, required_certification: d?.certification ?? null },
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BAY_DISCIPLINES.map((d) => (
                      <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 w-20"
                    type="number"
                    step="0.5"
                    defaultValue={Number(b.daily_hours_cap)}
                    onBlur={(e) =>
                      Number(e.target.value) !== Number(b.daily_hours_cap) &&
                      patchBay.mutate({ id: b.id, patch: { daily_hours_cap: Number(e.target.value) } })
                    }
                  />
                  <span className="text-xs text-muted-foreground">h/day cap</span>
                </div>
                <Tag tone="muted">
                  {certifiedFor(b.required_certification).length} certified techs
                </Tag>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle
          title="Unscheduled work"
          hint="Drag a job onto a bay hour to book it"
        />
        <div className="divide-y divide-elevated">
          {unscheduled.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground">
              Everything on the books is scheduled.
            </p>
          )}
          {unscheduled.map((j) => (
            <div
              key={j.id}
              draggable
              onDragStart={() => setDragJob(j.id)}
              onDragEnd={() => setDragJob(null)}
              className={cn(
                "flex cursor-grab flex-wrap items-center justify-between gap-3 px-5 py-3",
                dragJob === j.id && "opacity-60",
              )}
            >
              <div>
                <p className="text-sm font-semibold">{j.title}</p>
                <p className="text-xs text-muted-foreground">
                  {j.customers?.name ?? "No customer"} · {label(j.service_type)} · {money(j.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone="urgent">{STATUS_LABELS[j.status] ?? j.status}</Tag>
                <Select value={j.status} onValueChange={(status) => updateStatus.mutate({ id: j.id, status })}>
                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {inspectJob && (
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="micro-label">Selected job</p>
              <h3 className="display-title mt-1 text-lg font-semibold">{inspectJob.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {inspectJob.customers?.name ?? "No customer"} · {shortDate(inspectJob.scheduled_start)} ·{" "}
                {inspectJob.bay || "No bay"} · {inspectJob.installer || "Unassigned"}
              </p>
            </div>
            <Select
              value={inspectJob.status}
              onValueChange={(status) => updateStatus.mutate({ id: inspectJob.id, status })}
            >
              <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Panel>
      )}
    </div>
  );
}

function sameDay(a: string | null | undefined, b: Date) {
  if (!a) return false;
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}
