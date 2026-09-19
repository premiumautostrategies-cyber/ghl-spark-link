# Customizable Shop Command Center

## Goal
Replace the current basic Command Center with a dense, configurable shop dashboard that gives owners and operations staff a live view of revenue, sales, bays, production, team performance, and immediate actions.

## Build

1. **Dashboard data and preferences**
   - Add an organization/user-scoped dashboard preference record for preset, widget order, visibility, size, and KPI targets.
   - Add a structured loss reason to sales opportunities so the lost-revenue chart uses real shop data; uncategorized existing losses remain clearly labeled.
   - Keep all reads organization-isolated and bound dashboard queries to the relevant month, quarter, or active work.

2. **Header controls and customization mode**
   - Add `Quick Add`, `Customize Dashboard`, and Compact / Executive preset controls to the page header.
   - In customization mode, make widgets draggable between positions, offer size controls, allow hiding, and provide an “Add widgets” menu for restoring hidden items.
   - Persist changes automatically and provide a reset-to-preset action.

3. **Executive KPI strip**
   - Build six clickable scorecards with compact sparklines: daily revenue versus goal, month-to-date revenue and projected month end, active and weighted pipeline, bay utilization, lead-to-booked conversion and 30-day movement, and average ticket versus target.
   - Use real payments, jobs, and opportunities; show clear zero-data states rather than invented performance.

4. **Operational and analytics widgets**
   - Revenue pacing chart with month / quarter toggle and cumulative actual versus target lines.
   - Conversion funnel for leads, quoted, booked, and completed, including drop-off and dollars at each stage.
   - Live bay grid with job, customer/vehicle, installer, service, status, and time-based progress.
   - Today timeline for drop-offs, active installs, and pickups, with working deposit, follow-up/mockup, and completion actions where the underlying record supports them.
   - Team leaderboard with lead ownership, close rate, completed value, efficiency, and prior-month comparison.
   - Prioritized alerts for stale leads, unpaid balances, schedule pressure, and high-value follow-ups, each linking to or performing the relevant action.
   - Lost-revenue donut grouped by captured loss reason.

5. **Quick Add and deep links**
   - Add one menu that launches focused forms for a lead, work order, appointment, or payment and refreshes affected dashboard data after save.
   - Make every KPI and record row navigate to its underlying Sales, Bays, Production, Payments, Team, or Reports view with an appropriate search/filter parameter where supported.

6. **Responsive behavior and verification**
   - Preserve the existing obsidian surfaces, shop-selectable accent color, typography, buttons, tags, and panel styling.
   - Use a high-density desktop grid, a readable tablet layout, and ordered single-column widgets on phones; customization controls remain touch-friendly.
   - Verify preset switching, drag/reorder, resize, hide/restore, persistence, quick-add saves, actions, charts, deep links, empty states, and desktop/mobile rendering.

## Technical details
- Use the existing TanStack Query data flow, Lovable Cloud tables, `@dnd-kit/core`, Recharts, and current design-system components.
- Store dashboard preferences in a dedicated RLS-protected table with required authenticated/service grants; add an indexed `loss_reason` field to opportunities.
- Keep widget definitions in a registry so layout, visibility, sizing, and preset defaults stay centralized rather than duplicated in the page.
- Treat projected revenue, utilization, conversion, trends, and efficiency as derived metrics with explicit formulas and safe handling for missing history.