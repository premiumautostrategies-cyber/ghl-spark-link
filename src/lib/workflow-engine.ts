/**
 * Systemize workflow engine.
 *
 * A workflow is a graph of nodes. The same graph powers both the visual
 * builder and the simple step-by-step builder — a linear graph is rendered
 * as a numbered list, a branching graph as a canvas.
 */

export type NodeKind =
  | "trigger"
  | "delay"
  | "condition"
  | "send_sms"
  | "send_email"
  | "task"
  | "update_stage"
  | "create_job"
  | "sync_crm"
  | "notify_team"
  | "webhook";

export type WorkflowNode = {
  id: string;
  type: NodeKind;
  x: number;
  y: number;
  config: Record<string, string | number>;
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  branch?: "yes" | "no";
};

export type WorkflowGraph = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

export const TRIGGERS = [
  { value: "lead_created", label: "A new lead comes in" },
  { value: "proposal_sent", label: "A proposal is sent" },
  { value: "proposal_viewed", label: "A customer opens the proposal" },
  { value: "deposit_paid", label: "A deposit is paid" },
  { value: "job_scheduled", label: "A job is booked in a bay" },
  { value: "job_started", label: "Work starts on the vehicle" },
  { value: "job_completed", label: "A job is finished" },
  { value: "qc_passed", label: "Quality control signs off" },
  { value: "vehicle_delivered", label: "The vehicle is handed back" },
  { value: "payment_received", label: "A payment lands" },
  { value: "invoice_overdue", label: "An invoice goes overdue" },
  { value: "warranty_due", label: "Warranty check-in is due" },
  { value: "no_reply_3d", label: "A quote goes 3 days with no reply" },
] as const;

export const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(
  TRIGGERS.map((t) => [t.value, t.label]),
);

type Meta = {
  label: string;
  blurb: string;
  tone: "bronze" | "comms" | "revenue" | "urgent" | "rig" | "muted";
  fields: {
    key: string;
    label: string;
    type: "text" | "number" | "textarea" | "select";
    options?: { value: string; label: string }[];
    placeholder?: string;
  }[];
};

export const NODE_META: Record<NodeKind, Meta> = {
  trigger: {
    label: "Trigger",
    blurb: "What kicks the workflow off",
    tone: "bronze",
    fields: [
      {
        key: "event",
        label: "When this happens",
        type: "select",
        options: TRIGGERS.map((t) => ({ value: t.value, label: t.label })),
      },
    ],
  },
  delay: {
    label: "Wait",
    blurb: "Hold before the next step",
    tone: "muted",
    fields: [{ key: "minutes", label: "Wait (minutes)", type: "number" }],
  },
  condition: {
    label: "If / then",
    blurb: "Split the path on a rule",
    tone: "urgent",
    fields: [
      {
        key: "field",
        label: "Check",
        type: "select",
        options: [
          { value: "deal_value", label: "Quote total" },
          { value: "service_type", label: "Service type" },
          { value: "replied", label: "Customer replied" },
          { value: "deposit_paid", label: "Deposit paid" },
          { value: "vehicle_year", label: "Vehicle year" },
        ],
      },
      {
        key: "op",
        label: "Is",
        type: "select",
        options: [
          { value: "gte", label: "at least" },
          { value: "lte", label: "at most" },
          { value: "eq", label: "equal to" },
          { value: "neq", label: "not equal to" },
          { value: "contains", label: "contains" },
        ],
      },
      { key: "value", label: "Value", type: "text", placeholder: "2500" },
    ],
  },
  send_sms: {
    label: "Send text",
    blurb: "Text the customer",
    tone: "comms",
    fields: [
      {
        key: "template",
        label: "Message",
        type: "textarea",
        placeholder: "Hey {{first_name}} — thanks for reaching out about {{service}}.",
      },
    ],
  },
  send_email: {
    label: "Send email",
    blurb: "Email the customer",
    tone: "comms",
    fields: [
      { key: "subject", label: "Subject", type: "text", placeholder: "Your {{service}} quote" },
      { key: "template", label: "Body", type: "textarea" },
    ],
  },
  task: {
    label: "Internal task",
    blurb: "Put it on someone's list",
    tone: "rig",
    fields: [
      { key: "title", label: "Task", type: "text", placeholder: "Call the customer back" },
      {
        key: "assignee",
        label: "Assign to",
        type: "select",
        options: [
          { value: "owner", label: "Deal owner" },
          { value: "front_desk", label: "Front desk" },
          { value: "foreman", label: "Foreman" },
        ],
      },
    ],
  },
  update_stage: {
    label: "Move stage",
    blurb: "Advance the pipeline",
    tone: "bronze",
    fields: [
      {
        key: "stage",
        label: "Move to",
        type: "select",
        options: [
          { value: "contacted", label: "Contacted" },
          { value: "quoted", label: "Quoted" },
          { value: "negotiating", label: "Negotiating" },
          { value: "won", label: "Won" },
          { value: "lost", label: "Lost" },
        ],
      },
    ],
  },
  create_job: {
    label: "Create job",
    blurb: "Open a production ticket",
    tone: "rig",
    fields: [{ key: "title", label: "Job title", type: "text", placeholder: "{{service}} install" }],
  },
  sync_crm: {
    label: "Push to CRM",
    blurb: "Send it to GoHighLevel or HubSpot",
    tone: "revenue",
    fields: [
      {
        key: "provider",
        label: "Send to",
        type: "select",
        options: [
          { value: "gohighlevel", label: "GoHighLevel" },
          { value: "hubspot", label: "HubSpot" },
          { value: "quickbooks", label: "QuickBooks" },
        ],
      },
    ],
  },
  notify_team: {
    label: "Alert the shop",
    blurb: "Ping the team in-app",
    tone: "urgent",
    fields: [{ key: "message", label: "Alert", type: "text", placeholder: "Deposit paid — book it" }],
  },
  webhook: {
    label: "Webhook",
    blurb: "Post the payload anywhere",
    tone: "muted",
    fields: [{ key: "url", label: "URL", type: "text", placeholder: "https://" }],
  },
};

export const PALETTE: NodeKind[] = [
  "delay",
  "condition",
  "send_sms",
  "send_email",
  "task",
  "update_stage",
  "create_job",
  "sync_crm",
  "notify_team",
  "webhook",
];

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultConfig(type: NodeKind): Record<string, string | number> {
  switch (type) {
    case "trigger":
      return { event: "lead_created" };
    case "delay":
      return { minutes: 15 };
    case "condition":
      return { field: "deal_value", op: "gte", value: "2500" };
    case "send_sms":
      return { template: "Hey {{first_name}} — it's {{shop_name}}. Quick question about your {{vehicle}}." };
    case "send_email":
      return { subject: "Your {{service}} quote", template: "Hi {{first_name}}, here's your quote: {{proposal_link}}" };
    case "task":
      return { title: "Follow up", assignee: "owner" };
    case "update_stage":
      return { stage: "contacted" };
    case "create_job":
      return { title: "{{service}} install" };
    case "sync_crm":
      return { provider: "gohighlevel" };
    case "notify_team":
      return { message: "Needs attention" };
    case "webhook":
      return { url: "" };
  }
}

export function emptyGraph(event = "lead_created"): WorkflowGraph {
  return {
    nodes: [{ id: "trigger", type: "trigger", x: 40, y: 40, config: { event } }],
    edges: [],
  };
}

export function nodeSummary(node: WorkflowNode): string {
  const c = node.config;
  switch (node.type) {
    case "trigger":
      return TRIGGER_LABEL[String(c['event'])] ?? "An event happens";
    case "delay":
      return waitText(Number(c['minutes'] ?? 0));
    case "condition": {
      const field = NODE_META.condition.fields[0]!.options!.find((o) => o.value === c['field'])?.label ?? "Value";
      const op = NODE_META.condition.fields[1]!.options!.find((o) => o.value === c['op'])?.label ?? "is";
      return `${field} ${op} ${c['value']}`;
    }
    case "send_sms":
      return String(c['template'] || "Text the customer");
    case "send_email":
      return String(c['subject'] || "Email the customer");
    case "task":
      return String(c['title'] || "Internal task");
    case "update_stage":
      return `Move to ${String(c['stage'])}`;
    case "create_job":
      return String(c['title'] || "Create job");
    case "sync_crm":
      return `Push to ${String(c['provider'])}`;
    case "notify_team":
      return String(c['message'] || "Alert the shop");
    case "webhook":
      return String(c['url'] || "No URL yet");
  }
}

export function waitText(minutes: number) {
  if (!minutes) return "Continue immediately";
  if (minutes < 60) return `Wait ${minutes} minutes`;
  if (minutes < 1440) return `Wait ${round(minutes / 60)} hours`;
  return `Wait ${round(minutes / 1440)} days`;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

export function offsetText(minutes: number) {
  if (!minutes) return "instantly";
  if (minutes < 60) return `+${minutes}m`;
  if (minutes < 1440) return `+${round(minutes / 60)}h`;
  return `+${round(minutes / 1440)}d`;
}

/* ---------- linear helpers (simple builder) ---------- */

export function isLinear(graph: WorkflowGraph) {
  const counts = new Map<string, number>();
  for (const e of graph.edges) {
    if (e.branch === "no") return false;
    counts.set(e.from, (counts.get(e.from) ?? 0) + 1);
    if ((counts.get(e.from) ?? 0) > 1) return false;
  }
  return true;
}

export function linearOrder(graph: WorkflowGraph): WorkflowNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const next = new Map(graph.edges.map((e) => [e.from, e.to]));
  const out: WorkflowNode[] = [];
  let cur = graph.nodes.find((n) => n.type === "trigger")?.id;
  const seen = new Set<string>();
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    out.push(byId.get(cur)!);
    cur = next.get(cur);
  }
  for (const n of graph.nodes) if (!seen.has(n.id)) out.push(n);
  return out;
}

export function appendLinear(graph: WorkflowGraph, type: NodeKind): WorkflowGraph {
  const order = linearOrder(graph);
  const last = order[order.length - 1];
  const id = newId();
  const node: WorkflowNode = {
    id,
    type,
    x: 40,
    y: 40 + order.length * 130,
    config: defaultConfig(type),
  };
  const edges = [...graph.edges];
  if (last) edges.push({ id: newId(), from: last.id, to: id });
  return { nodes: [...graph.nodes, node], edges };
}

export function removeNode(graph: WorkflowGraph, id: string): WorkflowGraph {
  if (id === "trigger") return graph;
  const incoming = graph.edges.filter((e) => e.to === id);
  const outgoing = graph.edges.filter((e) => e.from === id);
  const kept = graph.edges.filter((e) => e.from !== id && e.to !== id);
  // stitch a single in/out pair back together so linear flows stay connected
  if (incoming.length === 1 && outgoing.length === 1) {
    kept.push({
      id: newId(),
      from: incoming[0]!.from,
      to: outgoing[0]!.to,
      ...(incoming[0]!.branch ? { branch: incoming[0]!.branch } : {}),
    });
  }
  return { nodes: graph.nodes.filter((n) => n.id !== id), edges: kept };
}

/* ---------- simulation ---------- */

export type SimStep = {
  nodeId: string;
  type: NodeKind;
  label: string;
  detail: string;
  offsetMinutes: number;
  branch?: "yes" | "no";
};

export type SimContext = Record<string, string | number | boolean>;

export const DEMO_CONTEXT: SimContext = {
  first_name: "Marcus",
  shop_name: "Apex Restyling",
  vehicle: "2023 Porsche 911 GT3",
  service: "Full front PPF",
  deal_value: 3850,
  service_type: "ppf",
  replied: false,
  deposit_paid: true,
  vehicle_year: 2023,
  proposal_link: "systemize.app/p/…",
};

export function fillTokens(text: string, ctx: SimContext) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    ctx[key] === undefined ? `{{${key}}}` : String(ctx[key]),
  );
}

function evaluate(node: WorkflowNode, ctx: SimContext): boolean {
  const actual = ctx[String(node.config['field'])];
  const raw = String(node.config['value'] ?? "");
  const op = String(node.config['op']);
  const asNum = Number(raw);
  const numeric = !Number.isNaN(asNum) && typeof actual === "number";
  switch (op) {
    case "gte":
      return numeric ? (actual as number) >= asNum : String(actual) >= raw;
    case "lte":
      return numeric ? (actual as number) <= asNum : String(actual) <= raw;
    case "eq":
      return String(actual) === raw;
    case "neq":
      return String(actual) !== raw;
    case "contains":
      return String(actual).toLowerCase().includes(raw.toLowerCase());
    default:
      return false;
  }
}

export function simulate(graph: WorkflowGraph, ctx: SimContext = DEMO_CONTEXT): SimStep[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const steps: SimStep[] = [];
  let cur = graph.nodes.find((n) => n.type === "trigger")?.id;
  let offset = 0;
  const guard = new Set<string>();

  while (cur && byId.has(cur) && steps.length < 50) {
    if (guard.has(cur)) break;
    guard.add(cur);
    const node = byId.get(cur)!;
    let branch: "yes" | "no" | undefined;

    if (node.type === "delay") offset += Number(node.config['minutes'] ?? 0);
    if (node.type === "condition") branch = evaluate(node, ctx) ? "yes" : "no";

    steps.push({
      nodeId: node.id,
      type: node.type,
      label: NODE_META[node.type].label,
      detail: fillTokens(
        node.type === "condition" ? `${nodeSummary(node)} → ${branch === "yes" ? "yes" : "no"}` : nodeSummary(node),
        ctx,
      ),
      offsetMinutes: offset,
      ...(branch ? { branch } : {}),
    });

    const outs = graph.edges.filter((e) => e.from === node.id);
    const next = branch
      ? (outs.find((e) => e.branch === branch) ?? outs.find((e) => !e.branch))
      : outs[0];
    cur = next?.to;
  }
  return steps;
}

export function validate(graph: WorkflowGraph): string[] {
  const issues: string[] = [];
  const trigger = graph.nodes.find((n) => n.type === "trigger");
  if (!trigger) issues.push("This workflow has no starting trigger.");
  const reached = new Set(simulate(graph).map((s) => s.nodeId));
  for (const n of graph.nodes) {
    if (!reached.has(n.id) && n.type !== "trigger") {
      issues.push(`"${NODE_META[n.type].label}" isn't connected to anything.`);
    }
    if (n.type === "webhook" && !String(n.config['url'] || "").startsWith("http")) {
      issues.push("The webhook step needs a URL.");
    }
    if (n.type === "condition") {
      const outs = graph.edges.filter((e) => e.from === n.id);
      if (!outs.some((e) => e.branch === "yes") || !outs.some((e) => e.branch === "no")) {
        issues.push("An if/then step needs both a yes and a no path.");
      }
    }
  }
  return [...new Set(issues)];
}

/* ---------- starter recipes ---------- */

function chain(event: string, steps: { type: NodeKind; config: Record<string, string | number> }[]): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    { id: "trigger", type: "trigger", x: 40, y: 40, config: { event } },
  ];
  const edges: WorkflowEdge[] = [];
  let prev = "trigger";
  steps.forEach((s, i) => {
    const id = newId();
    nodes.push({ id, type: s.type, x: 40, y: 40 + (i + 1) * 130, config: s.config });
    edges.push({ id: newId(), from: prev, to: id });
    prev = id;
  });
  return { nodes, edges };
}

export type Recipe = {
  key: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
};

export const RECIPES: Recipe[] = [
  {
    key: "speed_to_lead",
    name: "Two-minute speed to lead",
    description: "Text every new lead instantly, then chase twice if they go quiet.",
    graph: chain("lead_created", [
      {
        type: "send_sms",
        config: {
          template:
            "Hi {{first_name}}, {{shop_name}} here — thanks for reaching out about {{service}}. What year/make/model is the vehicle?",
        },
      },
      { type: "delay", config: { minutes: 240 } },
      { type: "condition", config: { field: "replied", op: "eq", value: "false" } },
      { type: "send_sms", config: { template: "Still happy to get you a number on the {{vehicle}} — want me to text the quote?" } },
      { type: "task", config: { title: "Call the lead back", assignee: "front_desk" } },
    ]),
  },
  {
    key: "proposal_chase",
    name: "Proposal follow-up ladder",
    description: "Nudge after the quote, split high-ticket jobs to a human call.",
    graph: chain("proposal_sent", [
      { type: "delay", config: { minutes: 1440 } },
      { type: "condition", config: { field: "deal_value", op: "gte", value: "2500" } },
      { type: "task", config: { title: "Owner calls the high-ticket quote", assignee: "owner" } },
      { type: "send_email", config: { subject: "Your {{service}} quote", template: "Any questions on the {{vehicle}}? {{proposal_link}}" } },
    ]),
  },
  {
    key: "deposit_to_bay",
    name: "Deposit paid → booked",
    description: "Turn a paid deposit into a job, a CRM update and a confirmation.",
    graph: chain("deposit_paid", [
      { type: "update_stage", config: { stage: "won" } },
      { type: "create_job", config: { title: "{{service}} install" } },
      { type: "sync_crm", config: { provider: "gohighlevel" } },
      { type: "send_sms", config: { template: "Deposit received — your {{vehicle}} is on the board. We'll confirm your bay time shortly." } },
    ]),
  },
  {
    key: "aftercare",
    name: "Film aftercare series",
    description: "Care texts on day 3 and day 14, then the warranty check-in.",
    graph: chain("vehicle_delivered", [
      { type: "send_sms", config: { template: "Thanks {{first_name}}! Keep the {{vehicle}} dry for 48 hours — full care guide in your hub." } },
      { type: "delay", config: { minutes: 4320 } },
      { type: "send_sms", config: { template: "Day 3 check-in: any edges lifting or water pockets on the {{vehicle}}?" } },
      { type: "delay", config: { minutes: 15840 } },
      { type: "send_email", config: { subject: "Your warranty certificate", template: "Everything you need for the {{service}} on your {{vehicle}}." } },
    ]),
  },
  {
    key: "overdue_invoice",
    name: "Overdue invoice recovery",
    description: "Chase the balance before it ages, and flag the shop.",
    graph: chain("invoice_overdue", [
      { type: "send_sms", config: { template: "Quick reminder {{first_name}} — the balance on the {{vehicle}} is still open." } },
      { type: "delay", config: { minutes: 2880 } },
      { type: "notify_team", config: { message: "Invoice still unpaid — front desk to call" } },
      { type: "sync_crm", config: { provider: "quickbooks" } },
    ]),
  },
];
