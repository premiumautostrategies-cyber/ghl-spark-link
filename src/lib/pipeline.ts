// Dynamic pipeline model.
//
// Five independent properties per opportunity:
//   stage        — where it is in the sales process
//   newLead      — has first contact ever happened
//   temperature  — how recently the CUSTOMER meaningfully interacted
//   live         — customer interaction happening right now
//   focus        — how urgently the salesperson should act
//
// Only CUSTOMER activity changes temperature. Salesperson activity is logged
// but never makes a lead look hotter.

export type Temperature = "new" | "live" | "hot" | "warm" | "cool" | "dormant";

export const PIPELINE_STAGES = [
  { key: "new_lead", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "negotiating", label: "Decision" },
  { key: "scheduled", label: "Scheduled" },
] as const;

export const CLOSED_STAGES = [
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

export function stageLabel(stage: string) {
  return (
    configuredStageLabel(stage) ??
    PIPELINE_STAGES.find((s) => s.key === stage)?.label ??
    CLOSED_STAGES.find((s) => s.key === stage)?.label ??
    stage
  );
}

export type LeadEvent = {
  id: string;
  deal_id: string;
  actor: string;
  kind: string;
  detail: string | null;
  created_at: string;
};

/** Customer-side event kinds — these drive temperature. */
export const CUSTOMER_EVENTS: Record<string, string> = {
  sms_in: "Customer replied",
  email_in: "Customer emailed",
  call_in: "Customer called",
  quote_opened: "Opened quote",
  quote_reopened: "Reopened quote",
  quote_viewing: "Viewing quote now",
  package_selected: "Selected a package",
  option_selected: "Added an option",
  quote_accepted: "Accepted quote",
  link_opened: "Opened scheduling link",
  appointment_requested: "Requested an appointment",
  form_completed: "Completed a form",
  deposit_started: "Started deposit",
  deposit_paid: "Deposit paid",
};

/** Shop-side event kinds — timeline only, never heat. */
export const SHOP_EVENTS: Record<string, string> = {
  sms_out: "Text sent",
  email_out: "Email sent",
  call_out: "Call made",
  quote_sent: "Quote sent",
  note: "Note added",
  stage_moved: "Stage changed",
};

export function eventLabel(e: { kind: string; detail: string | null }) {
  return e.detail || CUSTOMER_EVENTS[e.kind] || SHOP_EVENTS[e.kind] || e.kind;
}

/** Events that mean the customer is actively engaging right now. */
const LIVE_KINDS = new Set([
  "quote_viewing",
  "quote_opened",
  "quote_reopened",
  "sms_in",
  "call_in",
  "link_opened",
  "deposit_started",
  "appointment_requested",
]);

const MIN = 60_000;

export type LeadSignal = {
  temperature: Temperature;
  live: boolean;
  liveLabel: string | null;
  lastCustomerAt: string | null;
  lastCustomerLabel: string | null;
  quoteOpens: number;
  firstContact: boolean;
  focusScore: number;
  focusReason: string | null;
  nextAction: string | null;
  awaitingReply: boolean;
};

export function leadSignal(
  deal: {
    stage: string;
    created_at: string;
    speed_to_lead_at?: string | null;
    last_activity_at?: string | null;
  },
  events: LeadEvent[],
): LeadSignal {
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const customer = sorted.filter((e) => e.actor === "customer");
  const shop = sorted.filter((e) => e.actor !== "customer");

  const firstContact =
    Boolean(deal.speed_to_lead_at) || shop.length > 0 || deal.stage !== "new_lead";

  const last = customer[0] ?? null;
  const lastAt = last ? new Date(last.created_at).getTime() : null;
  const age = lastAt !== null ? Date.now() - lastAt : null;

  const live = Boolean(last && LIVE_KINDS.has(last.kind) && age !== null && age < 15 * MIN);

  let temperature: Temperature;
  if (!firstContact) temperature = "new";
  else if (age === null) temperature = "dormant";
  else if (live || age < 30 * MIN) temperature = "live";
  else if (age < 24 * 60 * MIN) temperature = "hot";
  else if (age < 72 * 60 * MIN) temperature = "warm";
  else if (age < 14 * 24 * 60 * MIN) temperature = "cool";
  else temperature = "dormant";

  const quoteOpens = customer.filter(
    (e) => e.kind === "quote_opened" || e.kind === "quote_reopened" || e.kind === "quote_viewing",
  ).length;

  const lastShopAt = shop[0] ? new Date(shop[0].created_at).getTime() : null;
  const awaitingReply = Boolean(
    lastAt !== null && (lastShopAt === null || lastAt > lastShopAt) && last?.kind === "sms_in",
  );

  // Focus priority from observable events and timing — no invented probabilities.
  let focusScore = 0;
  let focusReason: string | null = null;
  let nextAction: string | null = null;

  const leadAgeMin = (Date.now() - new Date(deal.created_at).getTime()) / MIN;

  if (!firstContact) {
    focusScore = 100 - Math.min(leadAgeMin / 60, 20);
    focusReason = "New lead — no contact yet";
    nextAction = "Send the first text";
  } else if (live) {
    focusScore = 95;
    focusReason = eventLabel(last!);
    nextAction = "Call while they are looking";
  } else if (awaitingReply) {
    focusScore = 85;
    focusReason = "Customer replied — unanswered";
    nextAction = "Reply now";
  } else if (deal.stage === "quoted" && quoteOpens >= 2) {
    focusScore = 78;
    focusReason = `Quote opened ${quoteOpens}×, no decision`;
    nextAction = "Ask for the yes";
  } else if (deal.stage === "negotiating") {
    focusScore = 70;
    focusReason = "Waiting on a decision";
    nextAction = "Offer an install date";
  } else if (temperature === "cool") {
    focusScore = 55;
    focusReason = "Cooling off — no activity in days";
    nextAction = "Follow up";
  } else if (deal.stage === "quoted") {
    focusScore = 50;
    focusReason = "Quote out, no response";
    nextAction = "Follow up on the quote";
  } else if (temperature === "dormant") {
    focusScore = 20;
    focusReason = "Dormant";
    nextAction = "Reactivation text";
  } else {
    focusScore = 35;
    nextAction = "Keep working it";
  }

  return {
    temperature,
    live,
    liveLabel: live && last ? eventLabel(last) : null,
    lastCustomerAt: last?.created_at ?? null,
    lastCustomerLabel: last ? eventLabel(last) : null,
    quoteOpens,
    firstContact,
    focusScore: Math.round(focusScore),
    focusReason,
    nextAction,
    awaitingReply,
  };
}

export const TEMP_META: Record<
  Temperature,
  { label: string; dot: string; edge: string; tint: string; text: string }
> = {
  new: {
    label: "New lead",
    dot: "bg-revenue",
    edge: "before:bg-revenue",
    tint: "bg-revenue/[0.06]",
    text: "text-revenue",
  },
  live: {
    label: "Live now",
    dot: "bg-critical",
    edge: "before:bg-critical",
    tint: "bg-critical/[0.07]",
    text: "text-critical",
  },
  hot: {
    label: "Active today",
    dot: "bg-heat",
    edge: "before:bg-heat",
    tint: "bg-heat/[0.05]",
    text: "text-heat",
  },
  warm: {
    label: "Warm",
    dot: "bg-urgent",
    edge: "before:bg-urgent",
    tint: "bg-transparent",
    text: "text-urgent",
  },
  cool: {
    label: "Cooling",
    dot: "bg-comms",
    edge: "before:bg-comms",
    tint: "bg-transparent",
    text: "text-comms",
  },
  dormant: {
    label: "Dormant",
    dot: "bg-muted-foreground/60",
    edge: "before:bg-muted-foreground/40",
    tint: "bg-transparent",
    text: "text-muted-foreground",
  },
};

export function sinceLabel(value: string | null | undefined) {
  if (!value) return "no activity";
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / MIN));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function clockTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
