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
    <section className="rounded-xl border border-elevated bg-surface">
      <header className="flex items-center gap-2 border-b border-elevated px-4 py-3">
        <span className="text-bronze">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </header>
      <div className="divide-y divide-elevated">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{children}</p>;
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
  const now = new Date();
  const upcoming = data.jobs
    .filter((j) => j.scheduled_start && new Date(j.scheduled_start) >= now && !j.key_released)
    .slice(0, 3);
  const inShop = data.jobs.filter(
    (j) => !j.key_released && (j.status === "in_progress" || j.qc_status === "in_review" || j.status === "ready_for_pickup"),
  );
  const history = data.jobs.filter((j) => j.key_released || j.status === "completed" || j.status === "invoiced");

  const STEPS = ["Booked", "Checked in", "In the shop", "Final check", "Ready"] as const;
  const stepIndex = (j: (typeof data.jobs)[number]) => {
    if (j.key_released || j.status === "completed" || j.status === "invoiced") return 4;
    if (j.status === "ready_for_pickup" || j.qc_status === "passed") return 4;
    if (j.qc_status === "in_review") return 3;
    if (j.status === "in_progress") return 2;
    if (j.checked_in_at) return 1;
    return 0;
  };

  return (
    <Shell>
      <div className="rounded-xl border border-bronze/40 bg-surface p-6">
        <p className="micro-label">{data.shopName}</p>
        <h1 className="display-title mt-2 text-3xl">Hello, {data.customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your vehicle, review quotes, see your photos and keep every document in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Vehicles", value: String(data.vehicles.length) },
          { label: "In the shop", value: String(inShop.length) },
          { label: "Paid to date", value: money(data.billing.paid) },
          { label: "Balance", value: money(data.billing.balance) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-elevated bg-surface px-4 py-3">
            <p className="micro-label">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {inShop.length > 0 && (
        <Card title="Where your vehicle is right now" icon={<Wrench className="h-4 w-4" />}>
          {inShop.map((j) => {
            const idx = stepIndex(j);
            return (
              <div key={j.id} className="px-4 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{j.vehicle ?? j.title}</p>
                  <p className="text-xs text-muted-foreground">{label(j.service_type)}</p>
                </div>
                <div className="mt-3 flex gap-1">
                  {STEPS.map((s, i) => (
                    <div key={s} className="min-w-0 flex-1">
                      <div className={i <= idx ? "h-1 rounded-full bg-bronze" : "h-1 rounded-full bg-elevated"} />
                      <p
                        className={
                          i === idx
                            ? "mt-1.5 truncate text-[10px] font-semibold text-bronze"
                            : "mt-1.5 truncate text-[10px] text-muted-foreground"
                        }
                      >
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card title="Your appointments" icon={<CalendarClock className="h-4 w-4" />}>
          {upcoming.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {new Date(j.scheduled_start as string).toLocaleString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {j.vehicle ?? j.title} · {label(j.service_type)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {j.is_mobile
                  ? `We come to you${j.service_city ? ` · ${j.service_city}` : ""}${j.arrival_window ? ` · ${j.arrival_window}` : ""}`
                  : "At the shop"}
              </p>
            </div>
          ))}
        </Card>
      )}

      {data.photos.length > 0 && (
        <Card title="Photos from your install" icon={<Camera className="h-4 w-4" />} hint={`${data.photos.length}`}>
          <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
            {data.photos.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-elevated"
              >
                <img src={p.url} alt="Install photo" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        </Card>
      )}

      <Card title="Your vehicles" icon={<Car className="h-4 w-4" />}>
        {data.vehicles.length === 0 && <Empty>No vehicles on file yet.</Empty>}
        {data.vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm font-semibold">{v.label}</p>
            {v.plate && <span className="text-xs text-muted-foreground">{v.plate}</span>}
          </div>
        ))}
      </Card>

      <Card title="Work in progress" icon={<Receipt className="h-4 w-4" />} hint={`${active.length} open`}>
        {active.length === 0 && <Empty>Nothing in progress right now.</Empty>}
        {active.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
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
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
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
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
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
          <div key={t.id} className="px-4 py-3">
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
            <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
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
