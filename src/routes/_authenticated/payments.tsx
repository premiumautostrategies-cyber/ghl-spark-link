import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Systemize" },
      { name: "description", content: "Invoices, deposits and payment history." },
      { property: "og:title", content: "Payments — Systemize" },
      { property: "og:description", content: "Invoices, deposits and payment history." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Deposits, invoices and outstanding balances.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Payments and invoicing are coming next. Generate invoices, collect deposits and track
          outstanding balances.
        </p>
      </div>
    </div>
  );
}
