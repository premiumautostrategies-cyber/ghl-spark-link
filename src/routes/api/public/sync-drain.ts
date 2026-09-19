import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled worker endpoint: drains queued outbound events for every shop with
 * pending work and pulls calendar / QuickBooks changes back in.
 * Requires the shared worker secret.
 */
export const Route = createFileRoute("/api/public/sync-drain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SYNC_WORKER_SECRET"];
        const provided = request.headers.get("x-worker-secret");
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { drainQueue, pullUpdates } = await import("@/lib/integrations/sync.server");

        const { data: pending } = await supabaseAdmin
          .from("sync_events")
          .select("organization_id")
          .eq("status", "pending")
          .lte("next_attempt_at", new Date().toISOString())
          .limit(500);
        const { data: connected } = await supabaseAdmin
          .from("integration_connections")
          .select("organization_id")
          .eq("status", "connected");

        const orgIds = Array.from(
          new Set([
            ...(pending ?? []).map((r) => r.organization_id),
            ...(connected ?? []).map((r) => r.organization_id),
          ]),
        );

        let processed = 0;
        let failed = 0;
        let changed = 0;
        for (const orgId of orgIds) {
          const drained = await drainQueue(orgId, 50);
          processed += drained.processed;
          failed += drained.failed;
          const pulled = await pullUpdates(orgId);
          changed += pulled.changed;
        }
        return Response.json({ organizations: orgIds.length, processed, failed, changed });
      },
    },
  },
});
