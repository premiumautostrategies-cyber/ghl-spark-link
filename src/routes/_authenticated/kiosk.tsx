import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { label } from "@/lib/format";
import { PRODUCTION_PHASES, QC_TEMPLATE } from "@/lib/shop";
import { logOpsAlert, OPS_ALERTS_KEY } from "@/lib/ops-alerts";
import { toast } from "sonner";
import { ArrowLeft, Pause, Play, Check, ClipboardCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/kiosk")({
  head: () => ({
    meta: [
      { title: "Shop floor — Systemize" },
      { name: "description", content: "Installer work center: accept work, check in vehicles, run inspections, prep, install and request QC." },
      { property: "og:title", content: "Shop floor — Systemize" },
      { property: "og:description", content: "Installer work center: accept work, check in vehicles, run inspections, prep, install and request QC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KioskPage,
});

type Phase = {
  id: string;
  job_id: string;
  phase: string;
  sequence: number;
  status: string;
  estimated_hours: number | string;
  actual_minutes: number | string;
  assigned_to: string | null;
  started_at: string | null;
};

type Inspection = {
  id: string;
  job_id: string | null;
  status: string;
  mileage: number | null;
  notes: string | null;
};

const PREP_PHASES = ["wash_prep", "plot_cut"];
const INSTALL_PHASES = ["install", "reassembly"];

const STEPS = [
  { key: "accept", label: "Accept" },
  { key: "checkin", label: "Check in" },
  { key: "inspection", label: "Inspection" },
  { key: "prep", label: "Prep" },
  { key: "install", label: "Install" },
  { key: "qc", label: "QC" },
] as const;

function clock(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Unscheduled";
}

function KioskPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [tech, setTech] = useState("");

  const { data: jobs = [] } = useQuery({
    queryKey: ["floor-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "*, customers(name,phone), vehicles(year,make,model,color,plate), inventory_rolls(roll_code,lot_number,product_line)",
        )
        .in("status", ["scheduled", "in_progress", "ready_for_pickup"])
        .is("deleted_at", null)
        .order("scheduled_start");
      if (error) throw error;
      return data;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["floor-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name,is_active")
        .is("deleted_at", null)
        .order("full_name");
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
      return data as Phase[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["floor-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id,job_id,status,mileage,notes,inspection_defects(panel,defect_type,severity,note)");
      if (error) throw error;
      return data as unknown as (Inspection & { inspection_defects: { panel: string; defect_type: string; severity: string; note: string | null }[] })[];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["floor-qc"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qc_checklists").select("id,job_id,status");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["floor-jobs"] });
    qc.invalidateQueries({ queryKey: ["job-phases"] });
    qc.invalidateQueries({ queryKey: ["floor-inspections"] });
    qc.invalidateQueries({ queryKey: ["floor-qc"] });
    qc.invalidateQueries({ queryKey: OPS_ALERTS_KEY });
  };

  const techNames = useMemo(() => {
    const fromTeam = team.filter((t) => t.is_active !== false).map((t) => t.full_name).filter(Boolean) as string[];
    const fromJobs = jobs.map((j) => j.installer).filter(Boolean) as string[];
    return Array.from(new Set([...fromTeam, ...fromJobs]));
  }, [team, jobs]);

  useEffect(() => {
    if (!tech && techNames[0]) setTech(techNames[0]);
  }, [tech, techNames]);

  const acceptJob = useMutation({
    mutationFn: async (jobId: string) => {
      if (!tech) throw new Error("Pick your name first");
      const { error } = await supabase
        .from("jobs")
        .update({ installer: tech, accepted_by: tech, accepted_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job accepted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkIn = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ checked_in_at: new Date().toISOString(), status: "in_progress" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle checked in");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startInspection = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      const { error } = await supabase.from("inspections").insert({
        organization_id: orgId,
        location_id: locId,
        job_id: jobId,
        customer_id: job?.customer_id ?? null,
        vehicle_id: job?.vehicle_id ?? null,
        inspector: tech || null,
        stage: "check_in",
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection started");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeInspection = useMutation({
    mutationFn: async ({ id, mileage, notes }: { id: string; mileage: string; notes: string }) => {
      const { error } = await supabase
        .from("inspections")
        .update({
          mileage: mileage ? Number(mileage) : null,
          notes: notes || null,
          status: "completed",
          inspector: tech || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection complete");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        assigned_to: job?.installer ?? tech ?? null,
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
      const elapsed = phase.started_at ? (now.getTime() - new Date(phase.started_at).getTime()) / 60000 : 0;
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
          tech_name: phase.assigned_to ?? tech,
          minutes: Math.round(elapsed),
          ended_at: now.toISOString(),
        });
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const requestQc = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      let checklistId = checklists.find((c) => c.job_id === jobId)?.id ?? null;
      if (!checklistId) {
        const { data, error } = await supabase
          .from("qc_checklists")
          .insert({ organization_id: orgId, job_id: jobId })
          .select("id")
          .single();
        if (error) throw error;
        checklistId = data.id;
        const { error: e2 } = await supabase.from("qc_items").insert(
          QC_TEMPLATE.map((t, i) => ({
            organization_id: orgId,
            checklist_id: data.id,
            label: t.label,
            kind: t.kind,
            is_required: t.required,
            sort_order: i,
          })),
        );
        if (e2) throw e2;
      } else {
        await supabase.from("qc_checklists").update({ status: "pending" }).eq("id", checklistId);
      }
      const { error: e3 } = await supabase.from("jobs").update({ qc_status: "in_review" }).eq("id", jobId);
      if (e3) throw e3;
      await logOpsAlert({
        organizationId: orgId,
        jobId,
        kind: "qc_requested",
        title: `QC requested — ${job?.title ?? "vehicle"}`,
        body: `${tech || "Installer"} finished install on ${job?.customers?.name ?? "the vehicle"}.`,
        actor: tech || null,
      });
    },
    onSuccess: () => {
      toast.success("QC requested — sales notified");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const job = jobs.find((j) => j.id === openJob) ?? null;

  const stepsFor = (jobId: string, jobRow: (typeof jobs)[number]) => {
    const mine = phases.filter((p) => p.job_id === jobId);
    const inspection = inspections.find((i) => i.job_id === jobId) ?? null;
    const phaseDone = (keys: string[]) => {
      const rows = mine.filter((p) => keys.includes(p.phase));
      return rows.length > 0 && rows.every((p) => p.status === "complete");
    };
    return {
      phases: mine,
      inspection,
      accept: Boolean(jobRow.accepted_at),
      checkin: Boolean(jobRow.checked_in_at),
      inspectionDone: inspection?.status === "completed",
      prep: phaseDone(PREP_PHASES),
      install: phaseDone(INSTALL_PHASES),
      qc: ["in_review", "passed", "failed"].includes(jobRow.qc_status ?? ""),
      qcFailed: jobRow.qc_status === "failed",
      qcPassed: jobRow.qc_status === "passed",
    };
  };

  if (job) {
    const s = stepsFor(job.id, job);
    const done = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].filter(Boolean).length;
    const currentIndex = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].findIndex((v) => !v);
    const vehicle = [job.vehicles?.year, job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ") || job.title;

    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-28">
        <Button variant="ghost" className="min-h-12" onClick={() => setOpenJob(null)}>
          <ArrowLeft className="mr-2 h-5 w-5" /> My work
        </Button>

        {s.qcFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-critical/50 bg-critical/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-critical" />
            <div>
              <p className="text-sm font-semibold text-critical">QC sent this vehicle back</p>
              <p className="mt-1 text-sm text-muted-foreground">Correct the flagged work, then request QC again.</p>
            </div>
          </div>
        )}

        <Panel className="p-5 sm:p-6">
          <p className="micro-label">{clock(job.scheduled_start)} · {job.bay ?? "No bay"}</p>
          <h1 className="display-title mt-2 text-2xl sm:text-3xl">{vehicle}</h1>
          <p className="mt-2 text-base font-medium">{label(job.service_type)}</p>
          <dl className="mt-5 grid gap-3 border-t border-elevated pt-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 font-medium">{job.customers?.name ?? "No customer"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Plate / color</dt><dd className="mt-1 font-medium">{[job.vehicles?.plate, job.vehicles?.color].filter(Boolean).join(" · ") || "—"}</dd></div>
          </dl>

          <ol className="mt-5 flex flex-wrap gap-2 border-t border-elevated pt-4">
            {STEPS.map((step, i) => {
              const complete = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc][i];
              const active = i === currentIndex;
              return (
                <li
                  key={step.key}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                    complete
                      ? "border-revenue/40 bg-revenue/10 text-revenue"
                      : active
                        ? "border-bronze bg-bronze/10 text-bronze"
                        : "border-elevated text-muted-foreground",
                  )}
                >
                  {i + 1}. {step.label}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">{done} of {STEPS.length} steps complete</p>
        </Panel>

        {/* Step 1–2 */}
        <Panel className="p-5">
          <p className="micro-label">Start of day</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="min-h-14" disabled={s.accept || acceptJob.isPending} onClick={() => acceptJob.mutate(job.id)}>
              {s.accept ? `Accepted${job.accepted_by ? ` by ${job.accepted_by}` : ""}` : "Accept this job"}
            </Button>
            <Button size="lg" variant={s.accept && !s.checkin ? "default" : "outline"} className="min-h-14" disabled={!s.accept || s.checkin || checkIn.isPending} onClick={() => checkIn.mutate(job.id)}>
              {s.checkin ? `Checked in ${clock(job.checked_in_at)}` : "Check in vehicle"}
            </Button>
          </div>
        </Panel>

        {/* Inspection */}
        <Panel>
          <SectionTitle title="Intake inspection" hint="Log condition before any film touches the car" right={<Link to="/inspections" className="text-xs text-comms underline">Full panel map</Link>} />
          <div className="border-t border-elevated p-4 sm:p-5">
            {!s.checkin ? (
              <p className="text-sm text-muted-foreground">Check the vehicle in to start the inspection.</p>
            ) : !s.inspection ? (
              <Button size="lg" className="min-h-14 w-full" disabled={startInspection.isPending} onClick={() => startInspection.mutate(job.id)}>
                Start inspection
              </Button>
            ) : s.inspectionDone ? (
              <div className="space-y-2">
                <Tag tone="revenue">Inspection complete</Tag>
                <p className="text-sm text-muted-foreground">
                  {s.inspection.mileage ? `${s.inspection.mileage} mi · ` : ""}{s.inspection.notes || "No condition notes."}
                </p>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  completeInspection.mutate({
                    id: s.inspection!.id,
                    mileage: String(f.get("mileage") || ""),
                    notes: String(f.get("notes") || ""),
                  });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mileage" className="text-xs">Mileage</Label>
                  <Input id="mileage" name="mileage" type="number" inputMode="numeric" className="min-h-12" defaultValue={s.inspection.mileage ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Condition notes & pre-existing damage</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={s.inspection.notes ?? ""} placeholder="Rock chips on hood, swirls on driver door…" />
                </div>
                <Button type="submit" size="lg" className="min-h-14 w-full" disabled={completeInspection.isPending}>
                  Complete inspection
                </Button>
              </form>
            )}
          </div>
        </Panel>

        {/* Prep & install */}
        <Panel>
          <SectionTitle title="Prep & install" hint="Work the steps in order" />
          <div className="space-y-3 border-t border-elevated p-4 sm:p-5">
            {!s.inspectionDone ? (
              <p className="text-sm text-muted-foreground">Finish the inspection to open production steps.</p>
            ) : s.phases.length === 0 ? (
              <Button size="lg" className="min-h-14 w-full" disabled={seedPhases.isPending} onClick={() => seedPhases.mutate(job.id)}>
                Start production steps
              </Button>
            ) : (
              s.phases.map((p) => {
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
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">
                          {PRODUCTION_PHASES.find((x) => x.key === p.phase)?.label ?? label(p.phase)}
                        </p>
                        <p className={cn("text-sm", over ? "text-critical" : "text-muted-foreground")}>
                          {Math.round(actual)} min logged · {Math.round(est)} min estimated
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {p.status !== "complete" && p.status !== "active" && (
                          <Button size="lg" className="min-h-12 flex-1" onClick={() => setPhase.mutate({ phase: p, action: "start" })}>
                            <Play className="mr-1.5 h-5 w-5" /> Start
                          </Button>
                        )}
                        {p.status === "active" && (
                          <Button size="lg" variant="outline" className="min-h-12 flex-1" onClick={() => setPhase.mutate({ phase: p, action: "pause" })}>
                            <Pause className="mr-1.5 h-5 w-5" /> Pause
                          </Button>
                        )}
                        {p.status !== "complete" && (
                          <Button size="lg" variant="outline" className="min-h-12 flex-1" onClick={() => setPhase.mutate({ phase: p, action: "complete" })}>
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
            <p className="mt-1 text-xs text-muted-foreground">{Number(job.film_feet_estimate) || 0} ft estimated for this vehicle</p>
            {job.cut_file_url && (
              <a href={job.cut_file_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-comms underline">
                Open plot cut file
              </a>
            )}
          </Panel>
          <Panel className="p-5">
            <p className="micro-label">Logged damage</p>
            <ul className="mt-2 space-y-1.5">
              {(s.inspection?.inspection_defects ?? []).map((d, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className={d.severity === "critical" ? "text-critical" : "text-urgent"}>•</span>{" "}
                  {label(d.defect_type)} — {label(d.panel)} {d.note ? `· ${d.note}` : ""}
                </li>
              ))}
              {(s.inspection?.inspection_defects ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No pre-existing damage logged.</li>
              )}
            </ul>
          </Panel>
          <Panel className="p-5 sm:col-span-2">
            <p className="micro-label">Notes</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {job.notes || "No special instructions or technician notes."}
            </p>
          </Panel>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-elevated bg-background/95 p-3 backdrop-blur">
          {s.qcPassed ? (
            <Button asChild size="lg" className="mx-auto min-h-14 w-full max-w-3xl text-sm font-semibold">
              <Link to="/qc">QC passed — vehicle ready</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="mx-auto min-h-14 w-full max-w-3xl text-sm font-semibold"
              disabled={!s.install || requestQc.isPending || job.qc_status === "in_review"}
              onClick={() => requestQc.mutate(job.id)}
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              {job.qc_status === "in_review" ? "QC requested — awaiting review" : s.install ? "Request QC" : "Finish install to request QC"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const myJobs = tech ? jobs.filter((j) => j.installer === tech || j.accepted_by === tech) : [];
  const openJobs = jobs.filter((j) => !j.installer && j.status === "scheduled");

  const JobCard = ({ item, mode }: { item: (typeof jobs)[number]; mode: "mine" | "open" }) => {
    const s = stepsFor(item.id, item);
    const stepDone = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].filter(Boolean).length;
    const next = s.qcFailed
      ? "QC returned — fix and resubmit"
      : !s.accept
        ? mode === "open" ? "Claim this job" : "Accept this job"
        : !s.checkin
          ? "Check in vehicle"
          : !s.inspectionDone
            ? "Run inspection"
            : !s.install
              ? "Prep & install"
              : !s.qc
                ? "Request QC"
                : s.qcPassed ? "Ready for delivery" : "In QC review";
    return (
      <div
        className={cn(
          "rounded-xl border p-5",
          s.qcFailed ? "border-critical/50 bg-critical/5" : s.accept ? "border-elevated bg-surface" : "border-bronze/40 bg-bronze/5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-bronze">{clock(item.scheduled_start)} · {item.bay ?? "No bay"}</p>
            <p className="mt-1 truncate text-xl font-semibold leading-tight">
              {[item.vehicles?.year, item.vehicles?.make, item.vehicles?.model].filter(Boolean).join(" ") || item.title}
            </p>
            <p className="mt-1 text-base">{label(item.service_type)}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.customers?.name ?? "No customer"}</p>
          </div>
          <Tag tone={s.qcFailed ? "critical" : s.accept ? "bronze" : "muted"}>{stepDone}/{STEPS.length} steps</Tag>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {mode === "open" ? (
            <Button size="lg" className="min-h-14" disabled={!tech || acceptJob.isPending} onClick={() => acceptJob.mutate(item.id)}>
              Claim job
            </Button>
          ) : (
            <Button size="lg" variant={s.accept ? "outline" : "default"} className="min-h-14" onClick={() => setOpenJob(item.id)}>
              {next}
            </Button>
          )}
          <Button size="lg" variant="outline" className="min-h-14" onClick={() => setOpenJob(item.id)}>
            Open job
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Shop floor"
        subtitle={tech ? `${tech}’s work center — accept, check in, install and hand off to QC.` : "Choose your name to see your work."}
        action={
          <Select value={tech} onValueChange={(value) => { setTech(value); setOpenJob(null); }}>
            <SelectTrigger className="min-h-12 w-full sm:w-56">
              <SelectValue placeholder="Choose installer" />
            </SelectTrigger>
            <SelectContent>
              {techNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">My jobs</h2>
        {myJobs.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{tech ? `Nothing assigned to ${tech} right now.` : "Pick your name above."}</p>
          </Panel>
        ) : (
          myJobs.map((item) => <JobCard key={item.id} item={item} mode="mine" />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Open jobs you can claim</h2>
        {openJobs.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No unassigned work on the board.</p>
          </Panel>
        ) : (
          openJobs.map((item) => <JobCard key={item.id} item={item} mode="open" />)
        )}
      </section>
    </div>
  );
}
