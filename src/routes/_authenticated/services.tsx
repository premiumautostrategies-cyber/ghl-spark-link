import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { label, money, SERVICE_TYPES } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "Service Menu — Systemize" },
      { name: "description", content: "Priced service menu for tint, PPF, wrap and coatings." },
      { property: "og:title", content: "Service Menu — Systemize" },
      {
        property: "og:description",
        content: "Priced service menu for tint, PPF, wrap and coatings.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addService = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("services").insert({
        name: String(form.get("name")),
        category: String(form.get("category")),
        description: String(form.get("description") || "") || null,
        base_price: Number(form.get("base_price") || 0),
        duration_minutes: Number(form.get("duration_minutes") || 120),
        unit: String(form.get("unit") || "job"),
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const active = services.filter((s) => s.is_active);
  const avg = active.length
    ? active.reduce((t, s) => t + Number(s.base_price), 0) / active.length
    : 0;
  const grouped = services.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Menu"
        subtitle="Every service you sell, priced and timed for scheduling."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New service</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New service</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addService.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Full front PPF" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select name="category" defaultValue="ppf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Sold by</Label>
                    <Input id="unit" name="unit" defaultValue="job" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Base price</Label>
                    <Input id="base_price" name="base_price" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_minutes">Bay time (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      defaultValue="120"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" />
                </div>
                <Button type="submit" className="w-full" disabled={addService.isPending}>
                  Save service
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active services" value={String(active.length)} />
        <StatCard label="Average ticket" value={money(avg)} />
        <StatCard label="Categories" value={String(Object.keys(grouped).length)} />
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          body="Add your menu, or load the demo shop from Settings to see a full example."
        />
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
                {label(cat)}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {list.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.description || "No description"} · {Math.round(s.duration_minutes / 60)}h
                      bay time · per {s.unit}
                    </p>
                  </div>
                  <span className="font-semibold">{money(s.base_price)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.is_active ? "secondary" : "outline"}>
                      {s.is_active ? "Active" : "Hidden"}
                    </Badge>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
