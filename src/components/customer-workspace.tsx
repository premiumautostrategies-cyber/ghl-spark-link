import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Car, ExternalLink, FileText, Link as LinkIcon, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/os-ui";
import { label, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sinceLabel, stageLabel } from "@/lib/pipeline";

type TabKey = "vehicles" | "projects" | "quotes" | "money" | "documents";

const TABS: { key: TabKey; label: string }[] = [
  { key: "vehicles", label: "Vehicles" },
  { key: "projects", label: "Projects" },
  { key: "quotes", label: "Quotes" },
  { key: "money", label: "Money" },
  { key: "documents", label: "Documents" },
];

function vehicleName(v: { year?: number | null; make?: string | null; model?: string | null; color?: string | null }) {
  return [v.year, v.make, v.model, v.color].filter(Boolean).join(" ") || "Vehicle";
}

export function CustomerWorkspace({
  customerId,
  onClose,
  onOpenDeal,
  onAddVehicle,
}: {
  customerId: string | null;
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
  onAddVehicle?: (customerId: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("vehicles");
  const enabled = Boolean(customerId);

  const { data: customer } = useQuery({
    queryKey: ["customer-workspace", customerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, vehicles(id,year,make,model,color,plate,vin)")
        .eq("id", customerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bundle } = useQuery({
    queryKey: ["customer-workspace-bundle", customerId],
    enabled,
    queryFn: async () => {
      const [jobs, deals, proposals, payments, documents] = await Promise.all([
        supabase
          .from("jobs")
          .select("id,title,status,price,scheduled_start,service_type,vehicle_id,installer,is_mobile,qc_status")
          .eq("customer_id", customerId!)
          .order("scheduled_start", { ascending: false }),
        supabase
          .from("deals")
          .select("id,title,stage,value,vehicle_id,last_activity_at,created_at")
          .eq("customer_id", customerId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("proposals")
          .select("id,token,title,status,total,deposit_amount,sent_at,viewed_at,signed_at,paid_at,customer_id")
          .eq("customer_id", customerId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,amount,kind,status,method,paid_at,created_at,job_id")
          .eq("customer_id", customerId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("documents")
          .select("id,name,doc_type,status,signed_at,updated_at,vehicle_id")
          .eq("customer_id", customerId!)
          .order("updated_at", { ascending: false }),
      ]);
      return {
        jobs: jobs.data ?? [],
        deals: deals.data ?? [],
        proposals: proposals.data ?? [],
        payments: payments.data ?? [],
        documents: documents.data ?? [],
      };
    },
  });

  const jobs = bundle?.jobs ?? [];
  const deals = bundle?.deals ?? [];
  const payments = bundle?.payments ?? [];

  const totals = useMemo(() => {
    const lifetime = jobs.reduce((t, j) => t + Number(j.price ?? 0), 0);
    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((t, p) => t + Number(p.amount ?? 0), 0);
    const owed = payments
      .filter((p) => p.status !== "paid")
      .reduce((t, p) => t + Number(p.amount ?? 0), 0);
    const open = deals.filter((d) => !["won", "lost"].includes(d.stage ?? "")).length;
    return { lifetime, paid, owed, open };
  }, [jobs, payments, deals]);

  const phone = customer?.phone?.trim() || null;
  const vehicles = customer?.vehicles ?? [];

  return (
    <Sheet open={enabled} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-elevated bg-surface p-0 sm:max-w-[600px]"
      >
        {!customer ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <header className="space-y-3 border-b border-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">{customer.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {[customer.company, customer.email, phone].filter(Boolean).join(" · ") ||
                      "No contact details"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tabular-nums text-bronze">
                    {money(totals.lifetime)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Lifetime</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { k: "Vehicles", v: String(vehicles.length) },
                  { k: "Projects", v: String(jobs.length) },
                  { k: "Open deals", v: String(totals.open) },
                  { k: "Balance", v: money(totals.owed) },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-elevated bg-surface-2 px-2 py-1.5">
                    <p className="text-sm font-semibold tabular-nums">{s.v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.k}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild disabled={!phone}>
                  <a href={phone ? `sms:${phone}` : "#"}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Text
                  </a>
                </Button>
                <Button size="sm" variant="secondary" asChild disabled={!phone}>
                  <a href={phone ? `tel:${phone}` : "#"}>
                    <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!customer.portal_token}
                  onClick={() => {
                    void navigator.clipboard?.writeText(
                      `${window.location.origin}/p/portal/${customer.portal_token}`,
                    );
                    toast.success("Customer hub link copied");
                  }}
                >
                  <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Hub link
                </Button>
                {onAddVehicle && (
                  <Button size="sm" variant="secondary" onClick={() => onAddVehicle(customer.id)}>
                    <Car className="mr-1.5 h-3.5 w-3.5" /> Vehicle
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/estimates">New quote</Link>
                </Button>
              </div>
            </header>

            <nav className="flex gap-1 border-b border-elevated px-4">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                    tab === t.key
                      ? "border-bronze text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 space-y-3 p-5">
              {tab === "vehicles" &&
                (vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vehicles on file.</p>
                ) : (
                  vehicles.map((v) => {
                    const history = jobs.filter((j) => j.vehicle_id === v.id);
                    const spend = history.reduce((t, j) => t + Number(j.price ?? 0), 0);
                    return (
                      <div key={v.id} className="rounded-lg border border-elevated bg-surface-2 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Car className="h-4 w-4 text-bronze" />
                          <span className="text-sm font-medium">{vehicleName(v)}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {[v.plate, `${history.length} projects · ${money(spend)}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        {history.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-elevated pt-2">
                            {history.map((j) => (
                              <li
                                key={j.id}
                                className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                              >
                                <span className="min-w-0 truncate">
                                  {j.title} · {label(j.status)}
                                </span>
                                <span className="whitespace-nowrap">
                                  {shortDate(j.scheduled_start)} · {money(j.price ?? 0)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {v.vin && <p className="mt-2 text-[11px] text-muted-foreground">VIN {v.vin}</p>}
                      </div>
                    );
                  })
                ))}

              {tab === "projects" &&
                (jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects yet.</p>
                ) : (
                  jobs.map((j) => {
                    const v = vehicles.find((x) => x.id === j.vehicle_id);
                    return (
                      <div key={j.id} className="rounded-lg border border-elevated bg-surface-2 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{j.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {v ? vehicleName(v) : "No vehicle"}
                              {j.installer ? ` · ${j.installer}` : ""}
                              {j.is_mobile ? " · Mobile" : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {money(j.price ?? 0)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Tag tone="muted">{label(j.status)}</Tag>
                          {j.qc_status && <span>QC {label(j.qc_status)}</span>}
                          <span>· {shortDate(j.scheduled_start)}</span>
                        </div>
                      </div>
                    );
                  })
                ))}

              {tab === "quotes" && (
                <>
                  {deals.length === 0 && (bundle?.proposals.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No quotes or opportunities yet.</p>
                  )}
                  {deals.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onOpenDeal?.(d.id)}
                      className="w-full rounded-lg border border-elevated bg-surface-2 p-3 text-left transition-colors hover:border-bronze/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium">{d.title}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-bronze">
                          {money(d.value ?? 0)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Tag tone="muted">{stageLabel(d.stage ?? "")}</Tag>
                        {d.last_activity_at && <span>Activity {sinceLabel(d.last_activity_at)}</span>}
                      </div>
                    </button>
                  ))}
                  {bundle?.proposals.map((p) => (
                    <div key={p.id} className="rounded-lg border border-elevated bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium">{p.title}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {money(p.total ?? 0)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Tag tone="muted">{label(p.status ?? "")}</Tag>
                        {p.viewed_at && <span>Viewed {sinceLabel(p.viewed_at)}</span>}
                        {p.paid_at && <span>· Deposit paid</span>}
                      </div>
                      <a
                        href={`/p/proposal/${p.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-bronze underline"
                      >
                        Customer link <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </>
              )}

              {tab === "money" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-elevated bg-surface-2 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Collected</p>
                      <p className="text-base font-semibold tabular-nums">{money(totals.paid)}</p>
                    </div>
                    <div className="rounded-lg border border-elevated bg-surface-2 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
                      <p className="text-base font-semibold tabular-nums">{money(totals.owed)}</p>
                    </div>
                  </div>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded.</p>
                  ) : (
                    payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-elevated bg-surface-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate capitalize">{p.kind}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[label(p.status ?? ""), p.method, shortDate(p.paid_at ?? p.created_at)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">{money(p.amount ?? 0)}</span>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === "documents" &&
                ((bundle?.documents.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents yet — check-in forms, QC sheets and warranties land here automatically.
                  </p>
                ) : (
                  bundle?.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-elevated bg-surface-2 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-bronze" />
                        <div className="min-w-0">
                          <p className="truncate">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[label(d.doc_type ?? ""), label(d.status ?? "")].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {shortDate(d.updated_at)}
                      </span>
                    </div>
                  ))
                ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
