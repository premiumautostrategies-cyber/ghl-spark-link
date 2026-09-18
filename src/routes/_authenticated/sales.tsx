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
import { DEAL_STAGES, dayDate, label, money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales Pipeline — Systemize" },
      { name: "description", content: "Every restyling opportunity from first call to closed won." },
      { property: "og:title", content: "Sales Pipeline — Systemize" },
      {
        property: "og:description",
        content: "Every restyling opportunity from first call to closed won.",
      },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name)")
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

  const addDeal = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const customerId = String(form.get("customer_id") || "");
      const close = String(form.get("expected_close") || "");
      const { error } = await supabase.from("deals").insert({
        title: String(form.get("title")),
        stage: String(form.get("stage")),
        value: Number(form.get("value") || 0),
        probability: Number(form.get("probability") || 25),
        source: String(form.get("source") || "") || null,
        owner_name: String(form.get("owner_name") || "") || null,
        notes: String(form.get("notes") || "") || null,
        expected_close: close || null,
        customer_id: customerId || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opportunity added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const openValue = openDeals.reduce((t, d) => t + Number(d.value), 0);
  const weighted = openDeals.reduce((t, d) => t + (Number(d.value) * d.probability) / 100, 0);
  const won = deals.filter((d) => d.stage === "won");
  const closeRate = deals.length
    ? Math.round((won.length / deals.filter((d) => ["won", "lost"].includes(d.stage)).length || 1) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Leads, quotes and negotiations — the money before it hits a bay."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New opportunity</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New opportunity</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDeal.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="Full body PPF — GT3" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select name="customer_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
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
                    <Label>Stage</Label>
                    <Select name="stage" defaultValue="new_lead">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input id="value" name="value" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability %</Label>
                    <Input id="probability" name="probability" type="number" defaultValue="25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input id="source" name="source" placeholder="Instagram" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_close">Expected close</Label>
                    <Input id="expected_close" name="expected_close" type="date" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="owner_name">Owner</Label>
                    <Input id="owner_name" name="owner_name" placeholder="Advisor name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full" disabled={addDeal.isPending}>
                  Save opportunity
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open pipeline" value={money(openValue)} />
        <StatCard label="Weighted forecast" value={money(weighted)} />
        <StatCard label="Won this period" value={money(won.reduce((t, d) => t + Number(d.value), 0))} />
        <StatCard label="Close rate" value={`${closeRate}%`} />
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          body="Every call, DM and walk-in becomes an opportunity you can forecast."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEAL_STAGES.map((stage) => {
            const list = deals.filter((d) => d.stage === stage);
            const total = list.reduce((t, d) => t + Number(d.value), 0);
            return (
              <div key={stage} className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
                    {label(stage)}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {list.length} · {money(total)}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {list.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                  {list.map((d) => (
                    <div key={d.id} className="space-y-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{d.title}</p>
                        <span className="whitespace-nowrap font-semibold">{money(d.value)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.customers?.name ?? "No customer"} · {d.source || "Direct"} ·{" "}
                        {d.probability}% · close {dayDate(d.expected_close)}
                      </p>
                      <Select
                        value={d.stage}
                        onValueChange={(v) => moveStage.mutate({ id: d.id, stage: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEAL_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {label(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
