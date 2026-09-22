import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AUTOMATION_TRIGGERS, label } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, Workflow as WorkflowIcon } from "lucide-react";
import {
  RECIPES,
  TRIGGERS,
  TRIGGER_LABEL,
  emptyGraph,
  type WorkflowGraph,
} from "@/lib/workflow-engine";

export const Route = createFileRoute("/_authenticated/automations/")({
  head: () => ({
    meta: [
      { title: "Workflows — Systemize" },
      {
        name: "description",
        content: "Build visual shop workflows, quick follow-up rules and watch every run.",
      },
      { property: "og:title", content: "Workflows — Systemize" },
      {
        property: "og:description",
        content: "Build visual shop workflows, quick follow-up rules and watch every run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AutomationsPage,
});

function delayText(minutes: number) {
  if (minutes === 0) return "immediately";
  if (minutes < 60) return `after ${minutes} min`;
  if (minutes < 1440) return `after ${Math.round(minutes / 60)} h`;
  return `after ${Math.round(minutes / 1440)} days`;
}

function AutomationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        subtitle="Build the follow-up your shop would do on its best day — then let it run every day."
      />
      <Tabs defaultValue="workflows" className="space-y-5">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="rules">Quick rules</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="workflows">
          <WorkflowsTab />
        </TabsContent>
        <TabsContent value="rules">
          <QuickRulesTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Workflows ---------------- */

function WorkflowsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { orgId } = useOrg();
  const [open, setOpen] = useState(false);
  const [recipe, setRecipe] = useState("blank");

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const picked = RECIPES.find((r) => r.key === recipe);
      const trigger = String(form.get("trigger_event") || "lead_created");
      const graph: WorkflowGraph = picked
        ? {
            ...picked.graph,
            nodes: picked.graph.nodes.map((n) =>
              n.type === "trigger" ? { ...n, config: { event: trigger } } : n,
            ),
          }
        : emptyGraph(trigger);
      const { data, error } = await supabase
        .from("workflows")
        .insert({
          organization_id: orgId,
          name: String(form.get("name") || picked?.name || "New workflow"),
          description: picked?.description ?? "",
          trigger_event: trigger,
          graph: graph as never,
          builder: String(form.get("builder") || "visual"),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["workflows"] });
      navigate({ to: "/automations/$workflowId", params: { workflowId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("workflows").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const selected = RECIPES.find((r) => r.key === recipe);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Workflows" value={String(workflows.length)} />
        <StatCard label="Live" value={String(workflows.filter((w) => w.is_active).length)} />
        <StatCard
          label="Total runs"
          value={String(workflows.reduce((t, w) => t + (w.run_count ?? 0), 0))}
        />
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New workflow</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New workflow</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label>Start from</Label>
                <div className="grid gap-2">
                  {[{ key: "blank", name: "Blank canvas", description: "Start with just a trigger." }, ...RECIPES].map(
                    (r) => (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => setRecipe(r.key)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          recipe === r.key
                            ? "border-bronze bg-bronze/10"
                            : "border-elevated hover:bg-surface-2"
                        }`}
                      >
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-name">Name</Label>
                <Input
                  id="wf-name"
                  name="name"
                  defaultValue={selected?.name ?? ""}
                  key={recipe}
                  placeholder="Two-minute speed to lead"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select
                    name="trigger_event"
                    defaultValue={
                      selected
                        ? String(
                            selected.graph.nodes.find((n) => n.type === "trigger")?.config['event'] ??
                              "lead_created",
                          )
                        : "lead_created"
                    }
                    key={`t-${recipe}`}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Builder</Label>
                  <Select name="builder" defaultValue="visual">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual canvas</SelectItem>
                      <SelectItem value="simple">Step by step</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                Create workflow
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          body="Start with the two-minute speed-to-lead recipe — it wins the most jobs."
        />
      ) : (
        <div className="divide-y divide-elevated overflow-hidden rounded-xl border border-elevated bg-surface">
          {workflows.map((w) => {
            const graph = (w.graph as unknown as WorkflowGraph) ?? emptyGraph();
            return (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2/40">
                <div className="min-w-[240px] flex-1">
                  <div className="min-w-0">
                    <Link
                      to="/automations/$workflowId"
                      params={{ workflowId: w.id }}
                      className="text-sm font-semibold hover:text-bronze"
                    >
                      {w.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{w.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="bronze">{TRIGGER_LABEL[w.trigger_event] ?? w.trigger_event}</Tag>
                  <Tag tone="muted">{graph.nodes.length - 1} steps</Tag>
                  <Tag tone={w.is_active ? "revenue" : "muted"}>{w.is_active ? "Live" : "Paused"}</Tag>
                  <Tag tone="comms">{w.run_count ?? 0} runs</Tag>
                </div>
                <div className="flex items-center gap-4">
                  <Switch checked={w.is_active} onCheckedChange={(v) => toggle.mutate({ id: w.id, is_active: v })} />
                  <Link to="/automations/$workflowId" params={{ workflowId: w.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-bronze">Open <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quick rules ---------------- */

function QuickRulesTab() {
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addRule = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("automations").insert({
        name: String(form.get("name")),
        trigger_event: String(form.get("trigger_event")),
        delay_minutes: Number(form.get("delay_minutes") || 0),
        channel: String(form.get("channel")),
        template: String(form.get("template") || "") || null,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automations").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          One trigger, one message. Good for reminders you don't want to draw on a canvas.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">New quick rule</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New quick rule</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addRule.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="New lead instant text" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>When</Label>
                  <Select name="trigger_event" defaultValue="lead_created">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_TRIGGERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {label(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Send by</Label>
                  <Select name="channel" defaultValue="sms">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="task">Internal task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="delay_minutes">Delay (minutes)</Label>
                  <Input id="delay_minutes" name="delay_minutes" type="number" defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Message</Label>
                <Textarea
                  id="template"
                  name="template"
                  rows={4}
                  placeholder="Hey {{first_name}} — thanks for reaching out about {{service}}."
                />
              </div>
              <Button type="submit" className="w-full" disabled={addRule.isPending}>
                Save rule
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <EmptyState title="No quick rules yet" body="Add a reminder that fires on one event." />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Panel key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    When <span className="text-foreground">{label(r.trigger_event)}</span> ·{" "}
                    {delayText(r.delay_minutes)} · via {label(r.channel)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.is_active ? "secondary" : "outline"}>
                    {r.is_active ? "Live" : "Paused"}
                  </Badge>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })}
                  />
                </div>
              </div>
              {r.template && (
                <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">
                  {r.template}
                </p>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Activity ---------------- */

function ActivityTab() {
  const { data: runs = [] } = useQuery({
    queryKey: ["workflow-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*, workflows(name)")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (runs.length === 0) {
    return (
      <EmptyState
        title="No runs yet"
        body="Test a workflow from its builder and every step lands here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const steps = (run.steps as unknown as { label: string; detail: string }[]) ?? [];
        return (
          <Panel key={run.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WorkflowIcon className="h-4 w-4 text-bronze" />
                <p className="font-semibold">
                  {(run.workflows as { name: string } | null)?.name ?? "Workflow"}
                </p>
                <Tag tone={run.mode === "test" ? "muted" : "revenue"}>{run.mode}</Tag>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(run.started_at).toLocaleString()}
              </p>
            </div>
            {run.trigger_summary && (
              <p className="mt-1 text-xs text-muted-foreground">{run.trigger_summary}</p>
            )}
            <ol className="mt-3 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-xs">
                  <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="w-24 shrink-0 font-semibold uppercase tracking-[0.1em] text-bronze">
                    {s.label}
                  </span>
                  <span className="text-muted-foreground">{s.detail}</span>
                </li>
              ))}
            </ol>
          </Panel>
        );
      })}
    </div>
  );
}
