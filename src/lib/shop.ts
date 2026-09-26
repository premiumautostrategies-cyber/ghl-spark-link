/* Shared shop-floor constants for SYSTEMIZE.OS */

export const PRODUCTION_PHASES = [
  { key: "wash_prep", label: "Wash & Prep", hours: 1 },
  { key: "plot_cut", label: "Plot & Cut", hours: 1.5 },
  { key: "install", label: "Install", hours: 4 },
  { key: "reassembly", label: "Reassembly", hours: 1 },
] as const;

export const BAY_DISCIPLINES = [
  { key: "ppf", label: "PPF", certification: "ppf" },
  { key: "tint", label: "Tint", certification: "tint" },
  { key: "wrap", label: "Wrap / Detail", certification: "wrap" },
  { key: "ceramic", label: "Ceramic", certification: "ceramic" },
  { key: "flex", label: "Flex bay", certification: null },
] as const;

export const CERTIFICATIONS = ["ppf", "tint", "wrap", "ceramic", "detail", "prep"] as const;
export const CERT_LEVELS = ["lead", "certified", "junior"] as const;

export const QC_TEMPLATE = [
  { label: "Post-heat edge temp verified (190–200°F)", kind: "temp", required: true },
  { label: "Water bubble inspection — no trapped moisture", kind: "check", required: true },
  { label: "Lights, cameras and sensors functional", kind: "check", required: true },
  { label: "Windows roll down and seal cleanly", kind: "check", required: true },
  { label: "Edges and wrapped lines inspected under light", kind: "check", required: true },
  { label: "Interior clean, no adhesive or slip solution", kind: "check", required: false },
] as const;

export const DEFAULT_MESSAGE_TEMPLATES = [
  {
    name: "Speed to lead",
    category: "lead",
    body: "Thanks for reaching out! To get you an exact quote, can you send the year, make and model of the vehicle plus a quick note on the current paint condition?",
  },
  {
    name: "Film shade availability",
    category: "question",
    body: "We stock 5%, 20%, 35% and 70% ceramic. All of them block over 95% of infrared heat — happy to show samples on your glass before we start.",
  },
  {
    name: "Cure times",
    category: "question",
    body: "Film needs 3–5 days to fully cure. Keep the windows up, skip the car wash for a week, and a little haze early on is normal.",
  },
  {
    name: "Drop-off instructions",
    category: "logistics",
    body: "Drop-off is between 8:00 and 8:30am at the front bay. Please bring the vehicle washed if you can, and leave us a key. We'll text you photos at check-in.",
  },
  {
    name: "Quote follow-up",
    category: "sales",
    body: "Just checking in on the proposal we sent over — happy to adjust coverage or tiers if you want a different number. Want me to hold a bay this week?",
  },
  {
    name: "Vehicle ready",
    category: "delivery",
    body: "Your vehicle is finished and passed final inspection. You're clear to pick up any time before 5pm — balance can be settled at the counter or by link.",
  },
] as const;

export const AFTERCARE_STEPS = [
  {
    kind: "day3_care",
    days: 3,
    body: "Day 3 check-in: your film is still curing. No pressure washing, no wax on the edges, and keep it out of the automatic wash for another week. Questions? Just reply here.",
  },
  {
    kind: "day14_check",
    days: 14,
    body: "It's been two weeks — we'd like to do a free 15-minute edge check to make sure every line is holding. Reply with a day that works and we'll hold a slot.",
  },
  {
    kind: "day15_review",
    days: 15,
    body: "Hope the vehicle is still turning heads. If we earned it, a quick 5-star review really helps our shop: {{review_url}}",
  },
] as const;

export const DEFECT_TYPES = [
  { key: "chip", label: "Paint chip", severity: "critical" },
  { key: "scratch", label: "Deep scratch", severity: "critical" },
  { key: "repaint", label: "Repainted panel", severity: "minor" },
  { key: "swirls", label: "Swirl marks", severity: "minor" },
  { key: "dent", label: "Dent", severity: "critical" },
  { key: "rust", label: "Rust / corrosion", severity: "critical" },
  { key: "glass", label: "Glass damage", severity: "minor" },
] as const;

export const FILM_VENDORS = ["XPEL", "SunTek", "Avery Dennison", "KPMF", "3M", "STEK"] as const;

export function makeToken(len = 24) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(len))
      : null;
  for (let i = 0; i < len; i++) {
    const n = bytes ? bytes[i]! : Math.floor(Math.random() * 256);
    out += chars[n % chars.length];
  }
  return out;
}

export function certForService(serviceType: string | null | undefined) {
  const t = (serviceType ?? "").toLowerCase();
  if (t.includes("ppf") || t.includes("protection")) return "ppf";
  if (t.includes("tint")) return "tint";
  if (t.includes("wrap") || t.includes("color")) return "wrap";
  if (t.includes("ceramic") || t.includes("coating")) return "ceramic";
  if (t.includes("detail") || t.includes("correction")) return "detail";
  if (t.includes("pdr") || t.includes("dent")) return "detail";
  return null;
}

/** Rough film consumption estimate in linear feet by service type. */
export function estimateFilmFeet(serviceType: string | null | undefined, hours: number) {
  const cert = certForService(serviceType);
  if (cert === "ppf") return Math.round(hours * 3.5);
  if (cert === "wrap") return Math.round(hours * 4);
  if (cert === "tint") return Math.round(hours * 1.5);
  return 0;
}
