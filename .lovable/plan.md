# Systemize UI normalization pass

## Goal
Apply one restrained, production-grade visual language across every existing Systemize screen without changing functionality, information architecture, data, or workflows.

## Visual system
- Consolidate the graphite surface hierarchy, restrained bronze accent, and semantic status colors in the global design tokens.
- Standardize spacing on an 8px rhythm, 10–12px radii, subtle 1px borders, and shadows only for elevated overlays.
- Establish one typography hierarchy for page titles, section titles, record names, metadata, and captions.
- Remove decorative gradients, banners, imagery, and color treatments from operational screens where they do not communicate state.
- Normalize primary, secondary, tertiary, icon-only, and destructive button treatments through the existing shared controls.

## Shared structure
- Standardize the desktop shell, section navigation, content width, toolbar alignment, and page padding.
- Upgrade the shared page header and reusable panel, summary, status, empty-state, filter, and row patterns so screens inherit the same structure.
- Preserve compact density for collection screens and more generous spacing inside drawers, modals, and record workspaces.

## Screen-by-screen pass
- **Sales:** normalize Pipeline, Customers, Services, Calendar, Quotes, and their existing drawers/sheets. Keep movable opportunities as cards; make comparable collections compact rows or tables.
- **Installation:** normalize Bays, Production, Inspections, Shop Floor, Quality Control, and Team. Preserve schedules and production jobs as task-focused boards while tightening supporting lists.
- **Operations:** normalize Command Center, Payments, Documents, Stock, Warranty, Reports, Workflows, Import, Integrations, and Settings. Convert repeated record collections to consistent tables/lists where appropriate.
- **Public record views:** align existing proposal, portal, waiver, and warranty screens with the same typography, spacing, controls, and surface rules without changing their flows.
- Keep all existing interactions, queries, mutations, links, filters, drag-and-drop behavior, forms, and responsive behavior intact.

## Quality checks
- Review every route at desktop width for header consistency, hierarchy, density, overflow, and visual duplication.
- Spot-check representative Sales, Installation, Operations, drawer, modal, and public views at mobile width.
- Verify interactive paths that are most sensitive to styling changes: pipeline drag/drop and lead drawer, calendar booking, bay scheduling, document actions, and production/QC controls.
- Confirm type checking and browser console remain clean, then update the existing roadmap only for this normalization milestone.
