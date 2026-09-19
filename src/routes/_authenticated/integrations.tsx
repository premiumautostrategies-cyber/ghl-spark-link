import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Mail,
  Plug,
  RefreshCw,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PROVIDERS, EVENT_LABELS, type ProviderId } from "@/lib/integrations/registry";
import {
  completeProviderConnect,
  completeQuickbooksConnect,
  disconnectProvider,
  getIntegrationsOverview,
  retrySyncEvent,
  setProviderSetting,
  startProviderConnect,
  startQuickbooksConnect,
  syncNow,
} from "@/lib/integrations.functions";
import { getGhlStatus, saveGhlCredentials, importGhlContacts } from "@/lib/ghl.functions";
import { importHubspotContacts } from "@/lib/hubspot.functions";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Systemize" },
      {
        name: "description",
        content:
          "Connect QuickBooks, Google, Outlook and your CRM so shop data flows out automatically.",
      },
      { property: "og:title", content: "Integrations — Systemize" },
      {
        property: "og:description",
        content:
          "Connect QuickBooks, Google, Outlook and your CRM so shop data flows out automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

const PROVIDER_ICON: Record<ProviderId, typeof Plug> = {
  quickbooks: Receipt,
  google_calendar: CalendarDays,
  google_mail: Mail,
  microsoft_outlook: Mail,
  hubspot: Plug,
  ghl: Plug,
};

function waitForPopup(popup: Window, okType: string, failType: string) {
  return new Promise<{ code: string | null; realmId?: string | null }>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup) return;
      const type = event.data?.type;
      if (type !== okType && type !== failType) return;
      cleanup();
      if (type === okType) {
        resolve({ code: event.data?.code ?? null, realmId: event.data?.realmId ?? null });
        return;
      }
      popup.close();
      reject(new Error("The connection did not finish."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The window closed before the connection finished."));
    }, 500);
  });
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function IntegrationsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getIntegrationsOverview);
  const startConnect = useServerFn(startProviderConnect);
  const finishConnect = useServerFn(completeProviderConnect);
  const startQbo = useServerFn(startQuickbooksConnect);
  const finishQbo = useServerFn(completeQuickbooksConnect);
  const toggleSetting = useServerFn(setProviderSetting);
  const removeProvider = useServerFn(disconnectProvider);
  const runSync = useServerFn(syncNow);
  const retry = useServerFn(retrySyncEvent);

  const overview = useQuery({ queryKey: ["integrations"], queryFn: () => overviewFn() });
  const ghlStatusFn = useServerFn(getGhlStatus);
  const ghl = useQuery({ queryKey: ["ghl-status"], queryFn: () => ghlStatusFn() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["integrations"] });

  const connect = useMutation({
    mutationFn: async (provider: ProviderId) => {
      const popup = window.open("", `systemize-${provider}`, "width=620,height=740");
      if (!popup) throw new Error("Allow pop-ups and try again.");
      try {
        if (provider === "quickbooks") {
          const { authorizationUrl } = await startQbo();
          const waiter = waitForPopup(
            popup,
            "systemizeQuickbooksComplete",
            "systemizeQuickbooksFailed",
          );
          popup.location.href = authorizationUrl;
          const result = await waiter;
          if (!result.code || !result.realmId) throw new Error("QuickBooks did not return a company.");
          await finishQbo({ data: { code: result.code, realmId: result.realmId } });
          return;
        }
        const { authorizationUrl } = await startConnect({ data: { provider } });
        const waiter = waitForPopup(popup, "systemizeConnectorComplete", "systemizeConnectorFailed");
        popup.location.href = authorizationUrl;
        const result = await waiter;
        if (result.code) await finishConnect({ data: { provider, code: result.code } });
      } catch (err) {
        popup.close();
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Connected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setToggle = useMutation({
    mutationFn: async (v: { provider: ProviderId; key: string; value: boolean }) =>
      toggleSetting({ data: v }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async (provider: ProviderId) => removeProvider({ data: { provider } }),
    onSuccess: () => {
      toast.success("Disconnected");
      refresh();
      qc.invalidateQueries({ queryKey: ["ghl-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: async () => runSync(),
    onSuccess: (r) => {
      toast.success(
        `${r.processed} sent${r.failed ? `, ${r.failed} failed` : ""}${
          r.changed ? `, ${r.changed} updated here` : ""
        }`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retryOne = useMutation({
    mutationFn: async (eventId: string) => retry({ data: { eventId } }),
    onSuccess: () => {
      toast.success("Retried");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importContacts = useMutation({
    mutationFn: async (source: "hubspot" | "ghl") =>
      source === "hubspot" ? importHubspotContacts() : importGhlContacts(),
    onSuccess: (res) => {
      if (!res.connected) {
        toast.error("Connect the account first.");
        return;
      }
      toast.success(`${res.imported} contacts imported`);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = overview.data;
  const configuredMap: Record<ProviderId, boolean> = {
    quickbooks: data?.quickbooksConfigured ?? false,
    google_calendar: data?.googleCalendarConfigured ?? false,
    google_mail: data?.googleMailConfigured ?? false,
    microsoft_outlook: data?.outlookConfigured ?? false,
    hubspot: data?.hubspotConfigured ?? false,
    ghl: true,
  };
  const connections = data?.connections ?? [];
  const connectedCount = connections.filter((c) => c.status !== "disabled").length;
  const failing = (data?.events ?? []).filter((e) => e.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            {connectedCount} connected · {failing} needing attention. Shop data pushes out
            automatically as jobs move.
          </p>
        </div>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
          Sync now
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROVIDERS.map((def) => {
          const conn = connections.find((c) => c.provider === def.id);
          const Icon = PROVIDER_ICON[def.id];
          const configured = configuredMap[def.id];
          const connected = def.id === "ghl" ? Boolean(ghl.data?.connected) : Boolean(conn);
          const state = conn?.status === "error" ? "error" : connected ? "connected" : "idle";
          return (
            <section
              key={def.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg border border-border bg-background p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{def.name}</h2>
                    <p className="text-sm text-muted-foreground">{def.blurb}</p>
                  </div>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    state === "connected"
                      ? "border-emerald-500/40 text-emerald-400"
                      : state === "error"
                        ? "border-destructive/50 text-destructive"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {state === "connected" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : state === "error" ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : null}
                  {state === "connected"
                    ? "Connected"
                    : state === "error"
                      ? "Needs attention"
                      : "Not connected"}
                </span>
              </div>

              {conn?.lastError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  {conn.lastError}
                </p>
              )}

              {!configured && (
                <p className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
                  {def.name} setup for this app is not finished yet, so connecting is unavailable.
                </p>
              )}

              {connected && (
                <div className="space-y-2">
                  {def.settings.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{s.label}</span>
                      <Switch
                        checked={conn?.settings?.[s.key] !== false}
                        onCheckedChange={(value) =>
                          setToggle.mutate({ provider: def.id, key: s.key, value })
                        }
                      />
                    </div>
                  ))}
                  {def.twoWay && (
                    <p className="pt-1 text-xs text-muted-foreground">Two-way: {def.twoWay}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last sync {timeAgo(conn?.lastSyncAt)}
                  </p>
                </div>
              )}

              {def.id === "ghl" ? (
                <GhlCard connected={Boolean(ghl.data?.connected)} locationId={ghl.data?.locationId ?? ""} />
              ) : (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => connect.mutate(def.id)}
                    disabled={!configured || connect.isPending}
                  >
                    {connected ? "Reconnect" : "Connect"}
                  </Button>
                  {def.id === "hubspot" && connected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => importContacts.mutate("hubspot")}
                      disabled={importContacts.isPending}
                    >
                      Import contacts
                    </Button>
                  )}
                  {connected && (
                    <Button size="sm" variant="ghost" onClick={() => disconnect.mutate(def.id)}>
                      Disconnect
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Sync activity</h2>
          <span className="text-xs text-muted-foreground">Last 40 pushes</span>
        </div>
        {(data?.events ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nothing pushed yet. Book a job, send a quote or take a payment and it will appear here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(data?.events ?? []).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    e.status === "sent"
                      ? "bg-emerald-400"
                      : e.status === "failed"
                        ? "bg-destructive"
                        : "bg-amber-400"
                  }`}
                />
                <span className="w-40 shrink-0 font-medium">
                  {EVENT_LABELS[e.event_type as keyof typeof EVENT_LABELS] ?? e.event_type}
                </span>
                <span className="w-32 shrink-0 text-muted-foreground">{e.provider}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {e.last_error ?? e.summary ?? ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(e.created_at)}
                </span>
                {e.status !== "sent" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => retryOne.mutate(e.id)}
                    disabled={retryOne.isPending}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GhlCard({ connected, locationId }: { connected: boolean; locationId: string }) {
  const qc = useQueryClient();
  const [loc, setLoc] = useState("");
  const [apiKey, setApiKey] = useState("");
  const save = useMutation({
    mutationFn: async () => saveGhlCredentials({ data: { locationId: loc, apiKey } }),
    onSuccess: () => {
      toast.success("GoHighLevel connected");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ghl-status"] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const importer = useMutation({
    mutationFn: async () => importGhlContacts(),
    onSuccess: (res) => toast.success(`${res.imported} contacts imported`),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-auto space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ghl-loc" className="text-xs">
            Location ID
          </Label>
          <Input
            id="ghl-loc"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder={locationId || "abc123..."}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ghl-key" className="text-xs">
            Private token
          </Label>
          <Input
            id="ghl-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pit-..."
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {connected ? "Update connection" : "Connect GoHighLevel"}
        </Button>
        {connected && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => importer.mutate()}
            disabled={importer.isPending}
          >
            Import contacts
          </Button>
        )}
      </div>
    </div>
  );
}
