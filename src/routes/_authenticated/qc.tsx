import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { label, shortDate } from "@/lib/format";
import { QC_TEMPLATE } from "@/lib/shop";
import { toast } from "sonner";
import { Lock, LockOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { logOpsAlert, OPS_ALERTS_KEY } from "@/lib/ops-alerts";

export const Route = createFileRoute("/_authenticated/qc")({
  head: () => ({
    meta: [
      { title: "Quality control — Systemize" },
      { name: "description", content: "Foreman sign-off gate: post-heat temps, bubble checks and key release." },
      { property: "og:title", content: "Quality control — Systemize" },
      { property: "og:description", content: "Foreman sign-off gate: post-heat temps, bubble checks and key release." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QcPage,
});

type Item = {
  id: string;
  label: string;
  kind: string;
  is_required: boolean;
  passed: boolean;
  value_text: string | null;
  sort_order: number;
};

const FILM_SERVICES = ["ppf", "wrap", "color_change", "tint"];
const needsHeatCheck = (serviceType: string | null | undefined) =>
  FILM_SERVICES.includes((serviceType ?? "").toLowerCase());

function QcPage() {
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [correction, setCorrection] = useState("");


  const { data: jobs = [] } = useQuery({
    queryKey: ["qc-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name), vehicles(year,make,model)")
        .in("status", ["in_progress", "ready_for_pickup", "scheduled"])
        .is("deleted_at", null)
        .order("scheduled_start");
      if (error) throw error;
      return data;
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["qc-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qc_checklists")
        .select("*, qc_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["qc-checklists"] });
    qc.invalidateQueries({ queryKey: ["qc-jobs"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["floor-jobs"] });
    qc.invalidateQueries({ queryKey: OPS_ALERTS_KEY });
  };

  const startChecklist = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const { data, error } = await supabase
        .from("qc_checklists")
        .insert({ organization_id: orgId, job_id: jobId })
        .select("id")
        .single();
      if (error) throw error;
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
      await supabase.from("jobs").update({ qc_status: "in_review" }).eq("id", jobId);
    },
    onSuccess: () => {
      toast.success("QC checklist opened");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { passed?: boolean; value_text?: string } }) => {
      const { error } = await supabase.from("qc_items").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const signOff = useMutation({
    mutationFn: async ({
      checklistId,
      jobId,
      inspector,
      temp,
      notes,
      items,
      requireTemp,
    }: {
      checklistId: string;
      jobId: string;
      inspector: string;
      temp: number;
      notes: string;
      items: Item[];
      requireTemp: boolean;
    }) => {
      const missing = items.filter((i) => i.is_required && !i.passed);
      if (missing.length) throw new Error(`${missing.length} required check(s) still open`);
      if (!inspector.trim()) throw new Error("Enter the lead installer or foreman name");
      if (requireTemp && !(temp >= 190 && temp <= 200)) {
        throw new Error("Log a post-heat edge temp between 190°F and 200°F for film work");
      }
      const { error } = await supabase
        .from("qc_checklists")
        .update({
          status: "passed",
          inspector: inspector.trim(),
          ...(requireTemp ? { edge_temp_f: temp } : {}),
          notes: notes || null,
          signed_at: new Date().toISOString(),
        })
        .eq("id", checklistId);
      if (error) throw error;
      await supabase
        .from("jobs")
        .update({ qc_status: "passed", key_released: true, status: "ready_for_pickup" })
        .eq("id", jobId);
      if (orgId) {
        const job = jobs.find((j) => j.id === jobId);
        await logOpsAlert({
          organizationId: orgId,
          jobId,
          kind: "qc_passed",
          title: `Vehicle ready — ${job?.title ?? "vehicle"}`,
          body: `${job?.customers?.name ?? "The customer"} can be called for pickup.`,
          actor: inspector.trim() || null,
        });
      }
    },
    onSuccess: () => {
      toast.success("QC passed — keys released and invoicing unlocked");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const failQc = useMutation({
    mutationFn: async ({
      checklistId,
      jobId,
      reason,
      existingNotes,
    }: {
      checklistId: string;
      jobId: string;
      reason: string;
      existingNotes: string | null;
    }) => {
      if (reason.trim().length < 5) {
        throw new Error("Tell the installer exactly what to correct before sending it back");
      }
      const stamped = `QC correction (${new Date().toLocaleString("en-US")}): ${reason.trim()}`;
      await supabase
        .from("qc_checklists")
        .update({
          status: "failed",
          notes: existingNotes ? `${existingNotes}\n${stamped}` : stamped,
        })
        .eq("id", checklistId);
      await supabase
        .from("jobs")
        .update({ qc_status: "failed", key_released: false, status: "in_progress" })
        .eq("id", jobId);
      if (orgId) {
        const job = jobs.find((j) => j.id === jobId);
        await logOpsAlert({
          organizationId: orgId,
          jobId,
          kind: "qc_failed",
          title: `QC returned — ${job?.title ?? "vehicle"}`,
          body: reason.trim(),
          actor: job?.installer ?? null,
        });
      }
    },
    onSuccess: () => {
      toast.warning("Sent back to the installer with correction notes");
      setCorrection("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checklistFor = (jobId: string) => checklists.find((c) => c.job_id === jobId) ?? null;
  const current = jobs.find((j) => j.id === selected) ?? null;
  const currentList = current ? checklistFor(current.id) : null;
  const currentItems = ([...((currentList?.qc_items ?? []) as Item[])]).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const submitted = jobs.filter((j) => ["in_review", "failed", "passed"].includes(j.qc_status ?? ""));
  const visibleJobs = showAll ? jobs : submitted;
  const awaiting = jobs.filter((j) => j.qc_status === "in_review" || j.qc_status === "failed");
  const passed = jobs.filter((j) => j.qc_status === "passed");


  return (
    <div className="space-y-5">
      <PageHeader
        title="Quality control"
        subtitle="No vehicle reaches ready for pickup until the foreman signs every required check."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Awaiting QC" value={String(awaiting.length)} tone={awaiting.length ? "urgent" : "muted"} />
        <Kpi label="Passed & keys released" value={String(passed.length)} tone="revenue" />
        <Kpi
          label="Failed / reworking"
          value={String(jobs.filter((j) => j.qc_status === "failed").length)}
          tone="critical"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_1fr]">
        <Panel>
          <SectionTitle
            title={showAll ? "All vehicles in production" : "Submitted for QC"}
            hint={showAll ? "Everything on the floor" : "Installers have finished these"}
            right={
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show submitted only" : "Show all in production"}
              </Button>
            }
          />
          <div className="divide-y divide-elevated">
            {visibleJobs.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                {showAll ? "Nothing in production." : "No vehicles waiting on QC right now."}
              </p>
            )}
            {visibleJobs.map((j) => {
              const list = checklistFor(j.id);
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelected(j.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-4 py-3 text-left",
                    selected === j.id && "bg-surface-2",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{j.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {j.customers?.name ?? "No customer"} · {shortDate(j.scheduled_start)}
                    </p>
                  </div>
                  <Tag
                    tone={
                      j.qc_status === "passed" ? "revenue" : j.qc_status === "failed" ? "critical" : list ? "urgent" : "muted"
                    }
                  >
                    {label(j.qc_status ?? "not_started")}
                  </Tag>
                </button>
              );
            })}
          </div>
        </Panel>

        {current ? (
          <Panel>
            <SectionTitle
              title={current.title}
              hint={`${current.customers?.name ?? "No customer"} · ${current.installer ?? "Unassigned"}`}
              right={
                current.key_released ? (
                  <Tag tone="revenue"><LockOpen className="mr-1 inline h-3 w-3" /> Keys released</Tag>
                ) : (
                  <Tag tone="critical"><Lock className="mr-1 inline h-3 w-3" /> Keys locked</Tag>
                )
              }
            />
            <div className="border-t border-elevated p-4">
              {!currentList ? (
                <div className="rounded-xl border border-dashed border-elevated p-8 text-center">
                  <p className="text-sm text-muted-foreground">No QC checklist opened for this vehicle.</p>
                  <Button className="mt-3" onClick={() => startChecklist.mutate(current.id)} disabled={startChecklist.isPending}>
                    Open QC checklist
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    signOff.mutate({
                      checklistId: currentList.id,
                      jobId: current.id,
                      inspector: String(f.get("inspector") || ""),
                      temp: Number(f.get("temp") || 0),
                      notes: String(f.get("notes") || ""),
                      items: currentItems,
                      requireTemp: needsHeatCheck(current.service_type),
                    });
                  }}
                >
                  <div className="space-y-2">
                    {currentItems.map((i) => (
                      <label
                        key={i.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                          i.passed ? "border-revenue/40 bg-revenue/10" : "border-elevated bg-surface-2",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-current"
                          checked={i.passed}
                          onChange={(e) => toggleItem.mutate({ id: i.id, patch: { passed: e.target.checked } })}
                        />
                        <span className="min-w-0 flex-1 text-sm">{i.label}</span>
                        {i.is_required && <Tag tone="muted">required</Tag>}
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {needsHeatCheck(current.service_type) && (
                      <div className="space-y-1.5">
                        <Label htmlFor="temp" className="text-xs">Post-heat edge temp (°F)</Label>
                        <Input
                          id="temp"
                          name="temp"
                          type="number"
                          step="1"
                          defaultValue={currentList.edge_temp_f ?? 195}
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "space-y-1.5",
                        needsHeatCheck(current.service_type) ? "sm:col-span-2" : "sm:col-span-3",
                      )}
                    >
                      <Label htmlFor="inspector" className="text-xs">Signed off by</Label>
                      <Input
                        id="inspector"
                        name="inspector"
                        placeholder="Lead installer or foreman"
                        defaultValue={currentList.inspector ?? current.installer ?? ""}
                      />
                    </div>
                  </div>
                  {!needsHeatCheck(current.service_type) && (
                    <p className="text-xs text-muted-foreground">
                      {label(current.service_type ?? "this service")} does not use a post-heat temperature check.
                    </p>
                  )}
                  <Textarea name="notes" rows={2} placeholder="Notes for the file" defaultValue={currentList.notes ?? ""} />

                  <div className="space-y-2 rounded-xl border border-elevated bg-surface-2 p-3">
                    <Label htmlFor="correction" className="text-xs">
                      If something needs redoing, tell the installer what to correct
                    </Label>
                    <Textarea
                      id="correction"
                      rows={2}
                      value={correction}
                      onChange={(e) => setCorrection(e.target.value)}
                      placeholder="Lifted edge on the driver fender — re-tuck and post-heat."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={signOff.isPending || currentList.status === "passed"}>
                      Pass QC &amp; release keys
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={failQc.isPending || correction.trim().length < 5}
                      onClick={() =>
                        failQc.mutate({
                          checklistId: currentList.id,
                          jobId: current.id,
                          reason: correction,
                          existingNotes: currentList.notes ?? null,
                        })
                      }
                    >
                      Fail — send back to installer
                    </Button>
                  </div>
                  {currentList.status === "passed" && (
                    <p className="text-xs text-revenue">
                      Passed by {currentList.inspector}
                      {currentList.edge_temp_f ? ` at ${Number(currentList.edge_temp_f)}°F` : ""} — invoicing unlocked.
                    </p>
                  )}
                </form>

              )}
            </div>
          </Panel>
        ) : (
          <Panel className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Pick a vehicle to run its quality gate.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
