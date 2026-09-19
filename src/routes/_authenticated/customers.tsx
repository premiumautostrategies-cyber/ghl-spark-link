import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { Car, Plus } from "lucide-react";
import { useEmitEvent } from "@/lib/integrations/emit";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Systemize" },
      { name: "description", content: "Customer and vehicle records with full job history." },
      { property: "og:title", content: "Customers — Systemize" },
      {
        property: "og:description",
        content: "Customer and vehicle records with full job history.",
      },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [vehicleFor, setVehicleFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { organization, location } = useRouteContext({ from: "/_authenticated" });
  const orgId = organization?.id;
  const locId = location?.id ?? null;
  const emitEvent = useEmitEvent();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, vehicles(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addCustomer = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const payload = {
        name: String(form.get("name")),
        email: String(form.get("email") || "") || null,
        phone: String(form.get("phone") || "") || null,
        company: String(form.get("company") || "") || null,
        notes: String(form.get("notes") || "") || null,
        organization_id: orgId,
        location_id: locId,
      };
      const { data, error } = await supabase
        .from("customers")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string, ...payload };
    },
    onSuccess: (created) => {
      emitEvent({
        event: "customer.created",
        payload: {
          customerId: created.id,
          customerName: created.name,
          customerEmail: created.email,
          customerPhone: created.phone,
        },
        localType: "customer",
        localId: created.id,
        summary: `New customer ${created.name}`,
      });
      toast.success("Customer added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-lite"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addVehicle = useMutation({
    mutationFn: async ({ form, customerId }: { form: FormData; customerId: string }) => {
      if (!orgId) throw new Error("No workspace selected");
      const year = String(form.get("year") || "");
      const { error } = await supabase.from("vehicles").insert({
        customer_id: customerId,
        year: year ? Number(year) : null,
        make: String(form.get("make") || "") || null,
        model: String(form.get("model") || "") || null,
        color: String(form.get("color") || "") || null,
        vin: String(form.get("vin") || "") || null,
        plate: String(form.get("plate") || "") || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle added");
      setVehicleFor(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = customers.filter((c) =>
    [c.name, c.email, c.phone, c.company].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Contacts, vehicles and shop history.</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New customer</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomer.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={addCustomer.isPending}>
                  Save customer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[c.company, c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setVehicleFor(c.id)}>
                <Plus className="size-3.5" /> Vehicle
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {c.vehicles.length === 0 && (
                <p className="text-xs text-muted-foreground">No vehicles on file.</p>
              )}
              {c.vehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <Car className="size-4 text-primary" />
                  <span>
                    {[v.year, v.make, v.model, v.color].filter(Boolean).join(" ") || "Vehicle"}
                  </span>
                  {v.plate && (
                    <span className="ml-auto text-xs text-muted-foreground">{v.plate}</span>
                  )}
                </div>
              ))}
            </div>
            {c.notes && <p className="mt-4 text-sm text-muted-foreground">{c.notes}</p>}
          </div>
        ))}
      </div>

      <Dialog open={vehicleFor !== null} onOpenChange={(v) => !v && setVehicleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!vehicleFor) return;
              addVehicle.mutate({ form: new FormData(e.currentTarget), customerId: vehicleFor });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" name="year" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" name="make" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Plate</Label>
                <Input id="plate" name="plate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input id="vin" name="vin" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addVehicle.isPending}>
              Save vehicle
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
