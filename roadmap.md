# Systemize Build Roadmap

## Done
- [x] Multi-tenant architecture, auth/roles, navigation shell, design system
- [x] Configurable Command Center (executive/compact presets, saved widget order/size/visibility)
- [x] Dashboard KPI trends, revenue forecast, funnel, bay status, schedule, team, alerts, and loss analysis
- [x] Dashboard quick-add flows and deep links
- [x] Customers · Vehicles (with service history)
- [x] Service Catalog
- [x] Quotes / Estimates
- [x] Scheduling
- [x] Jobs / Production board (stage moves, installer filter)
- [x] Native sales pipeline (stages, forecast, close rate)
- [x] Documents (types, signature status)
- [x] Inventory (reorder alerts, stock value)
- [x] Payments (deposits, balances, mark paid)
- [x] Team (roles, pay, workload)
- [x] Automations (trigger → delay → channel, pause/resume)
- [x] Analytics + Shop Health
- [x] Settings + one-click demo shop loader
- [x] HubSpot / GoHighLevel integration page

## Queued
- [ ] Technician mobile view (My Day, task timers, photo capture)
- [ ] Inspections / check-in templates with damage markers
- [ ] QC checklists gating job completion
- [ ] Warranty records and claims
- [ ] Customer portal (approve quote, pay deposit, sign)
- [ ] Systemize AI (rough notes → SOPs, checklists, forms)
- [ ] Vendors / purchase orders
- [ ] Multi-location switcher

## Notes
- Source of truth: MASTER PRODUCT BUILD SPECIFICATION
- HubSpot app provisioning authorization still pending from the user.

- [x] Luxury obsidian/bronze design system ported (Shine OS reference)
- [x] Drag-and-drop sales pipeline board
- [x] Bay x hour schedule board with conflict detection
- [x] Vehicle inspections with panel damage map and customer sign-off

- [x] Integrations hub: QuickBooks / Google Calendar / Gmail / Outlook / HubSpot / GHL cards, per-event toggles, sync queue with retries, activity log, scheduled drain worker (demo mode — provider sign-in apps not provisioned)

## Shop floor overhaul (8 steps)
- [x] 1. Deal comms thread + speed-to-lead auto text
- [x] 2. Interactive Good/Better/Best proposal, e-signature, deposit gate
- [x] 3. Smart bay scheduler (caps, certifications, roll soft-reserve)
- [x] 4. DVI panel map with photo/video pins + customer waiver link
- [x] 5. Shop floor kiosk with phase timers
- [x] 6. Roll-level film stock, waste logging, vendor POs
- [x] 7. QC gate with edge temp + key release lock
- [x] 8. Warranty certificates + day 3/14/15 aftercare cadence
- [ ] Automated sending of queued aftercare texts (needs a live SMS provider; "Send now" works today)

## Verified end to end (Sep 19)
Lead -> auto text -> quote -> proposal link -> signature + deposit -> bay booking -> inspection -> phase timers -> QC gate/key release -> warranty certificate -> aftercare cadence. Fixed: warranty certificate dates on the customer page showed a time instead of the coverage year.

- [x] Workflow engine (visual canvas, step-by-step builder, preview runs, starter recipes)
- [x] CSV data import with AI column matching

## Current push (Sep 21)
- [ ] Installer phone experience (my day, big timers, photo capture) — paused, folded into mobile work
- [ ] Mobile services: off-site jobs with addresses, service areas, travel time
- [ ] AI batching + route optimisation for mobile crews (day plan, drive order, gaps)
- [ ] Inventory rethink — a clear opinionated way to run stock (rolls, consumables, reorder, usage per job)
- [ ] Investor/developer polish pass: consistent empty states, demo data, no dead ends

## Core product upgrade (SYSTEMIZE spec)
- [x] P1 Dynamic Pipeline: stage + new-lead state + activity temperature + live activity + focus priority
- [x] P1 Lead Workspace drawer (activity timeline, conversation, quote, notes, stage moves)
- [x] Customer-activity event log (lead_events) seeded with realistic restyling activity
- [x] Workspace bootstrap RPC (remix DB lost the auth signup trigger); demo seed double-run guard
- [x] P2 Customer workspace drawer (vehicles → projects → quotes → money → documents, opens deal drawer)
- [ ] P2 Scheduling continuity (appointment ↔ quote/deposit/installer/location)
- [ ] P3 Production board + technician My Day mobile experience
- [ ] P4 Command Center (sales execution) vs Operations/Owner split
- [ ] P5 Visual consistency pass across modules
- [ ] P6 Automation recipes, document/SOP attachment, integration presentation
