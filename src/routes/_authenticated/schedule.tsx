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

const BAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Systemize" },
      { name: "description", content: "Bay and installer scheduling for every job in the shop." },
      { property: "og:title", content: "Schedule — Systemize" },
      {
        property: "og:description",
        content: "Bay and installer scheduling for every job in the shop.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
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
  const day = days[dayIndex] ?? days[0];

  const dayJobs = jobs.filter((j) => sameDay(j.scheduled_start, day));
  const unscheduled = jobs.filter(
    (j) => !j.scheduled_start && !["completed", "invoiced"].includes(j.status),
  );
  const bays = Array.from(
    new Set([...dayJobs.map((j) => j.bay || "Unassigned"), "Bay 1", "Bay 2", "Bay 3"]),
  ).sort();
  const dayValue = dayJobs.reduce((t, j) => t + Number(j.price), 0);

  const conflictIds = new Set<string>();
  const conflicts: string[] = [];
  for (const a of dayJobs) {
    for (const b of dayJobs) {
      if (a.id >= b.id || !a.scheduled_start || !b.scheduled_start) continue;
      const aS = new Date(a.scheduled_start).getTime();
      const aE = a.scheduled_end ? new Date(a.scheduled_end).getTime() : aS + 2 * 3600000;
      const bS = new Date(b.scheduled_start).getTime();
      const bE = b.scheduled_end ? new Date(b.scheduled_end).getTime() : bS + 2 * 3600000;
      const overlap = aS < bE && bS < aE;
      if (!overlap) continue;
      if ((a.bay || "Unassigned") === (b.bay || "Unassigned")) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        conflicts.push(`${a.bay || "Unassigned"}: "${a.title}" overlaps "${b.title}"`);
      } else if (a.installer && a.installer === b.installer) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        conflicts.push(`${a.installer} is double-booked on "${a.title}" and "${b.title}"`);
      }
    }
  }

  const bookedHours = dayJobs.reduce((t, j) => {
    if (!j.scheduled_start) return t;
    const s0 = new Date(j.scheduled_start).getTime();
    const e0 = j.scheduled_end ? new Date(j.scheduled_end).getTime() : s0 + 2 * 3600000;
    return t + (e0 - s0) / 3600000;
  }, 0);
  const utilisation = Math.round(
    (bookedHours / Math.max(BAY_HOURS.length * bays.length, 1)) * 100,
  );
  const inspectJob = jobs.find((j) => j.id === inspect) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-elevated pb-5">
        <div>
          <p className="micro-label">Systemize</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">Bays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live bay board — installer load, overlaps and open capacity.
          </p>
        </div>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue="scheduled">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select name="customer_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
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
                  <Input id="bay" name="bay" placeholder="Bay 2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installer">Installer</Label>
                  <Input id="installer" name="installer" placeholder="Marco" />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Booked today" value={String(dayJobs.length)} />
        <Kpi label="Booked value" value={money(dayValue)} tone="revenue" />
        <Kpi
          label="Bay utilisation"
          value={`${utilisation}%`}
          tone={utilisation > 95 ? "critical" : "rig"}
          hint={`${BAY_HOURS.length * bays.length} bay hours available`}
        />
        <Kpi
          label="Conflicts"
          value={String(conflicts.length)}
          tone={conflicts.length ? "critical" : "muted"}
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
              <p className="micro-label">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className="mt-1 font-display text-lg font-semibold">{d.getDate()}</p>
              <p className="text-[11px] text-muted-foreground">{count} booked</p>
            </button>
          );
        })}
      </div>

      {conflicts.length > 0 && (
        <Panel className="border-critical/40 bg-critical/5 p-4">
          <p className="micro-label text-critical">Bottleneck</p>
          <ul className="mt-2 space-y-1 text-sm">
            {conflicts.map((c) => (
              <li key={c} className="text-muted-foreground">
                {c}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <SectionTitle
          title="Bay board"
          hint={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        />
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div
              className="grid border-b border-elevated"
              style={{ gridTemplateColumns: `140px repeat(${BAY_HOURS.length}, minmax(64px, 1fr))` }}
            >
              <div className="px-4 py-2 micro-label">Bay</div>
              {BAY_HOURS.map((h) => (
                <div key={h} className="border-l border-elevated px-2 py-2 micro-label">
                  {h % 12 === 0 ? 12 : h % 12}
                  {h < 12 ? "a" : "p"}
                </div>
              ))}
            </div>
            {bays.map((bay) => (
              <div
                key={bay}
                className="grid border-b border-elevated last:border-0"
                style={{
                  gridTemplateColumns: `140px repeat(${BAY_HOURS.length}, minmax(64px, 1fr))`,
                }}
              >
                <div className="px-4 py-4 text-sm font-semibold">{bay}</div>
                <div
                  className="relative col-span-full col-start-2 min-h-[72px]"
                  style={{ gridColumn: `2 / span ${BAY_HOURS.length}` }}
                >
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BAY_HOURS.length}, 1fr)` }}>
                    {BAY_HOURS.map((h) => (
                      <div key={h} className="border-l border-elevated/60" />
                    ))}
                  </div>
                  {dayJobs
                    .filter((j) => (j.bay || "Unassigned") === bay)
                    .map((j) => {
                      const start = new Date(j.scheduled_start as string);
                      const end = j.scheduled_end ? new Date(j.scheduled_end) : null;
                      const startH = start.getHours() + start.getMinutes() / 60;
                      const endH = end ? end.getHours() + end.getMinutes() / 60 : startH + 2;
                      const left = ((startH - BAY_HOURS[0]) / BAY_HOURS.length) * 100;
                      const width = (Math.max(endH - startH, 0.75) / BAY_HOURS.length) * 100;
                      const clash = conflictIds.has(j.id);
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => setInspect(j.id === inspect ? null : j.id)}
                          className={cn(
                            "absolute top-2 h-[56px] overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors",
                            clash
                              ? "border-critical/60 bg-critical/15"
                              : "border-elevated bg-surface-2 hover:border-bronze/50",
                          )}
                          style={{
                            left: `${Math.max(left, 0)}%`,
                            width: `${Math.min(width, 100)}%`,
                          }}
                        >
                          <p className="truncate text-xs font-semibold">{j.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {j.installer || "Unassigned"} · {label(j.service_type)}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Unscheduled work"
          hint="Jobs without a date — book them before they age"
        />
        <div className="divide-y divide-elevated">
          {unscheduled.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground">
              Everything on the books is scheduled.
            </p>
          )}
          {unscheduled.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">{j.title}</p>
                <p className="text-xs text-muted-foreground">
                  {j.customers?.name ?? "No customer"} · {label(j.service_type)} · {money(j.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone="urgent">{STATUS_LABELS[j.status] ?? j.status}</Tag>
                <Select
                  value={j.status}
                  onValueChange={(status) => updateStatus.mutate({ id: j.id, status })}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
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
                {inspectJob.customers?.name ?? "No customer"} · {shortDate(inspectJob.scheduled_start)}{" "}
                · {inspectJob.bay || "No bay"} · {inspectJob.installer || "Unassigned"}
              </p>
            </div>
            <Select
              value={inspectJob.status}
              onValueChange={(status) => updateStatus.mutate({ id: inspectJob.id, status })}
            >
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
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
