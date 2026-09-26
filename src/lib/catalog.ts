import ppfImg from "@/assets/cat-ppf.jpg";
import tintImg from "@/assets/cat-tint.jpg";
import wrapImg from "@/assets/cat-wrap.jpg";
import ceramicImg from "@/assets/cat-ceramic.jpg";
import correctionImg from "@/assets/cat-correction.jpg";
import graphicsImg from "@/assets/cat-graphics.jpg";

/** Fallback imagery used when a service or category has no picture of its own. */
export const CATEGORY_IMAGES: Record<string, string> = {
  ppf: ppfImg,
  tint: tintImg,
  wrap: wrapImg,
  color_change: wrapImg,
  commercial_graphics: graphicsImg,
  ceramic: ceramicImg,
  detail: ceramicImg,
  paint_correction: correctionImg,
  pdr: correctionImg,
  protection_package: ppfImg,
  accessory: graphicsImg,
  other: wrapImg,
};

export function catalogImage(
  imageUrl?: string | null,
  categorySlug?: string | null,
  categoryImage?: string | null,
) {
  return (
    imageUrl ||
    categoryImage ||
    (categorySlug ? CATEGORY_IMAGES[categorySlug] : undefined) ||
    CATEGORY_IMAGES["other"]
  );
}

/** Panels a film/coating package can cover — laid out as a top-down vehicle map. */
export const PANEL_ROWS: { key: string; label: string; wide?: boolean }[][] = [
  [{ key: "front_bumper", label: "Front bumper", wide: true }],
  [
    { key: "fender_l", label: "L fender" },
    { key: "hood", label: "Hood" },
    { key: "fender_r", label: "R fender" },
  ],
  [
    { key: "mirror_l", label: "L mirror" },
    { key: "windshield", label: "Windshield" },
    { key: "mirror_r", label: "R mirror" },
  ],
  [
    { key: "door_front_l", label: "L front door" },
    { key: "roof", label: "Roof" },
    { key: "door_front_r", label: "R front door" },
  ],
  [
    { key: "door_rear_l", label: "L rear door" },
    { key: "rear_glass", label: "Rear glass" },
    { key: "door_rear_r", label: "R rear door" },
  ],
  [
    { key: "rocker_l", label: "L rocker" },
    { key: "trunk", label: "Trunk / hatch" },
    { key: "rocker_r", label: "R rocker" },
  ],
  [
    { key: "quarter_l", label: "L quarter" },
    { key: "a_pillars", label: "A-pillars" },
    { key: "quarter_r", label: "R quarter" },
  ],
  [{ key: "rear_bumper", label: "Rear bumper", wide: true }],
];

export const ALL_PANELS = PANEL_ROWS.flat().map((p) => p.key);

export const PANEL_LABELS: Record<string, string> = Object.fromEntries(
  PANEL_ROWS.flat().map((p) => [p.key, p.label]),
);

export const COVERAGE_PRESETS: { name: string; panels: string[] }[] = [
  {
    name: "Partial front",
    panels: ["front_bumper", "hood", "fender_l", "fender_r", "mirror_l", "mirror_r"],
  },
  {
    name: "Full front",
    panels: [
      "front_bumper",
      "hood",
      "fender_l",
      "fender_r",
      "mirror_l",
      "mirror_r",
      "a_pillars",
    ],
  },
  {
    name: "Track pack",
    panels: [
      "front_bumper",
      "hood",
      "fender_l",
      "fender_r",
      "mirror_l",
      "mirror_r",
      "a_pillars",
      "rocker_l",
      "rocker_r",
      "door_front_l",
      "door_front_r",
    ],
  },
  { name: "Full body", panels: ALL_PANELS },
];

export const OPTION_KINDS = ["tier", "coverage", "shade", "color", "addon"] as const;

export const OPTION_KIND_LABELS: Record<string, string> = {
  tier: "Film / product tier",
  coverage: "Coverage level",
  shade: "Shade",
  color: "Colour / finish",
  addon: "Add-on",
};

/** Starter categories offered when a shop has none yet. */
export const STARTER_CATEGORIES: {
  name: string;
  slug: string;
  description: string;
  accent_color: string;
}[] = [
  { name: "Paint protection film", slug: "ppf", description: "Clear bra packages by coverage.", accent_color: "#c99a5b" },
  { name: "Window tint", slug: "tint", description: "Film tiers, shades and coverage.", accent_color: "#3f6fd8" },
  { name: "Vinyl wrap", slug: "wrap", description: "Colour change and accent wraps.", accent_color: "#8c8f96" },
  { name: "Commercial graphics", slug: "commercial_graphics", description: "Fleet lettering and branding.", accent_color: "#2f9e6f" },
  { name: "Ceramic coating", slug: "ceramic", description: "Paint, glass and wheel coatings.", accent_color: "#39b3c9" },
  { name: "Paint correction & detail", slug: "paint_correction", description: "Polishing and detail packages.", accent_color: "#d4a13a" },
];
