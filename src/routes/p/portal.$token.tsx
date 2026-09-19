import { createFileRoute, Link } from "@tanstack/react-router";
import { getCustomerPortal } from "@/lib/portal.functions";
import { dayDate, label, money } from "@/lib/format";
import { BadgeCheck, Car, FileText, MessageSquare, Receipt } from "lucide-react";

export const Route = createFileRoute("/p/portal/$token")({
  head: () => ({
    meta: [
      { title: "Your vehicle hub — Systemize" },
      {
        name: "description",
        content: "Your quotes, proposals, warranty certificates and aftercare messages in one place.",
      },
      { property: "og:title", content: "Your vehicle hub" },
      {
        property: "og:description",
        content: "Your quotes, proposals, warranty certificates and aftercare messages in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => getCustomerPortal({ data: { token: params.token } }),
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">This hub could not be opened.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Hub not found.</p>
    </Shell>
  ),
  component: PortalPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-5">{children}</div>
    </div>
  );
}

function Card({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-elevated bg-surface">
      <header className="flex items-center gap-2 border-b border-elevated px-5 py-3">
        <span className="text-bronze">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </header>
      <div className="divide-y divide-elevated">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-center text-xs text-muted-foreground">{children}</p>;
}

function PortalPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">This link is no longer active.</p>
      </Shell>
    );
  }

  const active = data.deals.filter((d) => d.stage !== "lost");

  return (
    <Shell>
      <div className="rounded-2xl border border-bronze/40 bg-surface p-6">
        <p className="micro-label">{data.shopName}</p>
        <h1 className="display-title mt-2 text-3xl">Hello, {data.customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything on your vehicles — quotes, proposals, warranty certificates and the aftercare
          notes we have sent you.
        </p>
        {data.shopPhone && (
          <a
            href={`tel:${data.shopPhone}`}
            className="mt-3 inline-block text-sm text-bronze underline-offset-4 hover:underline"
          >
            Call the shop · {data.shopPhone}
          </a>
        )}
      </div>

      <Card title="Your vehicles" icon={<Car className="h-4 w-4" />}>
        {data.vehicles.length === 0 && <Empty>No vehicles on file yet.</Empty>}
        {data.vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-sm font-semibold">{v.label}</p>
            {v.plate && <span className="text-xs text-muted-foreground">{v.plate}</span>}
          </div>
        ))}
      </Card>

      <Card title="Work in progress" icon={<Receipt className="h-4 w-4" />} hint={`${active.length} open`}>
        {active.length === 0 && <Empty>Nothing in progress right now.</Empty>}
        {active.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{d.title}</p>
              <p className="text-xs text-muted-foreground">
                {d.vehicle ?? "Vehicle to confirm"} · updated {dayDate(d.updated_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label(d.stage)}</p>
              {Number(d.value) > 0 && <p className="text-sm font-semibold">{money(d.value)}</p>}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Quotes & proposals" icon={<FileText className="h-4 w-4" />}>
        {data.proposals.length === 0 && <Empty>No proposals yet.</Empty>}
        {data.proposals.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.vehicle ?? "—"} · {label(p.status)}
                {p.signed_at ? ` · signed ${dayDate(p.signed_at)}` : ""}
                {Number(p.total) > 0 ? ` · ${money(p.total)}` : ""}
              </p>
            </div>
            <Link
              to="/p/proposal/$token"
              params={{ token: p.token }}
              className="text-sm text-bronze underline-offset-4 hover:underline"
            >
              {p.signed_at ? "View" : "Review & sign"}
            </Link>
          </div>
        ))}
      </Card>

      <Card title="Warranty certificates" icon={<BadgeCheck className="h-4 w-4" />}>
        {data.warranties.length === 0 && <Empty>No certificates issued yet.</Empty>}
        {data.warranties.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{w.certificate_number}</p>
              <p className="text-xs text-muted-foreground">
                {w.vehicle ?? "—"} · {w.product ?? "—"} · covered through{" "}
                {w.expires_at ? dayDate(w.expires_at) : "lifetime"}
                {w.roll_lots?.length ? ` · lot ${w.roll_lots.join(", ")}` : ""}
              </p>
            </div>
            <Link
              to="/p/warranty/$token"
              params={{ token: w.token }}
              className="text-sm text-bronze underline-offset-4 hover:underline"
            >
              Open certificate
            </Link>
          </div>
        ))}
      </Card>

      <Card title="Aftercare messages" icon={<MessageSquare className="h-4 w-4" />}>
        {data.aftercare.length === 0 && <Empty>Nothing yet — aftercare starts after your install.</Empty>}
        {data.aftercare.map((t) => (
          <div key={t.id} className="px-5 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label(t.kind)} · {t.sent_at ? `sent ${dayDate(t.sent_at)}` : `due ${dayDate(t.scheduled_for)}`}
            </p>
            <p className="mt-1 text-sm">{t.body}</p>
          </div>
        ))}
      </Card>

      {data.payments.length > 0 && (
        <Card title="Payments" icon={<Receipt className="h-4 w-4" />}>
          {data.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-sm">
                {label(p.kind)} · {label(p.method)}
                {p.paid_at ? ` · ${dayDate(p.paid_at)}` : ""}
              </p>
              <p className="text-sm font-semibold">{money(p.amount)}</p>
            </div>
          ))}
        </Card>
      )}

      {data.reviewUrl && (
        <p className="pb-6 text-center text-xs text-muted-foreground">
          Happy with the work?{" "}
          <a href={data.reviewUrl} className="text-bronze underline-offset-4 hover:underline">
            Leave {data.shopName} a review
          </a>
          .
        </p>
      )}
    </Shell>
  );
}
