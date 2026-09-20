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
