import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { label, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Systemize" },
      { name: "description", content: "Revenue, close rate and shop health at a glance." },
      { property: "og:title", content: "Analytics — Systemize" },
      { property: "og:description", content: "Revenue, close rate and shop health at a glance." },
    ],
  }),
  component: AnalyticsPage,
});

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${max ? Math.max(4, (value / max) * 100) : 0}%` }}
      />
    </div>
  );
}

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [jobs, deals, payments, inventory] = await Promise.all([
        supabase.from("jobs").select("service_type,status,price,installer"),
        supabase.from("deals").select("stage,value,source"),
        supabase.from("payments").select("amount,status,kind"),
        supabase.from("inventory_items").select("name,quantity_on_hand,reorder_point"),
      ]);
      if (jobs.error) throw jobs.error;
      if (deals.error) throw deals.error;
      if (payments.error) throw payments.error;
      if (inventory.error) throw inventory.error;
      return {
        jobs: jobs.data,
        deals: deals.data,
        payments: payments.data,
        inventory: inventory.data,
      };
    },
  });

  const jobs = data?.jobs ?? [];
  const deals = data?.deals ?? [];
  const payments = data?.payments ?? [];
  const inventory = data?.inventory ?? [];

  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce((t, p) => t + Number(p.amount), 0);
  const avgTicket = jobs.length ? jobs.reduce((t, j) => t + Number(j.price), 0) / jobs.length : 0;
  const closedDeals = deals.filter((d) => ["won", "lost"].includes(d.stage));
  const closeRate = closedDeals.length
    ? Math.round((deals.filter((d) => d.stage === "won").length / closedDeals.length) * 100)
    : 0;
  const outstanding = payments
    .filter((p) => p.status === "pending")
    .reduce((t, p) => t + Number(p.amount), 0);

  const byService = Object.entries(
    jobs.reduce<Record<string, number>>((acc, j) => {
      acc[j.service_type] = (acc[j.service_type] ?? 0) + Number(j.price);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxService = byService[0]?.[1] ?? 0;

  const byInstaller = Object.entries(
    jobs.reduce<Record<string, number>>((acc, j) => {
      if (!j.installer) return acc;
      acc[j.installer] = (acc[j.installer] ?? 0) + Number(j.price);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxInstaller = byInstaller[0]?.[1] ?? 0;

  const bySource = Object.entries(
    deals.reduce<Record<string, number>>((acc, d) => {
      const s = d.source || "Direct";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const lowStock = inventory.filter(
    (i) => Number(i.quantity_on_hand) <= Number(i.reorder_point),
  );
  const stalled = deals.filter((d) => ["contacted", "quoted"].includes(d.stage));

  const health = [
    lowStock.length > 0
      ? `${lowStock.length} material${lowStock.length > 1 ? "s are" : " is"} at or below reorder point — ${lowStock
          .slice(0, 2)
          .map((i) => i.name)
          .join(", ")}.`
      : null,
    stalled.length > 0
      ? `${stalled.length} quoted opportunit${stalled.length > 1 ? "ies are" : "y is"} still open and worth ${money(
          stalled.reduce((t, d) => t + Number(d.value), 0),
        )}.`
      : null,
    outstanding > 0 ? `${money(outstanding)} in payments is recorded but not collected.` : null,
    jobs.filter((j) => j.status === "in_progress").length > 2
      ? `${jobs.filter((j) => j.status === "in_progress").length} vehicles are in production at once — check bay capacity.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Where revenue comes from and what's quietly costing you money."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected revenue" value={money(collected)} />
        <StatCard label="Average ticket" value={money(avgTicket)} />
        <StatCard label="Quote close rate" value={`${closeRate}%`} />
        <StatCard label="Outstanding" value={money(outstanding)} />
      </div>

      {jobs.length === 0 && deals.length === 0 ? (
        <EmptyState
          title="Not enough data yet"
          body="Book jobs and record payments — or load the demo shop from Settings."
        />
      ) : (
        <>
          <div className="rounded-xl border border-elevated bg-surface p-4">
            <h2 className="text-sm font-semibold">Shop health</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {health.length === 0 && (
                <li className="text-muted-foreground">
                  Nothing needs attention — stock, pipeline and payments are clean.
                </li>
              )}
              {health.map((h) => (
                <li key={h} className="py-3">
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-elevated bg-surface p-4">
              <h2 className="text-sm font-semibold">
                Revenue by service
              </h2>
              <table className="mt-3 w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Service</th><th className="py-2">Share</th><th className="py-2 text-right">Revenue</th></tr></thead>
                <tbody className="divide-y divide-border">{byService.map(([svc, total]) => <tr key={svc}><td className="py-3 pr-4">{label(svc)}</td><td className="w-1/2 py-3 pr-4"><Bar value={total} max={maxService} /></td><td className="py-3 text-right font-medium">{money(total)}</td></tr>)}</tbody>
              </table>
            </div>

            <div className="rounded-xl border border-elevated bg-surface p-4">
              <h2 className="text-sm font-semibold">
                Production by installer
              </h2>
              <div className="mt-3">
                {byInstaller.length === 0 && (
                  <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
                )}
                {byInstaller.length > 0 && <table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Installer</th><th className="py-2">Share</th><th className="py-2 text-right">Value</th></tr></thead><tbody className="divide-y divide-border">
                  {byInstaller.map(([name, total]) => <tr key={name}><td className="py-3 pr-4">{name}</td><td className="w-1/2 py-3 pr-4"><Bar value={total} max={maxInstaller} /></td><td className="py-3 text-right font-medium">{money(total)}</td></tr>)}
                </tbody></table>}
              </div>
            </div>

            <div className="rounded-xl border border-elevated bg-surface p-4 lg:col-span-2">
              <h2 className="text-sm font-semibold">
                Lead sources
              </h2>
              <table className="mt-3 w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Source</th><th className="py-2 text-right">Opportunities</th></tr></thead><tbody className="divide-y divide-border">
                {bySource.map(([src, count]) => <tr key={src}><td className="py-3">{label(src)}</td><td className="py-3 text-right font-semibold">{count}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
