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
import { label, money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — Systemize" },
      { name: "description", content: "Installers, advisors, pay structure and workload." },
      { property: "og:title", content: "Team — Systemize" },
      { property: "og:description", content: "Installers, advisors, pay structure and workload." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("installer,status,price");
      if (error) throw error;
      return data;
    },
  });

  const addMember = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("team_members").insert({
        full_name: String(form.get("full_name")),
        email: String(form.get("email") || "") || null,
        phone: String(form.get("phone") || "") || null,
        title: String(form.get("title") || "Installer"),
        pay_type: String(form.get("pay_type") || "hourly"),
        pay_rate: Number(form.get("pay_rate") || 0),
        commission_rate: Number(form.get("commission_rate") || 0),
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const workload = (name: string) =>
    jobs.filter((j) => j.installer === name && !["completed", "invoiced"].includes(j.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Who installs what, how they're paid and what they're carrying."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add person</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add team member</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addMember.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Role</Label>
                    <Input id="title" name="title" defaultValue="Installer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay type</Label>
                    <Select name="pay_type" defaultValue="hourly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="salary">Salary</SelectItem>
                        <SelectItem value="commission">Commission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay_rate">Pay rate</Label>
                    <Input id="pay_rate" name="pay_rate" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Commission %</Label>
                    <Input id="commission_rate" name="commission_rate" type="number" step="0.1" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addMember.isPending}>
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="People" value={String(members.length)} />
        <StatCard
          label="Active installers"
          value={String(members.filter((m) => m.is_active).length)}
        />
        <StatCard
          label="Jobs in flight"
          value={String(jobs.filter((j) => !["completed", "invoiced"].includes(j.status)).length)}
        />
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="No team yet"
          body="Add installers and advisors so jobs can be assigned and paid out."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-elevated bg-surface">
          <div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_88px] gap-4 border-b border-elevated bg-surface-2/60 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Person</span><span>Specialties</span><span>Pay</span><span>Open work</span><span>Status</span>
          </div>
          <div className="min-w-[760px] divide-y divide-elevated">
            {members.map((m) => {
              const load = workload(m.full_name);
              return (
                <div key={m.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_88px] items-center gap-4 px-4 py-3 text-sm hover:bg-surface-2/40">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.title} · {[m.email, m.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {(m.specialties ?? []).length ? (m.specialties ?? []).map((s) => <Badge key={s} variant="outline">{label(s)}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <span>{m.pay_type === "commission" ? `${Number(m.commission_rate)}% commission` : m.pay_type === "salary" ? `${money(m.pay_rate)}/yr` : `${money(m.pay_rate)}/hr`}</span>
                  <span>{load.length} · {money(load.reduce((t, j) => t + Number(j.price), 0))}</span>
                  <Badge variant={m.is_active ? "secondary" : "outline"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
