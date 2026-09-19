import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/shop";
import { ALL_PANELS, STARTER_CATEGORIES } from "@/lib/catalog";

function daysFromNow(days: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Loads a realistic, interconnected demo shop into the current organization:
 * customers -> vehicles -> deals -> estimates -> jobs -> payments -> documents,
 * plus a service menu, inventory, installers and automations.
 */
export async function seedDemoData(orgId: string, locId: string | null) {
  const org = { organization_id: orgId, location_id: locId };

  // --- Service library ----------------------------------------------------
  const categoryRows = STARTER_CATEGORIES.map((c, i) => ({
    ...c,
    sort_order: i,
    ...org,
  }));
  const catIns = await supabase
    .from("service_categories")
    .insert(categoryRows)
    .select("id,slug");
  if (catIns.error) throw catIns.error;
  const catId = (slug: string) => catIns.data?.find((c) => c.slug === slug)?.id ?? null;

  const FRONT = ["front_bumper", "hood", "fender_l", "fender_r", "mirror_l", "mirror_r"];
  const services = [
    { name: "Full front PPF", category: "ppf", base_price: 2400, duration_minutes: 600, description: "Hood, fenders, bumper, mirrors, headlights.", customer_description: "Impact protection across every panel the road hits first.", coverage_panels: [...FRONT, "a_pillars"] },
    { name: "Partial front PPF", category: "ppf", base_price: 1250, duration_minutes: 360, customer_description: "Bumper, partial hood and fenders — the high-value basics.", coverage_panels: FRONT },
    { name: "Full body PPF", category: "ppf", base_price: 6800, duration_minutes: 2400, description: "Complete paint protection coverage.", customer_description: "Every painted panel wrapped in self-healing film.", coverage_panels: ALL_PANELS },
    { name: "Ceramic tint — full vehicle", category: "tint", base_price: 549, duration_minutes: 180, description: "Nano-ceramic, lifetime warranty.", customer_description: "Heat rejection you feel on the first drive." },
    { name: "Windshield tint strip", category: "tint", base_price: 120, duration_minutes: 45 },
    { name: "Color change wrap — full", category: "wrap", base_price: 4200, duration_minutes: 2880, description: "Premium cast vinyl, full disassembly.", customer_description: "A brand-new colour without touching the factory paint.", coverage_panels: ALL_PANELS },
    { name: "Commercial fleet graphics", category: "commercial_graphics", base_price: 1800, duration_minutes: 720, description: "Cut vinyl logos and lettering." },
    { name: "Ceramic coating — 5 year", category: "ceramic", base_price: 1650, duration_minutes: 960, customer_description: "Five years of gloss, chemical resistance and easy washing." },
    { name: "Two-step paint correction", category: "paint_correction", base_price: 900, duration_minutes: 600 },
    { name: "Maintenance detail", category: "paint_correction", base_price: 225, duration_minutes: 180 },
    { name: "Protection package — Track", category: "ppf", base_price: 8900, duration_minutes: 3600, description: "Full PPF + ceramic + tint bundle.", coverage_panels: ALL_PANELS },
  ].map((s, i) => ({
    coverage_panels: [] as string[],
    ...s,
    category_id: catId(s.category),
    sort_order: i,
    ...org,
  }));

  // --- Inventory ----------------------------------------------------------
  const inventory = [
    { name: "XPEL Ultimate Plus 60\"", sku: "XPL-UP-60", brand: "XPEL", category: "ppf", unit: "roll", quantity_on_hand: 6, reorder_point: 3, unit_cost: 1150, supplier: "XPEL Direct" },
    { name: "SunTek Ceramic CIR 35%", sku: "STK-CIR-35", brand: "SunTek", category: "tint", unit: "roll", quantity_on_hand: 2, reorder_point: 3, unit_cost: 420, supplier: "Tint Supply Co" },
    { name: "3M 2080 Satin Black", sku: "3M-2080-SB", brand: "3M", category: "film", unit: "roll", quantity_on_hand: 4, reorder_point: 2, unit_cost: 690, supplier: "Metro Wrap Supply" },
    { name: "Gtechniq Crystal Serum Ultra", sku: "GT-CSU", brand: "Gtechniq", category: "coating", unit: "bottle", quantity_on_hand: 9, reorder_point: 4, unit_cost: 145, supplier: "Detail Depot" },
    { name: "Slip solution concentrate", sku: "CHM-SLIP", category: "chemical", unit: "gallon", quantity_on_hand: 1, reorder_point: 2, unit_cost: 38, supplier: "Detail Depot" },
    { name: "Knifeless tape — finish line", sku: "KNF-FL", brand: "3M", category: "consumable", unit: "roll", quantity_on_hand: 12, reorder_point: 6, unit_cost: 28, supplier: "Metro Wrap Supply" },
    { name: "Squeegee blades (50pk)", sku: "TL-SQB", category: "tool", unit: "pack", quantity_on_hand: 5, reorder_point: 2, unit_cost: 22, supplier: "Metro Wrap Supply" },
  ].map((i) => ({ ...i, ...org }));

  // --- Team ---------------------------------------------------------------
  const team = [
    { full_name: "Marcus Webb", title: "Lead PPF installer", email: "marcus@shop.test", phone: "(704) 555-0142", specialties: ["ppf", "paint_correction"], pay_type: "hourly", pay_rate: 34 },
    { full_name: "Dani Ortiz", title: "Tint specialist", email: "dani@shop.test", phone: "(704) 555-0119", specialties: ["tint"], pay_type: "commission", pay_rate: 0, commission_rate: 35 },
    { full_name: "Corey Lang", title: "Wrap installer", email: "corey@shop.test", phone: "(704) 555-0188", specialties: ["wrap", "color_change", "commercial_graphics"], pay_type: "hourly", pay_rate: 31 },
    { full_name: "Priya Raman", title: "Service advisor", email: "priya@shop.test", phone: "(704) 555-0163", specialties: ["sales"], pay_type: "salary", pay_rate: 58000, commission_rate: 5 },
  ].map((t) => ({ commission_rate: 0, ...t, ...org }));

  // --- Automations --------------------------------------------------------
  const automations = [
    { name: "New lead instant text", trigger_event: "lead_created", delay_minutes: 2, channel: "sms", template: "Hey {{first_name}} — thanks for reaching out about {{service}}. Want me to hold a bay this week?" },
    { name: "Estimate follow-up", trigger_event: "estimate_sent", delay_minutes: 2880, channel: "sms", template: "Just checking in on your {{service}} quote. Happy to walk through options." },
    { name: "Day-before reminder", trigger_event: "job_scheduled", delay_minutes: 1440, channel: "sms", template: "See you tomorrow at {{time}} for your {{service}}. Please arrive with the vehicle washed." },
    { name: "Aftercare + review ask", trigger_event: "job_completed", delay_minutes: 2880, channel: "email", template: "Care instructions for your new {{service}} — and if we earned it, a review means the world." },
    { name: "12-month warranty check-in", trigger_event: "warranty_due", delay_minutes: 0, channel: "email", template: "It's been a year on your {{service}}. Book a free inspection." },
  ].map((a) => ({ ...a, organization_id: orgId }));

  const [svc, inv] = await Promise.all([
    supabase.from("services").insert(services).select("id,name,base_price,category"),
    supabase.from("inventory_items").insert(inventory),
    supabase.from("team_members").insert(team),
    supabase.from("automations").insert(automations),
  ]);
  if (svc.error) throw svc.error;
  if (inv.error) throw inv.error;
  const menu = svc.data ?? [];
  const priceOf = (name: string) => Number(menu.find((m) => m.name === name)?.base_price ?? 0);
  const svcId = (name: string) => menu.find((m) => m.name === name)?.id ?? null;

  // --- Options, tiers and shades -----------------------------------------
  const optionRows = [
    ...["Full front PPF", "Partial front PPF", "Full body PPF"].flatMap((s) => [
      { service: s, name: "Standard gloss film", kind: "tier", price_delta: 0, description: "10-year self-healing film." },
      { service: s, name: "Premium gloss film", kind: "tier", price_delta: 450, description: "12-year film, superior clarity." },
      { service: s, name: "Satin / stealth film", kind: "tier", price_delta: 900, swatch_color: "#4b4f57", description: "Matte finish over factory gloss." },
      { service: s, name: "Ceramic top coat", kind: "addon", price_delta: 550, duration_delta_minutes: 240 },
      { service: s, name: "Headlight & fog protection", kind: "addon", price_delta: 180, duration_delta_minutes: 60 },
    ]),
    { service: "Ceramic tint — full vehicle", name: "Carbon film", kind: "tier", price_delta: -120, description: "Colour-stable, no signal interference." },
    { service: "Ceramic tint — full vehicle", name: "Nano-ceramic IR", kind: "tier", price_delta: 0, description: "98% infrared rejection." },
    { service: "Ceramic tint — full vehicle", name: "Ceramic IR Max", kind: "tier", price_delta: 220, description: "Top-tier heat rejection, lifetime warranty." },
    { service: "Ceramic tint — full vehicle", name: "5% Limo", kind: "shade", price_delta: 0, swatch_color: "#0b0b0d" },
    { service: "Ceramic tint — full vehicle", name: "20% Dark", kind: "shade", price_delta: 0, swatch_color: "#2a2b30" },
    { service: "Ceramic tint — full vehicle", name: "35% Medium", kind: "shade", price_delta: 0, swatch_color: "#4a4c53" },
    { service: "Ceramic tint — full vehicle", name: "70% Clear IR", kind: "shade", price_delta: 60, swatch_color: "#9aa0ab" },
    { service: "Ceramic tint — full vehicle", name: "Windshield full tint", kind: "addon", price_delta: 210, duration_delta_minutes: 60 },
    { service: "Ceramic tint — full vehicle", name: "Sunroof tint", kind: "addon", price_delta: 130, duration_delta_minutes: 45 },
    { service: "Color change wrap — full", name: "Satin black", kind: "color", price_delta: 0, swatch_color: "#1b1c1e" },
    { service: "Color change wrap — full", name: "Gloss nardo grey", kind: "color", price_delta: 0, swatch_color: "#9b9e9f" },
    { service: "Color change wrap — full", name: "Midnight blue metallic", kind: "color", price_delta: 300, swatch_color: "#1d2f52" },
    { service: "Color change wrap — full", name: "Colour-shift purple/gold", kind: "color", price_delta: 1400, swatch_color: "#6b4b9b" },
    { service: "Color change wrap — full", name: "Chrome delete", kind: "addon", price_delta: 450, duration_delta_minutes: 240 },
    { service: "Color change wrap — full", name: "Roof & mirrors only", kind: "coverage", price_delta: -2900, coverage_panels: ["roof", "mirror_l", "mirror_r"] },
    { service: "Ceramic coating — 5 year", name: "Paint only", kind: "coverage", price_delta: 0 },
    { service: "Ceramic coating — 5 year", name: "Paint + glass + wheels", kind: "coverage", price_delta: 420, duration_delta_minutes: 180 },
    { service: "Ceramic coating — 5 year", name: "Interior fabric & leather", kind: "addon", price_delta: 260, duration_delta_minutes: 120 },
    { service: "Commercial fleet graphics", name: "Single-side lettering", kind: "coverage", price_delta: -600 },
    { service: "Commercial fleet graphics", name: "Full three-side branding", kind: "coverage", price_delta: 0 },
    { service: "Commercial fleet graphics", name: "Reflective vinyl upgrade", kind: "addon", price_delta: 340 },
  ]
    .map((o) => ({
      duration_delta_minutes: 0,
      coverage_panels: [] as string[],
      swatch_color: null as string | null,
      description: null as string | null,
      ...o,
      service_id: svcId(o.service),
      organization_id: orgId,
    }))
    .filter((o): o is typeof o & { service_id: string } => !!o.service_id)
    .map(({ service: _s, ...rest }) => rest);
  const optIns = await supabase.from("service_options").insert(optionRows);
  if (optIns.error) throw optIns.error;

  // --- Customers ----------------------------------------------------------
  const customerRows = [
    { name: "Elena Marsh", email: "elena.marsh@example.com", phone: "(704) 555-0110", notes: "Repeat client — two vehicles protected." },
    { name: "Jordan Pike", email: "jpike@example.com", phone: "(704) 555-0121", notes: "Found us on Instagram." },
    { name: "Southside Plumbing", email: "ops@southsideplumbing.test", phone: "(704) 555-0134", company: "Southside Plumbing", notes: "Fleet of 6 vans." },
    { name: "Tasha Bell", email: "tasha.bell@example.com", phone: "(704) 555-0147" },
    { name: "Raj Anand", email: "raj.anand@example.com", phone: "(704) 555-0152", notes: "Track car — wants full protection package." },
    { name: "Kyle Donnelly", email: "kyle.d@example.com", phone: "(704) 555-0176" },
  ].map((c) => ({ ...c, ...org }));

  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .insert(customerRows)
    .select("id,name");
  if (custErr) throw custErr;
  const cid = (name: string) => customers?.find((c) => c.name === name)?.id ?? null;

  // --- Vehicles -----------------------------------------------------------
  const vehicleRows = [
    { customer_id: cid("Elena Marsh"), year: 2024, make: "Porsche", model: "Macan GTS", color: "Carrara White", plate: "ELN-914" },
    { customer_id: cid("Elena Marsh"), year: 2021, make: "Audi", model: "Q5", color: "Navarra Blue", plate: "ELN-22" },
    { customer_id: cid("Jordan Pike"), year: 2023, make: "Ford", model: "Bronco", color: "Cactus Gray", plate: "BRN-778" },
    { customer_id: cid("Southside Plumbing"), year: 2022, make: "Ram", model: "ProMaster 2500", color: "White", plate: "SSP-101" },
    { customer_id: cid("Southside Plumbing"), year: 2022, make: "Ram", model: "ProMaster 2500", color: "White", plate: "SSP-102" },
    { customer_id: cid("Tasha Bell"), year: 2025, make: "Tesla", model: "Model Y", color: "Stealth Grey", plate: "TSH-5" },
    { customer_id: cid("Raj Anand"), year: 2023, make: "Chevrolet", model: "Corvette Z06", color: "Amplify Orange", plate: "Z06-RAJ" },
    { customer_id: cid("Kyle Donnelly"), year: 2019, make: "Jeep", model: "Wrangler", color: "Firecracker Red", plate: "KYL-4X4" },
  ].map((v) => ({ ...v, ...org }));

  const { data: vehicles, error: vehErr } = await supabase
    .from("vehicles")
    .insert(vehicleRows)
    .select("id,plate,customer_id");
  if (vehErr) throw vehErr;
  const vid = (plate: string) => vehicles?.find((v) => v.plate === plate)?.id ?? null;

  // --- Jobs ---------------------------------------------------------------
  const jobRows = [
    { title: "Full front PPF — Macan GTS", service_type: "ppf", status: "in_progress", bay: "Bay 1", installer: "Marcus Webb", price: priceOf("Full front PPF"), customer_id: cid("Elena Marsh"), vehicle_id: vid("ELN-914"), scheduled_start: daysFromNow(0, 8), scheduled_end: daysFromNow(0, 17) },
    { title: "Ceramic tint — Model Y", service_type: "tint", status: "scheduled", bay: "Bay 2", installer: "Dani Ortiz", price: priceOf("Ceramic tint — full vehicle"), customer_id: cid("Tasha Bell"), vehicle_id: vid("TSH-5"), scheduled_start: daysFromNow(1, 10), scheduled_end: daysFromNow(1, 14) },
    { title: "Fleet graphics — van 101", service_type: "commercial_graphics", status: "scheduled", bay: "Bay 3", installer: "Corey Lang", price: priceOf("Commercial fleet graphics"), customer_id: cid("Southside Plumbing"), vehicle_id: vid("SSP-101"), scheduled_start: daysFromNow(2, 8), scheduled_end: daysFromNow(2, 16) },
    { title: "Satin black color change — Bronco", service_type: "color_change", status: "scheduled", bay: "Bay 1", installer: "Corey Lang", price: priceOf("Color change wrap — full"), customer_id: cid("Jordan Pike"), vehicle_id: vid("BRN-778"), scheduled_start: daysFromNow(5, 8), scheduled_end: daysFromNow(8, 17) },
    { title: "Track protection package — Z06", service_type: "protection_package", status: "estimate", price: priceOf("Protection package — Track"), customer_id: cid("Raj Anand"), vehicle_id: vid("Z06-RAJ"), scheduled_start: null },
    { title: "Ceramic coating — Q5", service_type: "ceramic", status: "completed", bay: "Bay 2", installer: "Marcus Webb", price: priceOf("Ceramic coating — 5 year"), customer_id: cid("Elena Marsh"), vehicle_id: vid("ELN-22"), scheduled_start: daysFromNow(-9, 8), scheduled_end: daysFromNow(-8, 16) },
    { title: "Two-step correction — Wrangler", service_type: "paint_correction", status: "invoiced", bay: "Bay 3", installer: "Marcus Webb", price: priceOf("Two-step paint correction"), customer_id: cid("Kyle Donnelly"), vehicle_id: vid("KYL-4X4"), scheduled_start: daysFromNow(-16, 9), scheduled_end: daysFromNow(-16, 17) },
    { title: "Maintenance detail — van 102", service_type: "detail", status: "lead", price: priceOf("Maintenance detail"), customer_id: cid("Southside Plumbing"), vehicle_id: vid("SSP-102") },
  ].map((j) => ({ ...j, ...org }));

  const { data: jobs, error: jobErr } = await supabase
    .from("jobs")
    .insert(jobRows)
    .select("id,title,price,customer_id,vehicle_id");
  if (jobErr) throw jobErr;
  const jid = (t: string) => jobs?.find((j) => j.title === t)?.id ?? null;

  // --- Estimates + line items --------------------------------------------
  const { data: estimates, error: estErr } = await supabase
    .from("estimates")
    .insert([
      { title: "Track protection package — Z06", status: "sent", tax_rate: 7.25, customer_id: cid("Raj Anand"), vehicle_id: vid("Z06-RAJ"), job_id: jid("Track protection package — Z06"), ...org },
      { title: "Fleet wrap program — 6 vans", status: "draft", tax_rate: 7.25, customer_id: cid("Southside Plumbing"), vehicle_id: vid("SSP-102"), ...org },
      { title: "Color change + tint — Bronco", status: "approved", tax_rate: 7.25, customer_id: cid("Jordan Pike"), vehicle_id: vid("BRN-778"), job_id: jid("Satin black color change — Bronco"), ...org },
    ])
    .select("id,title");
  if (estErr) throw estErr;
  const eid = (t: string) => estimates?.find((e) => e.title === t)?.id ?? null;

  const items = [
    { estimate_id: eid("Track protection package — Z06"), description: "Full body PPF — gloss", quantity: 1, unit_price: 6800, position: 0 },
    { estimate_id: eid("Track protection package — Z06"), description: "Ceramic coating over PPF", quantity: 1, unit_price: 1650, position: 1 },
    { estimate_id: eid("Track protection package — Z06"), description: "Ceramic tint — full vehicle", quantity: 1, unit_price: 549, position: 2 },
    { estimate_id: eid("Fleet wrap program — 6 vans"), description: "Cut vinyl logo kit per van", quantity: 6, unit_price: 1800, position: 0 },
    { estimate_id: eid("Fleet wrap program — 6 vans"), description: "Design and proofing", quantity: 1, unit_price: 650, position: 1 },
    { estimate_id: eid("Color change + tint — Bronco"), description: "Satin black full wrap", quantity: 1, unit_price: 4200, position: 0 },
    { estimate_id: eid("Color change + tint — Bronco"), description: "Ceramic tint — full vehicle", quantity: 1, unit_price: 549, position: 1 },
  ]
    .filter((i): i is typeof i & { estimate_id: string } => Boolean(i.estimate_id))
    .map((i) => ({ ...i, organization_id: orgId }));
  const itemRes = await supabase.from("estimate_items").insert(items);
  if (itemRes.error) throw itemRes.error;

  // --- Sales pipeline -----------------------------------------------------
  const deals = [
    { title: "Z06 track protection package", stage: "quoted", value: 8999, probability: 60, source: "Referral", customer_id: cid("Raj Anand"), vehicle_id: vid("Z06-RAJ"), estimate_id: eid("Track protection package — Z06"), owner_name: "Priya Raman", expected_close: daysFromNow(7).slice(0, 10), last_activity_at: daysFromNow(-1, 15) },
    { title: "Southside fleet wrap program", stage: "negotiating", value: 11450, probability: 45, source: "Cold outreach", customer_id: cid("Southside Plumbing"), estimate_id: eid("Fleet wrap program — 6 vans"), owner_name: "Priya Raman", expected_close: daysFromNow(21).slice(0, 10), last_activity_at: daysFromNow(-2, 11) },
    { title: "Bronco color change", stage: "won", value: 4749, probability: 100, source: "Instagram", customer_id: cid("Jordan Pike"), vehicle_id: vid("BRN-778"), job_id: jid("Satin black color change — Bronco"), owner_name: "Priya Raman", expected_close: daysFromNow(-3).slice(0, 10), last_activity_at: daysFromNow(-3, 16) },
    { title: "Model Y tint", stage: "won", value: 549, probability: 100, source: "Google", customer_id: cid("Tasha Bell"), vehicle_id: vid("TSH-5"), owner_name: "Dani Ortiz", expected_close: daysFromNow(1).slice(0, 10) },
    { title: "Wrangler full PPF", stage: "contacted", value: 6800, probability: 25, source: "Walk-in", customer_id: cid("Kyle Donnelly"), vehicle_id: vid("KYL-4X4"), owner_name: "Priya Raman", expected_close: daysFromNow(30).slice(0, 10) },
    { title: "Macan ceramic add-on", stage: "new_lead", value: 1650, probability: 20, source: "Existing client", customer_id: cid("Elena Marsh"), vehicle_id: vid("ELN-914"), owner_name: "Priya Raman", expected_close: daysFromNow(14).slice(0, 10) },
    { title: "Show car full wrap (lost)", stage: "lost", value: 5200, probability: 0, source: "Facebook", owner_name: "Priya Raman", notes: "Went with a cheaper shop across town.", expected_close: daysFromNow(-12).slice(0, 10) },
  ].map((d) => ({ ...d, ...org }));
  const dealRes = await supabase.from("deals").insert(deals);
  if (dealRes.error) throw dealRes.error;

  // --- Payments -----------------------------------------------------------
  const payments = [
    { amount: 1200, kind: "deposit", method: "card", status: "paid", customer_id: cid("Elena Marsh"), job_id: jid("Full front PPF — Macan GTS"), reference: "dep-2201", paid_at: daysFromNow(-4, 12) },
    { amount: 1650, kind: "payment", method: "card", status: "paid", customer_id: cid("Elena Marsh"), job_id: jid("Ceramic coating — Q5"), reference: "pay-2188", paid_at: daysFromNow(-8, 17) },
    { amount: 900, kind: "invoice", method: "ach", status: "pending", customer_id: cid("Kyle Donnelly"), job_id: jid("Two-step correction — Wrangler"), reference: "inv-2190", paid_at: null },
    { amount: 2100, kind: "deposit", method: "financing", status: "paid", customer_id: cid("Jordan Pike"), job_id: jid("Satin black color change — Bronco"), reference: "dep-2205", paid_at: daysFromNow(-3, 10) },
    { amount: 549, kind: "payment", method: "cash", status: "paid", customer_id: cid("Tasha Bell"), reference: "pay-2207", paid_at: daysFromNow(-1, 16) },
  ].map((p) => ({ ...p, ...org }));
  const payRes = await supabase.from("payments").insert(payments);
  if (payRes.error) throw payRes.error;

  // --- Documents ----------------------------------------------------------
  const docs = [
    { name: "PPF installation agreement — Macan GTS", doc_type: "contract", status: "signed", customer_id: cid("Elena Marsh"), job_id: jid("Full front PPF — Macan GTS"), signer_name: "Elena Marsh", signed_at: daysFromNow(-4, 12) },
    { name: "Lifetime tint warranty — Model Y", doc_type: "warranty", status: "draft", customer_id: cid("Tasha Bell") },
    { name: "Vehicle condition release — Bronco", doc_type: "release", status: "awaiting_signature", customer_id: cid("Jordan Pike"), job_id: jid("Satin black color change — Bronco") },
    { name: "Ceramic coating care guide", doc_type: "care_guide", status: "signed", customer_id: cid("Elena Marsh"), job_id: jid("Ceramic coating — Q5"), signer_name: "Elena Marsh", signed_at: daysFromNow(-8, 17) },
    { name: "Invoice 2190 — paint correction", doc_type: "invoice", status: "awaiting_signature", customer_id: cid("Kyle Donnelly"), job_id: jid("Two-step correction — Wrangler") },
  ].map((d) => ({ ...d, ...org }));
  const docRes = await supabase.from("documents").insert(docs);
  if (docRes.error) throw docRes.error;

  // --- Inspections --------------------------------------------------------
  const inspectionRows = [
    {
      ...org,
      vehicle_id: vid("ELN-914"),
      customer_id: cid("Elena Marsh"),
      job_id: jid("Full front PPF — Macan GTS"),
      stage: "check_in",
      status: "signed",
      mileage: 8420,
      inspector: "Marcus Webb",
      notes: "Rock chips across the nose, customer approved film over existing chips.",
      acknowledged_by: "Elena Marsh",
      acknowledged_at: daysFromNow(-4, 9),
    },
    {
      ...org,
      vehicle_id: vid("BRN-778"),
      customer_id: cid("Jordan Pike"),
      job_id: jid("Satin black color change — Bronco"),
      stage: "check_in",
      status: "open",
      mileage: 21750,
      inspector: "Corey Lang",
      notes: "Aftermarket bumper, extra prep time expected.",
    },
  ];
  const inspRes = await supabase.from("inspections").insert(inspectionRows).select("id,vehicle_id");
  if (inspRes.error) throw inspRes.error;
  const insp = inspRes.data ?? [];
  const iid = (plate: string) => insp.find((i) => i.vehicle_id === vid(plate))?.id ?? null;

  const defectRows = [
    { panel: "front_bumper", defect_type: "chip", severity: "critical", note: "Dense chip cluster, lower valance", inspection_id: iid("ELN-914") },
    { panel: "hood", defect_type: "chip", severity: "minor", note: "Six chips along leading edge", inspection_id: iid("ELN-914") },
    { panel: "driver_side", defect_type: "scratch", severity: "minor", note: "Door edge scuff", inspection_id: iid("ELN-914") },
    { panel: "rear_bumper", defect_type: "scratch", severity: "critical", note: "Deep scratch through clear, needs correction before wrap", inspection_id: iid("JPK-BRC") },
    { panel: "roof", defect_type: "swirl", severity: "minor", note: "Wash swirls across roof panel", inspection_id: iid("JPK-BRC") },
  ]
    .flatMap((d) =>
      d.inspection_id
        ? [{ ...d, inspection_id: d.inspection_id, organization_id: orgId, pos_x: 0, pos_y: 0 }]
        : [],
    );
  if (defectRows.length) {
    const defRes = await supabase.from("inspection_defects").insert(defectRows);
    if (defRes.error) throw defRes.error;
  }

  // --- Shop floor: bays, certifications, templates, film rolls -------------
  await supabase.from("bays").insert(
    [
      { name: "Bay 1 — PPF", discipline: "ppf", daily_hours_cap: 9, required_certification: "ppf", sort_order: 0 },
      { name: "Bay 2 — Tint", discipline: "tint", daily_hours_cap: 9, required_certification: "tint", sort_order: 1 },
      { name: "Bay 3 — Wrap / Detail", discipline: "wrap", daily_hours_cap: 9, required_certification: "wrap", sort_order: 2 },
      { name: "Prep bay", discipline: "flex", daily_hours_cap: 9, required_certification: null, sort_order: 3 },
    ].map((b) => ({ ...b, ...org })),
  );

  await supabase.from("message_templates").insert(
    DEFAULT_MESSAGE_TEMPLATES.map((t, i) => ({
      organization_id: orgId,
      name: t.name,
      channel: t.channel,
      category: t.category,
      body: t.body,
      sort_order: i,
    })),
  );

  const teamRes = await supabase.from("team_members").select("id,full_name,specialties");
  const certRows = (teamRes.data ?? []).flatMap((t) =>
    (t.specialties ?? [])
      .filter((sp: string) => ["ppf", "tint", "wrap", "ceramic", "paint_correction"].includes(sp))
      .map((sp: string) => ({
        organization_id: orgId,
        team_member_id: t.id,
        certification: sp === "paint_correction" ? "paint_correction" : sp,
        level: t.full_name === "Marcus Webb" || t.full_name === "Dani Ortiz" ? "lead" : "certified",
      })),
  );
  if (certRows.length) await supabase.from("tech_certifications").insert(certRows);

  await supabase.from("inventory_rolls").insert(
    [
      { roll_code: "XPL-2291", brand: "XPEL", product_line: "Ultimate Plus 10", material_type: "ppf", width_inches: 60, original_feet: 100, remaining_feet: 68, lot_number: "LOT-44821", batch_id: "B-2291", cost_per_foot: 11.4, vendor: "XPEL", shelf: "A1" },
      { roll_code: "XPL-2307", brand: "XPEL", product_line: "Stealth", material_type: "ppf", width_inches: 60, original_feet: 100, remaining_feet: 22, lot_number: "LOT-44902", cost_per_foot: 12.2, vendor: "XPEL", shelf: "A2" },
      { roll_code: "STK-1188", brand: "SunTek", product_line: "Ceramic CIR 35", material_type: "tint", width_inches: 40, original_feet: 100, remaining_feet: 74, lot_number: "LOT-90211", cost_per_foot: 4.2, vendor: "SunTek", shelf: "B1" },
      { roll_code: "3M-4402", brand: "3M", product_line: "2080 Satin Black", material_type: "wrap", width_inches: 60, original_feet: 75, remaining_feet: 18, lot_number: "LOT-77310", cost_per_foot: 9.1, vendor: "3M", shelf: "C3" },
    ].map((r) => ({ ...r, ...org })),
  );

  return { customers: customerRows.length, jobs: jobRows.length, deals: deals.length };
}
