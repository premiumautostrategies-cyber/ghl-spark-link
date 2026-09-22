import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { money } from "@/lib/format";
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

type Service = {
  id: string;
  name: string;
  base_price: number | string;
  category_id: string | null;
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
  const { orgId, locId, user } = useOrg();
  const [service, setService] = useState<Service | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const { data: estimate } = useQuery({
    queryKey: ["inbox-estimate", deal.id, deal.estimate_id],
    queryFn: async () => {
      if (!deal.estimate_id) return null;
      const { data, error } = await supabase
        .from("estimates")
        .select("id,status,tax_rate,estimate_items(id,description,quantity,unit_price,position)")
        .eq("id", deal.estimate_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,base_price,category_id")
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inbox-estimate", deal.id] });
    qc.invalidateQueries({ queryKey: ["sales-inbox-deals"] });
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
    mutationFn: async ({ description, unitPrice }: { description: string; unitPrice: number }) => {
      const estimateId = await ensureEstimate();
      const { error } = await supabase.from("estimate_items").insert({
        estimate_id: estimateId,
        owner_id: user?.id,
        organization_id: orgId,
        description,
        quantity: 1,
        unit_price: unitPrice,
        position: items.length,
      });
      if (error) throw error;
      await supabase.from("deals").update({ value: subtotal + unitPrice, last_activity_at: new Date().toISOString() }).eq("id", deal.id);
    },
    onSuccess: () => {
      setService(null);
      setSelectedOptions([]);
      invalidate();
      toast.success("Added to quote");
    },
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
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Add at least one service first");
      const estimateId = await ensureEstimate();
      const { error } = await supabase.from("estimates").update({ status: "sent" }).eq("id", estimateId);
      if (error) throw error;
      await supabase.from("deals").update({ stage: "quoted", value: total, last_activity_at: new Date().toISOString() }).eq("id", deal.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Quote marked sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const estimateId = await ensureEstimate();
      await supabase.from("estimates").update({ status: "approved" }).eq("id", estimateId);
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
  const configuredPrice = Number(service?.base_price ?? 0) + serviceOptions.filter((option) => selectedOptions.includes(option.id)).reduce((sum, option) => sum + Number(option.price_delta), 0);
  const configuredName = service
    ? [service.name, serviceOptions.filter((option) => selectedOptions.includes(option.id)).map((option) => option.name).join(", ")].filter(Boolean).join(" — ")
    : "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-elevated px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold">Quote builder</h2><p className="text-xs text-muted-foreground">{estimate?.status ?? "Draft"}</p></div>
          <span className="text-lg font-semibold tabular-nums text-bronze">{money(total)}</span>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-elevated p-4">
          <p className="micro-label mb-2">Add a service</p>
          <div className="divide-y divide-elevated overflow-hidden rounded-lg border border-elevated">
            {services.map((item) => (
              <Button key={item.id} variant="ghost" className="h-auto w-full justify-between rounded-none px-3 py-2.5 text-left" onClick={() => {
                const available = options.filter((option) => option.service_id === item.id);
                if (available.length) setService(item);
                else addLine.mutate({ description: item.name, unitPrice: Number(item.base_price) });
              }}>
                <span className="min-w-0 truncate text-xs font-medium">{item.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-bronze">{money(item.base_price)} <ChevronRight className="size-3" /></span>
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2 p-4">
          <p className="micro-label">Current quote</p>
          {items.length === 0 ? <p className="rounded-lg border border-dashed border-elevated p-4 text-center text-xs text-muted-foreground">No services added.</p> : items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 border-b border-elevated py-2.5 last:border-0">
              <div className="min-w-0 flex-1"><p className="text-xs font-medium leading-5">{item.description}</p><p className="text-[11px] text-muted-foreground">{Number(item.quantity)} × {money(item.unit_price)}</p></div>
              <span className="text-xs font-semibold tabular-nums">{money(Number(item.quantity) * Number(item.unit_price))}</span>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => removeLine.mutate(item.id)} aria-label="Remove quote line"><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
          <div className="space-y-2 border-t border-elevated pt-3 text-xs">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3"><Label htmlFor="inbox-tax" className="text-xs text-muted-foreground">Tax</Label><div className="flex items-center gap-1"><Input id="inbox-tax" className="h-8 w-16 text-right" type="number" step="0.1" defaultValue={taxRate} onBlur={(event) => updateTax.mutate(Number(event.target.value || 0))} /><span>%</span></div></div>
            <div className="flex items-center justify-between border-t border-elevated pt-2 text-sm font-semibold"><span>Total</span><span className="tabular-nums text-bronze">{money(total)}</span></div>
          </div>
        </section>
      </div>
      <footer className="grid gap-2 border-t border-elevated p-4">
        <Button onClick={() => sendQuote.mutate()} disabled={sendQuote.isPending || items.length === 0}><Send className="mr-1.5 size-4" />Send quote</Button>
        <Button variant="secondary" onClick={() => approve.mutate()} disabled={approve.isPending || items.length === 0}><Check className="mr-1.5 size-4" />Mark approved</Button>
      </footer>

      <Dialog open={Boolean(service)} onOpenChange={(open) => !open && setService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{service?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {Array.from(new Set(serviceOptions.map((option) => option.kind))).map((kind) => (
              <div key={kind}><p className="micro-label mb-2">{kind}</p><div className="grid gap-2">{serviceOptions.filter((option) => option.kind === kind).map((option) => {
                const selected = selectedOptions.includes(option.id);
                return <Button key={option.id} type="button" variant="outline" className={cn("h-auto justify-between py-2.5", selected && "border-bronze bg-bronze/10")} onClick={() => setSelectedOptions((current) => selected ? current.filter((id) => id !== option.id) : [...current, option.id])}><span>{option.name}</span><span className="text-xs tabular-nums">{Number(option.price_delta) >= 0 ? "+" : ""}{money(option.price_delta)}</span></Button>;
              })}</div></div>
            ))}
            <div className="flex items-center justify-between border-t border-elevated pt-4"><span className="text-lg font-semibold text-bronze">{money(configuredPrice)}</span><Button onClick={() => addLine.mutate({ description: configuredName, unitPrice: configuredPrice })} disabled={addLine.isPending}><Plus className="mr-1.5 size-4" />Add to quote</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}