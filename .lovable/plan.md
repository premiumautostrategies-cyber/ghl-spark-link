# Installer Work Center

## Goal
Keep the Production board unchanged and turn Shop Floor into the dedicated technician workspace. Technicians can claim open work, accept assigned work, complete intake and production steps, and hand finished installs into QC with clear Sales visibility.

## Experience
- Make **Shop Floor** installer-first and mobile-first, with a technician selector using the existing team roster.
- Show two compact queues:
  - **My Jobs**: assigned work awaiting acceptance plus accepted/in-progress work.
  - **Open Jobs**: scheduled jobs without an installer that the selected technician can claim.
- Give every job one clear lifecycle:
  - Accept / Claim
  - Check In
  - Inspection
  - Prep
  - Install
  - Request QC
- Keep the current vehicle, customer, service, bay, schedule, instructions, materials, notes, phase timers, and progress information.
- Use large, unambiguous primary actions and disable later steps until required earlier work is complete.

## Job Workspace
- Add a compact progress stepper at the top so the installer always knows the current step.
- **Acceptance:** acknowledge assigned work or claim an open job, recording installer and acceptance time.
- **Check-in:** confirm vehicle arrival and start an inspection tied directly to the job, vehicle, and customer.
- **Inspection:** capture mileage, condition notes, customer-present state, and defects using the existing inspection records. Surface the existing detailed inspection page for full panel mapping when needed.
- **Prep and install:** reuse existing production phases and timers; present only the current actionable phase prominently while completed/upcoming phases remain visible.
- **QC handoff:** require check-in, inspection, prep, and install completion before “Request QC.” Create/open the QC checklist, mark the job as awaiting review, and alert Sales.
- If QC fails, return the job to the installer with the failure state clearly visible. If QC passes, show the job as ready and create the second Sales alert.

## Sales Awareness
- Add persistent operational alerts for two events:
  - Installer requested QC.
  - QC passed and vehicle is ready.
- Surface these in the existing top-bar notification control and the Command Center’s Recent Activity / attention area, without creating a new page.
- Alerts link directly to the relevant job or QC record and can be marked read.

## Data and Safety
- Add small job acceptance/check-in fields and a focused operational-alert record; reuse existing jobs, inspections, job phases, QC checklists, and time entries.
- Keep all records organization-scoped, protected by existing membership rules, and grant only signed-in access.
- Preserve the Production board’s current stage behavior and all existing records.

## Validation
- Verify on phone and desktop:
  - Assigned job acceptance.
  - Claiming an open job.
  - Check-in and job-linked inspection.
  - Prep/install phase progression and timers.
  - Blocked early QC request.
  - QC request alert visible to Sales.
  - QC pass alert visible to Sales.
  - Failed QC returns visibly to the installer.
- Re-check Production board, Quality Control, Command Center, and notification navigation for regressions and console errors.
