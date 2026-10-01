import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/lib/use-org";
import { useLocalStore, money, DAY_MS } from "@/lib/local-store";
import { useShopJobs, vehicleLabel, isDone } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Systemize" },
      { name: "description", content: "Review requests, warranty check-ins, referrals and seasonal reminders." },
      { property: "og:title", content: "Follow-ups — Systemize" },
      { property: "og:description", content: "Review requests, warranty check-ins, referrals and seasonal reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowUps,
});

type Tab = "reviews" | "warranty" | "referrals" | "seasonal";
const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "reviews", label: "Review requests", hint: "Finished in the last 14 days" },
  { key: "warranty", label: "Warranty check-ins", hint: "Finished 6–13 months ago" },
  { key: "referrals", label: "Referral asks", hint: "Customers who spent $1,500+" },
  { key: "seasonal", label: "Seasonal trends", hint: "Booked revenue by month and service" },
];
const COPY: Record<Exclude<Tab, "seasonal">, (f: string, v: string, s: string) => string> = {
  reviews: (f, v, s) => `Hi ${f}, thanks for trusting ${s} with your ${v}! Would you mind leaving us a quick Google review?`,
  warranty: (f, v, s) => `Hi ${f}, it's ${s}. How is your ${v} holding up? Reply if you'd like a free warranty inspection.`,
  referrals: (f, v, s) => `Hi ${f}, glad you're enjoying your ${v}! Know someone who'd love the same? Send them to ${s} and you'll both get a thank-you.`,
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function FollowUps() {
  const { organization } = useOrg();
  const shop = organization?.name ?? "our shop";
  const { data: jobs = [] } = useShopJobs();
  const [tab, setTab] = useState<Tab>("reviews");
  const [sent, setSent] = useLocalStore<Record<string, string>>("followups-sent", {});
  const now = Date.now();
  const done = jobs.filter((j) => isDone(j.status));
  const at = (j: (typeof jobs)[number]) => new Date(j.scheduled_end ?? j.updated_at).getTime();

  const list = useMemo(() => {
    if (tab === "reviews") return done.filter((j) => now - at(j) < 14 * DAY_MS);
    if (tab === "warranty") return done.filter((j) => now - at(j) > 180 * DAY_MS && now - at(j) < 400 * DAY_MS);
    if (tab === "referrals") return done.filter((j) => Number(j.price ?? 0) >= 1500);
    return [];
  }, [tab, done, now]);

  const seasonal = useMemo(() => {
    const m = MONTHS.map(() => ({ total: 0, services: {} as Record<string, number> }));
    for (const j of jobs) {
      if (!j.scheduled_start) continue;
      const row = m[new Date(j.scheduled_start).getMonth()]!;
      const p = Number(j.price ?? 0);
      row.total += p;
      const s = j.service_type ?? "other";
      row.services[s] = (row.services[s] ?? 0) + p;
    }
    return m;
  }, [jobs]);
  const peak = Math.max(1, ...seasonal.map((s) => s.total));

  return (
    <div className="space-y-5">
      <PageHeader title="Follow-ups" subtitle="Turn finished jobs into reviews, repeat work and referrals." />
      <div className="flex gap-1 overflow-x-auto border-b border-elevated no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.key ? "border-bronze text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{TABS.find((t) => t.key === tab)!.hint}</p>

      {tab === "seasonal" ? (
        <Panel className="p-4">
          <div className="space-y-2">
            {seasonal.map((s, i) => {
              const top = Object.entries(s.services).sort((a, b) => b[1] - a[1])[0];
              return (
                <div key={i} className="grid grid-cols-[40px_1fr_90px] items-center gap-3 text-sm sm:grid-cols-[40px_1fr_90px_160px]">
                  <span className="text-muted-foreground">{MONTHS[i]}</span>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div className="h-2 rounded-full bg-bronze" style={{ width: `${(s.total / peak) * 100}%` }} />
                  </div>
                  <span className="text-right tabular-nums">{money(s.total)}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{top ? top[0].replace(/_/g, " ") : "—"}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel className="divide-y divide-elevated/60">
          {list.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nobody is due right now.</p>}
          {list.slice(0, 100).map((j) => {
            const key = `${tab}:${j.id}`;
            const first = (j.customers?.name ?? "there").split(" ")[0]!;
            const body = COPY[tab](first, vehicleLabel(j.vehicles), shop);
            return (
              <div key={j.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{j.customers?.name ?? "Customer"} · {vehicleLabel(j.vehicles)}</p>
                  <p className="truncate text-xs text-muted-foreground">{j.title} · {money(Number(j.price ?? 0))}</p>
                </div>
                {sent[key] ? (
                  <Tag tone="revenue">Sent {new Date(sent[key]).toLocaleDateString()}</Tag>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSent({ ...sent, [key]: new Date().toISOString() });
                      toast.success(`Text queued to ${first}`, { description: body });
                    }}
                  >
                    Send text
                  </Button>
                )}
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}
