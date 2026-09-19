import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
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
import { DEAL_STAGES, DOC_TYPES, PAYMENT_METHODS, dayDate, label, money, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sales/$dealId")({
  head: () => ({
    meta: [
      { title: "Sales Desk — Systemize" },
      { name: "description", content: "Build the quote, schedule the bay, send the proposal and take the deposit." },
      { property: "og:title", content: "Sales Desk — Systemize" },
      {
        property: "og:description",
        content: "Build the quote, schedule the bay, send the proposal and take the deposit.",
      },
    ],
  }),
  component: DealDesk,
});

const BAYS = ["Bay 1", "Bay 2", "Bay 3", "Detail bay"];

function DealDesk() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { orgId, locId, user } = useOrg();
  const userId = user?.id as string | undefined;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deal", dealId] });
    qc.invalidateQueries({ queryKey: ["deals"] });
  };

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "*, customers(id,name,email,phone), vehicles(id,year,make,model,color,plate), estimates(*, estimate_items(*)), jobs(*)",
        )
        .eq("id", dealId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const customerId = deal?.customer_id ?? null;

  const { data: services = [] } = useQuery({
    queryKey: ["services-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,category,base_price,duration_minutes,description")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["deal-payments", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["deal-documents", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const estimate = deal?.estimates ?? null;
  const items = useMemo(
    () =>
      [...((estimate?.estimate_items ?? []) as Array<{
        id: string;
        description: string;
        quantity: number | string;
        unit_price: number | string;
        position: number;
      }>)].sort((a, b) => a.position - b.position),
    [estimate],
  );
  const subtotal = items.reduce((t, i) => t + Number(i.quantity) * Number(i.unit_price), 0);
  const taxRate = Number(estimate?.tax_rate ?? 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce((t, p) => t + Number(p.amount), 0);
  const balance = Math.max(total - collected, 0);
  const job = deal?.jobs ?? null;

  /* ---------- booking form state ---------- */
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedHours, setSchedHours] = useState("4");
  const [schedBay, setSchedBay] = useState("Bay 1");

  useEffect(() => {
    if (!job?.scheduled_start) return;
    const start = new Date(job.scheduled_start as string);
    setSchedDate(start.toISOString().slice(0, 10));
    setSchedTime(start.toTimeString().slice(0, 5));
    if (job.bay) setSchedBay(job.bay as string);
    if (job.scheduled_end) {
      const hrs = (new Date(job.scheduled_end as string).getTime() - start.getTime()) / 3600000;
      if (hrs > 0) setSchedHours(String(hrs));
    }
  }, [job?.scheduled_start, job?.scheduled_end, job?.bay]);

  const { data: dayJobs = [] } = useQuery({
    queryKey: ["bay-day", schedDate],
    enabled: !!schedDate,
    queryFn: async () => {
      const from = new Date(`${schedDate}T00:00:00`).toISOString();
      const to = new Date(`${schedDate}T23:59:59`).toISOString();
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,bay,installer,scheduled_start,scheduled_end,status")
        .gte("scheduled_start", from)
        .lte("scheduled_start", to)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  /* ---------- quote ---------- */

  async function ensureEstimate() {
    if (estimate?.id) return estimate.id as string;
    if (!orgId || !userId) throw new Error("No workspace selected");
    const { data, error } = await supabase
      .from("estimates")
      .insert({
        title: deal?.title ?? "Quote",
        owner_id: userId,
        customer_id: deal?.customer_id ?? null,
        vehicle_id: deal?.vehicle_id ?? null,
        organization_id: orgId,
        location_id: locId,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    await supabase.from("deals").update({ estimate_id: data.id }).eq("id", dealId);
    return data.id as string;
  }

  async function syncValue(newTotal: number) {
    await supabase
      .from("deals")
      .update({ value: newTotal, last_activity_at: new Date().toISOString() })
      .eq("id", dealId);
  }

  const addLine = useMutation({
    mutationFn: async (line: { description: string; quantity: number; unit_price: number }) => {
      const estId = await ensureEstimate();
      const { error } = await supabase.from("estimate_items").insert({
        estimate_id: estId,
        owner_id: userId!,
        organization_id: orgId,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        position: items.length,
      });
      if (error) throw error;
      await syncValue(subtotal + line.quantity * line.unit_price);
    },
    onSuccess: () => {
      toast.success("Added to quote");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estimate_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const setTax = useMutation({
    mutationFn: async (rate: number) => {
      const estId = await ensureEstimate();
      const { error } = await supabase.from("estimates").update({ tax_rate: rate }).eq("id", estId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const setStage = useMutation({
    mutationFn: async (stage: string) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: (_d, stage) => {
      toast.success(`Moved to ${label(stage)}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---------- send to client hub ---------- */

  const sendProposal = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error("Add at least one service to the quote first");
      const estId = await ensureEstimate();
      await supabase.from("estimates").update({ status: "sent" }).eq("id", estId);
      const { error } = await supabase.from("documents").insert({
        organization_id: orgId,
        location_id: locId,
        customer_id: deal?.customer_id ?? null,
        vehicle_id: deal?.vehicle_id ?? null,
        job_id: deal?.job_id ?? null,
        name: `Proposal — ${deal?.title ?? "Quote"}`,
        doc_type: "contract",
        status: "awaiting_signature",
        body: items
          .map((i) => `${i.description} × ${Number(i.quantity)} — ${money(Number(i.unit_price))}`)
          .join("\n"),
      });
      if (error) throw error;
      await supabase
        .from("deals")
        .update({ stage: "quoted", value: total, last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
    },
    onSuccess: () => {
      toast.success("Proposal sent to the client hub");
      invalidate();
      qc.invalidateQueries({ queryKey: ["deal-documents", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendDocument = useMutation({
    mutationFn: async (docType: string) => {
      const { error } = await supabase.from("documents").insert({
        organization_id: orgId,
        location_id: locId,
        customer_id: deal?.customer_id ?? null,
        vehicle_id: deal?.vehicle_id ?? null,
        job_id: deal?.job_id ?? null,
        name: `${label(docType)} — ${deal?.title ?? "Deal"}`,
        doc_type: docType,
        status: "awaiting_signature",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sent to the client hub");
      qc.invalidateQueries({ queryKey: ["deal-documents", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---------- scheduling ---------- */

  const schedule = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !userId) throw new Error("No workspace selected");
      const date = String(form.get("date") || "");
      const time = String(form.get("time") || "09:00");
      if (!date) throw new Error("Pick a date");
      const hours = Number(form.get("hours") || 4);
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + hours * 3600000);
      const payload = {
        title: deal?.title ?? "Restyling job",
        service_type: String(form.get("service_type") || "other"),
        status: "scheduled",
        bay: String(form.get("bay") || "") || null,
        installer: String(form.get("installer") || "") || null,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        price: total,
        customer_id: deal?.customer_id ?? null,
        vehicle_id: deal?.vehicle_id ?? null,
        organization_id: orgId,
        location_id: locId,
      };
      if (job?.id) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase
        .from("jobs")
        .insert({ ...payload, owner_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("deals").update({ job_id: data.id }).eq("id", dealId);
    },
    onSuccess: () => {
      toast.success("Bay time booked");
      invalidate();
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---------- payments ---------- */

  const takePayment = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("payments").insert({
        organization_id: orgId,
        location_id: locId,
        customer_id: deal?.customer_id ?? null,
        job_id: deal?.job_id ?? null,
        estimate_id: deal?.estimate_id ?? null,
        amount: Number(form.get("amount") || 0),
        kind: String(form.get("kind") || "deposit"),
        method: String(form.get("method") || "card"),
        status: "paid",
        paid_at: new Date().toISOString(),
        reference: String(form.get("reference") || "") || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["deal-payments", customerId] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const winDeal = useMutation({
    mutationFn: async () => {
      const estId = deal?.estimate_id as string | null;
      if (estId) await supabase.from("estimates").update({ status: "approved" }).eq("id", estId);
      const { error } = await supabase
        .from("deals")
        .update({ stage: "won", probability: 100, value: total, last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale closed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-elevated bg-surface" />;
  }

  if (!deal) {
    return (
      <Panel className="p-8 text-center">
        <p className="text-sm text-muted-foreground">This opportunity no longer exists.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/sales" })}>
          Back to pipeline
        </Button>
      </Panel>
    );
  }

  const vehicle = deal.vehicles;

  return (
    <div className="min-w-0 space-y-6 pb-16">
      <div>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="micro-label">Sales desk</p>
            <h1 className="display-title mt-1 text-3xl">{deal.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {deal.customers?.name ?? "No customer"}
              {deal.customers?.phone ? ` · ${deal.customers.phone}` : ""}
              {vehicle ? ` · ${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="micro-label">Quote total</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-bronze">
              {money(total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {money(collected)} collected · {money(balance)} due
            </p>
          </div>
        </div>
      </div>


      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Quote builder */}
        <Panel className="min-w-0">
          <SectionTitle
            title="Quote builder"
            hint="Pick services from the menu or add a custom line."
            right={<Tag tone={estimate?.status === "sent" ? "comms" : "muted"}>{label(estimate?.status ?? "draft")}</Tag>}
          />
          <div className="border-t border-elevated p-5">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {services.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No services yet — add them in the Catalog.
                </p>
              )}
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    addLine.mutate({
                      description: s.name,
                      quantity: 1,
                      unit_price: Number(s.base_price),
                    })
                  }
                  className="w-[190px] shrink-0 rounded-xl border border-elevated bg-surface-2 p-3 text-left transition-colors hover:border-bronze/50"
                >
                  <p className="text-sm font-semibold leading-tight">{s.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label(s.category)}</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-bronze">
                    {money(s.base_price)}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-elevated p-6 text-center text-xs text-muted-foreground">
                  Nothing on this quote yet.
                </p>
              ) : (
                items.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(i.quantity)} × {money(i.unit_price)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {money(Number(i.quantity) * Number(i.unit_price))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine.mutate(i.id)}
                      className="text-muted-foreground hover:text-critical"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const description = String(f.get("description") || "").trim();
                if (!description) return;
                addLine.mutate({
                  description,
                  quantity: Number(f.get("quantity") || 1),
                  unit_price: Number(f.get("unit_price") || 0),
                });
                e.currentTarget.reset();
              }}
            >
              <div className="min-w-[160px] flex-1 space-y-1.5">
                <Label htmlFor="l-desc" className="text-xs">Custom line</Label>
                <Input id="l-desc" name="description" placeholder="Windshield strip, chrome delete…" />
              </div>
              <div className="w-20 space-y-1.5">
                <Label htmlFor="l-qty" className="text-xs">Qty</Label>
                <Input id="l-qty" name="quantity" type="number" step="0.5" defaultValue="1" />
              </div>
              <div className="w-28 space-y-1.5">
                <Label htmlFor="l-price" className="text-xs">Price</Label>
                <Input id="l-price" name="unit_price" type="number" step="0.01" defaultValue="0" />
              </div>
              <Button type="submit" variant="outline" disabled={addLine.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </form>

            <div className="mt-5 space-y-1.5 border-t border-elevated pt-4 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Tax</span>
                  <TaxInput rate={taxRate} onCommit={(v) => setTax.mutate(v)} />
                </div>
                <span className="tabular-nums">{money(tax)}</span>
              </div>
              <Row label="Total" value={money(total)} strong />
              <Row label="Suggested deposit (30%)" value={money(total * 0.3)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => sendProposal.mutate()} disabled={sendProposal.isPending}>
                Send proposal to client hub
              </Button>
              <Button variant="outline" onClick={() => winDeal.mutate()} disabled={winDeal.isPending}>
                Mark approved &amp; won
              </Button>
            </div>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          {/* Scheduling */}
          <Panel>
            <SectionTitle
              title="Book the bay"
              hint={job ? `Currently ${shortDate(job.scheduled_start)}` : "Turn the sale into scheduled work."}
              right={job ? <Tag tone="rig">{label(job.status)}</Tag> : undefined}
            />
            <form
              className="grid gap-3 border-t border-elevated p-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                schedule.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="s-date" className="text-xs">Date</Label>
                <Input
                  id="s-date"
                  name="date"
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-time" className="text-xs">Start</Label>
                <Input
                  id="s-time"
                  name="time"
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-hours" className="text-xs">Hours in bay</Label>
                <Input
                  id="s-hours"
                  name="hours"
                  type="number"
                  step="0.5"
                  value={schedHours}
                  onChange={(e) => setSchedHours(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bay</Label>
                <Select name="bay" value={schedBay} onValueChange={setSchedBay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BAYS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <DayAvailability
                  date={schedDate}
                  jobs={dayJobs}
                  currentJobId={job?.id ?? null}
                  hours={Number(schedHours) || 1}
                  selected={{ bay: schedBay, time: schedTime }}
                  onPick={(bay, time) => {
                    setSchedBay(bay);
                    setSchedTime(time);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Installer</Label>
                <Select name="installer" {...(job?.installer ? { defaultValue: job.installer } : {})}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {team.map((t) => (
                      <SelectItem key={t.id} value={t.full_name}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service type</Label>
                <Select name="service_type" defaultValue={job?.service_type ?? "ppf"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tint", "ppf", "wrap", "color_change", "ceramic", "detail", "paint_correction", "other"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>{label(t)}</SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="sm:col-span-2" disabled={schedule.isPending}>
                {job ? "Update booking" : "Book this job"}
              </Button>
            </form>
          </Panel>

          {/* Payments */}
          <Panel>
            <SectionTitle
              title="Collect payment"
              hint={`${money(collected)} collected of ${money(total)}`}
            />
            <form
              className="grid gap-3 border-t border-elevated p-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                takePayment.mutate(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="p-amount" className="text-xs">Amount</Label>
                <Input
                  id="p-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={(total * 0.3).toFixed(2)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select name="kind" defaultValue="deposit">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="full">Paid in full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select name="method" defaultValue="card">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{label(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-ref" className="text-xs">Reference</Label>
                <Input id="p-ref" name="reference" placeholder="Auth code" />
              </div>
              <Button type="submit" className="sm:col-span-2" disabled={takePayment.isPending}>
                Record payment
              </Button>
            </form>
            {payments.length > 0 && (
              <div className="space-y-1.5 border-t border-elevated p-5 pt-4">
                {payments.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {label(p.kind)} · {label(p.method)} · {dayDate(p.paid_at ?? p.created_at)}
                    </span>
                    <span className="tabular-nums text-revenue">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Client hub documents */}
          <Panel>
            <SectionTitle title="Client hub" hint="Everything the customer can see and sign." />
            <div className="border-t border-elevated p-5">
              <div className="flex flex-wrap gap-1.5">
                {DOC_TYPES.filter((d) => d !== "invoice" && d !== "photo_set").map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant="outline"
                    disabled={sendDocument.isPending}
                    onClick={() => sendDocument.mutate(d)}
                  >
                    Send {label(d).toLowerCase()}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5">
                {documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing shared yet.</p>
                ) : (
                  documents.slice(0, 6).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">{d.name}</span>
                      <Tag tone={d.status === "signed" ? "revenue" : "urgent"}>{label(d.status)}</Tag>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>

          {/* Notes */}
          <NotesPanel dealId={dealId} initial={deal.notes ?? ""} onSaved={invalidate} />
        </div>
      </div>
    </div>
  );
}

function Row({ label: l, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{l}</span>
      <span className={cn("tabular-nums", strong && "font-display text-lg font-semibold text-bronze")}>
        {value}
      </span>
    </div>
  );
}

function TaxInput({ rate, onCommit }: { rate: number; onCommit: (v: number) => void }) {
  const [value, setValue] = useState(String(rate));
  useEffect(() => setValue(String(rate)), [rate]);
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        className="h-7 w-16 px-2 text-xs"
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => Number(value) !== rate && onCommit(Number(value || 0))}
      />
      <span className="text-xs">%</span>
    </span>
  );
}

function NotesPanel({
  dealId,
  initial,
  onSaved,
}: {
  dealId: string;
  initial: string;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(initial);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("deals")
        .update({ notes, last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel>
      <SectionTitle title="Conversation notes" />
      <div className="space-y-3 border-t border-elevated p-5">
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What the customer wants, objections, next step…"
        />
        <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
          Save notes
        </Button>
      </div>
    </Panel>
  );
}

const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;
const BAY_LIST = BAYS;

type DayJob = {
  id: string;
  title: string;
  bay: string | null;
  installer: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

function DayAvailability({
  date,
  jobs,
  currentJobId,
  hours,
  selected,
  onPick,
}: {
  date: string;
  jobs: DayJob[];
  currentJobId: string | null;
  hours: number;
  selected: { bay: string; time: string };
  onPick: (bay: string, time: string) => void;
}) {
  if (!date) {
    return (
      <p className="rounded-xl border border-dashed border-elevated p-4 text-center text-xs text-muted-foreground">
        Pick a date to see which bays are open.
      </p>
    );
  }

  const slots = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
  const others = jobs.filter((j) => j.id !== currentJobId && j.scheduled_start);

  const busy = (bay: string, hour: number) =>
    others.find((j) => {
      if ((j.bay ?? "Bay 1") !== bay) return false;
      const s = new Date(j.scheduled_start as string);
      const e = j.scheduled_end ? new Date(j.scheduled_end) : new Date(s.getTime() + 3600000);
      const slotStart = new Date(s);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 3600000);
      return slotStart < e && slotEnd > s;
    });

  const selHour = Number(selected.time.slice(0, 2));
  const span = Math.max(1, Math.round(hours));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="micro-label">Bay availability</p>
        <p className="text-[11px] text-muted-foreground">Tap an open slot to set the start time</p>
      </div>
      <div className="no-scrollbar overflow-x-auto rounded-xl border border-elevated">
        <table className="w-full min-w-[520px] border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="w-24 px-2 py-1.5 text-left font-medium text-muted-foreground">Bay</th>
              {slots.map((h) => (
                <th key={h} className="px-0.5 py-1.5 font-medium text-muted-foreground">
                  {h > 12 ? h - 12 : h}
                  {h >= 12 ? "p" : "a"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BAY_LIST.map((bay) => (
              <tr key={bay} className="border-t border-elevated">
                <td className="px-2 py-1.5 text-muted-foreground">{bay}</td>
                {slots.map((h) => {
                  const taken = busy(bay, h);
                  const picked =
                    bay === selected.bay && h >= selHour && h < selHour + span;
                  return (
                    <td key={h} className="p-0.5">
                      <button
                        type="button"
                        title={taken ? taken.title : `${bay} · ${h}:00`}
                        disabled={!!taken}
                        onClick={() => onPick(bay, `${String(h).padStart(2, "0")}:00`)}
                        className={cn(
                          "h-6 w-full rounded-[4px] transition-colors",
                          taken
                            ? "cursor-not-allowed bg-critical/25"
                            : picked
                              ? "bg-bronze"
                              : "bg-elevated/60 hover:bg-elevated",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-[3px] bg-bronze" /> This job</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-[3px] bg-critical/25" /> Booked</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-[3px] bg-elevated/60" /> Open</span>
      </div>
    </div>
  );
}
