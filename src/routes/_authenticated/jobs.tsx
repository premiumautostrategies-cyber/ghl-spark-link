import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { label } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Production Board — Systemize" },
      { name: "description", content: "Every vehicle in the shop, stage by stage." },
      { property: "og:title", content: "Production Board — Systemize" },
      { property: "og:description", content: "Every vehicle in the shop, stage by stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsPage,
});

type ProductionStage = "arrived" | "prep" | "in_progress" | "qc" | "ready" | "completed";

type PhaseRow = {
  job_id: string;
  phase: string;
  status: string;
};

const STAGES: { key: ProductionStage; label: string }[] = [
  { key: "arrived", label: "Arrived" },
  { key: "prep", label: "Prep" },
  { key: "in_progress", label: "In Progress" },
  { key: "qc", label: "QC" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
];

const STAGE_ACCENT: Record<ProductionStage, string> = {
  arrived: "bg-muted-foreground",
  prep: "bg-comms",
  in_progress: "bg-bronze",
  qc: "bg-urgent",
  ready: "bg-revenue",
  completed: "bg-muted-foreground",
};

function productionStage(status: string, phases: PhaseRow[]): ProductionStage {
  if (status === "ready_for_pickup") return "ready";
  if (status === "completed" || status === "invoiced") return "completed";
  if (status !== "in_progress") return "arrived";
  if (phases.length > 0 && phases.every((phase) => phase.status === "complete")) return "qc";
  const prep = phases.find((phase) => phase.phase === "wash_prep");
  if (prep && prep.status !== "complete") return "prep";
  return "in_progress";
}

function dueLabel(value: string | null) {
  if (!value) return "No due time";
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDate(date, today) ? "Today" : sameDate(date, tomorrow) ? "Tomorrow" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function JobsPage() {
  const qc = useQueryClient();
  const [installer, setInstaller] = useState("all");

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-board"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name), vehicles(year,make,model,color)")
        .order("scheduled_start", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["production-board-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_phases")
        .select("job_id,phase,status")
        .order("sequence");
      if (error) throw error;
      return (data ?? []) as PhaseRow[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job moved");
      qc.invalidateQueries({ queryKey: ["jobs-board"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const installers = Array.from(new Set(jobs.map((job) => job.installer).filter(Boolean))) as string[];
  const visible = installer === "all" ? jobs : jobs.filter((job) => job.installer === installer);
  const nextStatus: Partial<Record<ProductionStage, string>> = {
    arrived: "in_progress",
    qc: "ready_for_pickup",
    ready: "completed",
  };
  const nextLabel: Partial<Record<ProductionStage, string>> = {
    arrived: "Start production",
    qc: "Mark ready",
    ready: "Complete job",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        subtitle="Work moving through the shop, from arrival through completion."
        action={
          <Select value={installer} onValueChange={setInstaller}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {installers.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet" body="Book work from Schedule, or load the demo shop from Settings." />
      ) : (
        <div className="no-scrollbar -mx-1 flex max-w-full items-start gap-3 overflow-x-auto px-1 pb-3">
          {STAGES.map((stage) => {
            const list = visible.filter((job) =>
              productionStage(job.status, phases.filter((phase) => phase.job_id === job.id)) === stage.key,
            );
            return (
              <section key={stage.key} className="w-[276px] shrink-0 overflow-hidden rounded-xl border border-elevated bg-surface">
                <header className="flex items-center justify-between border-b border-elevated px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", STAGE_ACCENT[stage.key])} />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">{stage.label}</h2>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                </header>
                <div className="min-h-28 space-y-2 p-2">
                  {list.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No work here</p>}
                  {list.map((job) => {
                    const jobPhases = phases.filter((phase) => phase.job_id === job.id);
                    const done = jobPhases.filter((phase) => phase.status === "complete").length;
                    const vehicle = job.vehicles
                      ? [job.vehicles.year, job.vehicles.make, job.vehicles.model].filter(Boolean).join(" ")
                      : job.title;
                    const target = nextStatus[stage.key];
                    return (
                      <article key={job.id} className="overflow-hidden rounded-lg border border-elevated bg-surface-2">
                        <div className="space-y-2.5 p-3">
                          <div>
                            <h3 className="text-sm font-semibold leading-snug">{vehicle || "Vehicle not assigned"}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">{job.customers?.name ?? "No customer"}</p>
                          </div>
                          <p className="text-sm font-medium">{label(job.service_type)}</p>
                          <dl className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
                            <dt className="text-muted-foreground">Tech</dt>
                            <dd className="truncate">{job.installer || "Unassigned"}</dd>
                            <dt className="text-muted-foreground">Bay</dt>
                            <dd className="truncate">{job.bay || (job.is_mobile ? "Mobile" : "Unassigned")}</dd>
                            <dt className="text-muted-foreground">Due</dt>
                            <dd className="truncate">{dueLabel(job.scheduled_end ?? job.scheduled_start)}</dd>
                          </dl>
                          {jobPhases.length > 0 && (
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Progress</span><span>{done} / {jobPhases.length} steps</span>
                              </div>
                              <div className="h-1 overflow-hidden rounded-full bg-elevated">
                                <div className="h-full bg-bronze" style={{ width: `${(done / jobPhases.length) * 100}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        {target && (
                          <Button
                            variant="ghost"
                            className="h-9 w-full rounded-none border-t border-elevated text-xs"
                            onClick={() => move.mutate({ id: job.id, status: target })}
                          >
                            {nextLabel[stage.key]}
                          </Button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}