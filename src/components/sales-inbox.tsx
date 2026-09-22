import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Car, ExternalLink, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealComms } from "@/components/deal-comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { leadSignal, sinceLabel, stageLabel, TEMP_META, type LeadEvent } from "@/lib/pipeline";

type InboxDeal = {
  id: string;
  customer_id: string | null;
  title: string;
  stage: string;
  value: number | string;
  created_at: string;
  speed_to_lead_at: string | null;
  last_activity_at: string | null;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
  vehicles: { id: string; year: number | null; make: string | null; model: string | null } | null;
};

type InboxMessage = { id: string; deal_id: string; body: string; direction: string; channel: string; sent_at: string };

export function SalesInbox({ onOpenRecord }: { onOpenRecord: (dealId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: deals = [] } = useQuery({
    queryKey: ["sales-inbox-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id,customer_id,title,stage,value,created_at,speed_to_lead_at,last_activity_at,customers(id,name,phone,email),vehicles(id,year,make,model)").not("stage", "in", "(won,lost)").order("last_activity_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as unknown as InboxDeal[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["sales-inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id,deal_id,body,direction,channel,sent_at").order("sent_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as InboxMessage[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["pipeline-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_events").select("id,deal_id,actor,kind,detail,created_at").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as LeadEvent[];
    },
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deals.map((deal) => {
      const thread = messages.filter((message) => message.deal_id === deal.id);
      const dealEvents = events.filter((event) => event.deal_id === deal.id);
      const latestMessage = thread[0] ?? null;
      const latestEvent = dealEvents[0] ?? null;
      const signal = leadSignal(deal, dealEvents);
      const latestAt = latestMessage?.sent_at ?? latestEvent?.created_at ?? deal.last_activity_at ?? deal.created_at;
      const preview = latestMessage?.body ?? latestEvent?.detail ?? signal.focusReason ?? deal.title;
      return { deal, latestAt, preview, signal, unread: latestMessage?.direction === "in" || signal.awaitingReply };
    }).filter(({ deal, preview }) => !query || [deal.customers?.name, deal.title, preview, deal.vehicles ? `${deal.vehicles.year ?? ""} ${deal.vehicles.make ?? ""} ${deal.vehicles.model ?? ""}` : ""].filter(Boolean).join(" ").toLowerCase().includes(query)).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }, [deals, events, messages, search]);

  const selected = rows.find((row) => row.deal.id === selectedId) ?? rows[0] ?? null;
  const deal = selected?.deal ?? null;
  const vehicle = deal?.vehicles ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model].filter(Boolean).join(" ") : "No vehicle on file";

  const { data: proposal } = useQuery({
    queryKey: ["sales-inbox-proposal", deal?.id],
    enabled: Boolean(deal?.id),
    queryFn: async () => {
      if (!deal?.id) return null;
      const { data, error } = await supabase.from("proposals").select("id,token").eq("deal_id", deal.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid min-h-[680px] overflow-hidden rounded-xl border border-elevated bg-surface xl:h-[calc(100vh-12rem)] xl:grid-cols-[296px_minmax(420px,1fr)_260px]">
      <aside className="flex min-h-0 flex-col border-b border-elevated bg-background/30 xl:border-b-0 xl:border-r">
        <div className="space-y-3 border-b border-elevated p-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Inbox</h2><span className="text-xs tabular-nums text-muted-foreground">{rows.length} open</span></div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="pl-9" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((row) => {
            const active = row.deal.id === deal?.id;
            return <button key={row.deal.id} type="button" onClick={() => setSelectedId(row.deal.id)} className={cn("relative block w-full border-b border-elevated px-4 py-3 text-left transition-colors hover:bg-surface-2", active && "bg-surface-2", row.unread && "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-bronze")}>
              <div className="flex items-start gap-2"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TEMP_META[row.signal.temperature].dot)} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className={cn("truncate text-sm", row.unread ? "font-semibold" : "font-medium")}>{row.deal.customers?.name ?? "No customer"}</p><span className="shrink-0 text-[11px] text-muted-foreground">{sinceLabel(row.latestAt)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{row.preview}</p><p className="mt-1 truncate text-[11px] text-muted-foreground/70">{row.deal.title}</p></div></div>
            </button>;
          })}
          {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No matching conversations.</p>}
        </div>
      </aside>

      <section className="flex min-h-[620px] min-w-0 flex-col border-b border-elevated xl:min-h-0 xl:border-b-0">
        {deal ? <><header className="flex min-h-16 items-center justify-between gap-3 border-b border-elevated px-5 py-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{deal.customers?.name ?? "No customer"}</h3><p className="truncate text-xs text-muted-foreground">{vehicle} · {deal.title}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="secondary" asChild><Link to="/calendar"><CalendarClock className="mr-1.5 size-3.5" />Schedule</Link></Button>{proposal && <Button size="sm" asChild><a href={`/p/proposal/${proposal.token}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-3.5" />Quote</a></Button>}</div></header><DealComms dealId={deal.id} customerId={deal.customer_id} customerName={deal.customers?.name} variant="inbox" /></> : <div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">Select a conversation.</div>}
      </section>

      <aside className="min-h-0 overflow-y-auto bg-background/20">
        {deal && <><div className="border-b border-elevated p-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-bronze/10 text-sm font-semibold text-bronze">{(deal.customers?.name ?? "?").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><h3 className="text-base font-semibold">{deal.customers?.name ?? "No customer"}</h3><p className="mt-1 text-xs text-muted-foreground">{deal.customers?.phone ?? "No phone"}</p><p className="text-xs text-muted-foreground">{deal.customers?.email ?? "No email"}</p></div><div className="space-y-4 border-b border-elevated p-5"><Context label="Vehicle" value={vehicle} /><Context label="Service" value={deal.title} /><Context label="Opportunity" value={money(deal.value)} /><Context label="Stage" value={stageLabel(deal.stage)} /></div><div className="grid grid-cols-2 gap-2 p-5">{proposal && <Button size="sm" variant="secondary" asChild><a href={`/p/proposal/${proposal.token}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-3.5" />Quote</a></Button>}<Button size="sm" variant="secondary" asChild><Link to="/calendar"><CalendarClock className="mr-1.5 size-3.5" />Appointment</Link></Button><Button size="sm" variant="secondary" onClick={() => onOpenRecord(deal.id)}><UserRound className="mr-1.5 size-3.5" />Customer</Button><Button size="sm" variant="secondary" onClick={() => onOpenRecord(deal.id)}><Car className="mr-1.5 size-3.5" />Vehicle</Button></div></>}
      </aside>
    </div>
  );
}

function Context({ label, value }: { label: string; value: string }) {
  return <div><p className="micro-label">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}