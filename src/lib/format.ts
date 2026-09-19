export function money(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dayDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const SERVICE_TYPES = [
  "tint",
  "ppf",
  "wrap",
  "color_change",
  "commercial_graphics",
  "ceramic",
  "detail",
  "paint_correction",
  "protection_package",
  "accessory",
  "other",
] as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  tint: "Window tint",
  ppf: "Paint protection film",
  wrap: "Vinyl wrap",
  color_change: "Color change wrap",
  commercial_graphics: "Commercial graphics",
  ceramic: "Ceramic coating",
  detail: "Detailing",
  paint_correction: "Paint correction",
  protection_package: "Protection package",
  accessory: "Accessory install",
  other: "Other",
};

export const JOB_STATUSES = [
  "lead",
  "estimate",
  "scheduled",
  "in_progress",
  "ready_for_pickup",
  "completed",
  "invoiced",
] as const;

export const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "quoted",
  "negotiating",
  "won",
  "lost",
] as const;

export const INVENTORY_CATEGORIES = [
  "film",
  "tint",
  "ppf",
  "coating",
  "chemical",
  "tool",
  "consumable",
] as const;

export const DOC_TYPES = [
  "contract",
  "warranty",
  "release",
  "care_guide",
  "invoice",
  "photo_set",
] as const;

export const PAYMENT_METHODS = ["card", "cash", "ach", "financing", "check"] as const;

export const AUTOMATION_TRIGGERS = [
  "lead_created",
  "estimate_sent",
  "job_scheduled",
  "job_completed",
  "payment_received",
  "warranty_due",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  estimate: "Estimate sent",
  scheduled: "Scheduled",
  in_progress: "In progress",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  invoiced: "Invoiced",
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  declined: "Declined",
  new_lead: "New lead",
  contacted: "Contacted",
  quoted: "Quoted",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
  paid: "Paid",
  pending: "Pending",
  refunded: "Refunded",
  signed: "Signed",
  awaiting_signature: "Awaiting signature",
  card: "Card",
  cash: "Cash",
  ach: "Bank transfer",
  financing: "Financing",
  check: "Check",
  lead_created: "Lead created",
  estimate_sent: "Estimate sent",
  job_scheduled: "Job scheduled",
  job_completed: "Job completed",
  payment_received: "Payment received",
  warranty_due: "Warranty check-in due",
  film: "Film",
  tint: "Tint",
  ppf: "PPF",
  coating: "Coating",
  chemical: "Chemical",
  tool: "Tool",
  consumable: "Consumable",
  contract: "Contract",
  warranty: "Warranty",
  release: "Release form",
  care_guide: "Care guide",
  invoice: "Invoice",
  photo_set: "Photo set",
  sms: "SMS",
  email: "Email",
  task: "Internal task",
};

export function label(value: string | null | undefined) {
  if (!value) return "—";
  return STATUS_LABELS[value] ?? SERVICE_TYPE_LABELS[value] ?? value;
}
