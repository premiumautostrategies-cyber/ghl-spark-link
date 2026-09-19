import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PROVIDER_BY_ID,
  defaultSettings,
  type DomainEventType,
  type ProviderId,
} from "@/lib/integrations/registry";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

const connector = () => import("@/integrations/lovable/appUserConnector");
const keyStore = () => import("@/server/appUserConnections.server");
const engine = () => import("@/lib/integrations/sync.server");
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function orgFor(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: { organization_id: string | null } | null }> };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  const orgId = data?.organization_id ?? null;
  if (!orgId) throw new Error("No shop workspace found for this account.");
  return orgId;
}

function originFor() {
  const request = getRequest();
  if (!request) throw new Error("OAuth must start from an app request.");
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return sandboxHost ? `https://${sandboxHost}` : url.origin;
}

/* -------------------------------- overview -------------------------------- */

export const getIntegrationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const db = await admin();
    const { data: connections } = await db
      .from("integration_connections")
      .select("*")
      .eq("organization_id", orgId);
    const { data: events } = await db
      .from("sync_events")
      .select("id, provider, event_type, status, summary, last_error, created_at, attempts")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(40);
    const { quickbooksConfigured } = await engine();
    return {
      organizationId: orgId,
      quickbooksConfigured: quickbooksConfigured(),
      hubspotConfigured: Boolean(process.env["HUBSPOT_APP_USER_CONNECTOR_CLIENT_API_KEY"]),
      googleCalendarConfigured: Boolean(
        process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"],
      ),
      googleMailConfigured: Boolean(process.env["GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY"]),
      outlookConfigured: Boolean(
        process.env["MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY"],
      ),
      connections: (connections ?? []).map((c) => ({
        provider: c.provider,
        status: c.status,
        accountLabel: c.account_label,
        settings: (c.settings ?? {}) as Record<string, boolean>,
        lastSyncAt: c.last_sync_at,
        lastError: c.last_error,
      })),
      events: events ?? [],
    };
  });

/* ---------------------- app user connector OAuth flow --------------------- */

function connectorClientKey(provider: ProviderId) {
  const envName: Partial<Record<ProviderId, string>> = {
    google_calendar: "GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY",
    google_mail: "GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY",
    microsoft_outlook: "MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY",
    hubspot: "HUBSPOT_APP_USER_CONNECTOR_CLIENT_API_KEY",
  };
  const name = envName[provider];
  return name ? process.env[name] : undefined;
}

export const startProviderConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId }) => input)
  .handler(async ({ data, context }) => {
    const def = PROVIDER_BY_ID[data.provider];
    if (!def?.connectorId) throw new Error("This service does not use a sign-in popup.");
    const clientKey = connectorClientKey(data.provider);
    if (!clientKey) throw new Error(`${def.name} is not set up for this app yet.`);
    const returnUrl = `${originFor()}/oauth/connector/return?provider=${data.provider}`;

    const { getConnectionKeyForUser } = await keyStore();
    const existing = await getConnectionKeyForUser(context.userId, def.connectorId);
    const { authorizeAppUserOAuth } = await connector();
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: def.connectorId,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      ...(def.scopes ? { credentialsConfiguration: { scopes: def.scopes } } : {}),
    });
    return { authorizationUrl };
  });

export const completeProviderConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId; code: string }) => input)
  .handler(async ({ data, context }) => {
    const def = PROVIDER_BY_ID[data.provider];
    if (!def?.connectorId) throw new Error("Unknown service.");
    const { exchangeAppUserOAuthCode } = await connector();
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== def.connectorId) throw new Error("Sign-in returned the wrong service.");
    const { saveConnectionKeyForUser } = await keyStore();
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);

    const orgId = await orgFor(context.supabase as never, context.userId);
    const db = await admin();
    const { data: existing } = await db
      .from("integration_connections")
      .select("settings")
      .eq("organization_id", orgId)
      .eq("provider", data.provider)
      .maybeSingle();
    await db.from("integration_connections").upsert(
      {
        organization_id: orgId,
        provider: data.provider,
        status: "connected",
        connected_by: context.userId,
        account_label: def.name,
        settings: existing?.settings ?? defaultSettings(data.provider),
        last_error: null,
      } as never,
      { onConflict: "organization_id,provider" },
    );
    return { ok: true };
  });

/* -------------------------------- quickbooks ------------------------------ */

export const startQuickbooksConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env["QUICKBOOKS_CLIENT_ID"];
    if (!clientId) throw new Error("QuickBooks is not set up for this app yet.");
    const orgId = await orgFor(context.supabase as never, context.userId);
    const redirectUri = `${originFor()}/oauth/quickbooks/return`;
    const url = new URL("https://appcenter.intuit.com/connect/oauth2");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", orgId);
    return { authorizationUrl: url.toString() };
  });

export const completeQuickbooksConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; realmId: string }) => input)
  .handler(async ({ data, context }) => {
    const clientId = process.env["QUICKBOOKS_CLIENT_ID"];
    const clientSecret = process.env["QUICKBOOKS_CLIENT_SECRET"];
    if (!clientId || !clientSecret) throw new Error("QuickBooks is not set up for this app yet.");
    const redirectUri = `${originFor()}/oauth/quickbooks/return`;
    const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: data.code,
        redirect_uri: redirectUri,
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`QuickBooks sign-in failed [${res.status}]: ${text.slice(0, 200)}`);
    const token = JSON.parse(text) as {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
    };

    const orgId = await orgFor(context.supabase as never, context.userId);
    const db = await admin();
    const { data: conn, error } = await db
      .from("integration_connections")
      .upsert(
        {
          organization_id: orgId,
          provider: "quickbooks",
          status: "connected",
          connected_by: context.userId,
          account_label: `QuickBooks company ${data.realmId}`,
          external_id: data.realmId,
          settings: defaultSettings("quickbooks"),
          last_error: null,
        } as never,
        { onConflict: "organization_id,provider" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await db.from("integration_secrets").upsert(
      {
        connection_id: (conn as { id: string }).id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        realm_id: data.realmId,
        expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "connection_id" },
    );
    return { ok: true };
  });

/* ---------------------------- settings / control -------------------------- */

export const setProviderSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId; key: string; value: boolean }) => input)
  .handler(async ({ data, context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const db = await admin();
    const { data: row } = await db
      .from("integration_connections")
      .select("id, settings")
      .eq("organization_id", orgId)
      .eq("provider", data.provider)
      .maybeSingle();
    if (!row) throw new Error("Connect this service first.");
    const settings = { ...((row.settings ?? {}) as Record<string, boolean>), [data.key]: data.value };
    await db.from("integration_connections").update({ settings }).eq("id", row.id);
    return { ok: true };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId }) => input)
  .handler(async ({ data, context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const db = await admin();
    const def = PROVIDER_BY_ID[data.provider];
    if (def?.connectorId) {
      const { getConnectionKeyForUser, deleteConnectionForUser } = await keyStore();
      const key = await getConnectionKeyForUser(context.userId, def.connectorId);
      if (key) {
        const { disconnectAppUser } = await connector();
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: def.connectorId,
        });
        await deleteConnectionForUser(context.userId, def.connectorId);
      }
    }
    await db
      .from("integration_connections")
      .delete()
      .eq("organization_id", orgId)
      .eq("provider", data.provider);
    return { ok: true };
  });

export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const { drainQueue, pullUpdates } = await engine();
    const drained = await drainQueue(orgId, 50);
    const pulled = await pullUpdates(orgId);
    return { ...drained, ...pulled };
  });

export const retrySyncEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => input)
  .handler(async ({ data, context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const { retryEvent } = await engine();
    return retryEvent(orgId, data.eventId);
  });

/** Record something that happened in the shop and push it to every connected service. */
export const emitDomainEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      event: DomainEventType;
      payload: Record<string, unknown>;
      localType?: string;
      localId?: string;
      summary?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const orgId = await orgFor(context.supabase as never, context.userId);
    const { enqueueEvent, drainQueue } = await engine();
    const queued = await enqueueEvent({
      organizationId: orgId,
      event: data.event,
      payload: data.payload,
      ...(data.localType ? { localType: data.localType } : {}),
      ...(data.localId ? { localId: data.localId } : {}),
      ...(data.summary ? { summary: data.summary } : {}),
    });
    if (queued.queued === 0) return { queued: 0, processed: 0, failed: 0 };
    const drained = await drainQueue(orgId, 10);
    return { ...queued, ...drained };
  });
