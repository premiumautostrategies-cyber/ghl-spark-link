import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { planMobileDay } from "@/lib/mobile.functions";
import { Panel, SectionTitle, Tag, Kpi } from "@/components/os-ui";
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
import { label as pretty, money } from "@/lib/format";
import { CERTIFICATIONS } from "@/lib/shop";
import { toast } from "sonner";
import { AlertTriangle, MapPin, Navigation, Sparkles, Truck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mobile")({
  head: () => ({
    meta: [
      { title: "Mobile services — Systemize" },
      {
        name: "description",
        content:
          "Run off-site tint, PPF and detail work: mobile crews, service addresses and an AI day plan that batches nearby stops into a driving route.",
      },
      { property: "og:title", content: "Mobile services — Systemize" },
      {
        property: "og:description",
        content: "Mobile crews, service addresses and AI route planning for off-site work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MobilePage,
});

const today = () => new Date().toISOString().slice(0, 10);

function MobilePage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const plan = useServerFn(planMobileDay);
  const [date, setDate] = useState(today());
  const [unitOpen, setUnitOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [skills, setSkills] = useState<string[]>(["tint"]);

  const { data: units = [] } = useQuery({
    queryKey: ["mobile-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobile_units")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["mobile-jobs", date],
    queryFn: async () => {
      const from = new Date(`${date}T00:00:00`);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name,phone), vehicles(year,make,model,color)")
        .eq("is_mobile", true)
        .gte("scheduled_start", from.toISOString())
        .lt("scheduled_start", to.toISOString())
        .is("deleted_at", null)
        .order("stop_order", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: shopJobs = [] } = useQuery({
    queryKey: ["shop-jobs-for-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,is_mobile,scheduled_start,customers(name)")
        .eq("is_mobile", false)
        .is("deleted_at", null)
        .order("scheduled_start", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["mobile-routes", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobile_routes")
        .select("*")
        .eq("route_date", date)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["mobile-jobs", date] });
    qc.invalidateQueries({ queryKey: ["mobile-routes", date] });
  };

  const addUnit = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("mobile_units").insert({
        organization_id: orgId,
        location_id: locId,
        name: String(form.get("name")),
        kind: String(form.get("kind") || "van"),
        base_address: String(form.get("base_address") || "") || null,
        capacity_hours: Number(form.get("capacity_hours") || 8),
        tech_name: String(form.get("tech_name") || "") || null,
        skills,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crew added");
      setUnitOpen(false);
      qc.invalidateQueries({ queryKey: ["mobile-units"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeMobile = useMutation({
    mutationFn: async (form: FormData) => {
      const jobId = String(form.get("job_id"));
      if (!jobId) throw new Error("Pick a job first");
      const { error } = await supabase
        .from("jobs")
        .update({
          is_mobile: true,
          service_address: String(form.get("service_address") || "") || null,
          service_city: String(form.get("service_city") || "") || null,
          service_zip: String(form.get("service_zip") || "") || null,
          scheduled_start: new Date(`${date}T08:00:00`).toISOString(),
        })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job moved to the mobile board");
      setJobOpen(false);
      qc.invalidateQueries({ queryKey: ["shop-jobs-for-mobile"] });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearPlan = useMutation({
    mutationFn: async () => {
      await supabase
        .from("jobs")
        .update({ route_id: null, stop_order: null, arrival_window: null, travel_minutes: 0 })
        .in("id", jobs.map((j) => j.id));
      const ids = routes.map((r) => r.id);
      if (ids.length) await supabase.from("mobile_routes").delete().in("id", ids);
    },
    onSuccess: () => {
      toast.success("Day plan cleared");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runPlanner = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      const active = units.filter((u) => u.active);
      if (!active.length) throw new Error("Add a crew or van first");
      if (!jobs.length) throw new Error("No mobile jobs on this day yet");

      const result = await plan({
        data: {
          route_date: date,
          start_time: "08:00",
          units: active.map((u) => ({
            id: u.id,
            name: u.name,
            kind: u.kind,
            base_address: u.base_address ?? "",
            capacity_hours: Number(u.capacity_hours),
            skills: (u.skills ?? []) as string[],
          })),
          jobs: jobs.map((j) => ({
            id: j.id,
            label:
              [j.vehicles?.year, j.vehicles?.make, j.vehicles?.model].filter(Boolean).join(" ") ||
              j.title,
            service: pretty(j.service_type),
            address: [j.service_address, j.service_city, j.service_zip].filter(Boolean).join(", "),
            hours: Number(j.estimated_hours) || 2,
            notes: j.notes ?? "",
          })),
        },
      });

      // wipe the previous plan for this day
      const oldIds = routes.map((r) => r.id);
      if (oldIds.length) await supabase.from("mobile_routes").delete().in("id", oldIds);
      await supabase
        .from("jobs")
        .update({ route_id: null, stop_order: null, arrival_window: null })
        .in("id", jobs.map((j) => j.id));

      for (const r of result.routes) {
        const { data: inserted, error } = await supabase
          .from("mobile_routes")
          .insert({
            organization_id: orgId,
            location_id: locId,
            unit_id: r.unit_id,
            route_date: date,
            status: "planned",
            drive_minutes: Math.round(r.drive_minutes || 0),
            work_hours: Number(r.work_hours || 0),
            summary: r.summary,
            warnings: result.warnings ?? [],
          })
          .select("id")
          .single();
        if (error) throw error;
        for (const s of r.stops) {
          await supabase
            .from("jobs")
            .update({
              route_id: inserted.id,
              stop_order: s.order,
              arrival_window: `${s.arrive}–${s.depart}`,
              travel_minutes: Math.round(s.drive_minutes || 0),
              installer:
                units.find((u) => u.id === r.unit_id)?.tech_name ??
                units.find((u) => u.id === r.unit_id)?.name ??
                null,
            })
            .eq("id", s.job_id);
        }
      }
      return result;
    },
    onSuccess: (r) => {
      toast.success(
        `Day planned — ${r.routes.length} route${r.routes.length === 1 ? "" : "s"}, ${r.unassigned.length} left over`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unrouted = jobs.filter((j) => !j.route_id);
  const planned = jobs.filter((j) => j.route_id);
  const driveTotal = routes.reduce((t, r) => t + Number(r.drive_minutes), 0);
  const revenue = jobs.reduce((t, j) => t + Number(j.price || 0), 0);
  const warnings = useMemo(
    () => Array.from(new Set(routes.flatMap((r) => (r.warnings ?? []) as string[]))),
    [routes],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-elevated pb-5">
        <div>
          <p className="micro-label">Mobile services</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">On-the-road day plan</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Off-site tint, PPF and detail work. Add the stops, then let the planner batch nearby
            vehicles into one crew's day and put them in driving order.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-[160px]"
          />
          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MapPin className="mr-1.5 h-4 w-4" /> Add a stop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send a job out to the customer</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  makeMobile.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label>Job</Label>
                  <Select name="job_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a job" />
                    </SelectTrigger>
                    <SelectContent>
                      {shopJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title} {j.customers?.name ? `· ${j.customers.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_address">Where are we going?</Label>
                  <Input id="service_address" name="service_address" placeholder="1420 Marina Blvd" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="service_city">City</Label>
                    <Input id="service_city" name="service_city" placeholder="Scottsdale" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_zip">ZIP</Label>
                    <Input id="service_zip" name="service_zip" placeholder="85251" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={makeMobile.isPending}>
                  Put it on {date}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => runPlanner.mutate()} disabled={runPlanner.isPending}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {runPlanner.isPending ? "Planning the day…" : "Plan the day"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Stops booked" value={String(jobs.length)} hint={`${unrouted.length} not routed yet`} />
        <Kpi label="Crews out" value={String(routes.length)} tone="rig" hint={`${units.length} available`} />
        <Kpi
          label="Time behind the wheel"
          value={`${Math.round(driveTotal / 60)}h ${driveTotal % 60}m`}
          tone="comms"
          hint="Across every route today"
        />
        <Kpi label="Value on the road" value={money(revenue)} tone="revenue" />
      </div>

      {warnings.length > 0 && (
        <Panel className="border-urgent/40 bg-urgent/5 p-5">
          <p className="micro-label flex items-center gap-2 text-urgent">
            <AlertTriangle className="h-3.5 w-3.5" /> Worth a look
          </p>
          <ul className="mt-2 space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {w}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-4">
          {routes.length === 0 ? (
            <Panel className="p-10 text-center">
              <Navigation className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No route planned for this day yet. Add your stops and press Plan the day.
              </p>
            </Panel>
          ) : (
            routes.map((r) => {
              const unit = units.find((u) => u.id === r.unit_id);
              const stops = planned
                .filter((j) => j.route_id === r.id)
                .sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
              return (
                <Panel key={r.id}>
                  <SectionTitle
                    title={unit?.name ?? "Crew"}
                    {...(r.summary ? { hint: r.summary } : {})}
                    right={
                      <div className="flex items-center gap-2">
                        <Tag tone="rig">{stops.length} stops</Tag>
                        <Tag tone="comms">{r.drive_minutes} min driving</Tag>
                        <Tag tone="bronze">{Number(r.work_hours)}h on site</Tag>
                      </div>
                    }
                  />
                  <ol className="divide-y divide-elevated border-t border-elevated">
                    {stops.map((j, i) => (
                      <li key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10 text-sm font-semibold text-bronze">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {[j.vehicles?.year, j.vehicles?.make, j.vehicles?.model]
                              .filter(Boolean)
                              .join(" ") || j.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {j.customers?.name ?? "No customer"} · {pretty(j.service_type)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[j.service_address, j.service_city, j.service_zip]
                              .filter(Boolean)
                              .join(", ") || "Address missing"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {j.arrival_window ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {j.travel_minutes} min drive · {Number(j.estimated_hours)}h on site
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Panel>
              );
            })
          )}

          <Panel>
            <SectionTitle
              title="Waiting for a slot"
              hint="Mobile work on this day that isn't in a route yet"
              right={
                routes.length > 0 ? (
                  <Button size="sm" variant="ghost" onClick={() => clearPlan.mutate()}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear plan
                  </Button>
                ) : undefined
              }
            />
            <div className="divide-y divide-elevated border-t border-elevated">
              {unrouted.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  Everything booked today has a place in the run.
                </p>
              ) : (
                unrouted.map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {[j.vehicles?.year, j.vehicles?.make, j.vehicles?.model]
                          .filter(Boolean)
                          .join(" ") || j.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[j.service_address, j.service_city, j.service_zip]
                          .filter(Boolean)
                          .join(", ") || "Address missing"}
                      </p>
                    </div>
                    <Tag tone={j.service_address ? "muted" : "urgent"}>
                      {j.service_address ? `${Number(j.estimated_hours)}h` : "Needs an address"}
                    </Tag>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <Panel className="h-fit">
          <SectionTitle
            title="Crews & vans"
            right={
              <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a mobile crew</DialogTitle>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addUnit.mutate(new FormData(e.currentTarget));
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="Van 1 — North valley" required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select name="kind" defaultValue="van">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="van">Dedicated van</SelectItem>
                            <SelectItem value="installer">Installer who goes out</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tech_name">Who's driving</Label>
                        <Input id="tech_name" name="tech_name" placeholder="Marcus" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base_address">Starts the day from</Label>
                      <Input id="base_address" name="base_address" placeholder="Shop — 4120 N 30th Ave, Phoenix" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity_hours">Hours of work per day</Label>
                      <Input id="capacity_hours" name="capacity_hours" type="number" step="0.5" defaultValue="8" />
                    </div>
                    <div className="space-y-2">
                      <Label>Can do</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {CERTIFICATIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setSkills((s) =>
                                s.includes(c) ? s.filter((x) => x !== c) : [...s, c],
                              )
                            }
                            className={
                              skills.includes(c)
                                ? "rounded-full border border-bronze/40 bg-bronze/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-bronze"
                                : "rounded-full border border-elevated px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                            }
                          >
                            {pretty(c)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={addUnit.isPending}>
                      Save crew
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            }
          />
          <div className="divide-y divide-elevated border-t border-elevated">
            {units.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No mobile crews yet. Add a van, or an installer who takes jobs on the road.
              </p>
            ) : (
              units.map((u) => (
                <div key={u.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-bronze" />
                    <p className="text-sm font-medium">{u.name}</p>
                    <Tag tone={u.kind === "van" ? "rig" : "muted"}>{pretty(u.kind)}</Tag>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {u.tech_name ? `${u.tech_name} · ` : ""}
                    {Number(u.capacity_hours)}h a day
                  </p>
                  <p className="text-xs text-muted-foreground">{u.base_address ?? "Starts at the shop"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {((u.skills ?? []) as string[]).map((s) => (
                      <Tag key={s}>{pretty(s)}</Tag>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
