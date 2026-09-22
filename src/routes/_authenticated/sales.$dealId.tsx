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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CoverageVisual } from "@/components/coverage-visual";
import { coverageLabel, resolveCoverage } from "@/lib/coverage-presets";
import { resolveBodyStyle } from "@/lib/vehicle-library";
import { OPTION_KIND_LABELS, catalogImage } from "@/lib/catalog";
import { useEmitEvent } from "@/lib/integrations/emit";
import { DealComms } from "@/components/deal-comms";
import { DealProposal } from "@/components/deal-proposal";

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

type CatalogCategory = {
  id: string;
  name: string;
  slug: string | null;
  accent_color: string | null;
  image_url: string | null;
  description: string | null;
};

type CatalogService = {
  id: string;
  name: string;
  category: string;
  category_id: string | null;
  base_price: number | string;
  duration_minutes: number;
  description: string | null;
  customer_description: string | null;
  image_url: string | null;
  swatch_color: string | null;
  coverage_panels: string[];
};

type CatalogOption = {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  kind: string;
  price_delta: number | string;
  duration_delta_minutes: number;
  swatch_color: string | null;
  coverage_panels: string[];
};

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
  const emitEvent = useEmitEvent();
  const syncContext = () => {
    const c = deal?.customers as
      | { name?: string; email?: string | null; phone?: string | null }
      | null
      | undefined;
    const v = deal?.vehicles as
      | { year?: number | null; make?: string | null; model?: string | null }
      | null
      | undefined;
    return {
      customerId,
      customerName: c?.name ?? null,
      customerEmail: c?.email ?? null,
      customerPhone: c?.phone ?? null,
      vehicle: v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : null,
      title: deal?.title ?? null,
    };
  };

  const { data: services = [] } = useQuery({
    queryKey: ["services-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id,name,category,category_id,base_price,duration_minutes,description,customer_description,image_url,swatch_color,coverage_panels",
        )
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as unknown as CatalogService[];
    },
  });

  const { data: catalogCategories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id,name,slug,accent_color,image_url,description")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as CatalogCategory[];
    },
  });

  const { data: catalogOptions = [] } = useQuery({
    queryKey: ["service-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_options")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as CatalogOption[];
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
      emitEvent({
        event: "quote.sent",
        payload: { ...syncContext(), total, lines: items.map((i) => ({ description: i.description, amount: Number(i.unit_price) * Number(i.quantity) })) },
        localType: "estimate",
        ...(deal?.estimate_id ? { localId: deal.estimate_id as string } : {}),
        summary: `Quote for ${deal?.title ?? "deal"}`,
      });
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

  /* ---------- delivery handoff ---------- */

  const DELIVERY_TEXT: Record<string, string> = {
    ready: "Your vehicle is finished and looks great — it's ready for pickup whenever you are.",
    delivered: "Thanks for trusting us with your vehicle. Care instructions are in your client hub.",
    review: "It was a pleasure working with you — would you mind leaving us a quick review?",
  };

  const deliver = useMutation({
    mutationFn: async (kind: "ready" | "delivered" | "review") => {
      if (!orgId) throw new Error("No workspace selected");
      const { error: msgErr } = await supabase.from("messages").insert({
        organization_id: orgId,
        location_id: locId,
        deal_id: dealId,
        customer_id: deal?.customer_id ?? null,
        channel: "sms",
        direction: "out",
        body: DELIVERY_TEXT[kind] ?? "",
      });
      if (msgErr) throw msgErr;
      if (kind === "delivered" && job?.id) {
        const { error } = await supabase
          .from("jobs")
          .update({ status: "completed", key_released: true })
          .eq("id", job.id);
        if (error) throw error;
      }
      await supabase.from("lead_events").insert({
        organization_id: orgId,
        deal_id: dealId,
        actor: "shop",
        kind: "sms_out",
        detail:
          kind === "ready"
            ? "Customer notified vehicle is ready"
            : kind === "delivered"
              ? "Vehicle delivered"
              : "Review request sent",
      });
    },
    onSuccess: (_d, kind) => {
      toast.success(
        kind === "ready" ? "Customer notified" : kind === "delivered" ? "Marked delivered" : "Review request sent",
      );
      invalidate();
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
    onSuccess: (_r, form) => {
      const date = String(form.get("date") || "");
      const time = String(form.get("time") || "09:00");
      const hours = Number(form.get("hours") || 4);
      const start = date ? new Date(`${date}T${time}`) : new Date();
      emitEvent({
        event: job?.id ? "appointment.updated" : "appointment.booked",
        payload: {
          ...syncContext(),
          start: start.toISOString(),
          end: new Date(start.getTime() + hours * 3600000).toISOString(),
          bay: String(form.get("bay") || "") || null,
          installer: String(form.get("installer") || "") || null,
          service: String(form.get("service_type") || "") || null,
        },
        localType: "job",
        ...(job?.id ? { localId: job.id as string } : {}),
        summary: `Booking for ${deal?.title ?? "deal"}`,
      });
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
    onSuccess: (_r, form) => {
      emitEvent({
        event: "payment.received",
        payload: {
          ...syncContext(),
          amount: Number(form.get("amount") || 0),
          method: String(form.get("method") || "card"),
          invoiceId: (deal?.estimate_id as string | null) ?? null,
        },
        localType: "payment",
        summary: `Payment on ${deal?.title ?? "deal"}`,
      });
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
    return <div className="h-64 animate-pulse rounded-xl border border-elevated bg-surface" />;
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


      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
        {/* Quote builder */}
        <Panel className="min-w-0">
          <SectionTitle
            title="Quote builder"
            hint="Tap a service to add it to the quote — ones with options open first."
            right={<Tag tone={estimate?.status === "sent" ? "comms" : "muted"}>{label(estimate?.status ?? "draft")}</Tag>}
          />
          <div className="border-t border-elevated p-4">
            <ServicePicker
              services={services}
              categories={catalogCategories}
              options={catalogOptions}
              body={resolveBodyStyle(vehicle?.make, vehicle?.model, vehicle?.year ?? undefined)}
              onAdd={(line) => addLine.mutate(line)}
            />

            <div className="mt-3 space-y-1.5">
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
              className="mt-3 flex flex-wrap items-end gap-2"
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

            <div className="mt-4 space-y-1.5 border-t border-elevated pt-3 text-sm">
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

            <div className="mt-4 space-y-2 border-t border-elevated pt-3">
              <p className="text-xs text-muted-foreground">
                This is the internal working quote. The customer sees the interactive proposal below — send that.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => sendProposal.mutate()} disabled={sendProposal.isPending}>
                  Share this quote as a plain document
                </Button>
                <Button variant="ghost" onClick={() => winDeal.mutate()} disabled={winDeal.isPending}>
                  Mark approved &amp; won
                </Button>
              </div>
            </div>

          </div>
        </Panel>

        <DealProposal
          dealId={dealId}
          deal={deal}
          quoteTotal={total}
          quoteHours={Math.max(2, Math.round(total / 300))}
        />

        <DealComms
          dealId={dealId}
          customerId={customerId}
          customerName={deal.customers?.name ?? null}
        />
        </div>

        <div className="min-w-0 space-y-4">
          {/* Readiness */}
          <Panel>
            <SectionTitle title="Where this sale stands" hint="Each step unlocks the next." />
            <div className="divide-y divide-elevated border-t border-elevated">
              {[
                { label: "Quote built", done: total > 0, detail: total > 0 ? money(total) : "Add services" },
                {
                  label: "Sent to customer",
                  done: ["sent", "approved", "viewed"].includes(estimate?.status ?? ""),
                  detail: label(estimate?.status ?? "not sent"),
                },
                {
                  label: "Approved",
                  done: ["won", "scheduled"].includes(deal.stage ?? "") || estimate?.status === "approved",
                  detail: label(deal.stage ?? ""),
                },
                {
                  label: "Deposit collected",
                  done: collected > 0,
                  detail: collected > 0 ? `${money(collected)} in` : "Nothing collected",
                },
                {
                  label: "Scheduled",
                  done: Boolean(job?.scheduled_start),
                  detail: job?.scheduled_start ? shortDate(job.scheduled_start) : "Not booked",
                },
                {
                  label: "QC passed",
                  done: job?.qc_status === "passed",
                  detail: job?.qc_status ? label(job.qc_status.replace(/_/g, " ")) : "Not started",
                },
              ].map((step) => (
                <div key={step.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        step.done ? "bg-revenue" : "bg-muted-foreground/40",
                      )}
                    />
                    <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{step.detail}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Scheduling */}

          <Panel>
            <SectionTitle
              title="Book the bay"
              hint={job ? `Currently ${shortDate(job.scheduled_start)}` : "Turn the sale into scheduled work."}
              right={job ? <Tag tone="rig">{label(job.status)}</Tag> : undefined}
            />
            <form
              className="grid gap-2.5 border-t border-elevated p-4 sm:grid-cols-2"
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
              title="Log a payment"
              hint={`${money(collected)} logged of ${money(total)} · ${money(balance)} outstanding`}
            />

            <form
              className="grid gap-2.5 border-t border-elevated p-4 sm:grid-cols-2"
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
              <div className="sm:col-span-2 space-y-2">
                <Button type="submit" className="w-full" disabled={takePayment.isPending}>
                  Record money already received
                </Button>
                <p className="text-xs text-muted-foreground">
                  This records a payment you've already taken — nothing is charged here.
                </p>
              </div>
            </form>
            {payments.length > 0 && (
              <div className="space-y-1.5 border-t border-elevated p-4 pt-3">
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

          {/* Delivery handoff */}
          <Panel>
            <SectionTitle
              title="Delivery handoff"
              hint={
                job?.qc_status === "passed"
                  ? `QC passed · ${money(balance)} outstanding`
                  : "Available once QC passes the vehicle."
              }
            />
            <div className="space-y-2 border-t border-elevated p-4">
              <Button
                variant="outline"
                className="w-full"
                disabled={job?.qc_status !== "passed" || deliver.isPending}
                onClick={() => deliver.mutate("ready")}
              >
                Tell the customer it's ready
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={job?.qc_status !== "passed" || deliver.isPending}
                onClick={() => deliver.mutate("delivered")}
              >
                {balance > 0 ? `Mark delivered (${money(balance)} due)` : "Mark delivered"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={job?.qc_status !== "passed" || deliver.isPending}
                onClick={() => deliver.mutate("review")}
              >
                Send review request
              </Button>
            </div>
          </Panel>


          {/* Client hub documents */}
          <Panel>
            <SectionTitle title="Client hub" hint="Everything the customer can see and sign." />
            <div className="border-t border-elevated p-4">
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
              <div className="mt-3 space-y-1.5">
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
      <div className="space-y-2.5 border-t border-elevated p-4">
        <Textarea
          rows={3}
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

/* ---------- catalog picker ---------- */

function ServicePicker({
  services,
  categories,
  options,
  body,
  onAdd,
}: {
  services: CatalogService[];
  categories: CatalogCategory[];
  options: CatalogOption[];
  body: ReturnType<typeof resolveBodyStyle>;
  onAdd: (line: { description: string; quantity: number; unit_price: number }) => void;
}) {
  const [cat, setCat] = useState<string>(categories[0]?.id ?? "all");
  const [picked, setPicked] = useState<CatalogService | null>(null);

  const visible = services.filter((s) => s.category_id === cat);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
    string,
    CatalogCategory
  >;

  if (services.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No services yet — build your library in the Catalog.
      </p>
    );
  }

  return (
    <div className="min-w-0">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
        {categories.map((c) => (
          <PickPill
            key={c.id}
            label={c.name}
            accent={c.accent_color}
            active={cat === c.id}
            onClick={() => setCat(c.id)}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((s) => {
          const count = options.filter((o) => o.service_id === s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                count > 0
                  ? setPicked(s)
                  : onAdd({
                      description: s.name,
                      quantity: 1,
                      unit_price: Number(s.base_price),
                    })
              }
               className="rounded-xl border border-elevated bg-surface p-4 text-left transition-colors hover:border-bronze/50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{s.name}</p>
                <Plus className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-base font-semibold tabular-nums text-bronze">
                  {money(s.base_price)}
                </span>
                <Tag>
                  {count > 0 ? `${count} options` : `${(s.duration_minutes / 60).toFixed(1)} h`}
                </Tag>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          {picked && (
            <ServiceConfigurator
              service={picked}
              category={picked.category_id ? catById[picked.category_id] : undefined}
              options={options.filter((o) => o.service_id === picked.id)}
              body={body}
              onAdd={(line) => {
                onAdd(line);
                setPicked(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PickPill({
  label: text,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
        active
          ? "border-bronze bg-bronze/15 text-bronze"
          : "border-elevated bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {accent && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
      {text}
    </button>
  );
}

function ServiceConfigurator({
  service,
  category,
  options,
  body,
  onAdd,
}: {
  service: CatalogService;
  category?: CatalogCategory | undefined;
  options: CatalogOption[];
  body: ReturnType<typeof resolveBodyStyle>;
  onAdd: (line: { description: string; quantity: number; unit_price: number }) => void;
}) {
  const single = options.filter((o) => o.kind !== "addon");
  const addons = options.filter((o) => o.kind === "addon");
  const groups = Array.from(new Set(single.map((o) => o.kind)));

  const [choice, setChoice] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [qty, setQty] = useState("1");

  const chosen = [
    ...groups.map((g) => single.find((o) => o.id === choice[g])).filter(Boolean),
    ...addons.filter((o) => extras.includes(o.id)),
  ] as CatalogOption[];

  const price = Number(service.base_price) + chosen.reduce((t, o) => t + Number(o.price_delta), 0);
  const minutes =
    service.duration_minutes + chosen.reduce((t, o) => t + o.duration_delta_minutes, 0);
  const coverage = chosen.reduce<string[]>(
    (acc, o) => (o.coverage_panels?.length ? o.coverage_panels : acc),
    service.coverage_panels ?? [],
  );
  /** Nothing mapped by hand? Read the wording so each option still looks like itself. */
  const shown = resolveCoverage(
    { coverage_kind: "panels", coverage_keys: coverage },
    service.name,
    service.customer_description,
    service.description,
    chosen.map((o) => o.name).join(" "),
  );

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{service.name}</DialogTitle>
      </DialogHeader>
      <img
        src={catalogImage(service.image_url, category?.slug ?? service.category, category?.image_url)}
        alt={service.name}
        loading="lazy"
        className="h-44 w-full rounded-xl object-cover"
      />
      <p className="text-sm text-muted-foreground">
        {service.customer_description || service.description || "No description yet."}
      </p>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-4">
          {groups.map((g) => (
            <div key={g} className="space-y-2">
              <p className="micro-label">{OPTION_KIND_LABELS[g] ?? g}</p>
              <div className="flex flex-wrap gap-2">
                {single
                  .filter((o) => o.kind === g)
                  .map((o) => {
                    const on = choice[g] === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          setChoice((p) => ({ ...p, [g]: on ? "" : o.id }))
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                          on
                            ? "border-bronze bg-bronze/10 text-foreground"
                            : "border-elevated bg-surface-2 text-muted-foreground hover:border-bronze/40",
                        )}
                      >
                        {o.swatch_color && (
                          <span
                            className="h-4 w-4 rounded-full border border-hairline"
                            style={{ backgroundColor: o.swatch_color }}
                          />
                        )}
                        <span>
                          <span className="block font-semibold text-foreground">{o.name}</span>
                          <span className="tabular-nums">
                            {Number(o.price_delta) === 0
                              ? "Included"
                              : `${Number(o.price_delta) > 0 ? "+" : ""}${money(o.price_delta)}`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}

          {addons.length > 0 && (
            <div className="space-y-2">
              <p className="micro-label">Add-ons</p>
              <div className="flex flex-wrap gap-2">
                {addons.map((o) => {
                  const on = extras.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() =>
                        setExtras((p) => (on ? p.filter((x) => x !== o.id) : [...p, o.id]))
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                        on
                          ? "border-bronze bg-bronze/10"
                          : "border-elevated bg-surface-2 text-muted-foreground hover:border-bronze/40",
                      )}
                    >
                      <span className="block font-semibold text-foreground">{o.name}</span>
                      <span className="tabular-nums">
                        {Number(o.price_delta) > 0 ? "+" : ""}
                        {money(o.price_delta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {shown.kind !== "none" && shown.keys.length > 0 && (
          <div className="rounded-xl border border-elevated bg-surface-2 p-3 sm:w-48">
            <p className="micro-label mb-2">
              {shown.kind === "tint" ? "Glass covered" : "Panels covered"}
            </p>
            <CoverageVisual
              kind={shown.kind === "tint" ? "tint" : "panels"}
              body={body}
              covered={shown.keys}
              accent={category?.accent_color ?? null}
              className={shown.kind === "tint" ? "max-h-24" : "max-h-40"}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {coverageLabel(shown.kind, shown.keys)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-elevated pt-4">
        <div className="w-24 space-y-1.5">
          <Label htmlFor="cfg-qty" className="text-xs">Qty</Label>
          <Input
            id="cfg-qty"
            type="number"
            step="1"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="text-right">
          <p className="micro-label">Line total</p>
          <p className="font-display text-2xl tabular-nums text-bronze">
            {money(price * (Number(qty) || 1))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {(minutes / 60).toFixed(1)}h in the bay
          </p>
        </div>
        <Button
          onClick={() =>
            onAdd({
              description: chosen.length
                ? `${service.name} — ${chosen.map((o) => o.name).join(", ")}`
                : service.name,
              quantity: Number(qty) || 1,
              unit_price: price,
            })
          }
        >
          Add to quote
        </Button>
      </div>
    </div>
  );
}
