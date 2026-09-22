import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Car, Clock3, ExternalLink, Mail, Phone, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealComms } from "@/components/deal-comms";
import { InboxQuoteBuilder } from "@/components/inbox-quote-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clockTime, eventLabel, leadSignal, sinceLabel, stageLabel, TEMP_META, type LeadEvent } from "@/lib/pipeline";

type InboxDeal = {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  estimate_id: string | null;
  title: string;
  stage: string;
  value: number | string;
  service_tags: string[];
  created_at: string;
  speed_to_lead_at: string | null;
  last_activity_at: string | null;
  customers: { id: string; name: string; phone: string | null; email: string | null; company: string | null; notes: string | null; created_at: string } | null;
  vehicles: { id: string; year: number | null; make: string | null; model: string | null; color: string | null; plate: string | null } | null;
};

type InboxMessage = { id: string; deal_id: string; body: string; direction: string; channel: string; sent_at: string };

export function SalesInbox({ onOpenRecord }: { onOpenRecord: (dealId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: deals = [] } = useQuery({
    queryKey: ["sales-inbox-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id,customer_id,vehicle_id,estimate_id,title,stage,value,service_tags,created_at,speed_to_lead_at,last_activity_at,customers(id,name,phone,email,company,notes,created_at),vehicles(id,year,make,model,color,plate)").order("last_activity_at", { ascending: false, nullsFirst: false });
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
      const signal = leadSignal(deal, dealEvents);
      const latestAt = latestMessage?.sent_at ?? dealEvents[0]?.created_at ?? deal.last_activity_at ?? deal.created_at;
      return { deal, signal, latestAt, preview: latestMessage?.body ?? dealEvents[0]?.detail ?? deal.title };
    }).filter(({ deal, preview }) => !query || [deal.customers?.name, deal.customers?.phone, deal.customers?.email, deal.title, preview].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [deals, events, messages, search]);

  const selected = rows.find((row) => row.deal.id === selectedId) ?? rows[0] ?? null;
  const deal = selected?.deal ?? null;
  const history = deal ? [...events.filter((event) => event.deal_id === deal.id), ...messages.filter((message) => message.deal_id === deal.id).map((message) => ({ id: message.id, deal_id: message.deal_id, actor: message.direction === "in" ? "customer" : "shop", kind: message.channel, detail: message.body, created_at: message.sent_at }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
  const vehicle = deal?.vehicles ? [deal.vehicles.year, deal.vehicles.make, deal.vehicles.model].filter(Boolean).join(" ") : "No vehicle on file";

  return (
    <div className="grid min-h-[720px] overflow-hidden rounded-xl border border-elevated bg-surface xl:h-[calc(100vh-12rem)] xl:grid-cols-[272px_minmax(300px,1fr)_360px]">
      <aside className="flex min-h-0 flex-col border-b border-elevated bg-background/25 xl:border-b-0 xl:border-r">
        <div className="space-y-3 border-b border-elevated p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Conversations</h2><span className="text-xs text-muted-foreground">{rows.length}</span></div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all messages" className="pl-9" /></div>
        </div>

        <div className="max-h-[340px] min-h-[220px] flex-1 overflow-y-auto border-b border-elevated xl:max-h-[45%]">
          {rows.length ? rows.map((row) => (
            <button
              key={row.deal.id}
              type="button"
              onClick={() => setSelectedId(row.deal.id)}
              className={cn("flex w-full items-start gap-2 border-b border-elevated/60 px-4 py-3 text-left transition-colors hover:bg-surface-2", row.deal.id === deal?.id && "bg-surface-2")}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TEMP_META[row.signal.temperature].dot)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{row.deal.customers?.name ?? "No customer"}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{sinceLabel(row.latestAt)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.preview}</span>
              </span>
            </button>
          )) : <p className="p-4 text-xs text-muted-foreground">No conversations match that search.</p>}
        </div>


        {deal ? <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="space-y-3 border-b border-elevated p-4">
            <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-bronze/10 text-sm font-semibold text-bronze">{(deal.customers?.name ?? "?").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="min-w-0"><h3 className="truncate text-base font-semibold">{deal.customers?.name}</h3><p className="text-xs text-muted-foreground">Customer since {shortDate(deal.customers?.created_at)}</p></div></div>
            <div className="space-y-1.5 text-xs text-muted-foreground">{deal.customers?.phone && <p className="flex items-center gap-2"><Phone className="size-3.5" />{deal.customers.phone}</p>}{deal.customers?.email && <p className="flex items-center gap-2"><Mail className="size-3.5" />{deal.customers.email}</p>}</div>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => onOpenRecord(deal.id)}><UserRound className="mr-1.5 size-3.5" />Full customer record</Button>
          </section>
          <section className="space-y-3 border-b border-elevated p-4">
            <Context icon={Car} label="Vehicle" value={vehicle} detail={[deal.vehicles?.color, deal.vehicles?.plate].filter(Boolean).join(" · ")} />
            <Context label="Opportunity" value={deal.title} detail={`${stageLabel(deal.stage)} · ${money(deal.value)}`} />
            <div><p className="micro-label mb-2">Tags</p><div className="flex flex-wrap gap-1.5">{deal.service_tags.length ? deal.service_tags.map((tag) => <span key={tag} className="rounded-full border border-elevated bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>) : <span className="text-xs text-muted-foreground">No tags</span>}</div></div>
            {deal.customers?.notes && <div><p className="micro-label mb-1">Notes</p><p className="text-xs leading-5 text-muted-foreground">{deal.customers.notes}</p></div>}
          </section>
          <section className="p-4"><div className="mb-3 flex items-center justify-between"><p className="micro-label">History</p><Button asChild size="sm" variant="ghost" className="h-7 px-2"><Link to="/sales/$dealId" params={{ dealId: deal.id }}>Full deal <ExternalLink className="ml-1 size-3" /></Link></Button></div>{history.length ? <ol className="space-y-0">{history.slice(0, 14).map((item, index) => <li key={`${item.kind}-${item.id}`} className="relative grid grid-cols-[10px_1fr] gap-2 pb-4 last:pb-0"><span className={cn("mt-1.5 size-2 rounded-full", item.actor === "customer" ? "bg-bronze" : "bg-muted-foreground/50")} />{index < Math.min(history.length, 14) - 1 && <span className="absolute bottom-0 left-[3px] top-3 w-px bg-elevated" />}<div className="min-w-0"><p className="line-clamp-2 text-xs leading-5">{"body" in item ? item.detail : eventLabel(item)}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{clockTime(item.created_at)}</p></div></li>)}</ol> : <p className="text-xs text-muted-foreground">No history yet.</p>}</section>
        </div> : <p className="p-5 text-sm text-muted-foreground">No conversations found.</p>}
      </aside>

      <section className="flex min-h-[620px] min-w-0 flex-col border-b border-elevated xl:min-h-0 xl:border-b-0 xl:border-r">
        {deal ? <><header className="flex items-center justify-between gap-3 border-b border-elevated px-5 py-3"><div className="min-w-0"><h2 className="text-sm font-semibold">Conversation</h2><p className="truncate text-xs text-muted-foreground">Text and email with {deal.customers?.name}</p></div><ConversationSummaryButton customer={deal.customers?.name ?? "Customer"} vehicle={vehicle} opportunity={deal.title} stage={stageLabel(deal.stage)} value={money(deal.value)} turns={summaryTurns} /></header><DealComms dealId={deal.id} customerId={deal.customer_id} customerName={deal.customers?.name ?? null} variant="inbox" channels={["sms", "email"]} /></> : <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a customer.</div>}
      </section>

      <aside className="min-h-[680px] bg-background/15 xl:min-h-0">{deal ? <InboxQuoteBuilder key={deal.id} deal={deal} /> : null}</aside>
    </div>
  );
}

function Context({ icon: Icon, label, value, detail }: { icon?: typeof Car; label: string; value: string; detail?: string }) {
  return <div className="flex gap-2">{Icon && <Icon className="mt-0.5 size-4 shrink-0 text-bronze" />}<div className="min-w-0"><p className="micro-label">{label}</p><p className="mt-1 text-sm font-medium">{value}</p>{detail && <p className="text-xs text-muted-foreground">{detail}</p>}</div></div>;
}