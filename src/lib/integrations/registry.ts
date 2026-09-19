// Client-safe metadata describing every outside service Systemize can sync with.

export type ProviderId =
  | "quickbooks"
  | "google_calendar"
  | "google_mail"
  | "microsoft_outlook"
  | "hubspot"
  | "ghl";

export type DomainEventType =
  | "customer.created"
  | "quote.sent"
  | "appointment.booked"
  | "appointment.updated"
  | "appointment.cancelled"
  | "job.completed"
  | "invoice.issued"
  | "payment.received";

export const EVENT_LABELS: Record<DomainEventType, string> = {
  "customer.created": "New customer",
  "quote.sent": "Quote sent",
  "appointment.booked": "Appointment booked",
  "appointment.updated": "Appointment changed",
  "appointment.cancelled": "Appointment cancelled",
  "job.completed": "Job completed",
  "invoice.issued": "Invoice issued",
  "payment.received": "Payment received",
};

export interface ProviderSetting {
  key: string;
  label: string;
  events: DomainEventType[];
  default: boolean;
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  blurb: string;
  auth: "app_user_connector" | "oauth_app" | "api_key";
  connectorId?: string;
  scopes?: string[];
  settings: ProviderSetting[];
  twoWay?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    blurb: "Customers, invoices and payments post straight into your books.",
    auth: "oauth_app",
    settings: [
      {
        key: "customers",
        label: "Push customers",
        events: ["customer.created"],
        default: true,
      },
      {
        key: "invoices",
        label: "Push invoices",
        events: ["invoice.issued", "job.completed"],
        default: true,
      },
      {
        key: "payments",
        label: "Push payments",
        events: ["payment.received"],
        default: true,
      },
    ],
    twoWay: "Invoices marked paid in QuickBooks come back to Systemize.",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    blurb: "Every booked job lands on the shop calendar with vehicle and bay.",
    auth: "app_user_connector",
    connectorId: "google_calendar",
    scopes: ["https://www.googleapis.com/auth/calendar"],
    settings: [
      {
        key: "appointments",
        label: "Push appointments",
        events: ["appointment.booked", "appointment.updated", "appointment.cancelled"],
        default: true,
      },
    ],
    twoWay: "Times moved or events deleted in Google update the job here.",
  },
  {
    id: "google_mail",
    name: "Gmail",
    blurb: "Quotes, confirmations and receipts send from your own shop address.",
    auth: "app_user_connector",
    connectorId: "google_mail",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    settings: [
      { key: "quotes", label: "Email quotes", events: ["quote.sent"], default: true },
      {
        key: "confirmations",
        label: "Email appointment confirmations",
        events: ["appointment.booked"],
        default: true,
      },
      {
        key: "receipts",
        label: "Email payment receipts",
        events: ["payment.received"],
        default: true,
      },
    ],
  },
  {
    id: "microsoft_outlook",
    name: "Microsoft Outlook",
    blurb: "Mail and calendar for shops running on Microsoft 365.",
    auth: "app_user_connector",
    connectorId: "microsoft_outlook",
    scopes: ["Mail.Send", "Calendars.ReadWrite", "offline_access"],
    settings: [
      {
        key: "appointments",
        label: "Push appointments",
        events: ["appointment.booked", "appointment.updated", "appointment.cancelled"],
        default: true,
      },
      { key: "quotes", label: "Email quotes", events: ["quote.sent"], default: true },
      {
        key: "receipts",
        label: "Email payment receipts",
        events: ["payment.received"],
        default: true,
      },
    ],
    twoWay: "Times moved in Outlook update the job here.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    blurb: "Keep contacts and deal activity in sync with your CRM.",
    auth: "app_user_connector",
    connectorId: "hubspot",
    settings: [
      { key: "customers", label: "Push customers", events: ["customer.created"], default: true },
      {
        key: "activity",
        label: "Log quotes and payments",
        events: ["quote.sent", "payment.received"],
        default: true,
      },
    ],
    twoWay: "Contacts can be imported from HubSpot at any time.",
  },
  {
    id: "ghl",
    name: "GoHighLevel",
    blurb: "Contacts flow to your sub-account so campaigns keep running.",
    auth: "api_key",
    settings: [
      { key: "customers", label: "Push customers", events: ["customer.created"], default: true },
    ],
    twoWay: "Contacts can be imported from GoHighLevel at any time.",
  },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<
  ProviderId,
  ProviderDef
>;

export function defaultSettings(provider: ProviderId): Record<string, boolean> {
  return Object.fromEntries(PROVIDER_BY_ID[provider].settings.map((s) => [s.key, s.default]));
}

/** Providers (and their setting keys) that care about a given domain event. */
export function subscribersFor(event: DomainEventType): Array<{
  provider: ProviderId;
  settingKey: string;
}> {
  const out: Array<{ provider: ProviderId; settingKey: string }> = [];
  for (const p of PROVIDERS) {
    for (const s of p.settings) {
      if (s.events.includes(event)) out.push({ provider: p.id, settingKey: s.key });
    }
  }
  return out;
}
