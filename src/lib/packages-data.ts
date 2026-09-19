import type { LucideIcon } from "lucide-react";
import { Brush, Car, Droplets, Layers, Shield, Sun } from "lucide-react";

export type PackageCategorySlug =
  | "ppf"
  | "wrap"
  | "ceramic"
  | "tint"
  | "detail";

export type PackageCategory = {
  slug: PackageCategorySlug;
  name: string;
  icon: LucideIcon;
  blurb: string;
};

export const PACKAGE_CATEGORIES: PackageCategory[] = [
  {
    slug: "ppf",
    name: "Paint Protection Film",
    icon: Shield,
    blurb: "Self-healing urethane against rock chips, road rash and bug etching.",
  },
  {
    slug: "wrap",
    name: "Colour Change Wraps",
    icon: Brush,
    blurb: "Reversible colour, accents and fleet livery over factory paint.",
  },
  {
    slug: "ceramic",
    name: "Ceramic Coatings",
    icon: Droplets,
    blurb: "Corrected paint locked under a hydrophobic, gloss-stable layer.",
  },
  {
    slug: "tint",
    name: "Window Tinting",
    icon: Sun,
    blurb: "Heat rejection, privacy and UV control with carbon or ceramic IR film.",
  },
  {
    slug: "detail",
    name: "Detailing & Reconditioning",
    icon: Car,
    blurb: "Decontamination, machine polishing and interior restoration.",
  },
];

export const CATEGORY_NAME: Record<PackageCategorySlug, string> = Object.fromEntries(
  PACKAGE_CATEGORIES.map((c) => [c.slug, c.name]),
) as Record<PackageCategorySlug, string>;

export type VehicleClass = {
  id: "coupe" | "suv" | "heavy";
  label: string;
  hint: string;
  multiplier: number;
};

export const VEHICLE_CLASSES: VehicleClass[] = [
  { id: "coupe", label: "Coupe / Small sedan", hint: "Base rate", multiplier: 1 },
  { id: "suv", label: "Mid-size SUV / Truck", hint: "+20%", multiplier: 1.2 },
  {
    id: "heavy",
    label: "Full-size / Heavy duty / Exotic",
    hint: "+45%",
    multiplier: 1.45,
  },
];

export type PackageBadge = {
  text: string;
  tone: "bronze" | "revenue" | "comms" | "urgent" | "rig";
};

export type PackageItem = {
  id: string;
  title: string;
  tagline: string;
  category: PackageCategorySlug;
  badges: PackageBadge[];
  basePrice: number;
  duration: string;
  features: string[];
  warranty: string;
  prep: string[];
  keywords: string[];
  recommendedAddons: string[];
};

export const PACKAGE_ITEMS: PackageItem[] = [
  // ---------- PPF ----------
  {
    id: "ppf-partial-front",
    title: "Partial Front PPF",
    tagline: "Covers the panels that take the first hit on every highway mile.",
    category: "ppf",
    badges: [{ text: "Self-healing", tone: "rig" }],
    basePrice: 1250,
    duration: "1 day",
    features: [
      "Full bumper, 18\" hood and fender leading edges",
      "Mirror caps wrapped and tucked",
      "Bulk-cut edges wrapped where trim allows",
      "Gloss or satin finish in the same film line",
    ],
    warranty: "10-year manufacturer warranty",
    prep: [
      "Decontamination wash, clay and IPA wipe-down",
      "Trim and light removal where the pattern requires it",
      "Tack-free cure in a heated, filtered bay",
    ],
    keywords: ["rock chips", "bumper", "highway", "urethane", "clear bra"],
    recommendedAddons: ["ceramic-3yr", "ppf-full-front", "tint-two-front"],
  },
  {
    id: "ppf-full-front",
    title: "Full Front PPF",
    tagline: "Bumper to A-pillar coverage with no visible cut line on the hood.",
    category: "ppf",
    badges: [
      { text: "Most popular", tone: "bronze" },
      { text: "Self-healing", tone: "rig" },
    ],
    basePrice: 2400,
    duration: "2 days",
    features: [
      "Full bumper, full hood and both fenders",
      "Mirrors, headlights and fog surrounds",
      "A-pillars and roof leading edge",
      "Wrapped edges, no seams across the hood",
      "Computer-cut plus hand-trimmed relief cuts",
    ],
    warranty: "10-year manufacturer warranty",
    prep: [
      "Two-stage wash and chemical decontamination",
      "Single-stage gloss enhancement before film",
      "Panel gap tucking with lights and grille removed",
    ],
    keywords: ["rock chips", "hood", "clear bra", "stealth", "matte"],
    recommendedAddons: ["ceramic-5yr", "tint-full-cabin", "detail-decon"],
  },
  {
    id: "ppf-track-pack",
    title: "Track Pack PPF",
    tagline: "Front end plus the rocker, arch and rear blast zones track days punish.",
    category: "ppf",
    badges: [{ text: "Track ready", tone: "urgent" }],
    basePrice: 3900,
    duration: "3 days",
    features: [
      "Everything in Full Front",
      "Rocker panels and lower quarter blast zones",
      "Rear arch and door-cup protection",
      "Rear bumper top loading strip",
      "High-impact 10-mil film on leading surfaces",
    ],
    warranty: "10-year manufacturer warranty",
    prep: [
      "Full underside and arch decontamination",
      "Wheels-off access to rocker and arch edges",
      "Pre-install paint depth reading and photo record",
    ],
    keywords: ["track", "rocker", "gravel", "arch", "impact"],
    recommendedAddons: ["ceramic-5yr", "detail-polish", "ppf-full-vehicle"],
  },
  {
    id: "ppf-full-vehicle",
    title: "Full Vehicle PPF",
    tagline: "Every painted panel under film, in gloss or a satin finish conversion.",
    category: "ppf",
    badges: [
      { text: "Lifetime care plan", tone: "revenue" },
      { text: "Gloss or satin", tone: "comms" },
    ],
    basePrice: 6800,
    duration: "5–7 days",
    features: [
      "All painted panels including roof and deck lid",
      "Gloss or satin stealth conversion",
      "Full disassembly of lights, handles and badges",
      "Wrapped edges throughout, no visible seams",
      "Ceramic top coat over film included",
      "Photo-documented install record",
    ],
    warranty: "12-year manufacturer warranty",
    prep: [
      "Multi-stage paint correction before any film goes on",
      "Full teardown of removable trim and hardware",
      "72-hour controlled cure before release",
    ],
    keywords: ["full body", "satin", "stealth", "matte", "conversion"],
    recommendedAddons: ["ceramic-5yr", "tint-full-cabin", "detail-polish"],
  },

  // ---------- Wraps ----------
  {
    id: "wrap-full-colour",
    title: "Full Colour Change Wrap",
    tagline: "A brand-new colour that lifts off cleanly and keeps the paint underneath.",
    category: "wrap",
    badges: [{ text: "Most popular", tone: "bronze" }],
    basePrice: 4200,
    duration: "4–5 days",
    features: [
      "Every exterior painted panel wrapped",
      "Door jambs wrapped one inch past the shut line",
      "Handles, mirrors and badges removed for tucking",
      "Gloss, satin, matte or colour-shift film lines",
      "Post-heat on every relieved edge",
    ],
    warranty: "5-year film warranty against lifting and fade",
    prep: [
      "Full decontamination and adhesive removal",
      "Panel teardown and edge degreasing",
      "24-hour post-heat inspection before release",
    ],
    keywords: ["colour change", "satin", "matte", "chrome", "colour shift"],
    recommendedAddons: ["ppf-full-front", "wrap-chrome-delete", "ceramic-1yr"],
  },
  {
    id: "wrap-chrome-delete",
    title: "Chrome Delete",
    tagline: "Blacks out every chrome accent for a factory-murdered look.",
    category: "wrap",
    badges: [{ text: "Same week", tone: "comms" }],
    basePrice: 450,
    duration: "4–6 hours",
    features: [
      "Window surrounds and belt-line trim",
      "Grille surround and lower valance accents",
      "Mirror caps and badge surrounds",
      "Gloss black, satin black or colour-matched",
    ],
    warranty: "3-year film warranty",
    prep: [
      "Trim degrease and adhesion promoter on tight radii",
      "Knifeless tape lines only, no blade on paint",
    ],
    keywords: ["chrome", "blackout", "trim", "murdered"],
    recommendedAddons: ["tint-full-cabin", "wrap-accents", "detail-decon"],
  },
  {
    id: "wrap-accents",
    title: "Roof & Hood Accents",
    tagline: "Contrast roof, hood or mirror caps without committing to a full wrap.",
    category: "wrap",
    badges: [],
    basePrice: 850,
    duration: "1 day",
    features: [
      "Roof and sunroof surround",
      "Hood or hood stripe layout",
      "Mirror caps and spoiler",
      "Carbon fibre, gloss or satin finishes",
    ],
    warranty: "3-year film warranty",
    prep: ["Decontamination of the accent panels", "Layout proofing before any film is cut"],
    keywords: ["roof", "hood", "carbon fibre", "stripe", "accent"],
    recommendedAddons: ["wrap-chrome-delete", "ceramic-1yr", "tint-sunstrip"],
  },
  {
    id: "wrap-fleet",
    title: "Commercial / Fleet Livery",
    tagline: "Consistent branded livery across a whole fleet, van by van.",
    category: "wrap",
    badges: [{ text: "Fleet pricing", tone: "revenue" }],
    basePrice: 1800,
    duration: "2 days per unit",
    features: [
      "Print, laminate and contour-cut graphics",
      "Three-side or full coverage layouts",
      "Reflective and cast film options",
      "Design proof and per-unit repeatability file",
      "Removal and re-livery on lease return",
    ],
    warranty: "5-year print and laminate warranty",
    prep: [
      "Vehicle template proofing and brand sign-off",
      "Panel decontamination and rivet-brush technique on corrugations",
    ],
    keywords: ["fleet", "van", "graphics", "livery", "branding", "reflective"],
    recommendedAddons: ["tint-two-front", "detail-decon", "ceramic-1yr"],
  },

  // ---------- Ceramic ----------
  {
    id: "ceramic-1yr",
    title: "1-Year Sport Coating",
    tagline: "Gloss enhancement and a season of easy washing at an entry price.",
    category: "ceramic",
    badges: [{ text: "Entry tier", tone: "comms" }],
    basePrice: 650,
    duration: "1 day",
    features: [
      "Single-stage gloss enhancement polish",
      "One layer SiO2 coating on paint",
      "Trim and glass sealant",
      "Wheel face coating",
    ],
    warranty: "12-month coating warranty",
    prep: [
      "Decontamination wash, iron and tar removal",
      "Clay treatment and panel wipe",
      "Enhancement polish — one stage",
    ],
    keywords: ["gloss", "hydrophobic", "sio2", "enhancement", "sealant"],
    recommendedAddons: ["detail-interior", "tint-full-cabin", "ceramic-3yr"],
  },
  {
    id: "ceramic-3yr",
    title: "3-Year Pro Coating",
    tagline: "Two-step corrected paint sealed under a professional-grade coating.",
    category: "ceramic",
    badges: [{ text: "Most popular", tone: "bronze" }],
    basePrice: 1650,
    duration: "2–3 days",
    features: [
      "Two-step machine correction (compound + refine)",
      "Two layers of coating on paint",
      "Glass, trim and wheel-face coating",
      "Exhaust tip and badge treatment",
      "Annual inspection included",
    ],
    warranty: "3-year coating warranty with annual inspection",
    prep: [
      "Paint depth readings on every panel",
      "Two-step correction under dual light sources",
      "IPA wipe and humidity-controlled cure",
    ],
    keywords: ["correction", "2-step", "swirls", "gloss", "coating"],
    recommendedAddons: ["ppf-full-front", "detail-interior", "tint-full-cabin"],
  },
  {
    id: "ceramic-5yr",
    title: "5–7 Year Multi-Layer Ceramic",
    tagline: "Multi-stage correction and layered coating for a long-term keeper.",
    category: "ceramic",
    badges: [
      { text: "Lifetime warranty option", tone: "revenue" },
      { text: "Wheels off", tone: "urgent" },
    ],
    basePrice: 2900,
    duration: "4–5 days",
    features: [
      "Multi-stage correction to 90%+ defect removal",
      "Base layer plus two topper layers",
      "Wheels-off barrel and caliper coating",
      "Glass, trim, plastics and interior leather coating",
      "Coating-safe maintenance wash kit",
      "Two annual inspections included",
    ],
    warranty: "7-year coating warranty, renewable for life with annual service",
    prep: [
      "Full paint mapping and depth logging",
      "Three-stage correction including finishing polish",
      "Wheels removed, arches cleaned and sealed",
    ],
    keywords: ["multi-layer", "wheels off", "correction", "show finish", "gloss"],
    recommendedAddons: ["ppf-full-front", "detail-polish", "tint-full-cabin"],
  },

  // ---------- Tint ----------
  {
    id: "tint-two-front",
    title: "Two-Front Match",
    tagline: "Matches the front doors to factory rear glass in an afternoon.",
    category: "tint",
    badges: [{ text: "Same day", tone: "comms" }],
    basePrice: 220,
    duration: "1–2 hours",
    features: [
      "Both front door windows",
      "Carbon or ceramic IR film",
      "Computer-cut patterns, no blade near glass",
      "Legal VLT check for your state",
    ],
    warranty: "Lifetime warranty against bubbling, peeling and purple fade",
    prep: ["Door card edge cleaning", "Steam and squeegee cure check before release"],
    keywords: ["two front", "match", "vlt", "carbon", "privacy"],
    recommendedAddons: ["tint-windshield", "tint-sunstrip", "detail-interior"],
  },
  {
    id: "tint-full-cabin",
    title: "Full Cabin Tint",
    tagline: "Every side and rear window in one consistent shade and film line.",
    category: "tint",
    badges: [
      { text: "Most popular", tone: "bronze" },
      { text: "Lifetime warranty", tone: "revenue" },
    ],
    basePrice: 549,
    duration: "3–4 hours",
    features: [
      "All side windows plus rear glass",
      "Nano-ceramic IR-rejecting film",
      "Up to 98% infrared heat rejection",
      "99% UV block, zero signal interference",
      "Shade options from 5% to 70%",
    ],
    warranty: "Lifetime warranty against bubbling, peeling and purple fade",
    prep: [
      "Full glass decontamination inside and out",
      "Defroster-safe rear glass technique",
      "48-hour cure guidance issued at delivery",
    ],
    keywords: ["heat rejection", "ceramic", "ir", "uv", "privacy", "shade"],
    recommendedAddons: ["tint-windshield", "ceramic-1yr", "detail-interior"],
  },
  {
    id: "tint-windshield",
    title: "Windshield Film",
    tagline: "Kills cabin heat through the biggest piece of glass on the car.",
    category: "tint",
    badges: [{ text: "Heat rejection", tone: "urgent" }],
    basePrice: 350,
    duration: "1–2 hours",
    features: [
      "Full windshield in clear or light ceramic IR",
      "ADAS camera window cut-out",
      "Glare reduction without VLT loss",
      "Legal clear IR option available",
    ],
    warranty: "Lifetime warranty against bubbling and peeling",
    prep: ["Rain sensor and camera housing masking", "Two-person top-load installation"],
    keywords: ["windshield", "heat rejection", "ir", "clear", "glare"],
    recommendedAddons: ["tint-full-cabin", "ceramic-1yr", "tint-sunstrip"],
  },
  {
    id: "tint-sunstrip",
    title: "Sunstrip",
    tagline: "A visor band across the top of the windshield for low-sun driving.",
    category: "tint",
    badges: [],
    basePrice: 120,
    duration: "45 minutes",
    features: [
      "5\" to 8\" band, height to preference",
      "Colour-matched or gradient options",
      "Cut clear of the ADAS window",
    ],
    warranty: "Lifetime warranty against bubbling and peeling",
    prep: ["Band height proofing from the driver's seat"],
    keywords: ["sunstrip", "visor", "glare", "band"],
    recommendedAddons: ["tint-windshield", "tint-two-front", "wrap-chrome-delete"],
  },

  // ---------- Detail ----------
  {
    id: "detail-interior",
    title: "Interior Deep Clean",
    tagline: "Extraction, leather care and a cabin that smells like nothing at all.",
    category: "detail",
    badges: [],
    basePrice: 325,
    duration: "4–5 hours",
    features: [
      "Hot-water extraction on carpets and cloth",
      "Leather clean and pH-balanced conditioning",
      "Steam sanitising of vents and touch points",
      "Glass, screens and trim detailed",
      "Odour treatment where needed",
    ],
    warranty: "30-day satisfaction re-clean",
    prep: ["Full removal of personal items and mats", "Pre-treatment dwell on stained areas"],
    keywords: ["interior", "leather", "extraction", "odour", "steam"],
    recommendedAddons: ["ceramic-1yr", "detail-decon", "tint-full-cabin"],
  },
  {
    id: "detail-decon",
    title: "Exterior Decontamination",
    tagline: "Strips iron, tar and bonded fallout so the paint feels like glass.",
    category: "detail",
    badges: [{ text: "Pre-service standard", tone: "comms" }],
    basePrice: 275,
    duration: "3–4 hours",
    features: [
      "Two-bucket wash and foam pre-soak",
      "Iron and tar chemical decontamination",
      "Clay bar treatment on all paint and glass",
      "Wheel barrels and arches cleaned",
      "Six-month sealant applied",
    ],
    warranty: "6-month sealant durability",
    prep: ["pH-neutral strip wash", "Drying with filtered air, no towel marring"],
    keywords: ["decontamination", "clay", "iron", "tar", "sealant", "wash"],
    recommendedAddons: ["detail-polish", "ceramic-1yr", "ppf-partial-front"],
  },
  {
    id: "detail-polish",
    title: "Multi-Stage Machine Polish",
    tagline: "Removes swirls, holograms and sanding marks under proper lighting.",
    category: "detail",
    badges: [{ text: "Show finish", tone: "rig" }],
    basePrice: 900,
    duration: "2 days",
    features: [
      "Compounding stage for defect removal",
      "Polishing stage for clarity",
      "Finishing stage for jewelling on dark paint",
      "Paint depth logged per panel",
      "Six-month sealant to protect the work",
    ],
    warranty: "Correction documented with before and after photos",
    prep: [
      "Decontamination and tape-off of trim and edges",
      "Test spot approved with the customer before full panels",
    ],
    keywords: ["polish", "swirls", "correction", "holograms", "paint"],
    recommendedAddons: ["ceramic-3yr", "ppf-full-front", "detail-interior"],
  },
];

export const PACKAGE_BY_ID: Record<string, PackageItem> = Object.fromEntries(
  PACKAGE_ITEMS.map((p) => [p.id, p]),
);

export const CATEGORY_ICON: Record<PackageCategorySlug, LucideIcon> = Object.fromEntries(
  PACKAGE_CATEGORIES.map((c) => [c.slug, c.icon]),
) as Record<PackageCategorySlug, LucideIcon>;

export const ALL_ICON = Layers;

export function classPrice(base: number, multiplier: number) {
  return Math.round((base * multiplier) / 5) * 5;
}
