import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import {
  NODE_META,
  PALETTE,
  TRIGGER_LABEL,
  appendLinear,
  defaultConfig,
  emptyGraph,
  linearOrder,
  newId,
  nodeSummary,
  offsetText,
  removeNode,
  simulate,
  validate,
  type NodeKind,
  type WorkflowGraph,
  type WorkflowNode,
} from "@/lib/workflow-engine";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Play, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/automations/$workflowId")({
  head: () => ({
    meta: [
      { title: "Workflow builder — Systemize" },
      { name: "description", content: "Draw the workflow, test it, and turn it on." },
      { property: "og:title", content: "Workflow builder — Systemize" },
      { property: "og:description", content: "Draw the workflow, test it, and turn it on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const { workflowId } = Route.useParams();
  const qc = useQueryClient();
  const { orgId } = useOrg();

  const { data: workflow } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", workflowId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [graph, setGraph] = useState<WorkflowGraph>(emptyGraph());
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setGraph((workflow.graph as unknown as WorkflowGraph) ?? emptyGraph());
    setName(workflow.name);
    setDirty(false);
  }, [workflow]);

  const issues = useMemo(() => validate(graph), [graph]);
  const steps = useMemo(() => simulate(graph), [graph]);
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  function update(next: WorkflowGraph) {
    setGraph(next);
    setDirty(true);
  }

  function patchNode(id: string, config: Record<string, string | number>) {
    update({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...config } } : n)),
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const trigger = String(
        graph.nodes.find((n) => n.type === "trigger")?.config['event'] ?? "lead_created",
      );
      const { error } = await supabase
        .from("workflows")
        .update({
          name,
          graph: graph as never,
          trigger_event: trigger,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workflowId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      toast.success("Workflow saved");
      qc.invalidateQueries({ queryKey: ["workflow", workflowId] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testRun = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("workflow_runs").insert({
        organization_id: orgId,
        workflow_id: workflowId,
        mode: "test",
        status: "completed",
        trigger_summary: `Test run on a sample lead · ${TRIGGER_LABEL[String(graph.nodes.find((n) => n.type === "trigger")?.config['event'])] ?? ""}`,
        steps: steps as never,
        finished_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test run logged — see it under Activity");
      qc.invalidateQueries({ queryKey: ["workflow-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLive = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await supabase.from("workflows").update({ is_active }).eq("id", workflowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", workflowId] }),
  });

  function addNode(type: NodeKind) {
    const id = newId();
    const node: WorkflowNode = {
      id,
      type,
      x: 320,
      y: 60 + graph.nodes.length * 40,
      config: defaultConfig(type),
    };
    const edges = [...graph.edges];
    if (selected && selected.type !== "condition" && !edges.some((e) => e.from === selected.id)) {
      edges.push({ id: newId(), from: selected.id, to: id });
      node.x = selected.x;
      node.y = selected.y + 140;
    }
    update({ nodes: [...graph.nodes, node], edges });
    setSelectedId(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-elevated pb-5">
        <div className="min-w-0">
          <Link
            to="/automations"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Workflows
          </Link>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="mt-2 h-auto border-0 bg-transparent px-0 font-display text-3xl font-semibold focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {workflow?.is_active ? "Live" : "Paused"}
          </span>
          <Switch
            checked={workflow?.is_active ?? false}
            onCheckedChange={(v) => toggleLive.mutate(v)}
          />
          <Button variant="outline" onClick={() => testRun.mutate()} disabled={testRun.isPending}>
            <Play className="mr-1.5 h-4 w-4" /> Test run
          </Button>
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      {issues.length > 0 && (
        <Panel className="border-urgent/40 p-4">
          <p className="micro-label text-urgent">Needs attention</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {issues.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Tabs defaultValue={workflow?.builder === "simple" ? "simple" : "visual"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="visual">Visual builder</TabsTrigger>
          <TabsTrigger value="simple">Step by step</TabsTrigger>
          <TabsTrigger value="preview">Preview run</TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addNode(kind)}
                    className="inline-flex items-center gap-1 rounded-full border border-elevated bg-surface px-3 py-1.5 text-xs font-semibold hover:border-bronze hover:text-bronze"
                  >
                    <Plus className="h-3 w-3" /> {NODE_META[kind].label}
                  </button>
                ))}
              </div>
              <WorkflowCanvas
                graph={graph}
                onChange={update}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <p className="text-xs text-muted-foreground">
                Drag a card to move it. Click “connect” then the next step to link them — an if/then
                card links a yes path and a no path.
              </p>
            </div>
            <Inspector node={selected} onPatch={patchNode} />
          </div>
        </TabsContent>

        <TabsContent value="simple">
          <SimpleBuilder graph={graph} onChange={update} onPatch={patchNode} />
        </TabsContent>

        <TabsContent value="preview">
          <Panel className="p-5">
            <p className="micro-label">Sample run · 2023 Porsche 911 GT3, $3,850 full front PPF</p>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={`${s.nodeId}-${i}`} className="flex gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {offsetText(s.offsetMinutes)}
                  </span>
                  <div className="min-w-0">
                    <Tag tone={NODE_META[s.type].tone}>{s.label}</Tag>
                    <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Inspector({
  node,
  onPatch,
}: {
  node: WorkflowNode | null;
  onPatch: (id: string, config: Record<string, string | number>) => void;
}) {
  if (!node) {
    return (
      <Panel className="p-5">
        <p className="micro-label">Step settings</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a card on the canvas to edit what it does.
        </p>
      </Panel>
    );
  }
  const meta = NODE_META[node.type];
  return (
    <Panel className="h-fit p-5">
      <Tag tone={meta.tone}>{meta.label}</Tag>
      <p className="mt-2 text-xs text-muted-foreground">{meta.blurb}</p>
      <div className="mt-4 space-y-4">
        {meta.fields.map((f) => {
          const value = String(node.config[f.key] ?? "");
          return (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={`${node.id}-${f.key}`}>{f.label}</Label>
              {f.type === "select" ? (
                <Select value={value} onValueChange={(v) => onPatch(node.id, { [f.key]: v })}>
                  <SelectTrigger id={`${node.id}-${f.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea
                  id={`${node.id}-${f.key}`}
                  rows={4}
                  value={value}
                  placeholder={f.placeholder ?? ""}
                  onChange={(e) => onPatch(node.id, { [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  id={`${node.id}-${f.key}`}
                  type={f.type === "number" ? "number" : "text"}
                  value={value}
                  placeholder={f.placeholder ?? ""}
                  onChange={(e) =>
                    onPatch(node.id, {
                      [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                    })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Use {"{{first_name}}"}, {"{{vehicle}}"}, {"{{service}}"} and {"{{proposal_link}}"} to pull in
        the customer's details.
      </p>
    </Panel>
  );
}

function SimpleBuilder({
  graph,
  onChange,
  onPatch,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
  onPatch: (id: string, config: Record<string, string | number>) => void;
}) {
  const order = linearOrder(graph);
  const [openId, setOpenId] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (index < 1 || target < 1 || target >= order.length) return;
    const next = [...order];
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    const edges = next.slice(0, -1).map((n, i) => ({ id: newId(), from: n.id, to: next[i + 1]!.id }));
    onChange({ nodes: graph.nodes, edges });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {order.map((node, i) => {
          const meta = NODE_META[node.type];
          const open = openId === node.id;
          return (
            <Panel key={node.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline text-xs tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={meta.tone}>{meta.label}</Tag>
                    <p className="text-sm text-muted-foreground">{nodeSummary(node)}</p>
                  </div>
                  {open && (
                    <div className="mt-3">
                      <Inspector node={node} onPatch={onPatch} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => move(i, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => move(i, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : node.id)}>
                    {open ? "Done" : "Edit"}
                  </Button>
                  {node.type !== "trigger" && (
                    <button
                      type="button"
                      aria-label="Remove step"
                      className="text-muted-foreground hover:text-critical"
                      onClick={() => onChange(removeNode(graph, node.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      <Panel className="h-fit p-5">
        <p className="micro-label">Add a step</p>
        <div className="mt-3 grid gap-2">
          {PALETTE.filter((k) => k !== "condition").map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onChange(appendLinear(graph, kind))}
              className="rounded-xl border border-elevated px-3 py-2 text-left text-sm hover:border-bronze hover:text-bronze"
            >
              {NODE_META[kind].label}
              <span className="block text-xs text-muted-foreground">{NODE_META[kind].blurb}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Need a yes/no split? Add it on the visual builder.
        </p>
      </Panel>
    </div>
  );
}
