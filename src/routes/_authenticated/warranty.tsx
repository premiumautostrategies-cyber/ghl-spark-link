import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { label, dayDate } from "@/lib/format";
import { AFTERCARE_STEPS, makeToken } from "@/lib/shop";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/warranty")({
  head: () => ({
    meta: [
      { title: "Warranty & aftercare — Systemize" },
      { name: "description", content: "Digital warranty certificates with film lot numbers and the automated aftercare cadence." },
      { property: "og:title", content: "Warranty & aftercare — Systemize" },
      { property: "og:description", content: "Digital warranty certificates with film lot numbers and the automated aftercare cadence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WarrantyPage,
});

function WarrantyPage() {
  const qc = useQueryClient();
  const { orgId, locId, organization } = useOrg();

  const { data: jobs = [] } = useQuery({
    queryKey: ["warranty-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name,phone), vehicles(year,make,model), inventory_rolls(lot_number,product_line,brand)")
        .in("status", ["ready_for_pickup", "completed", "invoiced"])
        .is("deleted_at", null)
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: warranties = [] } = useQuery({
    queryKey: ["warranties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranties")
        .select("*, customers(name), vehicles(year,make,model)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["aftercare"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aftercare_tasks")
        .select("*, customers(name)")
        .order("scheduled_for");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["warranties"] });
    qc.invalidateQueries({ queryKey: ["aftercare"] });
  };

  const issue = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      if (!job) throw new Error("Job not found");
      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + 10);
      const lots = job.inventory_rolls?.lot_number ? [job.inventory_rolls.lot_number] : [];

      const { error } = await supabase.from("warranties").insert({
        organization_id: orgId,
        location_id: locId,
        customer_id: job.customer_id,
        vehicle_id: job.vehicle_id,
        job_id: job.id,
        certificate_number: `W-${now.getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        token: makeToken(),
        product: [job.inventory_rolls?.brand, job.inventory_rolls?.product_line].filter(Boolean).join(" ") || label(job.service_type),
        coverage_terms:
          "Covers cracking, yellowing, bubbling and delamination of the installed film, plus workmanship on all covered panels. Excludes impact damage, improper washing and third-party modification.",
        roll_lots: lots,
        installer: job.installer,
        issued_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });
      if (error) throw error;

      const reviewUrl = organization?.review_url ?? "https://g.page/r/your-shop/review";
      const rows = AFTERCARE_STEPS.map((step) => {
        const when = new Date(now);
        when.setDate(when.getDate() + step.days);
        return {
          organization_id: orgId,
          job_id: job.id,
          customer_id: job.customer_id,
          kind: step.kind,
          channel: "sms",
          body: step.body.replace("{{review_url}}", reviewUrl),
          scheduled_for: when.toISOString(),
        };
      });
      const { error: e2 } = await supabase.from("aftercare_tasks").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Certificate issued and aftercare queued");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendTask = useMutation({
    mutationFn: async (task: { id: string; job_id: string | null; customer_id: string | null; body: string }) => {
      if (!orgId) throw new Error("No workspace selected");
      await supabase.from("messages").insert({
        organization_id: orgId,
        location_id: locId,
        job_id: task.job_id,
        customer_id: task.customer_id,
        channel: "sms",
        direction: "out",
        is_automated: true,
        body: task.body,
      });
      const { error } = await supabase
        .from("aftercare_tasks")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aftercare message sent");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = tasks.filter((t) => t.status === "pending");
  const due = pending.filter((t) => new Date(t.scheduled_for) <= new Date());
  const uncertified = jobs.filter((j) => !warranties.some((w) => w.job_id === j.id));

  return (
    <div className="space-y-5">
      <div className="border-b border-elevated pb-5">
        <p className="micro-label">Operations</p>
        <h1 className="display-title mt-1 text-3xl font-semibold">Warranty &amp; aftercare</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Certificates carry the film lot numbers; the cure, edge-check and review cadence queues itself.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Certificates issued" value={String(warranties.length)} tone="revenue" />
        <Kpi label="Aftercare queued" value={String(pending.length)} tone="comms" />
        <Kpi label="Due to send now" value={String(due.length)} tone={due.length ? "urgent" : "muted"} />
      </div>

      <Panel>
        <SectionTitle title="Ready to certify" hint="Completed vehicles without a warranty certificate" />
        <div className="divide-y divide-elevated">
          {uncertified.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">
              Every finished vehicle has a certificate.
            </p>
          )}
          {uncertified.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">{j.title}</p>
                <p className="text-xs text-muted-foreground">
                  {j.customers?.name ?? "No customer"} · {label(j.service_type)}
                  {j.inventory_rolls?.lot_number ? ` · lot ${j.inventory_rolls.lot_number}` : " · no roll lot on file"}
                </p>
              </div>
              <Button size="sm" onClick={() => issue.mutate(j.id)} disabled={issue.isPending}>
                Issue certificate
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Certificates" hint="Each one has a customer link with coverage terms and lot numbers" />
        <div className="divide-y divide-elevated">
          {warranties.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">No certificates yet.</p>
          )}
          {warranties.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">{w.certificate_number}</p>
                <p className="text-xs text-muted-foreground">
                  {w.customers?.name ?? "—"} ·{" "}
                  {[w.vehicles?.year, w.vehicles?.make, w.vehicles?.model].filter(Boolean).join(" ")} ·{" "}
                  {w.product ?? "—"} · through {w.expires_at ? dayDate(w.expires_at) : "lifetime"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {w.roll_lots.length > 0 && <Tag tone="muted">lot {w.roll_lots.join(", ")}</Tag>}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(`${window.location.origin}/p/warranty/${w.token}`);
                    toast.success("Certificate link copied");
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Aftercare cadence" hint="Day 3 cure rules · day 14 edge check · day 15 review request" />
        <div className="divide-y divide-elevated">
          {tasks.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">
              Nothing queued — issue a certificate to start the cadence.
            </p>
          )}
          {tasks.slice(0, 20).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {label(t.kind)} · {t.customers?.name ?? "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{t.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone={t.status === "sent" ? "revenue" : new Date(t.scheduled_for) <= new Date() ? "urgent" : "muted"}>
                  {t.status === "sent" ? `sent ${dayDate(t.sent_at)}` : dayDate(t.scheduled_for)}
                </Tag>
                {t.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      sendTask.mutate({
                        id: t.id,
                        job_id: t.job_id,
                        customer_id: t.customer_id,
                        body: t.body,
                      })
                    }
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Send now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
