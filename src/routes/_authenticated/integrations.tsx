import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  disconnectHubspot,
  getHubspotStatus,
  importHubspotContacts,
  startHubspotConnect,
  completeHubspotConnection,
} from "@/server/hubspot";
import {
  disconnectGhl,
  getGhlStatus,
  importGhlContacts,
  saveGhlCredentials,
} from "@/server/ghl";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Systemize" },
      {
        name: "description",
        content: "Connect your own GoHighLevel and HubSpot accounts to your shop workspace.",
      },
      { property: "og:title", content: "Integrations — Systemize" },
      {
        property: "og:description",
        content: "Connect your own GoHighLevel and HubSpot accounts to your shop workspace.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "hubspot" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("The HubSpot connection failed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The window closed before the connection finished."));
    }, 500);
  });
}

function IntegrationsPage() {
  const qc = useQueryClient();
  const startConnect = useServerFn(startHubspotConnect);
  const completeConnect = useServerFn(completeHubspotConnection);
  const hubspotStatusFn = useServerFn(getHubspotStatus);
  const ghlStatusFn = useServerFn(getGhlStatus);
  const [locationId, setLocationId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const hubspot = useQuery({ queryKey: ["hubspot-status"], queryFn: () => hubspotStatusFn() });
  const ghl = useQuery({ queryKey: ["ghl-status"], queryFn: () => ghlStatusFn() });

  const connectHubspot = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "systemize-hubspot", "width=600,height=720");
      if (!popup) throw new Error("Allow pop-ups and try again.");
      let code: string | null;
      try {
        const { authorizationUrl } = await startConnect();
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = authorizationUrl;
        code = await completion;
      } catch (err) {
        popup.close();
        throw err;
      }
      if (code) await completeConnect({ data: { code } });
    },
    onSuccess: () => {
      toast.success("HubSpot connected");
      qc.invalidateQueries({ queryKey: ["hubspot-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runImport = useMutation({
    mutationFn: async (source: "hubspot" | "ghl") =>
      source === "hubspot" ? importHubspotContacts() : importGhlContacts(),
    onSuccess: (res) => {
      if (!res.connected) {
        toast.error("Connect the account first.");
        return;
      }
      toast.success(`${res.imported} contacts imported`);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-lite"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveGhl = useMutation({
    mutationFn: async () => saveGhlCredentials({ data: { locationId, apiKey } }),
    onSuccess: () => {
      toast.success("GoHighLevel connected");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ghl-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeHubspot = useMutation({
    mutationFn: async () => disconnectHubspot(),
    onSuccess: () => {
      toast.success("HubSpot disconnected");
      qc.invalidateQueries({ queryKey: ["hubspot-status"] });
    },
  });

  const removeGhl = useMutation({
    mutationFn: async () => disconnectGhl(),
    onSuccess: () => {
      toast.success("GoHighLevel disconnected");
      qc.invalidateQueries({ queryKey: ["ghl-status"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Each shop connects its own CRM. Contacts flow into Systemize customers.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">HubSpot</h2>
            {hubspot.data?.connected ? (
              <Badge className="bg-success text-success-foreground">Connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your own HubSpot and pull your contacts into the shop.
          </p>

          {hubspot.data && !hubspot.data.configured && (
            <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              HubSpot setup for this app is not finished yet, so connecting is unavailable.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => connectHubspot.mutate()}
              disabled={!hubspot.data?.configured || connectHubspot.isPending}
            >
              {hubspot.data?.reconnectRequired
                ? "Reconnect HubSpot"
                : hubspot.data?.connected
                  ? "Reconnect HubSpot"
                  : "Connect HubSpot"}
            </Button>
            {hubspot.data?.connected && (
              <>
                <Button
                  variant="outline"
                  onClick={() => runImport.mutate("hubspot")}
                  disabled={runImport.isPending}
                >
                  Import contacts
                </Button>
                <Button variant="ghost" onClick={() => removeHubspot.mutate()}>
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">GoHighLevel</h2>
            {ghl.data?.connected ? (
              <Badge className="bg-success text-success-foreground">Connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste the private integration token and location ID from your GoHighLevel sub-account.
          </p>

          <div className="mt-5 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID</Label>
              <Input
                id="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder={ghl.data?.locationId ?? "abc123..."}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Private integration token</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pit-..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveGhl.mutate()} disabled={saveGhl.isPending}>
                {ghl.data?.connected ? "Update connection" : "Connect GoHighLevel"}
              </Button>
              {ghl.data?.connected && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => runImport.mutate("ghl")}
                    disabled={runImport.isPending}
                  >
                    Import contacts
                  </Button>
                  <Button variant="ghost" onClick={() => removeGhl.mutate()}>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
