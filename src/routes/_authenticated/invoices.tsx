import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Input } from "@/components/ui/input";
import { useLocalStore, money, DAY_MS } from "@/lib/local-store";
import { useShopJobs, useShopPayments, vehicleLabel } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Systemize" },
      { name: "description", content: "Invoices with balances, custom due dates and overdue tracking." },
      { property: "og:title", content: "Invoices — Systemize" },
      { property: "og:description", content: "Invoices with balances, custom due dates and overdue tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invoices,
});

type Filter = "all" | "open" | "overdue" | "paid";

function Invoices() {
  const { data: jobs = [] } = useShopJobs();
  const { data: payments = [] } = useShopPayments();
  const [terms, setTerms] = useLocalStore<number>("invoice-terms", 14);
  const [due, setDue] = useLocalStore<Record<string, string>>("invoice-due", {});
  const [filter, setFilter] = useState<Filter>("open");

  const rows = useMemo(() => {
    const paidBy = new Map<string, number>();
    for (const p of payments) {
      if (p.job_id && p.status !== "failed" && p.status !== "refunded")
        paidBy.set(p.job_id, (paidBy.get(p.job_id) ?? 0) + Number(p.amount ?? 0));
    }
    return jobs
      .filter((j) => Number(j.price ?? 0) > 0 && j.status !== "lead" && j.status !== "estimate")
      .map((j) => {
        const total = Number(j.price ?? 0);
        const paid = Math.min(total, paidBy.get(j.id) ?? 0);
        const issued = new Date(j.scheduled_end ?? j.scheduled_start ?? j.updated_at);
        const dueDate = due[j.id] ? new Date(due[j.id]!) : new Date(issued.getTime() + terms * DAY_MS);
        const balance = total - paid;
        const status = balance <= 0 ? "paid" : dueDate.getTime() < Date.now() ? "overdue" : "open";
        return { j, total, paid, balance, dueDate, status };
      });
  }, [jobs, payments, due, terms]);

  const shown = rows.filter((r) => filter === "all" || r.status === filter || (filter === "open" && r.status === "overdue"));
  const sum = (s: string) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.balance, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        subtitle="Balances owed per job. Set default payment terms or a custom due date per invoice."
        action={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Default terms
            <Input type="number" className="h-8 w-16" value={terms} onChange={(e) => setTerms(Math.max(0, Number(e.target.value)))} />
            days
          </label>
        }
      />
      <Panel className="grid grid-cols-3 divide-x divide-elevated">
        {[
          ["Open balance", money(sum("open") + sum("overdue"))],
          ["Overdue", money(sum("overdue"))],
          ["Paid invoices", String(rows.filter((r) => r.status === "paid").length)],
        ].map(([l, v]) => (
          <div key={l} className="px-4 py-3">
            <p className="micro-label">{l}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </Panel>
      <div className="flex gap-1">
        {(["open", "overdue", "paid", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1 text-xs capitalize ${filter === f ? "border-bronze/50 bg-bronze/10 text-bronze" : "border-elevated text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">
              {["Customer", "Job", "Total", "Paid", "Balance", "Due", "Status"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 200).map(({ j, total, paid, balance, dueDate, status }) => (
              <tr key={j.id} className="border-b border-elevated/60 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{j.customers?.name ?? "Customer"}</p>
                  <p className="text-xs text-muted-foreground">{vehicleLabel(j.vehicles)}</p>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{j.title}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(total)}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(paid)}</td>
                <td className="px-4 py-2.5 font-medium tabular-nums">{money(balance)}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="date"
                    className="h-8 rounded-md border border-input bg-surface-2 px-2 text-xs"
                    value={dueDate.toISOString().slice(0, 10)}
                    onChange={(e) => setDue({ ...due, [j.id]: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Tag tone={status === "paid" ? "revenue" : status === "overdue" ? "critical" : "muted"}>{status}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
