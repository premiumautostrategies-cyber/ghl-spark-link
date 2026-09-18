import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { seedDemoData } from "@/lib/demo-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Systemize" },
      { name: "description", content: "Shop profile, locations and workspace data." },
      { property: "og:title", content: "Settings — Systemize" },
      { property: "og:description", content: "Shop profile, locations and workspace data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const { user } = useRouteContext({ from: "/_authenticated" });

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const renameOrg = useMutation({
    mutationFn: async (name: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("organizations").update({ name }).eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shop name updated");
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadDemo = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      await seedDemoData(orgId, locId);
    },
    onSuccess: () => {
      toast.success("Demo shop loaded");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Your shop, locations and workspace data." />

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Shop</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get("name") || "").trim();
            if (value) renameOrg.mutate(value);
          }}
        >
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="name">Shop name</Label>
            <Input id="name" name="name" defaultValue={org?.name ?? ""} key={org?.name} />
          </div>
          <Button type="submit" disabled={renameOrg.isPending}>
            Save
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Signed in as {user?.email}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Locations</h2>
        <div className="mt-4 space-y-2">
          {locations.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[l.address, l.city, l.state].filter(Boolean).join(", ") || "No address on file"}
                </p>
              </div>
              {l.is_default && <Badge variant="secondary">Default</Badge>}
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Demo shop</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Fills this workspace with a realistic restyling shop — service menu, film and coating
          stock, installers, customers and their vehicles, quotes, booked jobs, payments and signed
          paperwork. Safe to run on an empty workspace; running it twice adds a second set.
        </p>
        <Button className="mt-4" onClick={() => loadDemo.mutate()} disabled={loadDemo.isPending}>
          {loadDemo.isPending ? "Loading…" : "Load demo shop"}
        </Button>
      </div>
    </div>
  );
}
