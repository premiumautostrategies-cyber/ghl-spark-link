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
import { PAYMENT_METHODS, dayDate, label, money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Systemize" },
      { name: "description", content: "Deposits, balances and invoices for every job." },
      { property: "og:title", content: "Payments — Systemize" },
      { property: "og:description", content: "Deposits, balances and invoices for every job." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, customers(name), jobs(title)")
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

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const record = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const status = String(form.get("status"));
      const { error } = await supabase.from("payments").insert({
        amount: Number(form.get("amount") || 0),
        kind: String(form.get("kind")),
        method: String(form.get("method")),
        status,
        reference: String(form.get("reference") || "") || null,
        customer_id: String(form.get("customer_id") || "") || null,
        job_id: String(form.get("job_id") || "") || null,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked paid");
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce((t, p) => t + Number(p.amount), 0);
  const outstanding = payments
    .filter((p) => p.status === "pending")
    .reduce((t, p) => t + Number(p.amount), 0);
  const deposits = payments
    .filter((p) => p.kind === "deposit" && p.status === "paid")
    .reduce((t, p) => t + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Deposits taken, balances owed and what landed in the bank."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Record payment</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record payment</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  record.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select name="kind" defaultValue="deposit">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select name="method" defaultValue="card">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {label(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue="paid">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select name="customer_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                    <Label>Job</Label>
                    <Select name="job_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input id="reference" name="reference" placeholder="dep-2201" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={record.isPending}>
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={money(collected)} />
        <StatCard label="Outstanding" value={money(outstanding)} hint="Awaiting payment" />
        <StatCard label="Deposits held" value={money(deposits)} />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          body="Record deposits and balances here to see real revenue in analytics."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Job</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium">{p.customers?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.jobs?.title ?? "—"}</td>
                  <td className="px-5 py-3 capitalize">{p.kind}</td>
                  <td className="px-5 py-3">{label(p.method)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{dayDate(p.paid_at)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{money(p.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    {p.status === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => markPaid.mutate(p.id)}>
                        Mark paid
                      </Button>
                    ) : (
                      <Badge variant="secondary">{label(p.status)}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
