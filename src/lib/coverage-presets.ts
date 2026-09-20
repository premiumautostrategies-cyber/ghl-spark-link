import { ALL_PANELS, COVERAGE_PRESETS, PANEL_LABELS } from "@/lib/catalog";
import { TINT_LABELS } from "@/lib/vehicle-art";

export type CoverageKind = "panels" | "tint" | "none";

/** Window-tint coverage sets — "two front windows" has to look different from
 *  a full vehicle on the customer's proposal. */
export const TINT_PRESETS: { name: string; windows: string[] }[] = [
  { name: "Two front windows", windows: ["win_front"] },
  { name: "Front + rear doors", windows: ["win_front", "win_rear"] },
  { name: "Rear privacy match", windows: ["win_rear", "win_quarter", "win_back_glass"] },
  {
    name: "Full vehicle",
    windows: ["win_front", "win_rear", "win_quarter", "win_back_glass"],
  },
  {
    name: "Full vehicle + windshield",
    windows: [
      "win_front",
      "win_rear",
      "win_quarter",
      "win_back_glass",
      "win_windshield",
      "win_brow",
    ],
  },
  { name: "Sun strip only", windows: ["win_brow"] },
  { name: "Sunroof", windows: ["win_sunroof"] },
];

export const PPF_PRESETS = COVERAGE_PRESETS;

export function coverageLabel(kind: CoverageKind, keys: string[]) {
  if (kind === "none" || keys.length === 0) return null;
  if (kind === "tint") {
    const hit = TINT_PRESETS.find(
      (p) => p.windows.length === keys.length && p.windows.every((w) => keys.includes(w)),
    );
    return hit?.name ?? `${keys.length} glass areas`;
  }
  const hit = PPF_PRESETS.find(
    (p) => p.panels.length === keys.length && p.panels.every((w) => keys.includes(w)),
  );
  if (hit) return hit.name;
  if (keys.length >= ALL_PANELS.length) return "Full body";
  return `${keys.length} panels`;
}

export function coverageItemLabels(kind: CoverageKind, keys: string[]) {
  const table = kind === "tint" ? (TINT_LABELS as Record<string, string>) : PANEL_LABELS;
  return keys.map((k) => table[k] ?? k);
}

const P = (name: string) => PPF_PRESETS.find((p) => p.name === name)?.panels ?? [];
const W = (name: string) => TINT_PRESETS.find((p) => p.name === name)?.windows ?? [];

type Inferred = { kind: CoverageKind; keys: string[] };

/** Rules run top-down; the first match wins, so put the most specific wording first. */
const RULES: { match: RegExp; out: Inferred }[] = [
  // Glass / tint
  { match: /sun ?strip|brow|visor strip/, out: { kind: "tint", keys: W("Sun strip only") } },
  { match: /sunroof|moonroof|panoramic/, out: { kind: "tint", keys: W("Sunroof") } },
  {
    match: /two front|2 front|front (two|2) window|front doors only/,
    out: { kind: "tint", keys: W("Two front windows") },
  },
  {
    match: /rear privacy|privacy match|back (half|glass) tint/,
    out: { kind: "tint", keys: W("Rear privacy match") },
  },
  {
    match: /(full|whole|all).*(tint|glass)|tint.*(full vehicle|all around)/,
    out: { kind: "tint", keys: W("Full vehicle") },
  },
  {
    match: /windshield (tint|film|strip)|front glass tint/,
    out: { kind: "tint", keys: ["win_windshield", "win_brow"] },
  },
  { match: /front \+ rear door|four door tint/, out: { kind: "tint", keys: W("Front + rear doors") } },
  { match: /tint/, out: { kind: "tint", keys: W("Full vehicle") } },

  // Glass-only film / coating
  {
    match: /windshield (defense|protection|armou?r)|clear windshield/,
    out: { kind: "panels", keys: ["windshield"] },
  },
  {
    match: /glass coat|glass treatment|rain repel/,
    out: { kind: "panels", keys: ["windshield", "rear_glass"] },
  },

  // Partial film zones
  { match: /mirror/, out: { kind: "panels", keys: ["mirror_l", "mirror_r"] } },
  { match: /rocker|door cup|kick panel/, out: { kind: "panels", keys: ["rocker_l", "rocker_r"] } },
  { match: /a-?pillar/, out: { kind: "panels", keys: ["a_pillars"] } },
  { match: /roof (and|&|\+) hood|hood (and|&|\+) roof/, out: { kind: "panels", keys: ["hood", "roof"] } },
  { match: /roof wrap|black roof|roof only/, out: { kind: "panels", keys: ["roof"] } },
  { match: /hood only|hood stripe|bra/, out: { kind: "panels", keys: ["hood", "front_bumper"] } },
  {
    match: /rear bumper|loading (strip|ledge)|bumper top/,
    out: { kind: "panels", keys: ["rear_bumper"] },
  },
  {
    match: /luggage|trunk|hatch|tailgate/,
    out: { kind: "panels", keys: ["trunk", "rear_bumper"] },
  },

  // Film / wrap packages
  { match: /partial front|18|standard front/, out: { kind: "panels", keys: P("Partial front") } },
  { match: /track|blast zone|touring/, out: { kind: "panels", keys: P("Track pack") } },
  {
    match: /full (body|vehicle|car)|whole car|complete coverage|colou?r change|full wrap|ceramic coat|paint correction|polish/,
    out: { kind: "panels", keys: P("Full body") },
  },
  { match: /full front|front end/, out: { kind: "panels", keys: P("Full front") } },
  { match: /wheel|caliper|badge|chrome delete|emblem|interior/, out: { kind: "none", keys: [] } },
];

/** Works out a coverage diagram from what an option is called and how it reads,
 *  so two options that describe different work never show the same picture. */
export function inferCoverage(...text: (string | null | undefined)[]): Inferred {
  const hay = text.filter(Boolean).join(" ").toLowerCase();
  if (!hay.trim()) return { kind: "none", keys: [] };
  for (const rule of RULES) if (rule.match.test(hay)) return rule.out;
  return { kind: "none", keys: [] };
}

/** Uses the stored coverage when the shop set one, otherwise reads the wording. */
export function resolveCoverage(
  row: { coverage_kind?: string | null; coverage_keys?: string[] | null },
  ...text: (string | null | undefined)[]
): Inferred {
  const keys = row.coverage_keys ?? [];
  if (keys.length > 0) {
    const kind: CoverageKind =
      row.coverage_kind === "tint" ? "tint" : row.coverage_kind === "none" ? "none" : "panels";
    return { kind, keys };
  }
  if (row.coverage_kind === "none") return { kind: "none", keys: [] };
  return inferCoverage(...text);
}
