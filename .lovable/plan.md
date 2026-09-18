# Systemize — First Build Plan

## Goal
Establish the scalable foundation for Systemize: multi-tenant organization/location model, role-based access, navigation shell, design system, and the core operational entities needed for the customer → vehicle → quote → job → invoice lifecycle.

## What we are building
1. Database architecture
   - `organizations` and `locations` tables
   - `user_roles`, `roles`, `role_permissions` tables
   - `audit_events` table for important changes
   - Refactor existing `customers`, `vehicles`, `jobs`, `estimates`, `profiles` to reference `organization_id` (and `location_id` where appropriate)
   - Soft-delete support via `deleted_at` on key business tables
   - RLS policies scoped to organization membership
2. Authentication + organizations
   - Any email/password still works (per earlier decision), but signup now creates an organization and a default location
   - Existing auto-created profiles migrate to the new model
3. Roles and permissions
   - Seed default roles: Owner, Administrator, General Manager, Sales/CSR, Production Manager, Installer/Technician, Accounting, Read-only/Advisor
   - Permission checks via `has_permission(user_id, permission_key)` security-definer function
4. Navigation shell
   - Replace the current top header with a left navigation rail/sidebar
   - Add top universal command search bar (visual shell first, live search later)
   - Map all primary nav items from the spec
5. Design system
   - Update tokens: near-black graphite surfaces, white text, warm bronze accent
   - Geometric heading font (Space Grotesk or similar), Inter body
   - Subtle rounding, generous spacing, readable tables
6. Seed data
   - Create a demo organization with a few locations
   - Seed realistic customers, vehicles, quotes, jobs, appointments

## What we are NOT building yet
- Marketing website
- Full inventory, payments, automations, AI assistant, analytics, customer portal
- HubSpot/GoHighLevel adapter refactor (will be re-wired after org model)

## Technical approach
- One migration adds org/location/roles/audit tables and nullable `organization_id`/`location_id` columns to existing tables
- Backfill existing rows into the demo organization and default location
- Make `organization_id` NOT NULL in a follow-up migration once every row has a value
- Keep existing UI working during the transition, then swap the navigation shell
- Use `lov_database--migration` for schema changes

## Success criteria
- `bun run build:dev` passes
- Sign-up creates an org + default location + owner role assignment
- Existing routes still load under the new shell
- Demo data populates Command Center, Customers, Vehicles, Schedule, Jobs, Estimates
