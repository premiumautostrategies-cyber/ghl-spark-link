import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
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
import { INVENTORY_CATEGORIES, label, money } from "@/lib/format";
import { toast } from "sonner";
import { FilmRolls } from "@/components/film-rolls";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Systemize" },
      { name: "description", content: "Film, coatings and consumables with reorder alerts." },
      { property: "og:title", content: "Inventory — Systemize" },
      {
        property: "og:description",
        content: "Film, coatings and consumables with reorder alerts.",
      },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("inventory_items").insert({
        name: String(form.get("name")),
        sku: String(form.get("sku") || "") || null,
        brand: String(form.get("brand") || "") || null,
        category: String(form.get("category")),
        unit: String(form.get("unit") || "roll"),
        quantity_on_hand: Number(form.get("quantity_on_hand") || 0),
        reorder_point: Number(form.get("reorder_point") || 0),
        unit_cost: Number(form.get("unit_cost") || 0),
        supplier: String(form.get("supplier") || "") || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjust = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: Math.max(0, qty) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const low = items.filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_point));
  const value = items.reduce((t, i) => t + Number(i.quantity_on_hand) * Number(i.unit_cost), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Film, coatings, chemicals and tools — with reorder alerts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New item</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New inventory item</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Item</Label>
                  <Input id="name" name="name" placeholder='XPEL Ultimate Plus 60"' required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" name="brand" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select name="category" defaultValue="film">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVENTORY_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {label(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" name="unit" defaultValue="roll" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_on_hand">On hand</Label>
                    <Input id="quantity_on_hand" name="quantity_on_hand" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_point">Reorder at</Label>
                    <Input id="reorder_point" name="reorder_point" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit cost</Label>
                    <Input id="unit_cost" name="unit_cost" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input id="supplier" name="supplier" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addItem.isPending}>
                  Save item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Items tracked" value={String(items.length)} />
        <StatCard label="Stock value" value={money(value)} />
        <StatCard label="Below reorder point" value={String(low.length)} hint="Order these now" />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing in stock yet"
          body="Add materials you buy by the roll, bottle or box to track burn rate."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">On hand</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i) => {
                const isLow = Number(i.quantity_on_hand) <= Number(i.reorder_point);
                return (
                  <tr key={i.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[i.brand, i.sku].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3">{label(i.category)}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium">
                        {Number(i.quantity_on_hand)} {i.unit}
                      </span>
                      {isLow && (
                        <Badge variant="destructive" className="ml-2">
                          Reorder
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {money(Number(i.quantity_on_hand) * Number(i.unit_cost))}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{i.supplier || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            adjust.mutate({ id: i.id, qty: Number(i.quantity_on_hand) - 1 })
                          }
                        >
                          −
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            adjust.mutate({ id: i.id, qty: Number(i.quantity_on_hand) + 1 })
                          }
                        >
                          +
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <FilmRolls />
    </div>
  );
}
