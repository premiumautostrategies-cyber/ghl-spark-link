import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dayDate, money, STATUS_LABELS } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/estimates")({
  head: () => ({
    meta: [
      { title: "Estimates — Systemize" },
      { name: "description", content: "Line-item estimates for wrap, tint and PPF work." },
      { property: "og:title", content: "Estimates — Systemize" },
      { property: "og:description", content: "Line-item estimates for wrap, tint and PPF work." },
    ],
  }),
  component: EstimatesPage,
});

const ESTIMATE_STATUSES = ["draft", "sent", "approved", "declined"] as const;

function EstimatesPage() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { organization, location } = useRouteContext({ from: "/_authenticated" });
  const orgId = organization?.id;
  const locId = location?.id ?? null;

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*, customers(name), vehicles(year,make,model), estimate_items(*), deals(owner_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createEstimate = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const customerId = String(form.get("customer_id") || "");
      const { data, error } = await supabase
        .from("estimates")
        .insert({
          title: String(form.get("title")),
          customer_id: customerId || null,
          tax_rate: Number(form.get("tax_rate") || 0),
          organization_id: orgId,
          location_id: locId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setOpenNew(false);
      setActiveId(id);
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ estimateId, form }: { estimateId: string; form: FormData }) => {
      const { error } = await supabase.from("estimate_items").insert({
        estimate_id: estimateId,
        description: String(form.get("description")),
        quantity: Number(form.get("quantity") || 1),
        unit_price: Number(form.get("unit_price") || 0),
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estimate_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("estimates").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });

  const active = estimates.find((e) => e.id === activeId) ?? null;

  const total = (est: (typeof estimates)[number]) => {
    const sub = est.estimate_items.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
      0,
    );
    return sub * (1 + Number(est.tax_rate) / 100);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estimates"
        subtitle="Build a quote, send it, track approval."
        action={<Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>New estimate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New estimate</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createEstimate.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue="Full vehicle wrap" required />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select name="customer_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax rate (%)</Label>
                <Input id="tax_rate" name="tax_rate" type="number" step="0.001" defaultValue="0" />
              </div>
              <Button type="submit" className="w-full" disabled={createEstimate.isPending}>
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {estimates.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No estimates yet.</p>
        )}
        {estimates.length > 0 && <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground"><tr>
            <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Vehicle</th><th className="px-4 py-2">Service</th>
            <th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Last activity</th><th className="px-4 py-2">Sales rep</th>
          </tr></thead>
          <tbody className="divide-y divide-border">{estimates.map((est) => {
            const vehicle = est.vehicles;
            return <tr key={est.id} onClick={() => setActiveId(est.id)} className="cursor-pointer hover:bg-secondary/40">
              <td className="px-4 py-3 font-medium">{est.customers?.name ?? "No customer"}</td>
              <td className="px-4 py-3 text-muted-foreground">{vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "—"}</td>
              <td className="px-4 py-3"><p className="font-medium">{est.title}</p><p className="text-xs text-muted-foreground">#{est.number} · {est.estimate_items.length} items</p></td>
              <td className="px-4 py-3 text-right font-semibold">{money(total(est))}</td>
              <td className="px-4 py-3"><Badge variant="secondary">{STATUS_LABELS[est.status] ?? est.status}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">{dayDate(est.updated_at)}</td>
              <td className="px-4 py-3 text-muted-foreground">{est.deals?.[0]?.owner_name ?? "—"}</td>
            </tr>;
          })}</tbody>
        </table>}
      </div>

      <Dialog open={active !== null} onOpenChange={(v) => !v && setActiveId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>
                  #{active.number} · {active.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-3">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={active.status}
                  onValueChange={(status) => setStatus.mutate({ id: active.id, status })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTIMATE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {active.estimate_items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No line items yet.</p>
                )}
                {active.estimate_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="flex-1">{item.description}</span>
                    <span className="text-muted-foreground">
                      {Number(item.quantity)} × {money(item.unit_price)}
                    </span>
                    <span className="w-24 text-right font-medium">
                      {money(Number(item.quantity) * Number(item.unit_price))}
                    </span>
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove line item"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form
                className="grid gap-3 sm:grid-cols-[1fr_80px_110px_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  addItem.mutate({ estimateId: active.id, form });
                  e.currentTarget.reset();
                }}
              >
                <Input name="description" placeholder="Gloss wrap — full body" required />
                <Input name="quantity" type="number" step="0.5" defaultValue="1" />
                <Input name="unit_price" type="number" step="0.01" placeholder="Price" />
                <Button type="submit">Add</Button>
              </form>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">
                  Tax {Number(active.tax_rate)}%
                </span>
                <span className="text-2xl font-bold">{money(total(active))}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
