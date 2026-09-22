// Dynamic Activity — a live sales execution workspace. Front-end prototype:
// all rows come from local mock state so actions visibly change priority.

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { crmName, type SalesConfig } from "@/lib/sales-mode";

type StatusKey =
  | "replied"
  | "new"
  | "quote"
  | "followup_due"
  | "cold"
  | "contacted"
  | "responded"
  | "followed_up";

const STATUS: Record<StatusKey, { label: string; dot: string; text: string; rank: number }> = {
  replied: { label: "Customer replied", dot: "bg-critical", text: "text-critical", rank: 0 },
  new: { label: "New lead", dot: "bg-revenue", text: "text-revenue", rank: 1 },
  quote: { label: "Quote activity", dot: "bg-heat", text: "text-heat", rank: 2 },
  followup_due: { label: "Follow-up due", dot: "bg-urgent", text: "text-urgent", rank: 3 },
  cold: { label: "Going cold", dot: "bg-comms", text: "text-comms", rank: 4 },
  contacted: {
    label: "Contacted",
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    rank: 5,
  },
  responded: {
    label: "Responded",
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    rank: 5,
  },
  followed_up: {
    label: "Followed up",
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    rank: 5,
  },
};

type ActionKey = "contact" | "respond" | "followup";

const ACTION_FOR: Partial<Record<StatusKey, ActionKey>> = {
  new: "contact",
  replied: "respond",
  quote: "followup",
  followup_due: "followup",
  cold: "followup",
};

const ACTION_LABEL: Record<ActionKey, string> = {
  contact: "Contact",
  respond: "Respond",
  followup: "Follow Up",
};

type Lead = {
  id: string;
  name: string;
  vehicle: string;
  service: string;
  status: StatusKey;
  note: string;
  minutes: number;
  value: number;
};

const SEED: Lead[] = [
  {
    id: "l1",
    name: "Sarah Thompson",
    vehicle: "2026 Tesla Model Y",
    service: "Ceramic Window Tint",
    status: "new",
    note: "Website inquiry received",
    minutes: 12,
    value: 690,
  },
  {
    id: "l2",
    name: "Chris Miller",
    vehicle: "2025 BMW M4",
    service: "Full Front PPF",
    status: "replied",
    note: "Asked about installation availability",
    minutes: 23,
    value: 2450,
  },
  {
    id: "l3",
    name: "Mike Rodriguez",
    vehicle: "2026 Ford F-150",
    service: "Ceramic Coating",
    status: "quote",
    note: "Quote viewed",
    minutes: 38,
    value: 1875,
  },
  {
    id: "l4",
    name: "Taylor Johnson",
    vehicle: "2025 Audi RS5",
    service: "Full Body PPF",
    status: "followup_due",
    note: "Follow-up scheduled for today",
    minutes: 5 * 60,
    value: 6200,
  },
  {
    id: "l5",
    name: "Amanda King",
    vehicle: "2025 Chevrolet Tahoe",
    service: "Window Tint",
    status: "cold",
    note: "No response after last contact",
    minutes: 2 * 24 * 60,
    value: 540,
  },
  {
    id: "l6",
    name: "Devin Carter",
    vehicle: "2024 Porsche 911",
    service: "Paint Correction + Coating",
    status: "cold",
    note: "Quote sent, no activity in 4 days",
    minutes: 4 * 24 * 60,
    value: 3100,
  },
];

const SEED_FEED = [
  "Mike Rodriguez viewed Ceramic Coating Quote",
  "Sarah Thompson submitted a Window Tint inquiry",
  "Chris Miller replied to your message",
  "Taylor Johnson scheduled PPF installation",
  "Amanda King opened the Window Tint quote",
];

const UPCOMING = [
  { when: "Today · 2:30 PM", what: "Call Taylor Johnson — confirm full body PPF date" },
  { when: "Today · 4:00 PM", what: "Tint consultation — Sarah Thompson" },
  { when: "Tomorrow · 9:00 AM", what: "Ceramic coating drop-off — Mike Rodriguez" },
  { when: "Tomorrow · 1:00 PM", what: "Follow up with Devin Carter" },
];

function ago(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hrs = Math.round(minutes / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export function DynamicActivity({ config }: { config: SalesConfig }) {
  const [leads, setLeads] = useState<Lead[]>(SEED);
  const [feed, setFeed] = useState<Array<{ text: string; minutes: number }>>(
    SEED_FEED.map((text, i) => ({ text, minutes: 12 + i * 26 })),
  );

  const source =
    config.dataSource === "crm" && config.crm
      ? `${crmName(config.crm)} · synced just now`
      : "Systemize sales data";

  const act = (lead: Lead, action: ActionKey) => {
    const next: StatusKey =
      action === "contact" ? "contacted" : action === "respond" ? "responded" : "followed_up";
    const note =
      action === "contact"
        ? "First contact made"
        : action === "respond"
          ? "Replied to customer"
          : "Follow-up sent";
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: next, note, minutes: 0 } : l)),
    );
    setFeed((prev) => [{ text: `You ${note.toLowerCase()} — ${lead.name}`, minutes: 0 }, ...prev]);
  };

  const sorted = useMemo(
    () =>
      [...leads].sort(
        (a, b) => STATUS[a.status].rank - STATUS[b.status].rank || a.minutes - b.minutes,
      ),
    [leads],
  );

  const attention = sorted.filter((l) => ACTION_FOR[l.status]);
  const handled = sorted.filter((l) => !ACTION_FOR[l.status]);
  const cold = sorted.filter((l) => l.status === "cold" || (l.minutes >= 2 * 24 * 60 && ACTION_FOR[l.status]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Activity"
        subtitle={`Who needs your attention right now · ${source}`}
      />

      <section className="rounded-xl border border-elevated bg-surface">
        <SectionHead title="Needs attention" meta={`${attention.length} open`} />
        <div className="divide-y divide-hairline/60">
          {attention.map((l) => (
            <LeadRow key={l.id} lead={l} onAct={act} />
          ))}
          {attention.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing waiting on you. Every lead has been worked.
            </p>
          )}
        </div>
        {handled.length > 0 && (
          <div className="divide-y divide-hairline/60 border-t border-hairline/60">
            <p className="micro-label px-4 pt-3 pb-1">Worked</p>
            {handled.map((l) => (
              <LeadRow key={l.id} lead={l} onAct={act} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-elevated bg-surface lg:col-span-2">
          <SectionHead title="Recent activity" />
          <ul className="divide-y divide-hairline/60">
            {feed.slice(0, 8).map((f, i) => (
              <li key={`${f.text}-${i}`} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 truncate">{f.text}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {ago(f.minutes)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-elevated bg-surface">
            <SectionHead title="Going cold" meta={`${cold.length}`} />
            <ul className="divide-y divide-hairline/60">
              {cold.map((l) => (
                <li key={l.id} className="px-4 py-2.5 text-sm">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.service} · {ago(l.minutes)}
                  </p>
                </li>
              ))}
              {cold.length === 0 && (
                <li className="px-4 py-4 text-sm text-muted-foreground">Nothing cooling off.</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-elevated bg-surface">
            <SectionHead title="Upcoming" />
            <ul className="divide-y divide-hairline/60">
              {UPCOMING.map((u) => (
                <li key={u.what} className="px-4 py-2.5 text-sm">
                  <p className="micro-label">{u.when}</p>
                  <p className="mt-0.5">{u.what}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-elevated px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {meta && <span className="text-xs tabular-nums text-muted-foreground">{meta}</span>}
    </div>
  );
}

function LeadRow({ lead, onAct }: { lead: Lead; onAct: (l: Lead, a: ActionKey) => void }) {
  const meta = STATUS[lead.status];
  const action = ACTION_FOR[lead.status];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium">{lead.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {lead.vehicle} · {lead.service}
        </p>
      </div>
      <div className="min-w-56 flex-1">
        <p className={cn("micro-label", meta.text)}>
          {meta.label} · {ago(lead.minutes)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.note}</p>
      </div>
      <p className="w-20 text-right text-sm tabular-nums">{money(lead.value)}</p>
      <div className="w-28 text-right">
        {action ? (
          <Button size="sm" onClick={() => onAct(lead, action)}>
            {ACTION_LABEL[action]}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Handled</span>
        )}
      </div>
    </div>
  );
}
