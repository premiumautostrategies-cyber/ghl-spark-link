import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

const crypto = () => import("@/server/connectionKeyCrypto");

async function loadGhl(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decryptConnectionKey } = await crypto();
  const { data, error } = await supabaseAdmin
    .from("ghl_connections")
    .select("location_id, api_key_ciphertext")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { locationId: data.location_id, apiKey: decryptConnectionKey(data.api_key_ciphertext) };
}

export const getGhlStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadGhl(context.userId);
    return { connected: Boolean(conn), locationId: conn?.locationId ?? null };
  });

export const saveGhlCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { locationId: string; apiKey: string }) => {
    if (!input.locationId?.trim()) throw new Error("Location ID is required");
    if (!input.apiKey?.trim()) throw new Error("Private integration token is required");
    return { locationId: input.locationId.trim(), apiKey: input.apiKey.trim() };
  })
  .handler(async ({ data, context }) => {
    const probe = await fetch(
      `${GHL_BASE}/contacts/?locationId=${encodeURIComponent(data.locationId)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${data.apiKey}`,
          Version: GHL_VERSION,
          Accept: "application/json",
        },
      },
    );
    if (!probe.ok) {
      const body = await probe.text();
      throw new Error(`GoHighLevel rejected these details [${probe.status}]: ${body.slice(0, 300)}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptConnectionKey } = await crypto();
    const { error } = await supabaseAdmin.from("ghl_connections").upsert(
      {
        user_id: context.userId,
        location_id: data.locationId,
        api_key_ciphertext: encryptConnectionKey(data.apiKey),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const disconnectGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ghl_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const importGhlContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadGhl(context.userId);
    if (!conn) return { imported: 0, connected: false };

    const res = await fetch(
      `${GHL_BASE}/contacts/?locationId=${encodeURIComponent(conn.locationId)}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${conn.apiKey}`,
          Version: GHL_VERSION,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GoHighLevel request failed [${res.status}]: ${body.slice(0, 300)}`);
    }
    const payload = (await res.json()) as {
      contacts?: Array<{
        id: string;
        contactName?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        companyName?: string;
      }>;
    };
    const rows = (payload.contacts ?? []).map((c) => ({
      owner_id: context.userId,
      ghl_contact_id: c.id,
      name:
        c.contactName ||
        [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
        c.email ||
        "GHL contact",
      email: c.email ?? null,
      phone: c.phone ?? null,
      company: c.companyName ?? null,
    }));
    if (rows.length === 0) return { imported: 0, connected: true };

    const { error } = await context.supabase.from("customers").insert(rows);
    if (error) throw error;
    return { imported: rows.length, connected: true };
  });
