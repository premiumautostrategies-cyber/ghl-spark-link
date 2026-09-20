import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getProposalByToken, saveProposalSelection, signProposal } from "@/lib/portal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { Check, Maximize2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { CoverageVisual } from "@/components/coverage-visual";
import { resolveBodyStyle } from "@/lib/vehicle-library";
import { BODY_LABELS, type BodyStyle } from "@/lib/vehicle-art";
import { coverageItemLabels, coverageLabel, type CoverageKind } from "@/lib/coverage-presets";

export const Route = createFileRoute("/p/proposal/$token")({
  head: () => ({
    meta: [
      { title: "Your proposal — Systemize" },
      { name: "description", content: "See exactly what each package covers on your vehicle, then sign and pay your deposit online." },
      { property: "og:title", content: "Your vehicle protection proposal" },
      { property: "og:description", content: "See exactly what each package covers on your vehicle, then sign and pay your deposit online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getProposalByToken({ data: { token: params.token } }),
  errorComponent: () => <Shell><p className="text-sm text-muted-foreground">This proposal link could not be opened.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-sm text-muted-foreground">Proposal not found.</p></Shell>,
  component: ProposalPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

type Covered = { coverage_kind?: string | null; coverage_keys?: string[] | null };

function ProposalPage() {
  const data = Route.useLoaderData();
  const [tierId, setTierId] = useState<string | null>(data?.proposal.selected_tier_id ?? null);
  const [addonIds, setAddonIds] = useState<string[]>(data?.proposal.selected_addon_ids ?? []);
  const [name, setName] = useState(data?.proposal.signature_name ?? data?.customerName ?? "");
  const [zoom, setZoom] = useState<{ title: string; kind: CoverageKind; keys: string[] } | null>(null);
  const [done, setDone] = useState(
    data?.proposal.status === "signed" || data?.proposal.status === "paid",
  );
  const [busy, setBusy] = useState(false);

  const tiers = data?.tiers ?? [];
  const addons = data?.addons ?? [];
  const depositPercent = Number(data?.proposal.deposit_percent ?? 30);
  const accent = data?.accent ?? "#c99a5b";
  const body: BodyStyle = resolveBodyStyle(
    data?.vehicleParts?.make,
    data?.vehicleParts?.model,
    data?.vehicleParts?.year ? Number(data.vehicleParts.year) : null,
  );

  const totals = useMemo(() => {
    const tier = tiers.find((t) => t.id === tierId);
    const picked = addons.filter((a) => addonIds.includes(a.id));
    const price = Number(tier?.price ?? 0) + picked.reduce((t, a) => t + Number(a.price), 0);
    const hours = Number(tier?.labor_hours ?? 0) + picked.reduce((t, a) => t + Number(a.labor_hours), 0);
    const feet = Number(tier?.film_feet ?? 0) + picked.reduce((t, a) => t + Number(a.film_feet), 0);
    return { price, hours, feet, deposit: Math.round(price * (depositPercent / 100) * 100) / 100 };
  }, [tierId, addonIds, tiers, addons, depositPercent]);

  if (!data) {
    return <Shell><p className="text-sm text-muted-foreground">This proposal link is no longer active.</p></Shell>;
  }

  const persist = (nextTier: string | null, nextAddons: string[]) => {
    void saveProposalSelection({
      data: { token: data.proposal.token, tierId: nextTier, addonIds: nextAddons },
    }).catch(() => undefined);
  };

  const toggleAddon = (id: string) => {
    const next = addonIds.includes(id) ? addonIds.filter((a) => a !== id) : [...addonIds, id];
    setAddonIds(next);
    persist(tierId, next);
  };

  async function submit(payDeposit: boolean) {
    if (!tierId) {
      toast.error("Choose a package first");
      return;
    }
    if (!name.trim()) {
      toast.error("Type your name to sign");
      return;
    }
    setBusy(true);
    try {
      await signProposal({
        data: { token: data!.proposal.token, tierId, addonIds, signatureName: name.trim(), payDeposit },
      });
      setDone(true);
      toast.success(payDeposit ? "Signed — deposit received" : "Proposal signed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <header className="mb-6">
        <p className="micro-label">{data.shopName}</p>
        <h1 className="display-title mt-2 text-3xl">{data.proposal.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {[data.customerName, data.vehicle].filter(Boolean).join(" · ") || "Prepared for you"}
          {` · shown on a ${BODY_LABELS[body].toLowerCase()} layout`}
        </p>
      </header>

      {done ? (
        <div className="rounded-2xl border border-revenue/40 bg-revenue/10 p-6">
          <ShieldCheck className="h-6 w-6 text-revenue" />
          <h2 className="mt-3 font-display text-xl">You're booked in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Thanks {name || "—"}. We've got your approval for {money(totals.price)}
            {data.proposal.status === "paid" ? ` and your ${money(totals.deposit)} deposit.` : "."} We'll text
            you to lock in a drop-off time.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <section>
            <p className="micro-label mb-2">Choose your package — tap a diagram to see it full size</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {tiers.map((t) => {
                const active = t.id === tierId;
                const kind = kindOf(t as Covered);
                const keys = keysOf(t as Covered);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex flex-col rounded-2xl border p-4 text-left transition-colors",
                      active ? "border-bronze bg-bronze/10" : "border-elevated bg-surface",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.is_recommended && (
                        <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-bronze">
                          Popular
                        </span>
                      )}
                    </div>

                    {kind !== "none" && keys.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setZoom({ title: t.name, kind, keys })}
                        className="group relative mt-3 rounded-xl border border-hairline/60 bg-surface-2/60 p-2"
                        aria-label={`Enlarge ${t.name} coverage`}
                      >
                        <CoverageVisual
                          kind={kind === "tint" ? "tint" : "panels"}
                          body={body}
                          covered={keys}
                          accent={accent}
                          className={kind === "tint" ? "max-h-28" : "max-h-40"}
                        />
                        <span className="absolute right-2 top-2 rounded-md bg-background/70 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          <Maximize2 className="h-3.5 w-3.5" />
                        </span>
                        <span className="mt-1 block text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                          {coverageLabel(kind, keys)}
                        </span>
                      </button>
                    )}

                    <p className="mt-3 font-display text-2xl text-bronze">{money(t.price)}</p>
                    {t.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{t.description}</p>
                    )}
                    <ul className="mt-3 space-y-1">
                      {(t.includes ?? []).map((inc) => (
                        <li key={inc} className="flex gap-1.5 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-bronze" /> {inc}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setTierId(t.id);
                        persist(t.id, addonIds);
                      }}
                    >
                      {active ? "Selected" : "Choose this"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          {addons.length > 0 && (
            <section>
              <p className="micro-label mb-2">Add protection</p>
              <div className="space-y-2">
                {addons.map((a) => {
                  const active = addonIds.includes(a.id);
                  const kind = kindOf(a as Covered);
                  const keys = keysOf(a as Covered);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddon(a.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        active ? "border-bronze bg-bronze/10" : "border-elevated bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                          active ? "border-bronze bg-bronze text-background" : "border-elevated",
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {kind !== "none" && keys.length > 0 && (
                        <span className="hidden w-20 shrink-0 sm:block">
                          <CoverageVisual
                            kind={kind === "tint" ? "tint" : "panels"}
                            body={body}
                            covered={keys}
                            accent={accent}
                          />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{a.name}</span>
                        {a.description && (
                          <span className="block text-xs text-muted-foreground">{a.description}</span>
                        )}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-bronze">+{money(a.price)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-elevated bg-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-bronze">{money(totals.price)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Shop time {totals.hours} h{totals.feet ? ` · ${totals.feet} ft of film` : ""}</span>
              <span>Deposit today {money(totals.deposit)} ({depositPercent}%)</span>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="sig" className="text-xs">Type your full name to sign</Label>
              <Input id="sig" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => submit(true)} disabled={busy}>
                Sign &amp; pay {money(totals.deposit)} deposit
              </Button>
              <Button variant="outline" onClick={() => submit(false)} disabled={busy}>
                Approve, pay at drop-off
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Card processing runs in demo mode on this workspace — approving records the deposit against your job.
            </p>
          </section>
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-elevated bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl">{zoom.title}</p>
                <p className="text-xs text-muted-foreground">
                  {coverageLabel(zoom.kind, zoom.keys)} · {data.vehicle ?? BODY_LABELS[body]}
                </p>
              </div>
              <button type="button" onClick={() => setZoom(null)} aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-4">
              <CoverageVisual
                kind={zoom.kind === "tint" ? "tint" : "panels"}
                body={body}
                covered={zoom.keys}
                accent={accent}
                className={zoom.kind === "tint" ? "max-h-64" : "max-h-[26rem]"}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {coverageItemLabels(zoom.kind, zoom.keys).map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-bronze/40 bg-bronze/10 px-2.5 py-0.5 text-[11px] text-bronze"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
