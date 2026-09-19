// Outbound sync engine. Server-only.
import {
  PROVIDER_BY_ID,
  subscribersFor,
  type DomainEventType,
  type ProviderId,
} from "./registry";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const MAX_ATTEMPTS = 5;

type Json = Record<string, unknown>;

interface ConnectionRow {
  id: string;
  organization_id: string;
  provider: string;
  status: string;
  account_label: string | null;
  external_id: string | null;
  settings: Json;
  connected_by: string | null;
  last_sync_at: string | null;
}

interface EventRow {
  id: string;
  organization_id: string;
  provider: string;
  event_type: string;
  local_type: string | null;
  local_id: string | null;
  payload: Json;
  attempts: number;
  summary: string | null;
}

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const connectorLib = () => import("@/integrations/lovable/appUserConnector");
const keyStore = () => import("@/server/appUserConnections.server");

function str(payload: Json, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function num(payload: Json, key: string): number | undefined {
  const v = payload[key];
  return typeof v === "number" ? v : undefined;
}

/* ---------------------------------- queue --------------------------------- */

export async function enqueueEvent(params: {
  organizationId: string;
  event: DomainEventType;
  payload: Json;
  localType?: string;
  localId?: string;
  summary?: string;
}) {
  const db = await admin();
  const { data: conns } = await db
    .from("integration_connections")
    .select("provider, settings, status")
    .eq("organization_id", params.organizationId);

  const rows: Json[] = [];
  for (const sub of subscribersFor(params.event)) {
    const conn = (conns ?? []).find((c) => c.provider === sub.provider);
    if (!conn || conn.status === "disabled") continue;
    const settings = (conn.settings ?? {}) as Record<string, unknown>;
    if (settings[sub.settingKey] === false) continue;
    rows.push({
      organization_id: params.organizationId,
      provider: sub.provider,
      event_type: params.event,
      local_type: params.localType ?? null,
      local_id: params.localId ?? null,
      payload: params.payload,
      summary: params.summary ?? null,
    });
  }
  if (rows.length === 0) return { queued: 0 };
  const { error } = await db.from("sync_events").insert(rows as never);
  if (error) throw error;
  return { queued: rows.length };
}

export async function drainQueue(organizationId: string, limit = 25) {
  const db = await admin();
  const nowIso = new Date().toISOString();
  const { data: events } = await db
    .from("sync_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!events || events.length === 0) return { processed: 0, failed: 0 };

  const { data: conns } = await db
    .from("integration_connections")
    .select("*")
    .eq("organization_id", organizationId);

  let processed = 0;
  let failed = 0;
  for (const ev of events as unknown as EventRow[]) {
    const conn = ((conns ?? []) as unknown as ConnectionRow[]).find(
      (c) => c.provider === ev.provider,
    );
    try {
      if (!conn) throw new Error(`${ev.provider} is not connected`);
      const result = await dispatch(conn, ev);
      await db
        .from("sync_events")
        .update({
          status: "sent",
          attempts: ev.attempts + 1,
          remote_id: result.remoteId ?? null,
          summary: result.summary ?? ev.summary,
          last_error: null,
        })
        .eq("id", ev.id);
      await db
        .from("integration_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "connected" })
        .eq("id", conn.id);
      processed += 1;
    } catch (err) {
      failed += 1;
      const attempts = ev.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);
      const backoffMs = Math.min(60_000 * 2 ** (attempts - 1), 6 * 60 * 60_000);
      await db
        .from("sync_events")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq("id", ev.id);
      if (conn) {
        await db
          .from("integration_connections")
          .update({ last_error: message.slice(0, 500), status: "error" })
          .eq("id", conn.id);
      }
    }
  }
  return { processed, failed };
}

export async function retryEvent(organizationId: string, eventId: string) {
  const db = await admin();
  await db
    .from("sync_events")
    .update({ status: "pending", next_attempt_at: new Date().toISOString(), attempts: 0 })
    .eq("id", eventId)
    .eq("organization_id", organizationId);
  return drainQueue(organizationId, 5);
}

/* -------------------------------- dispatch -------------------------------- */

interface PushResult {
  remoteId?: string;
  summary?: string;
}

async function dispatch(conn: ConnectionRow, ev: EventRow): Promise<PushResult> {
  switch (conn.provider as ProviderId) {
    case "google_calendar":
      return pushGoogleCalendar(conn, ev);
    case "google_mail":
      return pushGmail(conn, ev);
    case "microsoft_outlook":
      return pushOutlook(conn, ev);
    case "quickbooks":
      return pushQuickBooks(conn, ev);
    case "hubspot":
      return pushHubspot(conn, ev);
    case "ghl":
      return pushGhl(conn, ev);
    default:
      throw new Error(`No adapter for ${conn.provider}`);
  }
}

async function mapping(orgId: string, provider: string, localType: string, localId: string) {
  const db = await admin();
  const { data } = await db
    .from("integration_mappings")
    .select("remote_id")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .eq("local_type", localType)
    .eq("local_id", localId)
    .maybeSingle();
  return data?.remote_id ?? null;
}

async function saveMapping(
  orgId: string,
  provider: string,
  localType: string,
  localId: string,
  remoteId: string,
) {
  const db = await admin();
  await db.from("integration_mappings").upsert(
    {
      organization_id: orgId,
      provider,
      local_type: localType,
      local_id: localId,
      remote_id: remoteId,
      synced_at: new Date().toISOString(),
    } as never,
    { onConflict: "organization_id,provider,local_type,local_id" },
  );
}

/* --------------------------- app user connectors -------------------------- */

async function connectorCall(
  conn: ConnectionRow,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const def = PROVIDER_BY_ID[conn.provider as ProviderId];
  if (!def?.connectorId) throw new Error(`${conn.provider} has no connector`);
  if (!conn.connected_by) throw new Error(`${def.name} needs to be reconnected`);
  const { getConnectionKeyForUser } = await keyStore();
  const key = await getConnectionKeyForUser(conn.connected_by, def.connectorId);
  if (!key) throw new Error(`${def.name} needs to be reconnected`);
  const { callAsAppUser } = await connectorLib();
  return callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: def.connectorId,
    path,
    ...(init ? { init } : {}),
    ...(def.scopes ? { requiredScopes: def.scopes } : {}),
  });
}

async function readJson(res: Response, label: string) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} failed [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return text ? (JSON.parse(text) as Json) : {};
  } catch {
    return {};
  }
}

const jsonInit = (method: string, body: Json): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ------------------------------- calendars -------------------------------- */

function appointmentTimes(payload: Json) {
  const start = str(payload, "start") ?? new Date().toISOString();
  const end = str(payload, "end") ?? new Date(Date.parse(start) + 2 * 3600_000).toISOString();
  return { start, end };
}

function appointmentTitle(payload: Json) {
  return (
    str(payload, "title") ??
    [str(payload, "service"), str(payload, "vehicle")].filter(Boolean).join(" — ") ??
    "Systemize job"
  );
}

function appointmentBody(payload: Json) {
  return [
    str(payload, "customerName") && `Customer: ${str(payload, "customerName")}`,
    str(payload, "vehicle") && `Vehicle: ${str(payload, "vehicle")}`,
    str(payload, "service") && `Service: ${str(payload, "service")}`,
    str(payload, "bay") && `Bay: ${str(payload, "bay")}`,
    str(payload, "installer") && `Installer: ${str(payload, "installer")}`,
    str(payload, "notes"),
  ]
    .filter(Boolean)
    .join("\n");
}

async function pushGoogleCalendar(conn: ConnectionRow, ev: EventRow) {
  const localId = ev.local_id ?? ev.id;
  const existing = await mapping(conn.organization_id, conn.provider, "job", localId);
  if (ev.event_type === "appointment.cancelled") {
    if (!existing) return { summary: "Nothing on the calendar to cancel" };
    const res = await connectorCall(conn, `/calendar/v3/calendars/primary/events/${existing}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      await readJson(res, "Google Calendar delete");
    }
    return { remoteId: existing, summary: "Removed from Google Calendar" };
  }

  const { start, end } = appointmentTimes(ev.payload);
  const body: Json = {
    summary: appointmentTitle(ev.payload),
    description: appointmentBody(ev.payload),
    location: str(ev.payload, "locationName") ?? undefined,
    start: { dateTime: start },
    end: { dateTime: end },
  };
  const path = existing
    ? `/calendar/v3/calendars/primary/events/${existing}`
    : `/calendar/v3/calendars/primary/events`;
  const res = await connectorCall(conn, path, jsonInit(existing ? "PATCH" : "POST", body));
  const json = await readJson(res, "Google Calendar");
  const remoteId = typeof json["id"] === "string" ? json["id"] : existing;
  if (remoteId) await saveMapping(conn.organization_id, conn.provider, "job", localId, remoteId);
  return {
    ...(remoteId ? { remoteId } : {}),
    summary: existing ? "Updated on Google Calendar" : "Added to Google Calendar",
  };
}

async function pushOutlook(conn: ConnectionRow, ev: EventRow) {
  if (ev.event_type.startsWith("appointment")) {
    const localId = ev.local_id ?? ev.id;
    const existing = await mapping(conn.organization_id, conn.provider, "job", localId);
    if (ev.event_type === "appointment.cancelled") {
      if (!existing) return { summary: "Nothing on the calendar to cancel" };
      const res = await connectorCall(conn, `/v1.0/me/events/${existing}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) await readJson(res, "Outlook delete");
      return { remoteId: existing, summary: "Removed from Outlook calendar" };
    }
    const { start, end } = appointmentTimes(ev.payload);
    const body: Json = {
      subject: appointmentTitle(ev.payload),
      body: { contentType: "Text", content: appointmentBody(ev.payload) },
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    };
    const res = await connectorCall(
      conn,
      existing ? `/v1.0/me/events/${existing}` : `/v1.0/me/events`,
      jsonInit(existing ? "PATCH" : "POST", body),
    );
    const json = await readJson(res, "Outlook calendar");
    const remoteId = typeof json["id"] === "string" ? json["id"] : existing;
    if (remoteId) await saveMapping(conn.organization_id, conn.provider, "job", localId, remoteId);
    return {
      ...(remoteId ? { remoteId } : {}),
      summary: existing ? "Updated in Outlook" : "Added to Outlook calendar",
    };
  }

  const mail = buildEmail(ev);
  if (!mail) return { summary: "No customer email on file" };
  const res = await connectorCall(
    conn,
    `/v1.0/me/sendMail`,
    jsonInit("POST", {
      message: {
        subject: mail.subject,
        body: { contentType: "Text", content: mail.text },
        toRecipients: [{ emailAddress: { address: mail.to } }],
      },
      saveToSentItems: true,
    }),
  );
  if (!res.ok) await readJson(res, "Outlook mail");
  return { summary: `Emailed ${mail.to}` };
}

/* ---------------------------------- mail ---------------------------------- */

function buildEmail(ev: EventRow) {
  const to = str(ev.payload, "customerEmail");
  if (!to) return null;
  const shop = str(ev.payload, "shopName") ?? "Our shop";
  const name = str(ev.payload, "customerName") ?? "there";
  switch (ev.event_type) {
    case "quote.sent": {
      const total = num(ev.payload, "total");
      return {
        to,
        subject: `Your quote from ${shop}`,
        text: `Hi ${name},\n\nYour quote${
          str(ev.payload, "vehicle") ? ` for the ${str(ev.payload, "vehicle")}` : ""
        } is ready${total !== undefined ? `: $${total.toFixed(2)}` : ""}.\n${
          str(ev.payload, "link") ?? ""
        }\n\nThanks,\n${shop}`,
      };
    }
    case "appointment.booked": {
      const { start } = appointmentTimes(ev.payload);
      return {
        to,
        subject: `Your appointment at ${shop} is confirmed`,
        text: `Hi ${name},\n\nYou're booked for ${
          str(ev.payload, "service") ?? "your service"
        } on ${new Date(start).toLocaleString()}.\n\nSee you then,\n${shop}`,
      };
    }
    case "payment.received": {
      const amount = num(ev.payload, "amount") ?? 0;
      return {
        to,
        subject: `Receipt from ${shop}`,
        text: `Hi ${name},\n\nWe received your payment of $${amount.toFixed(2)}. Thank you!\n\n${shop}`,
      };
    }
    default:
      return null;
  }
}

function base64Url(input: string) {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function pushGmail(conn: ConnectionRow, ev: EventRow) {
  const mail = buildEmail(ev);
  if (!mail) return { summary: "No customer email on file" };
  const mime = [
    `To: ${mail.to}`,
    `Subject: ${mail.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    mail.text,
  ].join("\r\n");
  const res = await connectorCall(
    conn,
    `/gmail/v1/users/me/messages/send`,
    jsonInit("POST", { raw: base64Url(mime) }),
  );
  const json = await readJson(res, "Gmail");
  return {
    ...(typeof json["id"] === "string" ? { remoteId: json["id"] } : {}),
    summary: `Emailed ${mail.to}`,
  };
}

/* -------------------------------- hubspot --------------------------------- */

async function pushHubspot(conn: ConnectionRow, ev: EventRow) {
  const email = str(ev.payload, "customerEmail");
  const name = str(ev.payload, "customerName") ?? "Systemize customer";
  if (ev.event_type === "customer.created") {
    const [firstname, ...rest] = name.split(" ");
    const res = await connectorCall(
      conn,
      `/crm/v3/objects/contacts`,
      jsonInit("POST", {
        properties: {
          email: email ?? undefined,
          firstname,
          lastname: rest.join(" ") || undefined,
          phone: str(ev.payload, "customerPhone") ?? undefined,
        },
      }),
    );
    if (res.status === 409) return { summary: "Contact already in HubSpot" };
    const json = await readJson(res, "HubSpot contact");
    const remoteId = typeof json["id"] === "string" ? json["id"] : undefined;
    if (remoteId && ev.local_id)
      await saveMapping(conn.organization_id, conn.provider, "customer", ev.local_id, remoteId);
    return { ...(remoteId ? { remoteId } : {}), summary: "Contact created in HubSpot" };
  }
  // Activity note
  const res = await connectorCall(
    conn,
    `/crm/v3/objects/notes`,
    jsonInit("POST", {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: ev.summary ?? `${ev.event_type} for ${name}`,
      },
    }),
  );
  await readJson(res, "HubSpot note");
  return { summary: "Activity logged in HubSpot" };
}

/* ---------------------------------- ghl ----------------------------------- */

async function pushGhl(conn: ConnectionRow, ev: EventRow) {
  const db = await admin();
  if (!conn.connected_by) throw new Error("GoHighLevel needs to be reconnected");
  const { data } = await db
    .from("ghl_connections")
    .select("location_id, api_key_ciphertext")
    .eq("user_id", conn.connected_by)
    .maybeSingle();
  const row = data as { location_id?: string; api_key_ciphertext?: string } | null;
  if (!row?.api_key_ciphertext || !row.location_id) {
    throw new Error("GoHighLevel needs to be reconnected");
  }
  const { decryptConnectionKey } = await import("@/server/connectionKeyCrypto");
  const creds = { location_id: row.location_id, api_key: decryptConnectionKey(row.api_key_ciphertext) };
  const name = str(ev.payload, "customerName") ?? "Systemize customer";
  const [firstName, ...rest] = name.split(" ");
  const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locationId: creds.location_id,
      firstName,
      lastName: rest.join(" ") || undefined,
      email: str(ev.payload, "customerEmail"),
      phone: str(ev.payload, "customerPhone"),
      source: "Systemize",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 && body.includes("duplicated")) {
      return { summary: "Contact already in GoHighLevel" };
    }
    throw new Error(`GoHighLevel failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  return { summary: "Contact pushed to GoHighLevel" };
}

/* ------------------------------- quickbooks ------------------------------- */

const QBO_API = "https://quickbooks.api.intuit.com";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function quickbooksConfigured() {
  return Boolean(process.env["QUICKBOOKS_CLIENT_ID"] && process.env["QUICKBOOKS_CLIENT_SECRET"]);
}

export async function quickbooksToken(connectionId: string) {
  const db = await admin();
  const { data } = await db
    .from("integration_secrets")
    .select("access_token, refresh_token, realm_id, expires_at")
    .eq("connection_id", connectionId)
    .maybeSingle();
  const secret = data as {
    access_token: string | null;
    refresh_token: string | null;
    realm_id: string | null;
    expires_at: string | null;
  } | null;
  if (!secret?.refresh_token || !secret.realm_id) {
    throw new Error("QuickBooks needs to be reconnected");
  }
  const fresh =
    secret.access_token &&
    secret.expires_at &&
    Date.parse(secret.expires_at) - Date.now() > 120_000;
  if (fresh) {
    return { accessToken: secret.access_token as string, realmId: secret.realm_id };
  }
  const clientId = process.env["QUICKBOOKS_CLIENT_ID"];
  const clientSecret = process.env["QUICKBOOKS_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("QuickBooks is not set up for this app yet");
  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: secret.refresh_token,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`QuickBooks token refresh failed [${res.status}]: ${body}`);
  const json = JSON.parse(body) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  await db
    .from("integration_secrets")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? secret.refresh_token,
      expires_at: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("connection_id", connectionId);
  return { accessToken: json.access_token, realmId: secret.realm_id };
}

async function qboFetch(connectionId: string, path: string, init?: RequestInit) {
  const { accessToken, realmId } = await quickbooksToken(connectionId);
  const res = await fetch(`${QBO_API}/v3/company/${realmId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`QuickBooks failed [${res.status}]: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as Json;
}

async function qboCustomerId(conn: ConnectionRow, ev: EventRow) {
  const localId = str(ev.payload, "customerId") ?? ev.local_id ?? undefined;
  if (localId) {
    const existing = await mapping(conn.organization_id, "quickbooks", "customer", localId);
    if (existing) return existing;
  }
  const name = str(ev.payload, "customerName") ?? "Systemize customer";
  const created = await qboFetch(conn.id, "/customer", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: `${name}${str(ev.payload, "customerPhone") ? ` (${str(ev.payload, "customerPhone")})` : ""}`,
      PrimaryEmailAddr: str(ev.payload, "customerEmail")
        ? { Address: str(ev.payload, "customerEmail") }
        : undefined,
      PrimaryPhone: str(ev.payload, "customerPhone")
        ? { FreeFormNumber: str(ev.payload, "customerPhone") }
        : undefined,
    }),
  });
  const remoteId = (created["Customer"] as Json | undefined)?.["Id"];
  if (typeof remoteId !== "string") throw new Error("QuickBooks did not return a customer id");
  if (localId)
    await saveMapping(conn.organization_id, "quickbooks", "customer", localId, remoteId);
  return remoteId;
}

async function pushQuickBooks(conn: ConnectionRow, ev: EventRow) {
  if (ev.event_type === "customer.created") {
    const id = await qboCustomerId(conn, ev);
    return { remoteId: id, summary: "Customer created in QuickBooks" };
  }

  if (ev.event_type === "payment.received") {
    const customerId = await qboCustomerId(conn, ev);
    const amount = num(ev.payload, "amount") ?? 0;
    const invoiceLocalId = str(ev.payload, "invoiceId");
    const invoiceRemote = invoiceLocalId
      ? await mapping(conn.organization_id, "quickbooks", "invoice", invoiceLocalId)
      : null;
    const created = await qboFetch(conn.id, "/payment", {
      method: "POST",
      body: JSON.stringify({
        CustomerRef: { value: customerId },
        TotalAmt: amount,
        ...(invoiceRemote
          ? {
              Line: [
                {
                  Amount: amount,
                  LinkedTxn: [{ TxnId: invoiceRemote, TxnType: "Invoice" }],
                },
              ],
            }
          : {}),
      }),
    });
    const remoteId = (created["Payment"] as Json | undefined)?.["Id"];
    return {
      ...(typeof remoteId === "string" ? { remoteId } : {}),
      summary: `Payment of $${amount.toFixed(2)} posted to QuickBooks`,
    };
  }

  // invoice.issued / job.completed -> invoice
  const customerId = await qboCustomerId(conn, ev);
  const localId = ev.local_id ?? ev.id;
  const existing = await mapping(conn.organization_id, "quickbooks", "invoice", localId);
  const rawLines = Array.isArray(ev.payload["lines"]) ? (ev.payload["lines"] as Json[]) : [];
  const lines =
    rawLines.length > 0
      ? rawLines.map((l) => ({
          DetailType: "SalesItemLineDetail",
          Amount: typeof l["amount"] === "number" ? l["amount"] : 0,
          Description: typeof l["description"] === "string" ? l["description"] : undefined,
          SalesItemLineDetail: {},
        }))
      : [
          {
            DetailType: "SalesItemLineDetail",
            Amount: num(ev.payload, "total") ?? 0,
            Description: str(ev.payload, "title") ?? "Services",
            SalesItemLineDetail: {},
          },
        ];
  const body: Json = {
    CustomerRef: { value: customerId },
    Line: lines,
    ...(existing ? { Id: existing, sparse: true } : {}),
  };
  if (existing) {
    const current = await qboFetch(conn.id, `/invoice/${existing}`);
    const syncToken = ((current["Invoice"] as Json | undefined)?.["SyncToken"] as string) ?? "0";
    body["SyncToken"] = syncToken;
  }
  const saved = await qboFetch(conn.id, "/invoice", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const remoteId = (saved["Invoice"] as Json | undefined)?.["Id"];
  if (typeof remoteId === "string") {
    await saveMapping(conn.organization_id, "quickbooks", "invoice", localId, remoteId);
  }
  return {
    ...(typeof remoteId === "string" ? { remoteId } : {}),
    summary: existing ? "Invoice updated in QuickBooks" : "Invoice created in QuickBooks",
  };
}

/* ---------------------------------- pull ---------------------------------- */

export async function pullUpdates(organizationId: string) {
  const db = await admin();
  const { data } = await db
    .from("integration_connections")
    .select("*")
    .eq("organization_id", organizationId);
  const conns = (data ?? []) as unknown as ConnectionRow[];
  let changed = 0;
  for (const conn of conns) {
    try {
      if (conn.provider === "google_calendar") changed += await pullGoogleCalendar(conn);
      if (conn.provider === "quickbooks") changed += await pullQuickBooksPayments(conn);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .from("integration_connections")
        .update({ last_error: message.slice(0, 500) })
        .eq("id", conn.id);
    }
  }
  return { changed };
}

async function pullGoogleCalendar(conn: ConnectionRow) {
  const db = await admin();
  const { data: maps } = await db
    .from("integration_mappings")
    .select("local_id, remote_id")
    .eq("organization_id", conn.organization_id)
    .eq("provider", conn.provider)
    .eq("local_type", "job")
    .order("synced_at", { ascending: false })
    .limit(50);
  let changed = 0;
  for (const m of (maps ?? []) as Array<{ local_id: string; remote_id: string }>) {
    const res = await connectorCall(conn, `/calendar/v3/calendars/primary/events/${m.remote_id}`);
    if (res.status === 404 || res.status === 410) continue;
    if (!res.ok) continue;
    const json = (await res.json()) as Json;
    const status = json["status"];
    if (status === "cancelled") {
      await db.from("jobs").update({ status: "cancelled" }).eq("id", m.local_id);
      changed += 1;
      continue;
    }
    const start = (json["start"] as Json | undefined)?.["dateTime"];
    const end = (json["end"] as Json | undefined)?.["dateTime"];
    if (typeof start !== "string") continue;
    const { data: job } = await db
      .from("jobs")
      .select("scheduled_start, scheduled_end")
      .eq("id", m.local_id)
      .maybeSingle();
    const current = job as { scheduled_start: string | null; scheduled_end: string | null } | null;
    if (!current) continue;
    const sameStart =
      current.scheduled_start && Date.parse(current.scheduled_start) === Date.parse(start);
    if (sameStart) continue;
    await db
      .from("jobs")
      .update({
        scheduled_start: start,
        scheduled_end: typeof end === "string" ? end : current.scheduled_end,
      })
      .eq("id", m.local_id);
    changed += 1;
  }
  return changed;
}

async function pullQuickBooksPayments(conn: ConnectionRow) {
  const db = await admin();
  const { data: maps } = await db
    .from("integration_mappings")
    .select("local_id, remote_id")
    .eq("organization_id", conn.organization_id)
    .eq("provider", "quickbooks")
    .eq("local_type", "invoice")
    .order("synced_at", { ascending: false })
    .limit(50);
  let changed = 0;
  for (const m of (maps ?? []) as Array<{ local_id: string; remote_id: string }>) {
    const json = await qboFetch(conn.id, `/invoice/${m.remote_id}`);
    const invoice = json["Invoice"] as Json | undefined;
    const balance = invoice?.["Balance"];
    if (typeof balance !== "number" || balance > 0) continue;
    const { data: est } = await db
      .from("estimates")
      .select("status")
      .eq("id", m.local_id)
      .maybeSingle();
    const current = est as { status: string } | null;
    if (!current || current.status === "paid") continue;
    await db.from("estimates").update({ status: "paid" }).eq("id", m.local_id);
    changed += 1;
  }
  return changed;
}
