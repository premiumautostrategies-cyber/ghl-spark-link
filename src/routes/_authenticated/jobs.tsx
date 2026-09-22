import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_STATUSES, label, money, shortDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Production Board — Systemize" },
      { name: "description", content: "Every vehicle in the shop, stage by stage." },
      { property: "og:title", content: "Production Board — Systemize" },
      { property: "og:description", content: "Every vehicle in the shop, stage by stage." },
    ],
  }),
  component: JobsPage,
});

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

  const installers = Array.from(new Set(jobs.map((j) => j.installer).filter(Boolean))) as string[];
  const visible = installer === "all" ? jobs : jobs.filter((j) => j.installer === installer);

  const inShop = visible.filter((j) => j.status === "in_progress");
  const scheduled = visible.filter((j) => j.status === "scheduled");
  const booked = scheduled.reduce((t, j) => t + Number(j.price), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Board"
        subtitle="What's in the bays, what's next and who's on it."
        action={
          <Select value={installer} onValueChange={setInstaller}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All installers</SelectItem>
              {installers.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="In production" value={String(inShop.length)} />
        <StatCard label="Scheduled" value={String(scheduled.length)} />
        <StatCard label="Booked value" value={money(booked)} hint="Scheduled work" />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Book work from Schedule, or load the demo shop from Settings."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {JOB_STATUSES.map((status) => {
            const list = visible.filter((j) => j.status === status);
            return (
              <div key={status} className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">
                    {label(status)}
                  </h2>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {list.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                  {list.map((j) => {
                    const v = j.vehicles;
                    const idx = JOB_STATUSES.indexOf(status);
                    const next = JOB_STATUSES[idx + 1];
                    return (
                      <div key={j.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-tight">{j.title}</p>
                          <span className="whitespace-nowrap font-semibold">{money(j.price)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {j.customers?.name ?? "No customer"} ·{" "}
                          {v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "No vehicle"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">{label(j.service_type)}</Badge>
                          {j.bay && <Badge variant="outline">{j.bay}</Badge>}
                          {j.installer && <Badge variant="secondary">{j.installer}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {shortDate(j.scheduled_start)}
                        </p>
                        {next && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => move.mutate({ id: j.id, status: next })}
                          >
                            Move to {label(next)}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
