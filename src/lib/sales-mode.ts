// Front-end only Sales configuration: where lead data comes from, and how the
// Sales layer presents it. Persisted in localStorage — no backend involved.

import { useEffect, useState } from "react";

export type SalesDataSource = "systemize" | "crm";
export type SalesWorkspace = "activity" | "pipeline";
export type CrmId = "ghl" | "hubspot";

export const CRM_OPTIONS: Array<{ id: CrmId; name: string; blurb: string }> = [
  { id: "ghl", name: "GoHighLevel", blurb: "Contacts, conversations and opportunity activity." },
  { id: "hubspot", name: "HubSpot", blurb: "Contacts, deals and engagement activity." },
];

export type SalesConfig = {
  dataSource: SalesDataSource;
  workspace: SalesWorkspace;
  crm: CrmId | null;
  connectedAt: string | null;
};

export const DEFAULT_SALES_CONFIG: SalesConfig = {
  dataSource: "systemize",
  workspace: "pipeline",
  crm: null,
  connectedAt: null,
};

const KEY = "systemize.salesConfig.v1";
const EVENT = "systemize-sales-config";

export function readSalesConfig(): SalesConfig {
  if (typeof window === "undefined") return DEFAULT_SALES_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SALES_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SalesConfig>;
    return { ...DEFAULT_SALES_CONFIG, ...parsed };
  } catch {
    return DEFAULT_SALES_CONFIG;
  }
}

export function writeSalesConfig(next: SalesConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Live view of the sales configuration; updates instantly across the app. */
export function useSalesConfig() {
  const [config, setConfig] = useState<SalesConfig>(DEFAULT_SALES_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setConfig(readSalesConfig());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (patch: Partial<SalesConfig>) => {
    const next = { ...readSalesConfig(), ...patch };
    writeSalesConfig(next);
    setConfig(next);
  };

  return { config, ready, update };
}

export function crmName(id: CrmId | null) {
  return CRM_OPTIONS.find((c) => c.id === id)?.name ?? null;
}
