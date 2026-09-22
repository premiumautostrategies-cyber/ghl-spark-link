import { useRef, useState } from "react";
import { Trash2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/os-ui";
import {
  NODE_META,
  nodeSummary,
  type WorkflowGraph,
  type WorkflowNode,
} from "@/lib/workflow-engine";

const W = 232;
const H = 96;
const CANVAS_W = 1800;
const CANVAS_H = 1400;

type Pending = { from: string; branch?: "yes" | "no" } | null;

function port(node: WorkflowNode, side: "in" | "out", branch?: "yes" | "no") {
  if (side === "in") return { x: node.x + W / 2, y: node.y };
  if (!branch) return { x: node.x + W / 2, y: node.y + H };
  return { x: node.x + (branch === "yes" ? W * 0.25 : W * 0.75), y: node.y + H };
}

function path(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dy = Math.max(30, Math.abs(b.y - a.y) / 2);
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
}

export function WorkflowCanvas({
  graph,
  onChange,
  selectedId,
  onSelect,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  function startDrag(e: React.PointerEvent, node: WorkflowNode) {
    e.preventDefault();
    const box = shell.current?.getBoundingClientRect();
    if (!box) return;
    const scrollX = shell.current?.scrollLeft ?? 0;
    const scrollY = shell.current?.scrollTop ?? 0;
    drag.current = {
      id: node.id,
      dx: e.clientX - box.left + scrollX - node.x,
      dy: e.clientY - box.top + scrollY - node.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(node.id);
  }

  function moveDrag(e: React.PointerEvent) {
    const d = drag.current;
    const box = shell.current?.getBoundingClientRect();
    if (!d || !box) return;
    const x = Math.max(8, e.clientX - box.left + (shell.current?.scrollLeft ?? 0) - d.dx);
    const y = Math.max(8, e.clientY - box.top + (shell.current?.scrollTop ?? 0) - d.dy);
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === d.id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)),
    });
  }

  function endDrag() {
    drag.current = null;
  }

  function connectTo(targetId: string) {
    if (!pending || pending.from === targetId) {
      setPending(null);
      return;
    }
    const edges = graph.edges.filter(
      (e) => !(e.from === pending.from && (e.branch ?? null) === (pending.branch ?? null)),
    );
    edges.push({
      id: Math.random().toString(36).slice(2, 10),
      from: pending.from,
      to: targetId,
      ...(pending.branch ? { branch: pending.branch } : {}),
    });
    onChange({ ...graph, edges });
    setPending(null);
  }

  return (
    <div
      ref={shell}
      className="relative h-[620px] overflow-auto rounded-xl border border-elevated bg-surface-2/40"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklab, var(--color-hairline) 70%, transparent) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onClick={() => {
        if (pending) setPending(null);
      }}
    >
      <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <svg className="pointer-events-none absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
          {graph.edges.map((e) => {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) return null;
            const a = port(from, "out", e.branch);
            const b = port(to, "in");
            return (
              <g key={e.id}>
                <path
                  d={path(a, b)}
                  fill="none"
                  strokeWidth={2}
                  className={e.branch === "no" ? "stroke-critical/60" : "stroke-bronze/60"}
                />
                {e.branch && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2}
                    className="fill-muted-foreground text-[10px] uppercase"
                    textAnchor="middle"
                  >
                    {e.branch}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {graph.nodes.map((node) => {
          const meta = NODE_META[node.type];
          const active = selectedId === node.id;
          return (
            <div
              key={node.id}
              className={cn(
                "absolute rounded-xl border bg-surface p-3 shadow-lg transition-colors",
                active ? "border-bronze ring-1 ring-bronze/40" : "border-elevated",
                pending && pending.from !== node.id && "cursor-copy border-comms/60",
              )}
              style={{ left: node.x, top: node.y, width: W, minHeight: H }}
              onClick={(e) => {
                e.stopPropagation();
                if (pending) connectTo(node.id);
                else onSelect(node.id);
              }}
            >
              <div
                className="flex cursor-grab items-center justify-between gap-2 active:cursor-grabbing"
                onPointerDown={(e) => startDrag(e, node)}
              >
                <Tag tone={meta.tone}>{meta.label}</Tag>
                {node.type !== "trigger" && (
                  <button
                    type="button"
                    aria-label="Remove step"
                    className="text-muted-foreground hover:text-critical"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        nodes: graph.nodes.filter((n) => n.id !== node.id),
                        edges: graph.edges.filter((x) => x.from !== node.id && x.to !== node.id),
                      });
                      if (selectedId === node.id) onSelect(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{nodeSummary(node)}</p>

              <div className="mt-2 flex items-center gap-2">
                {node.type === "condition" ? (
                  (["yes", "no"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                        pending?.from === node.id && pending.branch === b
                          ? "border-bronze text-bronze"
                          : "border-hairline text-muted-foreground hover:text-foreground",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPending({ from: node.id, branch: b });
                      }}
                    >
                      {b} →
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                      pending?.from === node.id
                        ? "border-bronze text-bronze"
                        : "border-hairline text-muted-foreground hover:text-foreground",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPending({ from: node.id });
                    }}
                  >
                    <Link2 className="h-3 w-3" /> connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="sticky bottom-3 left-3 inline-block rounded-full border border-comms/50 bg-surface px-3 py-1 text-xs text-comms">
          Now click the step it should run next
        </div>
      )}
    </div>
  );
}
