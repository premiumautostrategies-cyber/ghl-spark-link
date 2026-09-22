import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { label } from "@/lib/format";
import { PRODUCTION_PHASES } from "@/lib/shop";
import { toast } from "sonner";
import { ArrowLeft, Pause, Play, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/kiosk")({
  head: () => ({
    meta: [
      { title: "Shop floor kiosk — Systemize" },
      { name: "description", content: "Tablet view for installers: today's vehicles, cut files, roll IDs and phase timers." },
      { property: "og:title", content: "Shop floor kiosk — Systemize" },
      { property: "og:description", content: "Tablet view for installers: today's vehicles, cut files, roll IDs and phase timers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KioskPage,
});

type Phase = {
  id: string;
  phase: string;
  sequence: number;
  status: string;
  estimated_hours: number | string;
  actual_minutes: number | string;
  assigned_to: string | null;
  started_at: string | null;
};

function KioskPage() {
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [openJob, setOpenJob] = useState<string | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ["kiosk-jobs"],
    queryFn: async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "*, customers(name), vehicles(year,make,model,color,plate), inventory_rolls(roll_code,lot_number,product_line)",
        )
        .gte("scheduled_start", from.toISOString())
        .lt("scheduled_start", to.toISOString())
        .is("deleted_at", null)
        .order("scheduled_start");
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["job-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_phases")
        .select("id,job_id,phase,sequence,status,estimated_hours,actual_minutes,assigned_to,started_at")
        .order("sequence");
      if (error) throw error;
      return data;
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["kiosk-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id,job_id,vehicle_id,notes,mileage,inspection_defects(panel,defect_type,severity,note)");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["job-phases"] });

  const seedPhases = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      const total = Number(job?.estimated_hours) || 6;
      const rows = PRODUCTION_PHASES.map((p, i) => ({
        organization_id: orgId,
        job_id: jobId,
        phase: p.key,
        sequence: i,
        estimated_hours: Math.round((total * (p.hours / 7.5)) * 10) / 10 || p.hours,
        assigned_to: job?.installer ?? null,
      }));
      const { error } = await supabase.from("job_phases").insert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setPhase = useMutation({
    mutationFn: async ({ phase, action }: { phase: Phase; action: "start" | "pause" | "complete" }) => {
      const now = new Date();
      const elapsed = phase.started_at
        ? (now.getTime() - new Date(phase.started_at).getTime()) / 60000
        : 0;
      if (action === "start") {
        const { error } = await supabase
          .from("job_phases")
          .update({ status: "active", started_at: now.toISOString() })
          .eq("id", phase.id);
        if (error) throw error;
        return;
      }
      const minutes = Math.round(Number(phase.actual_minutes) + elapsed);
      const { error } = await supabase
        .from("job_phases")
        .update({
          status: action === "pause" ? "paused" : "complete",
          actual_minutes: minutes,
          started_at: null,
          ...(action === "complete" ? { completed_at: now.toISOString() } : {}),
        })
        .eq("id", phase.id);
      if (error) throw error;
      if (orgId && elapsed > 0) {
        await supabase.from("time_entries").insert({
          organization_id: orgId,
          job_phase_id: phase.id,
          tech_name: phase.assigned_to,
          minutes: Math.round(elapsed),
          ended_at: now.toISOString(),
        });
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const job = jobs.find((j) => j.id === openJob) ?? null;
  const jobPhases = phases.filter((p) => p.job_id === openJob) as Phase[];
  const inspection = inspections.find((i) => i.job_id === openJob);

  if (job) {
    const done = jobPhases.filter((p) => p.status === "complete").length;
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-24">
        <Button variant="ghost" className="min-h-12" onClick={() => setOpenJob(null)}>
          <ArrowLeft className="mr-2 h-5 w-5" /> My Day
        </Button>

        <Panel className="p-5 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <p className="micro-label">
                {job.scheduled_start ? new Date(job.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Unscheduled"} · {job.bay ?? "No bay"}
              </p>
              <h1 className="display-title mt-2 text-2xl sm:text-3xl">
                {[job.vehicles?.year, job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ") || job.title}
              </h1>
              <p className="mt-2 text-base font-medium">{label(job.service_type)}</p>
            </div>
            <Tag tone="rig">{done}/{jobPhases.length || PRODUCTION_PHASES.length} phases done</Tag>
          </div>
          <dl className="mt-5 grid gap-3 border-t border-elevated pt-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 font-medium">{job.customers?.name ?? "No customer"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Vehicle</dt><dd className="mt-1 font-medium">{[job.vehicles?.year, job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ") || "No vehicle"}{job.vehicles?.plate ? ` · ${job.vehicles.plate}` : ""}</dd></div>
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle title="Checklist" hint="Complete each step in order" />
            <div className="space-y-3 border-t border-elevated p-4 sm:p-5">
              {jobPhases.length === 0 ? (
                <div className="rounded-xl border border-dashed border-elevated p-6 text-center">
                  <p className="text-sm text-muted-foreground">No phases on this vehicle yet.</p>
                  <Button className="mt-3" onClick={() => seedPhases.mutate(job.id)} disabled={seedPhases.isPending}>
                    Start the job
                  </Button>
                </div>
              ) : (
                jobPhases.map((p) => {
                  const est = Number(p.estimated_hours) * 60;
                  const actual = Number(p.actual_minutes);
                  const over = actual > est && est > 0;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-xl border p-4 sm:p-5",
                        p.status === "active" ? "border-bronze bg-bronze/10" : "border-elevated bg-surface-2",
                      )}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-lg font-semibold">
                            {PRODUCTION_PHASES.find((x) => x.key === p.phase)?.label ?? label(p.phase)}
                          </p>
                          <p className={cn("text-sm", over ? "text-critical" : "text-muted-foreground")}>
                            {Math.round(actual)} min logged · {Math.round(est)} min estimated
                            {p.assigned_to ? ` · ${p.assigned_to}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {p.status !== "complete" && p.status !== "active" && (
                            <Button size="lg" className="min-h-12" onClick={() => setPhase.mutate({ phase: p, action: "start" })}>
                              <Play className="mr-1.5 h-5 w-5" /> Start
                            </Button>
                          )}
                          {p.status === "active" && (
                            <Button size="lg" className="min-h-12" variant="outline" onClick={() => setPhase.mutate({ phase: p, action: "pause" })}>
                              <Pause className="mr-1.5 h-5 w-5" /> Pause
                            </Button>
                          )}
                          {p.status !== "complete" && (
                            <Button size="lg" className="min-h-12" variant="outline" onClick={() => setPhase.mutate({ phase: p, action: "complete" })}>
                              <Check className="mr-1.5 h-5 w-5" /> Done
                            </Button>
                          )}
                          {p.status === "complete" && <Tag tone="revenue">Complete</Tag>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-5">
              <p className="micro-label">Instructions & material</p>
              <p className="mt-2 text-sm">
                {job.inventory_rolls
                  ? `${job.inventory_rolls.roll_code} · ${job.inventory_rolls.product_line ?? ""} · lot ${job.inventory_rolls.lot_number ?? "—"}`
                  : "No roll assigned"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(job.film_feet_estimate) || 0} ft estimated for this vehicle
              </p>
              {job.cut_file_url && (
                <a href={job.cut_file_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-comms underline">
                  Open plot cut file
                </a>
              )}
            </Panel>

            <Panel className="p-5">
              <p className="micro-label">Inspection & photos</p>
              {inspection ? (
                <ul className="mt-2 space-y-1.5">
                  {(inspection.inspection_defects ?? []).map((d, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      <span className={d.severity === "critical" ? "text-critical" : "text-urgent"}>•</span>{" "}
                      {label(d.defect_type)} — {label(d.panel)} {d.note ? `· ${d.note}` : ""}
                    </li>
                  ))}
                  {(inspection.inspection_defects ?? []).length === 0 && (
                    <li className="text-sm text-muted-foreground">No pre-existing damage logged.</li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No inspection linked to this job.</p>
              )}
            </Panel>

            {job.notes && (
              <Panel className="p-5 sm:col-span-2">
                <p className="micro-label">Notes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{job.notes}</p>
              </Panel>
            )}
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-elevated bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button asChild size="lg" className="mx-auto min-h-14 w-full max-w-3xl text-sm font-semibold">
            <Link to="/qc">Ready for QC</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My Day"
        subtitle="Today’s assigned vehicles and work steps."
      />

      {jobs.length === 0 ? (
        <Panel className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing is booked in today.</p>
        </Panel>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const mine = phases.filter((p) => p.job_id === j.id);
            const done = mine.filter((p) => p.status === "complete").length;
            const active = mine.some((p) => p.status === "active");
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => setOpenJob(j.id)}
                className={cn(
                  "grid min-h-36 w-full grid-cols-[84px_minmax(0,1fr)] gap-4 rounded-xl border p-5 text-left transition-colors sm:min-h-40 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center",
                  active ? "border-bronze bg-bronze/10" : "border-elevated bg-surface hover:border-bronze/40",
                )}
              >
                <div>
                  <p className="text-lg font-semibold tabular-nums">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Unscheduled"}</p>
                  <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">{j.bay ?? "No bay"}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold leading-tight">{[j.vehicles?.year, j.vehicles?.make, j.vehicles?.model].filter(Boolean).join(" ") || j.title}</p>
                  <p className="mt-2 text-base">{label(j.service_type)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{j.customers?.name ?? "No customer"}</p>
                  <div className="mt-3 sm:hidden"><Tag tone={active ? "bronze" : "muted"}>{mine.length ? `${done}/${mine.length} steps` : "Not started"}</Tag></div>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:text-right">
                  <Tag tone={active ? "bronze" : "muted"}>{mine.length ? `${done}/${mine.length} steps` : "Not started"}</Tag>
                  <p className="mt-3 text-sm font-semibold text-bronze">{mine.length ? "Open job" : "Start job"}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
