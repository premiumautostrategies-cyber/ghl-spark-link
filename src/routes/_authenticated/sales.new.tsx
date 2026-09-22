import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/format";
import { TEMP_META } from "@/lib/pipeline";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/shop";
import { toast } from "sonner";

const SPEED_TO_LEAD_BODY = DEFAULT_MESSAGE_TEMPLATES[0].body;

export const Route = createFileRoute("/_authenticated/sales/new")({
  head: () => ({
    meta: [
      { title: "New Lead — Systemize" },
      {
        name: "description",
        content: "Open a new restyling opportunity with the customer, vehicle and services they want.",
      },
      { property: "og:title", content: "New Lead — Systemize" },
      {
        property: "og:description",
        content: "Open a new restyling opportunity with the customer, vehicle and services they want.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewLeadDesk,
});

const digits = (value: string) => value.replace(/\D/g, "");

function NewLeadDesk() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [addingCustomer, setAddingCustomer] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendFirstText, setSendFirstText] = useState(true);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name,phone,email").order("name");
      if (error) throw error;
      return data;
    },
  });

  const phoneDigits = digits(newPhone);
  const emailKey = newEmail.trim().toLowerCase();
  const nameKey = newName.trim().toLowerCase();
  const matches = addingCustomer
    ? customers
        .filter((c) => {
          const byPhone = phoneDigits.length >= 7 && digits(c.phone ?? "").endsWith(phoneDigits.slice(-7));
          const byEmail = emailKey.length > 4 && (c.email ?? "").toLowerCase() === emailKey;
          const byName = nameKey.length > 2 && (c.name ?? "").toLowerCase() === nameKey;
          return byPhone || byEmail || byName;
        })
        .slice(0, 3)
    : [];


  const addDeal = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      let cid = String(form.get("customer_id") || "") || null;
      const formName = String(form.get("new_customer_name") || "").trim();
      const formPhone = String(form.get("new_customer_phone") || "").trim();
      const formEmail = String(form.get("new_customer_email") || "").trim();


      if (!cid && formName) {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: formName,
            phone: formPhone || null,
            email: formEmail || null,

            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        cid = cust.id;
      }
      if (!cid) throw new Error("Pick a customer or add a new one");

      const year = String(form.get("vehicle_year") || "").trim();
      const make = String(form.get("vehicle_make") || "").trim();
      const model = String(form.get("vehicle_model") || "").trim();
      let vehicleId: string | null = null;
      if (make || model || year) {
        const { data: veh, error: vehErr } = await supabase
          .from("vehicles")
          .insert({
            customer_id: cid,
            owner_id: cid,
            year: year ? Number(year) : null,
            make: make || null,
            model: model || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (vehErr) throw vehErr;
        vehicleId = veh.id;
      }

      const wants = String(form.get("title") || "").trim();
      const { data: created, error } = await supabase
        .from("deals")
        .insert({
          title: wants || "New enquiry",
          stage: "new_lead",
          value: 0,
          probability: 25,
          notes: String(form.get("notes") || "") || null,
          service_tags: tags,
          customer_id: cid,
          vehicle_id: vehicleId,
          organization_id: orgId,
          location_id: locId,
        })
        .select("id,stage,customer_id")
        .single();
      if (error) throw error;

      // Speed to lead: the first text goes out only when the rep leaves it switched on.
      if (created?.stage === "new_lead" && sendFirstText) {
        await supabase.from("messages").insert({
          organization_id: orgId,
          location_id: locId,
          deal_id: created.id,
          customer_id: created.customer_id,
          channel: "sms",
          direction: "out",
          is_automated: true,
          body: SPEED_TO_LEAD_BODY,
        });
        await supabase.from("lead_events").insert({
          organization_id: orgId,
          deal_id: created.id,
          actor: "shop",
          kind: "sms_out",
          detail: "Automatic first text sent",
        });
        await supabase
          .from("deals")
          .update({ speed_to_lead_at: new Date().toISOString() })
          .eq("id", created.id);
      }
      return created.id as string;
    },
    onSuccess: (dealId) => {
      toast.success(sendFirstText ? "Lead added — first text sent" : "Lead added");

      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["pipeline-events"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-lite"] });
      navigate({ to: "/sales/$dealId", params: { dealId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-w-0 space-y-4 pb-10">
      <div>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="micro-label">Sales desk</p>
            <h1 className="display-title mt-1 text-3xl">{title.trim() || "New lead"}</h1>
            <p className={cn("mt-1.5 text-sm", TEMP_META.new.text)}>
              Untouched — the first text goes out as soon as you save
            </p>
          </div>
          <div className="text-right">
            <p className="micro-label">Quote total</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-bronze">$0</p>
            <p className="text-xs text-muted-foreground">Build the quote after the lead is saved</p>
          </div>
        </div>
      </div>

      <form
        id="new-lead-form"
        onSubmit={(e) => {
          e.preventDefault();
          addDeal.mutate(new FormData(e.currentTarget));
        }}
        className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0 space-y-4">
          <Panel className="min-w-0">
            <SectionTitle title="Customer" hint="Search the shop first — or add somebody new." />
            <div className="space-y-3 border-t border-elevated p-4">
              {addingCustomer ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-name" className="text-xs">Name</Label>
                    <Input id="c-name" name="new_customer_name" placeholder="Customer name" required />
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-phone" className="text-xs">Phone</Label>
                      <Input id="c-phone" name="new_customer_phone" placeholder="(555) 555-0142" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-email" className="text-xs">Email</Label>
                      <Input id="c-email" name="new_customer_email" placeholder="name@email.com" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground underline"
                    onClick={() => setAddingCustomer(false)}
                  >
                    Pick an existing customer instead
                  </button>
                </>
              ) : (
                <>
                  <input type="hidden" name="customer_id" value={customerId} />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Existing customer</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Choose a customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground underline"
                    onClick={() => {
                      setAddingCustomer(true);
                      setCustomerId("");
                    }}
                  >
                    + New customer
                  </button>
                </>
              )}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <SectionTitle title="Vehicle" hint="What are we working on?" />
            <div className="grid gap-2.5 border-t border-elevated p-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-year" className="text-xs">Year</Label>
                <Input id="v-year" name="vehicle_year" type="number" placeholder="2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-make" className="text-xs">Make</Label>
                <Input id="v-make" name="vehicle_make" placeholder="BMW" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-model" className="text-xs">Model</Label>
                <Input id="v-model" name="vehicle_model" placeholder="X5" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel className="min-w-0">
            <SectionTitle title="Opportunity" hint="What they want and which services are in play." />
            <div className="space-y-4 border-t border-elevated p-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">What do they want?</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Full front PPF + ceramic tint"
                  className="text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-2">
                <p className="micro-label">Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_TYPES.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setTags((list) => (on ? list.filter((x) => x !== t) : [...list, t]))
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                          on
                            ? "border-bronze bg-bronze/15 text-bronze"
                            : "border-elevated bg-surface text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {SERVICE_TYPE_LABELS[t] ?? t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} placeholder="Where they came from, timing, anything said on the call…" />
              </div>
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={addDeal.isPending}>
              {addDeal.isPending ? "Saving…" : "Save lead"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/sales" })}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
