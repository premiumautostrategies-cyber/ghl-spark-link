# Installer Interaction Model

## Goal
Keep the Production board unchanged and reshape Shop Floor around a passive workflow: open the job, review the work order, do the physical work, then document and submit in one efficient pass. Live progress remains available but optional.

## Installer Job View
- Replace the rigid six-step emphasis with a clear work-order summary first: vehicle, customer, services, coverage, assigned product/film, tint percentage when present, bay, due time, special instructions, cut file, and existing damage.
- Keep acceptance, check-in, and intake inspection, but stop presenting every production phase as a required real-time interaction.
- Show two clearly equivalent ways to work:
  - **Live progress:** optional phase timers, individual phase completion, notes, photos, and issue reporting.
  - **Bundle completion:** a prominent end-of-phase action for completing prep or install together.

## Fast Phase Completion
- Add **Mark prep complete** to complete all remaining prep phases in one action.
- Add **Mark install complete** to complete all remaining install phases in one action.
- In the install review, show all install areas together with **Select all / Mark all complete**, while allowing the installer to uncheck unfinished areas.
- Use the existing job phases as the source of truth; detailed phase controls remain available but secondary and optional.

## Consolidated Documentation
- Add one **Complete documentation** review at the end of the work rather than separate interruptions during installation.
- The review combines:
  - completed services and install areas
  - required documentation status
  - multiple photo selection in one control, with camera/photo-library support on mobile
  - one notes field
  - one optional issue report
  - final checklist confirmation
- Save bundled photos and notes against the existing job/document records so they remain connected to the customer, vehicle, and work order.
- Validate owner-required evidence only when completing the relevant phase or submitting the job. Do not repeatedly ask for “no issues.”

## Final Handoff
- Keep **Submit for QC** as the final action for the current shop configuration.
- Block submission only when required end-of-job documentation is actually missing.
- Preserve QC requested, failed, passed, and Sales alert behavior.
- When QC returns a job, reopen the installer’s completion review with the correction state clearly visible.

## Technical Details
- Reuse `jobs`, `job_services`, `job_phases`, `inspections`, `inspection_defects`, `documents`, `qc_checklists`, and operational alerts.
- Add only the smallest schema needed for persistent install-area completion and bundled documentation requirements; no new workflow or production-board model.
- Use private job-document storage with organization-scoped access for multi-photo uploads.
- Preserve individual phase timing as optional data; bulk completion records completion without requiring a timer.

## Validation
- Verify on phone and desktop that an installer can:
  - open a job and read every essential work-order detail without taking actions
  - optionally use live progress controls
  - complete prep in one action
  - complete all install areas together, then uncheck exceptions
  - upload several photos together and add one note/issue
  - submit the completed bundle to QC
  - see clear missing-document guidance only at completion
- Confirm Production, QC, Sales alerts, and existing inspection workflows still behave correctly.
