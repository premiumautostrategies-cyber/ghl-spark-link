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

export const SERVICE_TYPES = ["wrap", "tint", "ppf", "ceramic", "detail", "other"] as const;
export const JOB_STATUSES = [
  "lead",
  "estimate",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  estimate: "Estimate sent",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  invoiced: "Invoiced",
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  declined: "Declined",
};
