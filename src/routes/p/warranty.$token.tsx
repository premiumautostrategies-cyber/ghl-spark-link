import { createFileRoute } from "@tanstack/react-router";
import { getWarrantyByToken } from "@/lib/portal.functions";
import { shortDate } from "@/lib/format";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/p/warranty/$token")({
  head: () => ({
    meta: [
      { title: "Warranty certificate — Systemize" },
      { name: "description", content: "Your digital warranty certificate with coverage terms and film lot numbers." },
      { property: "og:title", content: "Digital warranty certificate" },
      { property: "og:description", content: "Your digital warranty certificate with coverage terms and film lot numbers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getWarrantyByToken({ data: { token: params.token } }),
  errorComponent: () => <Shell><p className="text-sm text-muted-foreground">This certificate could not be opened.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-sm text-muted-foreground">Certificate not found.</p></Shell>,
  component: WarrantyPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}

function WarrantyPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return <Shell><p className="text-sm text-muted-foreground">This certificate is no longer active.</p></Shell>;
  }
  const w = data.warranty;
  return (
    <Shell>
      <div className="rounded-2xl border border-bronze/40 bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="micro-label">{data.shopName}</p>
            <h1 className="display-title mt-2 text-3xl">Warranty certificate</h1>
          </div>
          <BadgeCheck className="h-8 w-8 text-bronze" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Certificate {w.certificate_number}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Customer" value={data.customerName ?? "—"} />
          <Field label="Vehicle" value={data.vehicle ?? "—"} />
          <Field label="Product" value={w.product ?? "—"} />
          <Field label="Installer" value={w.installer ?? "—"} />
          <Field label="Installed" value={shortDate(w.issued_at)} />
          <Field label="Covered through" value={w.expires_at ? shortDate(w.expires_at) : "Lifetime"} />
          <Field label="Film lot numbers" value={w.roll_lots.length ? w.roll_lots.join(", ") : "—"} />
          <Field label="Status" value={w.status === "active" ? "Active" : w.status} />
        </dl>

        {w.coverage_terms && (
          <div className="mt-6 border-t border-elevated pt-4">
            <p className="micro-label">Coverage terms</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{w.coverage_terms}</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Field({ label: l, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro-label">{l}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
