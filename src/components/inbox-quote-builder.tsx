import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Mail, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { money } from "@/lib/format";
import { OPTION_KIND_LABELS } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type QuoteDeal = {
  id: string;
  title: string;
  customer_id: string | null;
  vehicle_id: string | null;
  estimate_id: string | null;
  stage: string;
};

type Category = { id: string; name: string; accent_color: string | null; sort_order: number };

type Service = {
  id: string;
  name: string;
  base_price: number | string;
  duration_minutes: number;
  category_id: string | null;
  customer_description: string | null;
  mobile_available: boolean | null;
  travel_fee: number | string | null;
};

type Option = {
  id: string;
  service_id: string;
  name: string;
  kind: string;
  price_delta: number | string;
};

export function InboxQuoteBuilder({ deal }: { deal: QuoteDeal }) {
  const qc = useQueryClient();
  const { orgId, locId, user, organization } = useOrg();
  const [service, setService] = useState<Service | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [depositPercent, setDepositPercent] = useState(Number(organization?.deposit_percent ?? 30));

  const { data: estimate } = useQuery({
    queryKey: ["inbox-estimate", deal.id, deal.estimate_id],
    queryFn: async () => {
      if (!deal.estimate_id) return null;
      const { data, error } = await supabase
        .from("estimates")
        .select("id,status,tax_rate,notes,estimate_items(id,description,quantity,unit_price,position)")
        .eq("id", deal.estimate_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories-quote"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id,name,accent_color,sort_order")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,base_price,duration_minutes,category_id,customer_description,mobile_available,travel_fee")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: options = [] } = useQuery({
    queryKey: ["service-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_options")
        .select("id,service_id,name,kind,price_delta")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as Option[];
    },
  });

  const items = useMemo(
    () => [...(estimate?.estimate_items ?? [])].sort((a, b) => a.position - b.position),
    [estimate],
  );
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const taxRate = Number(estimate?.tax_rate ?? 0);
  const total = subtotal * (1 + taxRate / 100);
  const deposit = total * (depositPercent / 100);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((item) => {
      if (category !== "all" && item.category_id !== category) return false;
      if (!query) return true;
      return [item.name, item.customer_description].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [services, category, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inbox-estimate", deal.id] });
    qc.invalidateQueries({ queryKey: ["sales-inbox-deals"] });
    qc.invalidateQueries({ queryKey: ["sales-inbox-messages"] });
    qc.invalidateQueries({ queryKey: ["pipeline-events"] });
    qc.invalidateQueries({ queryKey: ["deal-messages", deal.id] });
    qc.invalidateQueries({ queryKey: ["deal", deal.id] });
  };

  async function ensureEstimate() {
    if (estimate?.id) return estimate.id;
    if (!orgId || !user?.id) throw new Error("No workspace selected");
    const { data, error } = await supabase.from("estimates").insert({
      title: deal.title,
      owner_id: user.id,
      customer_id: deal.customer_id,
      vehicle_id: deal.vehicle_id,
      organization_id: orgId,
      location_id: locId,
      status: "draft",
    }).select("id").single();
    if (error) throw error;
    const { error: dealError } = await supabase.from("deals").update({ estimate_id: data.id }).eq("id", deal.id);
    if (dealError) throw dealError;
    return data.id;
  }

  const addLine = useMutation({
    mutationFn: async ({ description, unitPrice, quantity = 1 }: { description: string; unitPrice: number; quantity?: number }) => {
      const estimateId = await ensureEstimate();
      const { error } = await supabase.from("estimate_items").insert({
        estimate_id: estimateId,
        owner_id: user?.id,
        organization_id: orgId,
        description,
        quantity,
        unit_price: unitPrice,
        position: items.length,
      });
      if (error) throw error;
      await supabase.from("deals").update({ value: subtotal + unitPrice * quantity, last_activity_at: new Date().toISOString() }).eq("id", deal.id);
    },
    onSuccess: () => {
      setService(null);
      setChoices({});
      setExtras([]);
      invalidate();
      toast.success("Added to quote");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { quantity?: number; unit_price?: number } }) => {
      const { error } = await supabase.from("estimate_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estimate_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTax = useMutation({
    mutationFn: async (rate: number) => {
      const estimateId = await ensureEstimate();
      const { error } = await supabase.from("estimates").update({ tax_rate: rate }).eq("id", estimateId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const sendQuote = useMutation({
    mutationFn: async (channel: "sms" | "email") => {
      if (items.length === 0) throw new Error("Add at least one service first");
      const estimateId = await ensureEstimate();
      const { error } = await supabase.from("estimates").update({ status: "sent" }).eq("id", estimateId);
      if (error) throw error;
      const lines = items.map((item) => `• ${item.description} — ${money(Number(item.quantity) * Number(item.unit_price))}`).join("\n");
      const body = `Here is your quote for ${deal.title}:\n${lines}\n\nTotal ${money(total)} (incl. ${taxRate}% tax). Deposit to book: ${money(deposit)}.`;
      await supabase.from("messages").insert({
        organization_id: orgId,
        deal_id: deal.id,
        customer_id: deal.customer_id,
        channel,
        direction: "out",
        body,
      });
      if (orgId) {
        await supabase.from("lead_events").insert({
          organization_id: orgId,
          deal_id: deal.id,
          actor: "shop",
          kind: "quote_sent",
          detail: `Quote sent by ${channel === "sms" ? "text" : "email"} — ${money(total)}`,
        });
      }
      await supabase.from("deals").update({ stage: "quoted", value: total, last_activity_at: new Date().toISOString() }).eq("id", deal.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Quote sent to the customer");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const estimateId = await ensureEstimate();
      await supabase.from("estimates").update({ status: "approved" }).eq("id", estimateId);
      if (orgId) {
        await supabase.from("lead_events").insert({
          organization_id: orgId,
          deal_id: deal.id,
          actor: "customer",
          kind: "quote_approved",
          detail: `Quote approved — ${money(total)}`,
        });
      }
      const { error } = await supabase.from("deals").update({ stage: "won", value: total, last_activity_at: new Date().toISOString() }).eq("id", deal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Quote approved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const serviceOptions = service ? options.filter((option) => option.service_id === service.id) : [];
  const exclusive = serviceOptions.filter((option) => option.kind !== "addon");
  const addons = serviceOptions.filter((option) => option.kind === "addon");
  const groups = Array.from(new Set(exclusive.map((option) => option.kind)));
  const picked = [
    ...groups.map((group) => exclusive.find((option) => option.id === choices[group])).filter(Boolean),
    ...addons.filter((option) => extras.includes(option.id)),
  ] as Option[];
  const configuredPrice = Number(service?.base_price ?? 0) + picked.reduce((sum, option) => sum + Number(option.price_delta), 0);
  const configuredName = service
    ? [service.name, picked.map((option) => option.name).join(", ")].filter(Boolean).join(" — ")
    : "";

  function openService(item: Service) {
    const available = options.filter((option) => option.service_id === item.id);
    setChoices({});
    setExtras([]);
    if (available.length) setService(item);
    else addLine.mutate({ description: item.name, unitPrice: Number(item.base_price) });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-elevated px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold">Quote</h2><p className="text-xs capitalize text-muted-foreground">{estimate?.status ?? "Draft"}</p></div>
          <span className="text-lg font-semibold tabular-nums text-bronze">{money(total)}</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="space-y-2 border-b border-elevated p-4">
          <p className="micro-label">Service catalog</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" className="pl-9" />
          </div>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
            <CatPill label="All" active={category === "all"} onClick={() => setCategory("all")} />
            {categories.map((item) => <CatPill key={item.id} label={item.name} accent={item.accent_color} active={category === item.id} onClick={() => setCategory(item.id)} />)}
          </div>
          <div className="divide-y divide-elevated overflow-hidden rounded-lg border border-elevated">
            {visibleServices.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No services match.</p> : visibleServices.map((item) => {
              const count = options.filter((option) => option.service_id === item.id).length;
              return (
                <Button key={item.id} variant="ghost" className="h-auto w-full justify-between rounded-none px-3 py-2.5 text-left" onClick={() => openService(item)}>
                  <span className="min-w-0"><span className="block truncate text-xs font-medium">{item.name}</span><span className="block text-[11px] text-muted-foreground">{count ? `${count} options` : `${(item.duration_minutes / 60).toFixed(1)} h`}</span></span>
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-bronze">{money(item.base_price)} <ChevronRight className="size-3" /></span>
                </Button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 border-b border-elevated p-4">
          <p className="micro-label">Quote lines</p>
          {items.length === 0 ? <p className="rounded-lg border border-dashed border-elevated p-4 text-center text-xs text-muted-foreground">No services added.</p> : items.map((item) => (
            <div key={item.id} className="space-y-1.5 border-b border-elevated py-2.5 last:border-0">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-xs font-medium leading-5">{item.description}</p>
                <span className="text-xs font-semibold tabular-nums">{money(Number(item.quantity) * Number(item.unit_price))}</span>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => removeLine.mutate(item.id)} aria-label="Remove quote line"><Trash2 className="size-3.5" /></Button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Qty</span>
                <Input className="h-7 w-14 text-right" type="number" step="0.5" defaultValue={Number(item.quantity)} onBlur={(event) => Number(event.target.value) !== Number(item.quantity) && updateLine.mutate({ id: item.id, patch: { quantity: Number(event.target.value || 1) } })} aria-label="Quantity" />
                <span>Price</span>
                <Input className="h-7 w-20 text-right" type="number" step="1" defaultValue={Number(item.unit_price)} onBlur={(event) => Number(event.target.value) !== Number(item.unit_price) && updateLine.mutate({ id: item.id, patch: { unit_price: Number(event.target.value || 0) } })} aria-label="Unit price" />
              </div>
            </div>
          ))}

          <form className="flex flex-wrap items-end gap-2 pt-1" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const description = String(form.get("description") || "").trim();
            if (!description) return;
            addLine.mutate({ description, unitPrice: Number(form.get("price") || 0), quantity: Number(form.get("qty") || 1) });
            event.currentTarget.reset();
          }}>
            <Input name="description" placeholder="Custom line" className="h-8 min-w-[110px] flex-1" />
            <Input name="qty" type="number" step="0.5" defaultValue="1" className="h-8 w-14 text-right" aria-label="Custom quantity" />
            <Input name="price" type="number" step="1" placeholder="$" className="h-8 w-20 text-right" aria-label="Custom price" />
            <Button type="submit" size="sm" variant="outline"><Plus className="size-3.5" /></Button>
          </form>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {[5, 10].map((percent) => (
              <Button key={percent} size="sm" variant="outline" className="text-xs" onClick={() => addLine.mutate({ description: `Discount ${percent}%`, unitPrice: -Math.round(subtotal * (percent / 100)) })} disabled={subtotal <= 0}>
                {percent}% discount
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2 p-4 text-xs">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="inbox-tax" className="text-xs text-muted-foreground">Tax</Label>
            <div className="flex items-center gap-1"><Input id="inbox-tax" className="h-8 w-16 text-right" type="number" step="0.1" defaultValue={taxRate} onBlur={(event) => updateTax.mutate(Number(event.target.value || 0))} /><span>%</span></div>
          </div>
          <div className="flex items-center justify-between border-t border-elevated pt-2 text-sm font-semibold"><span>Total</span><span className="tabular-nums text-bronze">{money(total)}</span></div>
          <div className="flex items-center justify-between gap-3 border-t border-elevated pt-2">
            <Label htmlFor="inbox-deposit" className="text-xs text-muted-foreground">Deposit</Label>
            <div className="flex items-center gap-1"><Input id="inbox-deposit" className="h-8 w-16 text-right" type="number" step="5" value={depositPercent} onChange={(event) => setDepositPercent(Number(event.target.value || 0))} /><span>% · {money(deposit)}</span></div>
          </div>
        </section>
      </div>

      <footer className="grid gap-2 border-t border-elevated p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => sendQuote.mutate("sms")} disabled={sendQuote.isPending || items.length === 0}><MessageSquare className="mr-1.5 size-4" />Text</Button>
          <Button variant="secondary" onClick={() => sendQuote.mutate("email")} disabled={sendQuote.isPending || items.length === 0}><Mail className="mr-1.5 size-4" />Email</Button>
        </div>
        <Button variant="outline" onClick={() => approve.mutate()} disabled={approve.isPending || items.length === 0}><Check className="mr-1.5 size-4" />Mark approved &amp; won</Button>
      </footer>

      <Dialog open={Boolean(service)} onOpenChange={(open) => !open && setService(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{service?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {service?.customer_description && <p className="text-sm text-muted-foreground">{service.customer_description}</p>}
            {groups.map((group) => (
              <div key={group}>
                <p className="micro-label mb-2">{OPTION_KIND_LABELS[group] ?? group}</p>
                <div className="grid gap-2">{exclusive.filter((option) => option.kind === group).map((option) => {
                  const selected = choices[group] === option.id;
                  return <Button key={option.id} type="button" variant="outline" className={cn("h-auto justify-between py-2.5", selected && "border-bronze bg-bronze/10")} onClick={() => setChoices((current) => ({ ...current, [group]: selected ? "" : option.id }))}><span>{option.name}</span><span className="text-xs tabular-nums">{Number(option.price_delta) >= 0 ? "+" : ""}{money(option.price_delta)}</span></Button>;
                })}</div>
              </div>
            ))}
            {addons.length > 0 && (
              <div>
                <p className="micro-label mb-2">Add-ons</p>
                <div className="grid gap-2">{addons.map((option) => {
                  const selected = extras.includes(option.id);
                  return <Button key={option.id} type="button" variant="outline" className={cn("h-auto justify-between py-2.5", selected && "border-bronze bg-bronze/10")} onClick={() => setExtras((current) => selected ? current.filter((id) => id !== option.id) : [...current, option.id])}><span>{option.name}</span><span className="text-xs tabular-nums">{Number(option.price_delta) >= 0 ? "+" : ""}{money(option.price_delta)}</span></Button>;
                })}</div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-elevated pt-4"><span className="text-lg font-semibold text-bronze">{money(configuredPrice)}</span><Button onClick={() => addLine.mutate({ description: configuredName, unitPrice: configuredPrice })} disabled={addLine.isPending}><Plus className="mr-1.5 size-4" />Add to quote</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatPill({ label, accent, active, onClick }: { label: string; accent?: string | null; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors", active ? "border-bronze bg-bronze/15 text-bronze" : "border-elevated bg-surface text-muted-foreground hover:text-foreground")}>
      {accent && <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />}
      {label}
    </button>
  );
}
