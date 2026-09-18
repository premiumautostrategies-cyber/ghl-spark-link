import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, shortDate, STATUS_LABELS } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — Systemize" },
      { name: "description", content: "Today's jobs, open estimates and shop revenue." },
      { property: "og:title", content: "Command Center — Systemize" },
      { property: "og:description", content: "Today's jobs, open estimates and shop revenue." },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { data, isLoading } = useQuery({
    queryKey: ["command-center"],
    queryFn: async () => {
      const [jobs, customers, estimates] = await Promise.all([
        supabase.from("jobs").select("*").order("scheduled_start", { ascending: true }),
        supabase.from("customers").select("id"),
        supabase.from("estimates").select("id,status,title,created_at"),
      ]);
      if (jobs.error) throw jobs.error;
      if (customers.error) throw customers.error;
      if (estimates.error) throw estimates.error;
      return { jobs: jobs.data, customers: customers.data, estimates: estimates.data };
    },
  });

  const jobs = data?.jobs ?? [];
  const active = jobs.filter((j) => !["completed", "invoiced"].includes(j.status));
  const pipeline = active.reduce((sum, j) => sum + Number(j.price ?? 0), 0);
  const booked = jobs.filter((j) => j.status === "scheduled").length;
  const openEstimates = (data?.estimates ?? []).filter((e) =>
    ["draft", "sent"].includes(e.status),
  ).length;

  const stats = [
    { label: "Open pipeline", value: money(pipeline) },
    { label: "Jobs booked", value: String(booked) },
    { label: "Open estimates", value: String(openEstimates) },
    { label: "Customers", value: String(data?.customers.length ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-title text-3xl font-bold">Command Center</h1>
          <p className="text-sm text-muted-foreground">Everything moving through your shop today.</p>
        </div>
        <Button asChild>
          <Link to="/schedule">New job</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Up next</h2>
        </div>
        <div className="divide-y divide-border">
          {isLoading && <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && active.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No active jobs yet. Add your first one from the schedule.
            </p>
          )}
          {active.slice(0, 8).map((job) => (
            <div key={job.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{job.title}</p>
                <p className="text-xs text-muted-foreground">
                  {shortDate(job.scheduled_start)} · {job.installer || "Unassigned"} ·{" "}
                  {job.bay || "No bay"}
                </p>
              </div>
              <Badge variant="secondary">{STATUS_LABELS[job.status] ?? job.status}</Badge>
              <span className="w-24 text-right font-medium">{money(job.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
