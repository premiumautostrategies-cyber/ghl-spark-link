import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey =
  | "command_center" | "sales" | "messages" | "quotes" | "schedule" | "mobile"
  | "production" | "qc" | "customers" | "payments" | "team" | "reports"
  | "inventory" | "sops" | "forms" | "automations" | "services" | "integrations";

export const MODULES: { key: ModuleKey; label: string; to: string; group: string }[] = [
  { key: "command_center", label: "Command Center", to: "/command-center", group: "Main" },
  { key: "sales", label: "Sales", to: "/sales", group: "Sales" },
  { key: "messages", label: "Messages", to: "/inbox", group: "Sales" },
  { key: "quotes", label: "Quotes", to: "/estimates", group: "Sales" },
  { key: "schedule", label: "Schedule", to: "/calendar", group: "Main" },
  { key: "mobile", label: "Mobile Dispatch", to: "/mobile", group: "Main" },
  { key: "production", label: "My Work", to: "/jobs", group: "Production" },
  { key: "qc", label: "Quality Control", to: "/qc", group: "Production" },
  { key: "customers", label: "Customers", to: "/customers", group: "Main" },
  { key: "payments", label: "Payments", to: "/payments", group: "Operations" },
  { key: "team", label: "Team", to: "/team", group: "Operations" },
  { key: "reports", label: "Reports", to: "/analytics", group: "Operations" },
  { key: "inventory", label: "Inventory", to: "/inventory", group: "Operations" },
  { key: "sops", label: "SOPs", to: "/documents", group: "Systemize" },
  { key: "forms", label: "Forms", to: "/inspections", group: "Systemize" },
  { key: "automations", label: "Automations", to: "/automations", group: "Systemize" },
  { key: "services", label: "System Builder", to: "/services", group: "Systemize" },
  { key: "integrations", label: "Integrations", to: "/integrations", group: "Admin" },
];

export type ShopConfig = {
  modules: Record<string, { enabled: boolean; label: string }>;
  workflow: { deposits: boolean; intake_inspection: boolean; qc_gate: boolean; delivery_handoff: boolean; review_request: boolean };
  tech: { clock_in: boolean; job_photos: boolean; require_notes: boolean; heat_check: boolean; heat_min: number; heat_max: number; final_checklist: boolean; require_all_areas: boolean };
  sales: { speed_to_lead: boolean; duplicate_check: boolean; proposals: boolean; ai_summary: boolean };
  lists: { stage_labels: Record<string, string>; lead_sources: string[]; qc_items: string[]; film_services: string[] };
  defaults: { deposit_pct: number; tax_pct: number; travel_fee: number; first_text: string };
};

export const WORKFLOW_LABELS: Record<keyof ShopConfig["workflow"], [string, string]> = {
  deposits: ["Deposits", "Ask for a deposit before booking"],
  intake_inspection: ["Intake inspection", "Techs log vehicle condition at check-in"],
  qc_gate: ["QC before delivery", "A manager signs off before the car goes home"],
  delivery_handoff: ["Delivery handoff", "Ready text, key release and balance check"],
  review_request: ["Review request", "Ask for a review after delivery"],
};
export const TECH_LABELS: Record<"clock_in" | "job_photos" | "require_notes" | "heat_check" | "final_checklist" | "require_all_areas", [string, string]> = {
  clock_in: ["Clock in / out", "Techs clock their shift from My Work"],
  job_photos: ["Job photos", "Techs can add photos to a job"],
  require_notes: ["Completion notes required", "A note is needed before submitting"],
  heat_check: ["Post-heat temperature", "QC records edge temp on film work"],
  final_checklist: ["Final checklist confirmation", "Tech confirms the final checklist"],
  require_all_areas: ["All install areas required", "Every area must be ticked before submitting"],
};
export const SALES_LABELS: Record<keyof ShopConfig["sales"], [string, string]> = {
  speed_to_lead: ["Speed-to-lead text", "First text is ticked on by default for new leads"],
  duplicate_check: ["Duplicate customer check", "Warn when a phone, email or name already exists"],
  proposals: ["Good / Better / Best proposals", "Send interactive customer proposals"],
  ai_summary: ["AI conversation summary", "Summarize button in Messages"],
};

export const DEFAULT_STAGES: { key: string; label: string }[] = [
  { key: "new_lead", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "negotiating", label: "Decision" },
  { key: "scheduled", label: "Scheduled" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export const DEFAULT_CONFIG: ShopConfig = {
  modules: Object.fromEntries(MODULES.map((m) => [m.key, { enabled: true, label: m.label }])),
  workflow: { deposits: true, intake_inspection: true, qc_gate: true, delivery_handoff: true, review_request: true },
  tech: { clock_in: true, job_photos: true, require_notes: false, heat_check: true, heat_min: 190, heat_max: 200, final_checklist: true, require_all_areas: true },
  sales: { speed_to_lead: true, duplicate_check: true, proposals: true, ai_summary: true },
  lists: {
    stage_labels: Object.fromEntries(DEFAULT_STAGES.map((s) => [s.key, s.label])),
    lead_sources: ["Website", "Google", "Instagram", "Referral", "Walk-in", "Dealer"],
    qc_items: ["Edges sealed", "No lifting or bubbles", "Glass clean", "Vehicle cleaned", "Photos taken"],
    film_services: ["ppf", "wrap", "color_change", "tint"],
  },
  defaults: { deposit_pct: 30, tax_pct: 6, travel_fee: 95, first_text: "Hi {first_name}, thanks for reaching out to {shop}! When is a good time to talk about your {vehicle}?" },
};

type Partial2 = { [K in keyof ShopConfig]?: Partial<ShopConfig[K]> };

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function mergeConfig(...layers: unknown[]): ShopConfig {
  const out = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, Record<string, unknown>>;
  for (const layer of layers) {
    if (!isObj(layer)) continue;
    for (const [section, values] of Object.entries(layer)) {
      if (!isObj(values) || !out[section]) continue;
      for (const [k, v] of Object.entries(values)) {
        const cur = out[section][k];
        out[section][k] = isObj(cur) && isObj(v) ? { ...cur, ...v } : v;
      }
    }
  }
  return out as unknown as ShopConfig;
}

// Module-level stage label overrides so stageLabel() works everywhere.
let stageLabels: Record<string, string> = DEFAULT_CONFIG.lists.stage_labels;
export function setStageLabels(m: Record<string, string>) {
  stageLabels = { ...DEFAULT_CONFIG.lists.stage_labels, ...m };
}
export function configuredStageLabel(key: string) {
  return stageLabels[key];
}

export function useShopConfigLayers() {
  const { organization, location } = useRouteContext({ from: "/_authenticated" });
  const orgId = organization?.id;
  const locId = location?.id;
  return useQuery({
    queryKey: ["shop-config", orgId, locId],
    enabled: Boolean(orgId),
    initialData: {
      org: (organization as { shop_config?: unknown } | null)?.shop_config ?? {},
      loc: (location as { shop_config?: unknown } | null)?.shop_config ?? {},
    },
    staleTime: 30_000,
    queryFn: async () => {
      const [o, l] = await Promise.all([
        supabase.from("organizations").select("shop_config").eq("id", orgId!).maybeSingle(),
        locId ? supabase.from("locations").select("shop_config").eq("id", locId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { org: (o.data?.shop_config ?? {}) as unknown, loc: ((l as { data: { shop_config?: unknown } | null }).data?.shop_config ?? {}) as unknown };
    },
  });
}

export function useShopConfig(): ShopConfig {
  const { data } = useShopConfigLayers();
  const cfg = mergeConfig(data?.org, data?.loc);
  setStageLabels(cfg.lists.stage_labels);
  return cfg;
}

export type { Partial2 as ShopConfigOverride };
