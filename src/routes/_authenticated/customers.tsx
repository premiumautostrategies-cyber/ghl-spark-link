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
import { Car, ChevronRight, Link as LinkIcon, MessageSquare, Phone, Plus } from "lucide-react";
import { useEmitEvent } from "@/lib/integrations/emit";
import { money } from "@/lib/format";
import { CustomerWorkspace } from "@/components/customer-workspace";
import { LeadWorkspace } from "@/components/lead-workspace";

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
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [openDeal, setOpenDeal] = useState<string | null>(null);
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

  const { data: jobs = [] } = useQuery({
    queryKey: ["customer-job-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,vehicle_id,customer_id,status,price,scheduled_start,service_type")
        .order("scheduled_start", { ascending: false });
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
    [c.name, c.email, c.phone, c.company, c.vehicles?.map((v) => [v.year, v.make, v.model, v.plate].join(" ")).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_1fr_100px_140px_48px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <span>Name</span>
          <span>Number</span>
          <span>Vehicle</span>
          <span className="text-right">LTV</span>
          <span className="text-center">Reach</span>
          <span />
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground text-center">No customers yet.</div>
        )}
        <ul>
          {filtered.map((c) => {
            const customerJobs = jobs.filter((j) => j.customer_id === c.id);
            const ltv = customerJobs.reduce((t, j) => t + Number(j.price ?? 0), 0);
            const primary = c.vehicles?.[0];
            const extra = (c.vehicles?.length ?? 0) - 1;
            const phone = c.phone?.trim();
            return (
              <li key={c.id} className="border-b border-border last:border-b-0">
                <div
                  className="grid grid-cols-[1fr_140px_1fr_100px_140px_48px] gap-4 items-center px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setOpenCustomer(c.id)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  </div>
                  <div className="min-w-0 text-sm">
                    {phone ? (
                      <a href={`tel:${phone}`} className="text-primary hover:underline truncate block">
                        {phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="min-w-0 text-sm">
                    {primary ? (
                      <div className="flex items-center gap-2 truncate">
                        <Car className="size-4 text-primary shrink-0" />
                        <span className="truncate">
                          {[primary.year, primary.make, primary.model, primary.color].filter(Boolean).join(" ")}
                          {extra > 0 && <span className="text-muted-foreground"> +{extra} more</span>}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No vehicle</span>
                    )}
                  </div>
                  <div className="text-right font-medium">{money(ltv)}</div>
                  <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {phone ? (
                      <>
                        <Button size="icon" variant="ghost" className="size-8" asChild>
                          <a href={`tel:${phone}`} aria-label="Call customer">
                            <Phone className="size-4" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" asChild>
                          <a href={`sms:${phone}`} aria-label="Message customer">
                            <MessageSquare className="size-4" />
                          </a>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No number</span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setOpenCustomer(c.id)}
                    aria-label="Open customer workspace"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <CustomerWorkspace
        customerId={openCustomer}
        onClose={() => setOpenCustomer(null)}
        onAddVehicle={(id) => {
          setOpenCustomer(null);
          setVehicleFor(id);
        }}
        onOpenDeal={(id) => {
          setOpenCustomer(null);
          setOpenDeal(id);
        }}
      />
      <LeadWorkspace dealId={openDeal} onClose={() => setOpenDeal(null)} />

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
