import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStore, money } from "@/lib/local-store";
import { useShopDeals } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({
    meta: [
      { title: "Ad Performance — Systemize" },
      { name: "description", content: "Ad spend, leads, booked revenue and return on spend by campaign." },
      { property: "og:title", content: "Ad Performance — Systemize" },
      { property: "og:description", content: "Ad spend, leads, booked revenue and return on spend by campaign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignsPage,
});

const CHANNELS = ["Google", "Meta", "Instagram", "TikTok", "Yelp", "Print", "Radio", "Other"];
type Campaign = { id: string; name: string; channel: string; source: string; spend: number };

const SEED: Campaign[] = [
  { id: "c1", name: "Google Search — PPF", channel: "Google", source: "google", spend: 2400 },
  { id: "c2", name: "Instagram Reels — Tint", channel: "Instagram", source: "instagram", spend: 1150 },
  { id: "c3", name: "Meta Lead Form — Ceramic", channel: "Meta", source: "facebook", spend: 900 },
];

function CampaignsPage() {
  const [campaigns, setCampaigns] = useLocalStore<Campaign[]>("campaigns", SEED);
  const { data: deals = [] } = useShopDeals();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("Google");
  const [spendInput, setSpendInput] = useState<Record<string, string>>({});

  const bySource = useMemo(() => {
    const m = new Map<string, { leads: number; won: number; rev: number }>();
    for (const d of deals) {
      const k = (d.source ?? "unknown").toLowerCase();
      const row = m.get(k) ?? { leads: 0, won: 0, rev: 0 };
      row.leads++;
      if (d.stage === "won" || d.stage === "scheduled") {
        row.won++;
        row.rev += Number(d.value ?? 0);
      }
      m.set(k, row);
    }
    return m;
  }, [deals]);

  const stats = (c: Campaign) => {
    const key = [...bySource.keys()].find((k) => k.includes(c.source) || c.source.includes(k));
    const s = (key && bySource.get(key)) || { leads: 0, won: 0, rev: 0 };
    return { ...s, cpl: s.leads ? c.spend / s.leads : 0, roas: c.spend ? s.rev / c.spend : 0 };
  };
  const totals = campaigns.reduce(
    (a, c) => {
      const s = stats(c);
      return { spend: a.spend + c.spend, leads: a.leads + s.leads, rev: a.rev + s.rev };
    },
    { spend: 0, leads: 0, rev: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Ad Performance" subtitle="What each campaign costs and what it books." />
      <Panel className="grid grid-cols-2 divide-x divide-elevated sm:grid-cols-4">
        {[
          ["Ad spend", money(totals.spend)],
          ["Leads", String(totals.leads)],
          ["Booked revenue", money(totals.rev)],
          ["Return on spend", totals.spend ? `${(totals.rev / totals.spend).toFixed(1)}×` : "—"],
        ].map(([l, v]) => (
          <div key={l} className="px-4 py-3">
            <p className="micro-label">{l}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </Panel>

      <Panel className="flex flex-wrap items-end gap-2 p-4">
        <Input className="max-w-xs" placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
        <select
          className="h-9 rounded-md border border-input bg-surface-2 px-3 text-sm"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            setCampaigns([...campaigns, { id: crypto.randomUUID(), name: name.trim(), channel, source: channel.toLowerCase(), spend: 0 }]);
            setName("");
          }}
        >
          <Plus className="size-4" /> Add campaign
        </Button>
      </Panel>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">
              {["Campaign", "Channel", "Spend", "Leads", "Cost / lead", "Won", "Revenue", "Return", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const s = stats(c);
              return (
                <tr key={c.id} className="border-b border-elevated/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.channel}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <div className="flex items-center gap-1">
                      {money(c.spend)}
                      <Input
                        className="h-7 w-20"
                        placeholder="+ $"
                        value={spendInput[c.id] ?? ""}
                        onChange={(e) => setSpendInput({ ...spendInput, [c.id]: e.target.value })}
                        onKeyDown={(e) => {
                          const n = Number(spendInput[c.id]);
                          if (e.key === "Enter" && n > 0) {
                            setCampaigns(campaigns.map((x) => (x.id === c.id ? { ...x, spend: x.spend + n } : x)));
                            setSpendInput({ ...spendInput, [c.id]: "" });
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{s.leads}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.cpl ? money(s.cpl) : "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.won}</td>
                  <td className="px-4 py-2.5 tabular-nums">{money(s.rev)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.roas ? `${s.roas.toFixed(1)}×` : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" onClick={() => setCampaigns(campaigns.filter((x) => x.id !== c.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel className="overflow-x-auto">
        <p className="micro-label px-4 pt-4">Results by lead source</p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {[...bySource.entries()]
              .sort((a, b) => b[1].rev - a[1].rev)
              .map(([src, s]) => (
                <tr key={src} className="border-t border-elevated/60">
                  <td className="px-4 py-2 capitalize">{src.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{s.leads} leads</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{s.won} won</td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(s.rev)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
