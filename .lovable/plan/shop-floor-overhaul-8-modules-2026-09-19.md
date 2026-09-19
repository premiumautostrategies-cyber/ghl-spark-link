# Shop Floor Overhaul — 8 modules

Builds the full lead-to-aftercare loop on top of what already exists (pipeline, sales desk, bays, inspections, stock, jobs).

## 1. Communication centre in the deal
One thread per deal showing texts, emails and call notes, newest last. Quick-reply templates for shade availability, cure times and drop-off instructions. "Speed to lead": when a deal lands in New Lead, an automatic first text goes out asking for year, make, model and paint condition, logged in the thread with the time it fired.

## 2. Interactive proposal with live upsells
Good / Better / Best tiers per service, plus toggleable add-ons (ceramic boost, glass coating, wheel faces, windshield defence). Every toggle re-totals price, labour hours and film linear feet. "Send interactive proposal" creates a public customer link: choose a tier, tick add-ons, sign, and pay a deposit (percentage set per shop, 20–50%). Deposit charging runs in demo mode until payments are switched on.

## 3. Smart bay and technician scheduler
Bays get a discipline (PPF, tint, wrap/detail) and a daily labour-hour cap. Drag a deal onto a bay and day; the board blocks or warns on overbooking, on a technician without the right certification, and soft-reserves the film rolls the job needs.

## 4. DVI body mapping and customer sign-off
Panel-level car map where a tech taps a panel to drop a pin (chip, scratch, repaint, swirls), attaches photos or a short clip, and adds a note. Generates a mobile waiver link for the customer to review and sign before tear-down.

## 5. Shop floor kiosk view
Tablet-sized screen listing today's vehicles. Tap a card for cut files, DVI notes, roll IDs and coverage instructions, with big Start / Pause / Complete buttons per phase (wash & prep, plot & cut, install, reassembly) recording actual versus estimated hours per tech.

## 6. Roll-level material tracking
Stock moves to individual rolls: brand, line, width, original and remaining linear feet, lot/batch number, cost, vendor. Starting a job deducts estimated usage from the assigned roll and stamps the lot number on the deal. Low-stock alerts, waste and scrap logging, and purchase orders per vendor.

## 7. QC gate before pickup
A job cannot reach Ready for Pickup until the checklist passes: post-heat edge temperature logged (190–200°F), water bubble check, lights and sensors, window roll-down. Signed by lead installer or foreman; key release and final invoice stay locked until then.

## 8. Warranty and aftercare
On completion and final payment, a branded warranty certificate is generated carrying the roll lot numbers and coverage terms. Aftercare cadence queued automatically: day 3 wash and cure rules, day 14 edge-check invite, day 15 review link.

## Technical notes
- New tables: `messages`, `message_templates`, `proposals` + `proposal_tiers` / `proposal_addons`, `bays`, `tech_certifications`, `labor_phases` / `time_entries`, `inventory_rolls` + `roll_transactions`, `purchase_orders` + `po_items`, `qc_checklists` + `qc_items`, `warranties`, `aftercare_tasks`. Existing `inspection_defects` extends with media; `inspections` gains a signed waiver token.
- Public customer surfaces (`/p/proposal/$token`, `/p/waiver/$token`) are unauthenticated routes reading through narrow token-scoped server functions — no anon table access.
- Automations (speed-to-lead, aftercare cadence) write rows to a scheduled queue drained by the existing worker endpoint; sends are simulated and logged until a messaging provider is connected.
- Everything stays org- and location-scoped with RLS and grants, matching current tables.

## Order of work
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8, each verified in the browser before the next. Steps 1 and 2 land first since they carry the revenue.
