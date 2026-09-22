# Inbox three-section workspace

## What will change
- Keep the existing `/inbox` page and all current communication behavior.
- Replace the current conversation-list-first layout with three synchronized sections for the selected opportunity:
  1. **Customer:** customer and vehicle details, opportunity/service tags, search/switch conversation control, and a compact chronological history.
  2. **Conversation:** text/email channel controls, full message thread, templates, and the existing composer fixed at the bottom.
  3. **Quote:** the existing service catalog, configurable options, quote line items, tax, instant total, and send/approve actions in a compact rail.
- Rename the sidebar item from **Inbox** to **Messages** while retaining the existing URL and avoiding a duplicate page.
- Keep the full deal page available as a secondary link; no database or communication changes.

## Layout behavior
- Desktop uses the requested three columns with independent scrolling.
- Narrow screens stack the customer, conversation, and quote sections without hiding actions.
- The selected customer/opportunity drives all three sections so history, messages, and pricing never drift apart.

## Validation
- Verify customer switching updates every section.
- Verify text/email composition, templates, quote additions/removals, tax, totals, send, and approve remain functional.
- Check desktop and phone layouts, sidebar navigation, and browser errors.
