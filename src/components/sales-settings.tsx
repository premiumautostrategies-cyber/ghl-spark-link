// Settings → Sales & CRM. Two independent decisions: where sales data comes
// from, and how Systemize presents it. Prototype only — connections simulated.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CRM_OPTIONS,
  crmName,
  useSalesConfig,
  type CrmId,
  type SalesDataSource,
  type SalesWorkspace,
} from "@/lib/sales-mode";

const SOURCES: Array<{ id: SalesDataSource; name: string; blurb: string }> = [
  {
    id: "systemize",
    name: "Systemize",
    blurb: "Manage leads and sales directly inside Systemize.",
  },
  {
    id: "crm",
    name: "Connect Existing CRM",
    blurb: "Connect your existing CRM and let Systemize use its live sales and activity data.",
  },
];

const WORKSPACES: Array<{ id: SalesWorkspace; name: string; blurb: string }> = [
  {
    id: "activity",
    name: "Dynamic Activity",
    blurb:
      "An intelligent live workspace that prioritizes leads, conversations, follow-ups and sales activity based on what needs attention now.",
  },
  {
    id: "pipeline",
    name: "Dynamic Pipeline",
    blurb: "Manage opportunities visually through Systemize's activity-aware sales pipeline.",
  },
];

export function SalesSettings() {
  const { config, update } = useSalesConfig();
  const [connecting, setConnecting] = useState<CrmId | null>(null);
  const connected = config.dataSource === "crm" && Boolean(config.crm);

  const connect = (id: CrmId) => {
    setConnecting(id);
    window.setTimeout(() => {
      setConnecting(null);
      update({ dataSource: "crm", crm: id, connectedAt: new Date().toISOString() });
      toast.success(`${crmName(id)} connected`);
    }, 1400);
  };

  const disconnect = () => {
    update({ dataSource: "systemize", crm: null, connectedAt: null });
    toast.success("CRM disconnected");
  };

  return (
    <div className="rounded-xl border border-elevated bg-surface p-4">
      <h2 className="text-sm font-semibold">Sales &amp; CRM</h2>

      <p className="micro-label mt-4">Data source</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <OptionButton
            key={s.id}
            name={s.name}
            blurb={s.blurb}
            active={config.dataSource === s.id}
            onClick={() =>
              s.id === "systemize"
                ? update({ dataSource: "systemize", crm: null, connectedAt: null })
                : update({ dataSource: "crm" })
            }
          />
        ))}
      </div>

      {config.dataSource === "crm" && (
        <div className="mt-4 rounded-lg border border-hairline/70 bg-muted/20 p-3">
          {connected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{crmName(config.crm)}</p>
                <p className="text-xs text-revenue">Connected · Last sync: Just now</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => update({ crm: null })}>
                  Change CRM
                </Button>
                <Button variant="ghost" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {CRM_OPTIONS.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.blurb}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={connecting !== null}
                    onClick={() => connect(c.id)}
                  >
                    {connecting === c.id ? "Connecting…" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="micro-label mt-6">Sales workspace</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {WORKSPACES.map((w) => (
          <OptionButton
            key={w.id}
            name={w.name}
            blurb={w.blurb}
            active={config.workspace === w.id}
            onClick={() => update({ workspace: w.id })}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-hairline/70 pt-4">
        <p className="micro-label">Sales configuration</p>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium">
              {connected ? crmName(config.crm) : "Systemize"}
            </dt>
            <dd className="text-xs text-muted-foreground">
              {connected ? "Connected" : "Internal CRM"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium">
              {config.workspace === "activity" ? "Dynamic Activity" : "Dynamic Pipeline"}
            </dt>
            <dd className="text-xs text-muted-foreground">Workspace</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function OptionButton({
  name,
  blurb,
  active,
  onClick,
}: {
  name: string;
  blurb: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/[0.06]"
          : "border-hairline/70 hover:border-elevated hover:bg-muted/20",
      )}
    >
      <p className={cn("text-sm font-medium", active && "text-primary")}>{name}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{blurb}</p>
    </button>
  );
}
