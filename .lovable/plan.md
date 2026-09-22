# Systemize list and table normalization

## Goal
Remove the remaining “everything is a card” feel by applying one consistent display rule across the existing application, without changing behavior, data, routes, or workflows.

## Collection rules
- Use tables or compact divided lists for comparable records.
- Keep cards only where the container has a real interaction purpose: Sales pipeline movement, Production stage movement, technician touch workflows, focused summaries, and single-record workspaces.
- Keep Schedule as a calendar, Messages as the existing three-section inbox, and record detail as the existing workspace/drawer pattern.
- Preserve all search, filtering, mutations, row actions, dialogs, links, drag-and-drop, and responsive behavior.
- At narrow widths, tables remain horizontally scrollable or collapse into dense labeled rows; they will not become card grids.

## Primary record screens
- **Customers:** retain search and the Customer Workspace row action; normalize columns to Customer, Vehicles, Phone, Lifetime Value, Last Visit, Next Appointment, and Status. Derive visit/appointment/status from existing jobs only.
- **Quotes:** replace the loose estimate rows with a proper comparison table: Customer, Vehicle, Service, Amount, Status, Last Activity, and Sales Rep. Continue opening the existing estimate editor from a row.
- **Payments:** align the current table to Customer, Invoice/reference, Amount, Paid, Balance, Status, and Date. Derive invoice totals and balances from existing linked estimates/items and payments; preserve Record payment and Mark paid.
- **Team:** convert the hand-built grid into a semantic table with Employee, Role, Status, current Jobs/value, and Last Activity, while retaining specialties and contact detail as secondary text.
- **Inventory:** align consumables to Item, Category, Quantity, Minimum, Status, and Updated, preserving inline quantity adjustments. Normalize film rolls and purchase orders as dense tables/lists with their existing actions.

## Reports, history, and task collections
- **Reports:** keep the compact KPI summary, but render ranked service, installer, and lead-source detail as clean tables/lists rather than boxed tiles. Keep useful in-row comparison bars where they aid scanning.
- **Activity history:** keep customer/deal history as one continuous timeline; remove per-run card shells from workflow activity and present runs as a divided activity list with compact step details.
- **Tasks and alerts:** retain Command Center’s compact Tasks/Follow-Ups, Recent Activity, schedule, and alert lists; standardize their row rhythm and separators without adding containers per item.
- Convert Automation quick rules from one card per rule into a compact operational list while preserving toggles and message previews.

## Application-wide consistency pass
- Normalize other repeated records already close to the target—documents, warranties, aftercare, inspections, QC queues, import history, sync activity, locations, mobile crews/stops, and workflow lists—to shared dense row/table conventions.
- Convert the Services catalog’s repeated service records to a scannable grouped list/table while preserving filters, active toggles, category grouping, and the existing editor; retain purpose-built package selection/configuration where cards support comparison and selection.
- Leave Sales Pipeline cards, Production board cards, Schedule calendar blocks, technician job controls, Messages columns, proposal package choices, and focused workspace summaries intact because their layout communicates action or state.
- Use the established graphite surfaces, bronze active/action treatment, subtle status colors, compact headers, 1px separators, and existing typography tokens throughout.

## Validation
- Type-check the full application.
- Verify Customers, Quotes, Payments, Team, Inventory, Reports, Workflows/Activity, Services, and representative secondary lists on desktop.
- Spot-check Customers, Payments, Inventory, and activity/task lists at phone width for readable labels, overflow, and accessible actions.
- Regression-check that customer rows open the Customer Workspace, quote rows open the editor, payment actions still work, inventory adjustments still work, and Pipeline/Production/Schedule/Messages remain unchanged.
