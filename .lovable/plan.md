# Technician Production Workspace

## Goal
Make **Production** the technician’s complete signed-in workspace. Remove the dispatch-board feel and the separate Shop Floor experience.

## What changes
- Replace the Production board with a personal **My Day** screen for the signed-in technician.
- Show a prominent clock-in/clock-out control and today’s time status.
- Show only that technician’s scheduled work, ordered by the times already set in the shop schedule.
- Each schedule row shows time, vehicle, customer, service, bay/mobile location, duration, and current status.
- Clicking the time or vehicle opens the full work order in the same workspace.
- Keep the work order focused on the information needed to perform the installation: vehicle, services, coverage, product/film, tint percentage, instructions, existing condition, and required documents.
- Keep checklist interaction optional during the work. Technicians can check items live or complete the remaining items together at the end.
- Use one clear **Complete work / Send to QC** action. It validates only required end-of-job documentation, records completion, and notifies Sales/Management that QC is ready.
- Preserve the existing bundled photos, notes, issues, required-document validation, QC alerts, failed-QC return flow, and all stored data.

## Access and navigation
- Technicians land directly on Production and see only their clock, schedule, and assigned work.
- Remove the separate Shop Floor navigation item to eliminate duplication.
- Managers and owners retain the normal application navigation and the dedicated QC screen.
- Non-technician access to Production may use the existing installer selector only as a manager preview; technicians never choose another installer.

## Technical details
- Reuse the existing schedule, jobs, team members, time entries, job services, phases, inspections, completion items, documents, and QC alerts.
- Link the signed-in account to its team/role records; do not infer identity from a manual dropdown.
- Consolidate the verified work-order and bundle-completion behavior into `/jobs`; keep `/kiosk` as a redirect so old links do not break.
- Keep Production and QC as separate responsibilities: technician submission creates the existing persistent QC request for Sales/Management.

## Validation
- Verify a technician sees only their own scheduled jobs and restricted navigation.
- Verify clock-in and clock-out persist.
- Verify opening a schedule item shows its work order and checklist.
- Verify live checklist updates remain optional and bundle completion remains fast.
- Verify completion creates the QC request and alert.
- Verify manager/owner navigation and QC remain intact on desktop and mobile.
