import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle, Tag, Kpi, FilterPills } from "@/components/os-ui";
import { label, money, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type View = "day" | "week" | "month";

type JobRow = {
  id: string;
  title: string;
  status: string;
  service_type: string | null;
  bay: string | null;
  installer: string | null;
  price: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_hours: number | null;
  is_mobile: boolean | null;
  service_address: string | null;
  service_city: string | null;
  customers: { name: string | null } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
};

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const STATUS_TONE: Record<string, string> = {
  lead: "border-l-comms",
  estimate: "border-l-comms",
  scheduled: "border-l-bronze",
  in_progress: "border-l-urgent",
  ready_for_pickup: "border-l-revenue",
  completed: "border-l-revenue",
  invoiced: "border-l-revenue",
};

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Shop calendar — Systemize" },
      {
        name: "description",
        content:
          "Every vehicle on the books by day, week and month, with bay capacity and installer availability.",
      },
      { property: "og:title", content: "Shop calendar — Systemize" },
      {
        property: "og:description",
        content:
          "Every vehicle on the books by day, week and month, with bay capacity and installer availability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  return addDays(x, -x.getDay());
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Labour hours this job consumes on the day it starts (multi-day bookings clamp to one shop day). */
function hoursOf(j: JobRow) {
  if (Number(j.estimated_hours) > 0) return Math.min(Number(j.estimated_hours), 10);
  if (j.scheduled_start && j.scheduled_end) {
    const span =
      (new Date(j.scheduled_end).getTime() - new Date(j.scheduled_start).getTime()) / 3600000;
    return Math.min(Math.max(span, 0.5), 9);
  }
  return 3;
}

/** Job rows store a short bay label ("Bay 1") while bay records may read "Bay 1 — PPF". */
function normalizeBay(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function matchBay(jobBay: string | null, bayNames: string[]) {
  const raw = (jobBay ?? "").trim();
  if (!raw) return "Unassigned";
  const n = normalizeBay(raw);
  const hit = bayNames.find((b) => {
    const bn = normalizeBay(b);
    return bn === n || bn.startsWith(n) || n.startsWith(bn);
  });
  return hit ?? raw;
}

function vehicleOf(j: JobRow) {
  const v = j.vehicles;
  if (!v) return null;
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || null;
}

function CalendarPage() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ["calendar-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,status,service_type,bay,installer,price,scheduled_start,scheduled_end,estimated_hours,is_mobile,service_address,service_city,customers(name),vehicles(year,make,model)",
        )
        .not("scheduled_start", "is", null)
        .order("scheduled_start");
      if (error) throw error;
      return (data ?? []) as unknown as JobRow[];
    },
  });

  const { data: bays = [] } = useQuery({
    queryKey: ["calendar-bays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bays")
        .select("id,name,daily_hours_cap,discipline")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["calendar-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const dailyCapacity = bays.reduce((t, b) => t + Number(b.daily_hours_cap ?? 0), 0) || 27;

  const jobsOn = (d: Date) =>
    jobs.filter((j) => j.scheduled_start && sameDay(new Date(j.scheduled_start), d));

  const range = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [view, anchor]);

  const step = (dir: number) => {
    if (view === "day") setAnchor((a) => addDays(a, dir));
    else if (view === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  };

  const heading =
    view === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(anchor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const scopeDaysList =
    view === "month" ? range.filter((d) => d.getMonth() === anchor.getMonth()) : range;
  const scopeJobs = scopeDaysList.flatMap(jobsOn);
  const scopeHours = scopeJobs.reduce((t, j) => t + hoursOf(j), 0);
  const util = Math.round((scopeHours / Math.max(dailyCapacity * scopeDaysList.length, 1)) * 100);
  const selectedJob = jobs.find((j) => j.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-elevated pb-5">
        <div>
          <p className="micro-label">Operations</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">Shop calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every vehicle on the books — switch between day, week and month with live bay capacity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
            value={view}
            onChange={(v) => setView(v as View)}
          />
          <div className="flex items-center gap-1 rounded-full border border-elevated bg-surface p-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => step(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setAnchor(startOfDay(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => step(1)}
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vehicles booked" value={String(scopeJobs.length)} />
        <Kpi
          label="Booked value"
          value={money(scopeJobs.reduce((t, j) => t + Number(j.price ?? 0), 0))}
          tone="revenue"
        />
        <Kpi
          label="Capacity used"
          value={`${util}%`}
          tone={util > 95 ? "critical" : "rig"}
          hint={`${scopeHours.toFixed(1)} of ${(dailyCapacity * scopeDaysList.length).toFixed(0)} labour hours`}
        />
        <Kpi
          label="Installers active"
          value={String(team.length)}
          tone="muted"
          hint={bays.length ? `${bays.length} active bays` : "No bays set up yet"}
        />
      </div>

      <Panel className="overflow-hidden">
        <SectionTitle
          title={view === "day" ? "Day board" : view === "week" ? "Week" : "Month"}
          hint={heading}
          right={<Tag tone="bronze">{scopeJobs.length} on the books</Tag>}
        />

        {view === "day" && (
          <DayBoard
            jobs={jobsOn(anchor)}
            bays={bays.map((b) => b.name)}
            onSelect={setSelected}
            selected={selected}
          />
        )}

        {view === "week" && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-7 divide-x divide-elevated">
              {range.map((d) => {
                const list = jobsOn(d);
                const hrs = list.reduce((t, j) => t + hoursOf(j), 0);
                const pct = Math.min((hrs / Math.max(dailyCapacity, 1)) * 100, 100);
                const today = sameDay(d, new Date());
                return (
                  <div
                    key={d.toISOString()}
                    className={cn("min-h-[420px] p-3", today && "bg-surface-2/60")}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="micro-label">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p
                        className={cn(
                          "display-title text-lg font-semibold",
                          today && "text-bronze",
                        )}
                      >
                        {d.getDate()}
                      </p>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className={cn("h-full", hrs > dailyCapacity ? "bg-critical" : "bg-bronze")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {hrs.toFixed(1)} / {dailyCapacity} h
                    </p>
                    <div className="mt-3 space-y-2">
                      {list.length === 0 && <p className="text-[11px] text-muted-foreground">Open</p>}
                      {list.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => setSelected(j.id === selected ? null : j.id)}
                          className={cn(
                            "w-full rounded-lg border border-l-2 border-elevated bg-surface-2 px-2 py-1.5 text-left transition-colors hover:border-bronze/50",
                            STATUS_TONE[j.status] ?? "border-l-elevated",
                            selected === j.id && "border-bronze/70",
                          )}
                        >
                          <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {new Date(j.scheduled_start as string).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="truncate text-xs font-semibold">{vehicleOf(j) ?? j.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {label(j.service_type)} · {j.installer || "Unassigned"}
                          </p>
                          {j.is_mobile && <p className="text-[10px] text-comms">Mobile</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-7 border-b border-elevated">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="micro-label px-3 py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {range.map((d) => {
                  const list = jobsOn(d);
                  const hrs = list.reduce((t, j) => t + hoursOf(j), 0);
                  const outside = d.getMonth() !== anchor.getMonth();
                  const today = sameDay(d, new Date());
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "min-h-[112px] border-b border-l border-elevated p-2",
                        outside && "opacity-40",
                        today && "bg-surface-2/60",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={cn("text-xs font-semibold tabular-nums", today && "text-bronze")}
                        >
                          {d.getDate()}
                        </p>
                        {hrs > 0 && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold tabular-nums",
                              hrs > dailyCapacity ? "text-critical" : "text-muted-foreground",
                            )}
                          >
                            {hrs.toFixed(0)}h
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {list.slice(0, 3).map((j) => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => setSelected(j.id === selected ? null : j.id)}
                            className={cn(
                              "block w-full truncate rounded border-l-2 bg-surface-2 px-1.5 py-1 text-left text-[10px] font-medium",
                              STATUS_TONE[j.status] ?? "border-l-elevated",
                            )}
                          >
                            {vehicleOf(j) ?? j.title}
                          </button>
                        ))}
                        {list.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnchor(d);
                              setView("day");
                            }}
                            className="text-[10px] text-bronze"
                          >
                            +{list.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {selectedJob && (
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="micro-label">Selected vehicle</p>
              <h3 className="display-title mt-1 text-lg font-semibold">
                {vehicleOf(selectedJob) ?? selectedJob.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedJob.customers?.name ?? "No customer"} · {label(selectedJob.service_type)} ·{" "}
                {new Date(selectedJob.scheduled_start as string).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedJob.is_mobile
                  ? `Mobile · ${[selectedJob.service_address, selectedJob.service_city].filter(Boolean).join(", ") || "No address"}`
                  : selectedJob.bay || "No bay assigned"}{" "}
                · {selectedJob.installer || "Installer unassigned"} · {money(selectedJob.price)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={selectedJob.status === "in_progress" ? "urgent" : "muted"}>
                {STATUS_LABELS[selectedJob.status] ?? selectedJob.status}
              </Tag>
              <Button asChild variant="outline" size="sm">
                <Link to="/jobs">Open production</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/schedule">Bay board</Link>
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function DayBoard({
  jobs,
  bays,
  onSelect,
  selected,
}: {
  jobs: JobRow[];
  bays: string[];
  onSelect: (id: string | null) => void;
  selected: string | null;
}) {
  const rowNames = Array.from(new Set([...bays, ...jobs.map((j) => j.bay || "Unassigned")]));
  if (rowNames.length === 0) rowNames.push("Unassigned");
  const cols = `170px repeat(${HOURS.length}, minmax(60px,1fr))`;
  const firstHour = HOURS[0] as number;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="grid border-b border-elevated" style={{ gridTemplateColumns: cols }}>
          <div className="micro-label px-4 py-2">Bay</div>
          {HOURS.map((h) => (
            <div key={h} className="micro-label border-l border-elevated px-2 py-2">
              {h % 12 === 0 ? 12 : h % 12}
              {h < 12 ? "a" : "p"}
            </div>
          ))}
        </div>
        {rowNames.map((name) => {
          const rowJobs = jobs.filter((j) => (j.bay || "Unassigned") === name);
          return (
            <div
              key={name}
              className="grid border-b border-elevated last:border-0"
              style={{ gridTemplateColumns: cols }}
            >
              <div className="px-4 py-3">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-[11px] text-muted-foreground">{rowJobs.length} vehicles</p>
              </div>
              <div className="relative min-h-[76px]" style={{ gridColumn: `2 / span ${HOURS.length}` }}>
                <div
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${HOURS.length},1fr)` }}
                >
                  {HOURS.map((h) => (
                    <div key={h} className="border-l border-elevated/60" />
                  ))}
                </div>
                {rowJobs.map((j) => {
                  const start = new Date(j.scheduled_start as string);
                  const end = j.scheduled_end
                    ? new Date(j.scheduled_end)
                    : new Date(start.getTime() + (Number(j.estimated_hours) || 3) * 3600000);
                  const sH = start.getHours() + start.getMinutes() / 60;
                  const eH = end.getHours() + end.getMinutes() / 60;
                  const left = ((sH - firstHour) / HOURS.length) * 100;
                  const width = (Math.max(eH - sH, 0.75) / HOURS.length) * 100;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => onSelect(j.id === selected ? null : j.id)}
                      className={cn(
                        "absolute top-2 h-[60px] overflow-hidden rounded-xl border border-l-2 bg-surface-2 px-3 py-1.5 text-left transition-colors hover:border-bronze/60",
                        STATUS_TONE[j.status] ?? "border-l-elevated",
                        selected === j.id ? "border-bronze/70" : "border-elevated",
                      )}
                      style={{
                        left: `${Math.min(Math.max(left, 0), 95)}%`,
                        width: `${Math.min(width, 100)}%`,
                      }}
                    >
                      <p className="truncate text-xs font-semibold">{vehicleOf(j) ?? j.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {j.installer || "Unassigned"} · {label(j.service_type)}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                        {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-muted-foreground">
            Nothing booked on this day — the shop is open.
          </p>
        )}
      </div>
    </div>
  );
}
