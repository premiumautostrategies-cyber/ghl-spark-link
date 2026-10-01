import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/lib/use-org";
import { useLocalStore, money } from "@/lib/local-store";
import { useShopDeals } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({
    meta: [
      { title: "Agency Access — Systemize" },
      { name: "description", content: "Let your marketing agency see spend, leads, bookings and return." },
      { property: "og:title", content: "Agency Access — Systemize" },
      { property: "og:description", content: "Let your marketing agency see spend, leads, bookings and return." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agency,
});

type Link = { id: string; name: string; email: string; status: "active" | "revoked"; since: string };
type Campaign = { spend: number };

function Agency() {
  const { organization } = useOrg();
  const [links, setLinks] = useLocalStore<Link[]>("agency-links", [
    { id: "a1", name: "Torque Digital", email: "team@torquedigital.co", status: "active", since: "2026-08-04" },
  ]);
  const [campaigns] = useLocalStore<Campaign[]>("campaigns", []);
  const { data: deals = [] } = useShopDeals();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const spend = campaigns.reduce((a, c) => a + c.spend, 0);
  const booked = deals.filter((d) => d.stage === "won" || d.stage === "scheduled");
  const rev = booked.reduce((a, d) => a + Number(d.value ?? 0), 0);
  const code = (organization?.id ?? "").slice(0, 8).toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader title="Agency Access" subtitle="Give a marketing agency a read-only view of ad results for this shop. They never see customers or messages." />
      <Panel className="grid grid-cols-2 divide-x divide-elevated sm:grid-cols-5">
        {[
          ["Spend", money(spend)],
          ["Leads", String(deals.length)],
          ["Booked", String(booked.length)],
          ["Revenue", money(rev)],
          ["Return", spend ? `${(rev / spend).toFixed(1)}×` : "—"],
        ].map(([l, v]) => (
          <div key={l} className="px-4 py-3">
            <p className="micro-label">{l}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </Panel>
      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <p className="micro-label">Shop access code</p>
          <p className="mt-1 font-mono text-lg">{code}</p>
        </div>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied — send it to your agency"); }}>
          <Copy className="size-4" /> Copy code
        </Button>
      </Panel>
      <Panel className="flex flex-wrap items-end gap-2 p-4">
        <Input className="max-w-xs" placeholder="Agency name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="max-w-xs" placeholder="Agency email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button disabled={!name.trim() || !email.includes("@")} onClick={() => {
          setLinks([...links, { id: crypto.randomUUID(), name: name.trim(), email: email.trim(), status: "active", since: new Date().toISOString().slice(0, 10) }]);
          setName(""); setEmail(""); toast.success("Agency invited");
        }}>Grant access</Button>
      </Panel>
      <Panel className="divide-y divide-elevated/60">
        {links.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.email} · since {l.since}</p>
            </div>
            <Tag tone={l.status === "active" ? "revenue" : "muted"}>{l.status}</Tag>
            <Button size="sm" variant="outline" onClick={() => setLinks(links.map((x) => x.id === l.id ? { ...x, status: x.status === "active" ? "revoked" : "active" } : x))}>
              {l.status === "active" ? "Revoke" : "Restore"}
            </Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
