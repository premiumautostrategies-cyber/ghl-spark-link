import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { money, label as fmtLabel } from "@/lib/format";
import { makeToken } from "@/lib/shop";
import { Copy, Trash2 } from "lucide-react";
import { CoverageVisual } from "@/components/coverage-visual";
import { resolveBodyStyle } from "@/lib/vehicle-library";
import { PPF_PRESETS, TINT_PRESETS, type CoverageKind } from "@/lib/coverage-presets";
import { useQuery as useRQ } from "@tanstack/react-query";

type Coverage = { coverage_kind?: string | null; coverage_keys?: string[] | null };

type Tier = {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  includes: string[];
  price: number | string;
  labor_hours: number | string;
  film_feet: number | string;
  is_recommended: boolean;
  sort_order: number;
} & Coverage;

type Addon = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  labor_hours: number | string;
  film_feet: number | string;
  sort_order: number;
} & Coverage;

const COVERAGE_OPTIONS: { value: string; label: string; kind: CoverageKind; keys: string[] }[] = [
  { value: "none", label: "No diagram", kind: "none", keys: [] },
  ...PPF_PRESETS.map((p) => ({
    value: `panels:${p.name}`,
    label: `Film — ${p.name}`,
    kind: "panels" as const,
    keys: p.panels,
  })),
  ...TINT_PRESETS.map((p) => ({
    value: `tint:${p.name}`,
    label: `Tint — ${p.name}`,
    kind: "tint" as const,
    keys: p.windows,
  })),
];

function coverageValue(row: Coverage) {
  const keys = row.coverage_keys ?? [];
  const kind = row.coverage_kind === "tint" ? "tint" : row.coverage_kind === "none" ? "none" : "panels";
  if (kind === "none" || keys.length === 0) return "none";
  const hit = COVERAGE_OPTIONS.find(
    (o) => o.kind === kind && o.keys.length === keys.length && o.keys.every((k) => keys.includes(k)),
  );
  return hit?.value ?? "none";
}

const DEFAULT_ADDONS = [
  { name: "Ceramic boost topper", description: "Hydrophobic topper over the film", price: 350, labor_hours: 1.5, film_feet: 0 },
  { name: "Glass coating", description: "Windshield and side glass", price: 250, labor_hours: 2, film_feet: 0 },
  { name: "Wheel face protection", description: "Coating on all four faces", price: 300, labor_hours: 2, film_feet: 0 },
  { name: "Windshield defense film", description: "Impact-resistant clear film", price: 795, labor_hours: 2.5, film_feet: 6 },
];

export function DealProposal({
  dealId,
  deal,
  quoteTotal,
  quoteHours,
}: {
  dealId: string;
  deal: {
    title?: string | null;
    customer_id?: string | null;
    vehicle_id?: string | null;
    service_tags?: string[] | null;
  };
  quoteTotal: number;
  quoteHours: number;
}) {
  const qc = useQueryClient();
  const { orgId, locId, organization } = useOrg();
  const [copied, setCopied] = useState(false);

  const { data: proposal } = useQuery({
    queryKey: ["deal-proposal", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, proposal_tiers(*), proposal_addons(*)")
        .eq("deal_id", dealId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal-proposal", dealId] });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      const base = quoteTotal > 0 ? quoteTotal : 1800;
      const hours = quoteHours > 0 ? quoteHours : 6;
      const { data: created, error } = await supabase
        .from("proposals")
        .insert({
          organization_id: orgId,
          location_id: locId,
          deal_id: dealId,
          customer_id: deal.customer_id ?? null,
          vehicle_id: deal.vehicle_id ?? null,
          token: makeToken(),
          title: deal.title ?? "Protection proposal",
          deposit_percent: Number(organization?.deposit_percent ?? 30),
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;

      const tiers = [
        {
          tier: "good",
          name: "Essential",
          description: "Core coverage on the highest-impact surfaces.",
          includes: ["High-impact front coverage", "Manufacturer film warranty", "Post-install cure check"],
          price: Math.round(base),
          labor_hours: hours,
          film_feet: Math.round(hours * 3),
          sort_order: 0,
          is_recommended: false,
        },
        {
          tier: "better",
          name: "Signature",
          description: "Wider coverage plus a ceramic topper for gloss and wash-down.",
          includes: ["Extended panel coverage", "Ceramic topper", "Wheel face coating", "10-year film warranty"],
          price: Math.round(base * 1.3),
          labor_hours: Math.round(hours * 1.3 * 10) / 10,
          film_feet: Math.round(hours * 4),
          sort_order: 1,
          is_recommended: true,
        },
        {
          tier: "best",
          name: "Track",
          description: "Full-surface protection with glass and interior coverage.",
          includes: ["Full-vehicle coverage", "Glass coating", "Windshield defense", "Interior protection", "Lifetime workmanship"],
          price: Math.round(base * 1.85),
          labor_hours: Math.round(hours * 1.8 * 10) / 10,
          film_feet: Math.round(hours * 6),
          sort_order: 2,
          is_recommended: false,
        },
      ].map((t) => ({ ...t, organization_id: orgId, proposal_id: created.id }));

      await supabase.from("proposal_tiers").insert(tiers);
      await supabase.from("proposal_addons").insert(
        DEFAULT_ADDONS.map((a, i) => ({
          ...a,
          organization_id: orgId,
          proposal_id: created.id,
          sort_order: i,
        })),
      );
      return created.id;
    },
    onSuccess: () => {
      toast.success("Proposal built from the quote");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchTier = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Tier> }) => {
      const { error } = await supabase.from("proposal_tiers").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const patchAddon = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Addon> }) => {
      const { error } = await supabase.from("proposal_addons").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAddon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposal_addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addAddon = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !proposal) throw new Error("Build the proposal first");
      const { error } = await supabase.from("proposal_addons").insert({
        organization_id: orgId,
        proposal_id: proposal.id,
        name: String(form.get("name") || "Add-on"),
        price: Number(form.get("price") || 0),
        labor_hours: Number(form.get("hours") || 0),
        film_feet: Number(form.get("feet") || 0),
        sort_order: (proposal.proposal_addons?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setDeposit = useMutation({
    mutationFn: async (percent: number) => {
      if (!proposal) return;
      const { error } = await supabase
        .from("proposals")
        .update({ deposit_percent: percent })
        .eq("id", proposal.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!proposal) throw new Error("Build the proposal first");
      const { error } = await supabase
        .from("proposals")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", proposal.id);
      if (error) throw error;
      const link = `${window.location.origin}/p/proposal/${proposal.token}`;
      await supabase.from("messages").insert({
        organization_id: orgId,
        deal_id: dealId,
        customer_id: deal.customer_id ?? null,
        channel: "sms",
        direction: "out",
        is_automated: true,
        body: `Your proposal is ready — pick your package, add options, sign and pay the deposit here: ${link}`,
      });
      await supabase
        .from("deals")
        .update({ stage: "quoted", last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
    },
    onSuccess: () => {
      toast.success("Interactive proposal sent");
      invalidate();
      qc.invalidateQueries({ queryKey: ["deal-messages", dealId] });
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!proposal) {
    return (
      <Panel>
        <SectionTitle
          title="Interactive proposal"
          hint="Good / Better / Best with live add-ons, e-signature and a deposit gate."
        />
        <div className="border-t border-elevated p-4">
          <p className="text-xs text-muted-foreground">
            Build three tiers from the current quote, then send one link the customer can configure and sign.
          </p>
          <Button className="mt-3" onClick={() => create.mutate()} disabled={create.isPending}>
            Build interactive proposal
          </Button>
        </div>
      </Panel>
    );
  }

  const tiers = ([...(proposal.proposal_tiers ?? [])] as Tier[]).sort((a, b) => a.sort_order - b.sort_order);
  const addons = ([...(proposal.proposal_addons ?? [])] as Addon[]).sort((a, b) => a.sort_order - b.sort_order);
  const link = typeof window !== "undefined" ? `${window.location.origin}/p/proposal/${proposal.token}` : "";
  const chosen = tiers.find((t) => t.id === proposal.selected_tier_id);

  return (
    <Panel className="min-w-0">
      <SectionTitle
        title="Interactive proposal"
        hint="Tiers and add-ons recalculate price, labour hours and film feet live."
        right={<Tag tone={proposal.status === "paid" ? "revenue" : proposal.status === "draft" ? "muted" : "comms"}>{fmtLabel(proposal.status)}</Tag>}
      />
      <div className="space-y-4 border-t border-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.id} className="rounded-2xl border border-elevated bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Input
                  className="h-7 border-0 bg-transparent px-0 text-sm font-semibold focus-visible:ring-0"
                  defaultValue={t.name}
                  onBlur={(e) =>
                    e.target.value !== t.name && patchTier.mutate({ id: t.id, patch: { name: e.target.value } })
                  }
                />
                <button
                  type="button"
                  title="Mark as recommended"
                  onClick={() => patchTier.mutate({ id: t.id, patch: { is_recommended: !t.is_recommended } })}
                  className={t.is_recommended ? "text-bronze" : "text-muted-foreground"}
                >
                  ★
                </button>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t.tier}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <NumField label="$" value={t.price} onCommit={(v) => patchTier.mutate({ id: t.id, patch: { price: v } })} />
                <NumField label="h" value={t.labor_hours} onCommit={(v) => patchTier.mutate({ id: t.id, patch: { labor_hours: v } })} />
                <NumField label="ft" value={t.film_feet} onCommit={(v) => patchTier.mutate({ id: t.id, patch: { film_feet: v } })} />
              </div>
              <ul className="mt-2 space-y-0.5">
                {t.includes.map((inc) => (
                  <li key={inc} className="text-[11px] text-muted-foreground">• {inc}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <p className="micro-label mb-2">Live add-ons</p>
          <div className="space-y-1.5">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-elevated bg-surface-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                <NumField label="$" value={a.price} onCommit={(v) => patchAddon.mutate({ id: a.id, patch: { price: v } })} />
                <NumField label="h" value={a.labor_hours} onCommit={(v) => patchAddon.mutate({ id: a.id, patch: { labor_hours: v } })} />
                <NumField label="ft" value={a.film_feet} onCommit={(v) => patchAddon.mutate({ id: a.id, patch: { film_feet: v } })} />
                <button type="button" onClick={() => removeAddon.mutate(a.id)} className="text-muted-foreground hover:text-critical">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addAddon.mutate(new FormData(e.currentTarget));
              e.currentTarget.reset();
            }}
          >
            <Input name="name" placeholder="New add-on" className="h-8 min-w-[140px] flex-1" />
            <Input name="price" type="number" step="1" placeholder="$" className="h-8 w-20" />
            <Input name="hours" type="number" step="0.5" placeholder="h" className="h-8 w-16" />
            <Input name="feet" type="number" step="1" placeholder="ft" className="h-8 w-16" />
            <Button type="submit" size="sm" variant="outline">Add</Button>
          </form>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-elevated pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Deposit required</Label>
            <div className="flex gap-1.5">
              {[20, 30, 40, 50].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDeposit.mutate(p)}
                  className={
                    Number(proposal.deposit_percent) === p
                      ? "rounded-lg border border-bronze bg-bronze/15 px-2.5 py-1 text-xs text-bronze"
                      : "rounded-lg border border-elevated bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground"
                  }
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            Send interactive proposal
          </Button>
          {proposal.status !== "draft" && (
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setCopied(true);
                toast.success("Customer link copied");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy link"}
            </Button>
          )}
        </div>

        {proposal.signed_at && (
          <div className="rounded-xl border border-revenue/40 bg-revenue/10 p-3 text-sm">
            Signed by {proposal.signature_name} · {chosen?.name ?? "package"} · {money(proposal.total)}
            {proposal.paid_at ? ` · deposit ${money(proposal.deposit_amount)} paid` : " · deposit due at drop-off"}
          </div>
        )}
      </div>
    </Panel>
  );
}

function NumField({
  label: l,
  value,
  onCommit,
}: {
  label: string;
  value: number | string;
  onCommit: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-elevated bg-surface px-1.5">
      <span className="text-[10px] text-muted-foreground">{l}</span>
      <input
        className="h-7 w-14 bg-transparent text-xs tabular-nums outline-none"
        type="number"
        step="0.5"
        defaultValue={Number(value)}
        onBlur={(e) => Number(e.target.value) !== Number(value) && onCommit(Number(e.target.value || 0))}
      />
    </span>
  );
}
