export type DashboardPreset = "compact" | "executive";
export type WidgetSize = "half" | "wide" | "full";

export type DashboardWidgetId =
  | "revenue"
  | "funnel"
  | "bays"
  | "schedule"
  | "team"
  | "alerts"
  | "lost";

export type DashboardWidgetLayout = {
  id: DashboardWidgetId;
  visible: boolean;
  size: WidgetSize;
};

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { name: string; description: string }> = {
  revenue: { name: "Revenue pacing", description: "Actual revenue against target" },
  funnel: { name: "Conversion funnel", description: "Lead-to-completion bottlenecks" },
  bays: { name: "Shop floor", description: "Live bay load and progress" },
  schedule: { name: "Today's queue", description: "Drop-offs, installs and pickups" },
  team: { name: "Team leaderboard", description: "Sales and production performance" },
  alerts: { name: "Action required", description: "Risks and revenue opportunities" },
  lost: { name: "Lost revenue", description: "Quote loss reasons" },
};

export const EXECUTIVE_LAYOUT: DashboardWidgetLayout[] = [
  { id: "revenue", visible: true, size: "wide" },
  { id: "alerts", visible: true, size: "half" },
  { id: "funnel", visible: true, size: "half" },
  { id: "lost", visible: true, size: "half" },
  { id: "team", visible: true, size: "full" },
  { id: "bays", visible: true, size: "wide" },
  { id: "schedule", visible: true, size: "half" },
];

export const COMPACT_LAYOUT: DashboardWidgetLayout[] = [
  { id: "alerts", visible: true, size: "half" },
  { id: "bays", visible: true, size: "half" },
  { id: "schedule", visible: true, size: "wide" },
  { id: "funnel", visible: true, size: "half" },
  { id: "revenue", visible: true, size: "half" },
  { id: "team", visible: true, size: "wide" },
  { id: "lost", visible: true, size: "half" },
];

export function layoutForPreset(preset: DashboardPreset) {
  const source = preset === "compact" ? COMPACT_LAYOUT : EXECUTIVE_LAYOUT;
  return source.map((widget) => ({ ...widget }));
}

export function isDashboardLayout(value: unknown): value is DashboardWidgetLayout[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set(Object.keys(DASHBOARD_WIDGETS));
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      ids.has(String(item.id)) &&
      "visible" in item &&
      typeof item.visible === "boolean" &&
      "size" in item &&
      ["half", "wide", "full"].includes(String(item.size)),
  );
}