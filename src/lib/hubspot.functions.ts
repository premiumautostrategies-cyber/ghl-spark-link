import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "hubspot";
const HUBSPOT_VERSION = "2026-09";

export const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "crm.objects.owners.read",
];

const connector = () => import("@/integrations/lovable/appUserConnector");
const store = () => import("@/server/appUserConnections.server");

export const startHubspotConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["HUBSPOT_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) {
      throw new Error("HubSpot is not set up for this app yet.");
    }
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/hubspot/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const { getConnectionKeyForUser } = await store();
    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizeAppUserOAuth } = await connector();
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      credentialsConfiguration: { scopes: HUBSPOT_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeHubspotConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await connector();
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) throw new Error("OAuth returned the wrong service");
    const { saveConnectionKeyForUser } = await store();
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export const getHubspotStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = Boolean(process.env["HUBSPOT_APP_USER_CONNECTOR_CLIENT_API_KEY"]);
    if (!configured) return { configured: false, connected: false };
    const { getConnectionKeyForUser } = await store();
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { configured: true, connected: false };
    const { callAsAppUser, appUserReconnectRequired } = await connector();
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/crm/objects/${HUBSPOT_VERSION}/contacts?limit=1&properties=email`,
      requiredScopes: HUBSPOT_SCOPES,
    });
    if (await appUserReconnectRequired(res)) {
      return { configured: true, connected: false, reconnectRequired: true };
    }
    if (!res.ok) {
      const body = await res.text();
      console.error(`HubSpot check failed [${res.status}]: ${body}`);
      return { configured: true, connected: true, warning: `HubSpot error ${res.status}` };
    }
    return { configured: true, connected: true };
  });

export const importHubspotContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await store();
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { imported: 0, connected: false };

    const { callAsAppUser, appUserReconnectRequired } = await connector();
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/crm/objects/${HUBSPOT_VERSION}/contacts?limit=100&properties=email,firstname,lastname,phone,company`,
      requiredScopes: HUBSPOT_SCOPES,
    });
    if (await appUserReconnectRequired(res)) {
      return { imported: 0, connected: false, reconnectRequired: true };
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HubSpot request failed [${res.status}]: ${body}`);
    }
    const payload = (await res.json()) as {
      results?: Array<{ id: string; properties: Record<string, string | null> }>;
    };
    const rows = (payload.results ?? []).map((r) => {
      const p = r.properties;
      return {
        owner_id: context.userId,
        hubspot_contact_id: r.id,
        name:
          [p["firstname"], p["lastname"]].filter(Boolean).join(" ").trim() ||
          p["email"] ||
          "HubSpot contact",
        email: p["email"] ?? null,
        phone: p["phone"] ?? null,
        company: p["company"] ?? null,
      };
    });
    if (rows.length === 0) return { imported: 0, connected: true };

    const { error } = await context.supabase.from("customers").insert(rows);
    if (error) throw error;
    return { imported: rows.length, connected: true };
  });

export const disconnectHubspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await store();
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      const { disconnectAppUser } = await connector();
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
      });
      await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    }
    return { ok: true };
  });
