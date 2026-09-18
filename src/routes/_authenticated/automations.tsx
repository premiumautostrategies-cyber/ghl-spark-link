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
import { AUTOMATION_TRIGGERS, label } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Systemize" },
      { name: "description", content: "Follow-up texts, reminders and aftercare on autopilot." },
      { property: "og:title", content: "Automations — Systemize" },
      {
        property: "og:description",
        content: "Follow-up texts, reminders and aftercare on autopilot.",
      },
    ],
  }),
  component: AutomationsPage,
});

function delayText(minutes: number) {
  if (minutes === 0) return "immediately";
  if (minutes < 60) return `after ${minutes} min`;
  if (minutes < 1440) return `after ${Math.round(minutes / 60)} h`;
  return `after ${Math.round(minutes / 1440)} days`;
}

function AutomationsPage() {
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addRule = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("automations").insert({
        name: String(form.get("name")),
        trigger_event: String(form.get("trigger_event")),
        delay_minutes: Number(form.get("delay_minutes") || 0),
        channel: String(form.get("channel")),
        template: String(form.get("template") || "") || null,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automation created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automations").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        subtitle="Speed-to-lead texts, reminders and aftercare that run without you."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New automation</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New automation</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addRule.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="New lead instant text" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>When</Label>
                    <Select name="trigger_event" defaultValue="lead_created">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTOMATION_TRIGGERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {label(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Send by</Label>
                    <Select name="channel" defaultValue="sms">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="task">Internal task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="delay_minutes">Delay (minutes)</Label>
                    <Input id="delay_minutes" name="delay_minutes" type="number" defaultValue="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Message</Label>
                  <Textarea
                    id="template"
                    name="template"
                    rows={4}
                    placeholder="Hey {{first_name}} — thanks for reaching out about {{service}}."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addRule.isPending}>
                  Save automation
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Automations" value={String(rules.length)} />
        <StatCard label="Live" value={String(rules.filter((r) => r.is_active).length)} />
        <StatCard
          label="Messages sent"
          value={String(rules.reduce((t, r) => t + r.run_count, 0))}
          hint="Since setup"
        />
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title="No automations yet"
          body="Start with a two-minute reply to every new lead — it wins the most jobs."
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    When <span className="text-foreground">{label(r.trigger_event)}</span> ·{" "}
                    {delayText(r.delay_minutes)} · via {label(r.channel)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.is_active ? "secondary" : "outline"}>
                    {r.is_active ? "Live" : "Paused"}
                  </Badge>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })}
                  />
                </div>
              </div>
              {r.template && (
                <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {r.template}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
