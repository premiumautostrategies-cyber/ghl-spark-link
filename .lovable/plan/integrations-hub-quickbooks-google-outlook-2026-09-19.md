# Integrations hub: QuickBooks, Google, Outlook

Goal: one place where a shop connects its outside accounts, and Systemize pushes its data out
automatically and reliably. Outbound first, with light two-way where it matters
(calendar changes and invoice payments coming back).

## What the shop sees

A rebuilt Integrations page with a card per service:

- **QuickBooks Online** — customers, invoices and payments flow out. Paid-in-QuickBooks comes back.
- **Google Calendar** — every booked job appears on the shop calendar. Moves/cancels made in Google come back.
- **Gmail** — quotes, proposals, reminders and receipts send from the shop's own address.
- **Microsoft Outlook** — same as Google, for shops on Microsoft (mail + calendar).
- **HubSpot / GoHighLevel** — existing CRM cards, folded into the same layout.

Each card shows: connected account name, last sync time, a health dot (healthy / needs
reconnect / erroring), what it sends, per-item on/off switches (e.g. "send invoices",
"push appointments"), Sync now, and Disconnect.

Below the cards, an **Activity log**: every push with time, service, record, status, and a
Retry button on failures. Failures are visible, never silent.

## How the syncing works

Systemize records a domain event whenever something meaningful happens (customer created,
quote sent, appointment booked/moved/cancelled, job completed, invoice issued, payment taken).
Each event is queued once per connected service that cares about it, then delivered by a worker
with retries and backoff. Nothing is pushed twice: an ID map remembers the remote record for
each local record, so repeats update instead of duplicating.

Two-way is deliberately narrow: pull calendar changes and QuickBooks invoice payment status on a
schedule, and apply them only to the fields Systemize owns loosely (appointment time, invoice
paid state).

## Technical notes

Data model (new migration, org-scoped, RLS + GRANTs):
- `integration_connections` — provider, status, account label, scopes, settings jsonb, last_sync_at, last_error
- `integration_mappings` — (provider, local_type, local_id) -> remote_id, unique
- `sync_events` — domain event, payload, provider, status (pending/sent/failed), attempts, next_attempt_at, error
- domain events emitted from existing mutation paths via a shared `emitEvent` helper

Server code:
- `src/lib/integrations/registry.ts` — provider definitions (events handled, settings toggles)
- `src/lib/integrations/{quickbooks,google,outlook}.server.ts` — adapters: `push(event)` + `pull()`
- `src/lib/integrations.functions.ts` — status, connect/disconnect, toggle setting, sync now, retry, list activity
- Worker endpoint `src/routes/api/public/sync-drain.ts` (shared-secret guarded) to drain the queue on a schedule; "Sync now" drains inline

Auth per provider:
- Google Calendar / Gmail / Microsoft Outlook: Lovable App User Connectors (each shop signs in with
  its own account, popup OAuth, same pattern as the existing HubSpot flow). Requires connecting the
  connector clients for this project first.
- QuickBooks Online: no Lovable connector exists, so custom Intuit OAuth per shop — needs an Intuit
  developer app and its client ID/secret saved as app secrets. Tokens stored per organization,
  refreshed server-side. I'll request those secrets when we reach that step.

## Build order

1. Migration + registry + event emitter wired into existing mutations
2. Integrations page rebuild (cards, toggles, activity log) with HubSpot/GHL moved in
3. Google Calendar + Gmail adapters (connector OAuth, push appointments/emails, pull calendar changes)
4. Outlook adapter (mail + calendar, same surface)
5. QuickBooks adapter (customers, invoices, payments out; payment status back)
6. Queue worker, retries, health dots, end-to-end verification
