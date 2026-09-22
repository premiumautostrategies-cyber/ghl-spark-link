import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { money, label as fmt, dayDate } from "@/lib/format";
import { FILM_VENDORS } from "@/lib/shop";
import { toast } from "sonner";

const MATERIALS = ["ppf", "tint", "wrap", "ceramic", "other"] as const;

export function FilmRolls() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [adding, setAdding] = useState(false);

  const { data: rolls = [] } = useQuery({
    queryKey: ["rolls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_rolls")
        .select("*")
        .is("deleted_at", null)
        .order("roll_code");
      if (error) throw error;
      return data;
    },
  });

  const { data: pos = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rolls"] });
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  };

  const addRoll = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const feet = Number(form.get("feet") || 0);
      const { error } = await supabase.from("inventory_rolls").insert({
        organization_id: orgId,
        location_id: locId,
        roll_code: String(form.get("roll_code") || "").trim(),
        brand: String(form.get("brand") || "") || null,
        product_line: String(form.get("product_line") || "") || null,
        material_type: String(form.get("material_type") || "ppf"),
        width_inches: Number(form.get("width") || 60),
        original_feet: feet,
        remaining_feet: feet,
        lot_number: String(form.get("lot_number") || "") || null,
        batch_id: String(form.get("batch_id") || "") || null,
        cost_per_foot: Number(form.get("cost") || 0),
        vendor: String(form.get("vendor") || "") || null,
        shelf: String(form.get("shelf") || "") || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roll added");
      setAdding(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logUsage = useMutation({
    mutationFn: async ({
      roll,
      feet,
      kind,
    }: {
      roll: { id: string; remaining_feet: number | string; reserved_feet: number | string };
      feet: number;
      kind: "usage" | "waste";
    }) => {
      if (!orgId) throw new Error("No workspace selected");
      const remaining = Math.max(Number(roll.remaining_feet) - feet, 0);
      const reserved = Math.max(Number(roll.reserved_feet) - (kind === "usage" ? feet : 0), 0);
      const { error } = await supabase
        .from("inventory_rolls")
        .update({ remaining_feet: remaining, reserved_feet: reserved })
        .eq("id", roll.id);
      if (error) throw error;
      await supabase.from("roll_transactions").insert({
        organization_id: orgId,
        roll_id: roll.id,
        kind,
        feet,
        note: kind === "waste" ? "Scrap / damaged material" : "Logged from stock",
      });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const draftPo = useMutation({
    mutationFn: async (vendor: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const lowRolls = rolls.filter(
        (r) => (r.vendor ?? "") === vendor && Number(r.remaining_feet) <= Number(r.reorder_point_feet),
      );
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          organization_id: orgId,
          location_id: locId,
          vendor,
          po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
          total: lowRolls.reduce((t, r) => t + 100 * Number(r.cost_per_foot || 4), 0),
        })
        .select("id")
        .single();
      if (error) throw error;
      if (lowRolls.length) {
        await supabase.from("purchase_order_items").insert(
          lowRolls.map((r, i) => ({
            organization_id: orgId,
            purchase_order_id: data.id,
            description: `${r.brand ?? vendor} ${r.product_line ?? fmt(r.material_type)} ${Number(r.width_inches)}"`,
            product_line: r.product_line,
            width_inches: r.width_inches,
            feet: 100,
            unit_cost: r.cost_per_foot,
            sort_order: i,
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Purchase order drafted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receivePo = useMutation({
    mutationFn: async (poId: string) => {
      const po = pos.find((p) => p.id === poId);
      if (!po || !orgId) throw new Error("Order not found");
      for (const item of po.purchase_order_items ?? []) {
        const existing = rolls.find(
          (r) => r.vendor === po.vendor && r.product_line === item.product_line,
        );
        if (existing) {
          await supabase
            .from("inventory_rolls")
            .update({
              remaining_feet: Number(existing.remaining_feet) + Number(item.feet),
              original_feet: Number(existing.original_feet) + Number(item.feet),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("inventory_rolls").insert({
            organization_id: orgId,
            location_id: locId,
            roll_code: `${po.vendor?.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            brand: po.vendor,
            product_line: item.product_line,
            width_inches: item.width_inches,
            original_feet: item.feet,
            remaining_feet: item.feet,
            cost_per_foot: item.unit_cost,
            vendor: po.vendor,
          });
        }
      }
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("id", poId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock received onto the shelf");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lowRolls = rolls.filter((r) => Number(r.remaining_feet) <= Number(r.reorder_point_feet));

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle
          title="Film rolls"
          hint="Linear-foot tracking with lot numbers for warranty claims"
          right={
            <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
              {adding ? "Close" : "Add roll"}
            </Button>
          }
        />
        {adding && (
          <form
            className="grid gap-3 border-t border-elevated p-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              addRoll.mutate(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Roll ID</Label>
              <Input name="roll_code" placeholder="XPL-2291" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor</Label>
              <Select name="vendor" defaultValue={FILM_VENDORS[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILM_VENDORS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select name="material_type" defaultValue="ppf">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => (
                    <SelectItem key={m} value={m}>{fmt(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Product line</Label>
              <Input name="product_line" placeholder="Ultimate Plus 10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Width (in)</Label>
              <Input name="width" type="number" defaultValue="60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Length (ft)</Label>
              <Input name="feet" type="number" defaultValue="100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lot number</Label>
              <Input name="lot_number" placeholder="LOT-44821" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost / ft</Label>
              <Input name="cost" type="number" step="0.01" defaultValue="4.50" />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" disabled={addRoll.isPending}>Save roll</Button>
            </div>
          </form>
        )}
        <div className="divide-y divide-elevated border-t border-elevated">
          {rolls.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No rolls on the shelf yet.
            </p>
          )}
          {rolls.map((r) => {
            const remaining = Number(r.remaining_feet);
            const original = Number(r.original_feet) || 1;
            const low = remaining <= Number(r.reorder_point_feet);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-semibold">
                    {r.roll_code}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {[r.brand, r.product_line].filter(Boolean).join(" ")}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(r.material_type)} · {Number(r.width_inches)}" · lot {r.lot_number ?? "—"} ·{" "}
                    {money(Number(r.cost_per_foot))}/ft
                  </p>
                  <div className="mt-1.5 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-elevated">
                    <div
                      className={cn("h-full", low ? "bg-critical" : "bg-bronze")}
                      style={{ width: `${Math.min((remaining / original) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm tabular-nums", low && "text-critical")}>
                    {remaining} ft left
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(r.reserved_feet)} ft reserved
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const feet = Number(window.prompt("Feet used on the job", "20"));
                      if (feet > 0) logUsage.mutate({ roll: r, feet, kind: "usage" });
                    }}
                  >
                    Log usage
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const feet = Number(window.prompt("Feet scrapped", "4"));
                      if (feet > 0) logUsage.mutate({ roll: r, feet, kind: "waste" });
                    }}
                  >
                    Waste
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Purchase orders"
          hint={lowRolls.length ? `${lowRolls.length} roll(s) below the reorder point` : "Stock levels healthy"}
          right={
            <div className="flex flex-wrap gap-1.5">
              {FILM_VENDORS.slice(0, 4).map((v) => (
                <Button key={v} size="sm" variant="outline" onClick={() => draftPo.mutate(v)}>
                  {v}
                </Button>
              ))}
            </div>
          }
        />
        <div className="divide-y divide-elevated">
          {pos.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">
              No purchase orders yet — tap a vendor to draft one from low stock.
            </p>
          )}
          {pos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">
                  {p.po_number} · {p.vendor}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(p.purchase_order_items ?? []).length} line(s) · {money(p.total)} ·{" "}
                  {p.received_at ? `received ${dayDate(p.received_at)}` : dayDate(p.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone={p.status === "received" ? "revenue" : "urgent"}>{fmt(p.status)}</Tag>
                {p.status !== "received" && (
                  <Button size="sm" variant="outline" onClick={() => receivePo.mutate(p.id)}>
                    Receive
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
