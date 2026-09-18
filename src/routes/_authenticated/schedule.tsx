import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { JOB_STATUSES, money, SERVICE_TYPES, shortDate, STATUS_LABELS } from "@/lib/format";
import { toast } from "sonner";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Drag-free board: set status, bay and date.</p>
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

      <div className="grid gap-4 lg:grid-cols-3">
        {JOB_STATUSES.map((status) => {
          const column = jobs.filter((j) => j.status === status);
          return (
            <div key={status} className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </h2>
                <span className="text-xs text-muted-foreground">{column.length}</span>
              </div>
              <div className="space-y-3 p-4">
                {column.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nothing here.</p>
                )}
                {column.map((job) => (
                  <div key={job.id} className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium">{job.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.customers?.name ?? "No customer"} · {shortDate(job.scheduled_start)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.service_type.toUpperCase()} · {job.bay || "No bay"} ·{" "}
                      {job.installer || "Unassigned"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{money(job.price)}</span>
                      <Select
                        value={job.status}
                        onValueChange={(status) => updateStatus.mutate({ id: job.id, status })}
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
