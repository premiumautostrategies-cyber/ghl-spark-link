import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/local-store";
import { useShopJobs } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/vehicle-intel")({
  head: () => ({
    meta: [
      { title: "Vehicle Intel — Systemize" },
      { name: "description", content: "What your shop sells on each make and model, plus VIN lookup." },
      { property: "og:title", content: "Vehicle Intel — Systemize" },
      { property: "og:description", content: "What your shop sells on each make and model, plus VIN lookup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VehicleIntel,
});

type Vin = { year: string; make: string; model: string; trim: string; body: string };

function VehicleIntel() {
  const { data: jobs = [] } = useShopJobs();
  const [q, setQ] = useState("");
  const [vin, setVin] = useState("");
  const [decoded, setDecoded] = useState<Vin | null>(null);
  const [vinErr, setVinErr] = useState("");

  const rows = useMemo(() => {
    const g = new Map<string, { label: string; prices: number[]; svc: Record<string, number> }>();
    for (const j of jobs) {
      if (!j.vehicles?.make) continue;
      const label = `${j.vehicles.make} ${j.vehicles.model ?? ""}`.trim();
      const e = g.get(label.toLowerCase()) ?? { label, prices: [], svc: {} };
      e.prices.push(Number(j.price ?? 0));
      const s = (j.service_type ?? j.title).replace(/_/g, " ");
      e.svc[s] = (e.svc[s] ?? 0) + 1;
      g.set(label.toLowerCase(), e);
    }
    return [...g.values()]
      .map((e) => {
        const rev = e.prices.reduce((a, b) => a + b, 0);
        const top = Object.entries(e.svc).sort((a, b) => b[1] - a[1]).slice(0, 3);
        return { label: e.label, jobs: e.prices.length, rev, avg: rev / e.prices.length, top };
      })
      .filter((r) => r.label.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.rev - a.rev);
  }, [jobs, q]);

  async function decode() {
    setVinErr("");
    setDecoded(null);
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin.trim())}?format=json`);
      const j = await r.json();
      const v = j.Results?.[0];
      if (!v?.Make) throw new Error();
      setDecoded({ year: v.ModelYear, make: v.Make, model: v.Model, trim: v.Trim, body: v.BodyClass });
    } catch {
      setVinErr("Couldn't decode that VIN. Check the 17 characters.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Vehicle Intel" subtitle="Which vehicles bring the most work, and what those owners usually buy." />
      <Panel className="flex flex-wrap items-center gap-2 p-4">
        <Input className="max-w-xs font-mono uppercase" maxLength={17} placeholder="Decode a VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
        <Button variant="outline" disabled={vin.trim().length !== 17} onClick={decode}>Decode</Button>
        {decoded && (
          <p className="text-sm">
            <span className="font-medium">{decoded.year} {decoded.make} {decoded.model}</span>{" "}
            <span className="text-muted-foreground">{[decoded.trim, decoded.body].filter(Boolean).join(" · ")}</span>
          </p>
        )}
        {vinErr && <p className="text-sm text-critical">{vinErr}</p>}
      </Panel>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filter make or model" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">
              {["Vehicle", "Jobs", "Revenue", "Avg ticket", "Most bought"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-elevated/60 last:border-0">
                <td className="px-4 py-2.5 font-medium">{r.label}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.jobs}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(r.rev)}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(r.avg)}</td>
                <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">
                  {r.top.map(([s, n]) => `${s} (${Math.round((n / r.jobs) * 100)}%)`).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
