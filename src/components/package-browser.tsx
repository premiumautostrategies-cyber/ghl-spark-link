import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Clock, Search, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { PageHeader } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import {
  ALL_ICON,
  CATEGORY_NAME,
  PACKAGE_BY_ID,
  PACKAGE_CATEGORIES,
  PACKAGE_ITEMS,
  VEHICLE_CLASSES,
  classPrice,
  type PackageCategorySlug,
  type PackageItem,
  type VehicleClass,
} from "@/lib/packages-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({
    meta: [
      { title: "Services & Packages — Systemize" },
      {
        name: "description",
        content:
          "Protection, wrap, coating, tint and detailing packages with vehicle-class pricing and coverage specs.",
      },
      { property: "og:title", content: "Services & Packages — Systemize" },
      {
        property: "og:description",
        content:
          "Protection, wrap, coating, tint and detailing packages with vehicle-class pricing and coverage specs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PackagesPage,
});

type CatFilter = PackageCategorySlug | "all";

function PackagesPage() {
  const [cat, setCat] = useState<CatFilter>("all");
  const [vclass, setVclass] = useState<VehicleClass>(VEHICLE_CLASSES[0]!);
  const [term, setTerm] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quoteFor, setQuoteFor] = useState<PackageItem | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: PACKAGE_ITEMS.length };
    for (const p of PACKAGE_ITEMS) map[p.category] = (map[p.category] ?? 0) + 1;
    return map;
  }, []);

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    return PACKAGE_ITEMS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.includes(q)) ||
        p.features.some((f) => f.toLowerCase().includes(q)) ||
        CATEGORY_NAME[p.category].toLowerCase().includes(q)
      );
    });
  }, [cat, term]);

  const price = (p: PackageItem) => classPrice(p.basePrice, vclass.multiplier);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Services & Packages"
        subtitle="Every package we sell, priced for the vehicle in front of you."
        action={
          <div className="flex rounded-full border border-elevated bg-surface p-1">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
                  view === v
                    ? "bg-bronze text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "grid" ? "Grid" : "Compare"}
              </button>
            ))}
          </div>
        }
      />

      {/* Category tabs */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CatTab
          active={cat === "all"}
          onClick={() => setCat("all")}
          icon={ALL_ICON}
          label="All services"
          count={counts["all"] ?? 0}
        />
        {PACKAGE_CATEGORIES.map((c) => (
          <CatTab
            key={c.slug}
            active={cat === c.slug}
            onClick={() => setCat(c.slug)}
            icon={c.icon}
            label={c.name}
            count={counts[c.slug] ?? 0}
          />
        ))}
      </div>

      {/* Vehicle class + search */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="p-3">
          <p className="micro-label px-1 pb-2">Vehicle class</p>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {VEHICLE_CLASSES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVclass(v)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  vclass.id === v.id
                    ? "border-bronze/60 bg-bronze/10"
                    : "border-elevated bg-surface-2 hover:border-hairline",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    vclass.id === v.id ? "text-bronze" : "text-foreground",
                  )}
                >
                  {v.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{v.hint}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="flex items-center p-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search matte, heat rejection, rock chips…"
              className="h-11 rounded-xl border-elevated bg-surface-2 pl-9"
            />
          </div>
        </Panel>
      </div>

      {visible.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="font-display text-lg">Nothing matches “{term}”</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a finish, a problem or a panel — “satin”, “swirls”, “rocker”.
          </p>
        </Panel>
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <PackageCard
              key={p.id}
              item={p}
              price={price(p)}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onQuote={() => setQuoteFor(p)}
              onPickAddon={(id) => {
                setCat("all");
                setExpanded(id);
                const el = document.getElementById(`pkg-${id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              priceOf={price}
            />
          ))}
        </div>
      ) : (
        <CompareTable items={visible} priceOf={price} onQuote={setQuoteFor} />
      )}

      <QuoteDialog
        item={quoteFor}
        vclass={vclass}
        price={quoteFor ? price(quoteFor) : 0}
        onClose={() => setQuoteFor(null)}
      />
    </div>
  );
}

function CatTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-bronze/60 bg-bronze/10 text-bronze"
          : "border-elevated bg-surface text-muted-foreground hover:border-hairline hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[11px] tabular-nums",
          active ? "bg-bronze/20" : "bg-surface-2",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PackageCard({
  item,
  price,
  expanded,
  onToggle,
  onQuote,
  onPickAddon,
  priceOf,
}: {
  item: PackageItem;
  price: number;
  expanded: boolean;
  onToggle: () => void;
  onQuote: () => void;
  onPickAddon: (id: string) => void;
  priceOf: (p: PackageItem) => number;
}) {
  const addons = item.recommendedAddons
    .map((id) => PACKAGE_BY_ID[id])
    .filter((a): a is PackageItem => !!a);

  return (
    <Panel
      id={`pkg-${item.id}`}
      className={cn(
        "flex flex-col self-start overflow-hidden transition-colors",
        expanded && "border-bronze/40",
      )}
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag tone="muted">{CATEGORY_NAME[item.category]}</Tag>
          {item.badges.map((b) => (
            <Tag key={b.text} tone={b.tone}>
              {b.text}
            </Tag>
          ))}
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.tagline}</p>
        </div>

        <div className="flex items-end justify-between gap-3 border-y border-elevated py-3">
          <div>
            <p className="micro-label">From</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-bronze">
              {money(price)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {item.duration}
          </div>
        </div>

        <ul className="space-y-1.5">
          {item.features.slice(0, expanded ? item.features.length : 4).map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-revenue" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-rig" />
          {item.warranty}
        </p>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-elevated bg-surface-2/60 px-5 py-4">
          <div>
            <p className="micro-label">Prep procedure</p>
            <ul className="mt-2 space-y-1.5">
              {item.prep.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-bronze" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="micro-label flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-bronze" />
              Frequently bundled
            </p>
            <div className="mt-2 space-y-1.5">
              {addons.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onPickAddon(a.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-elevated bg-surface px-3 py-2 text-left transition-colors hover:border-bronze/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {CATEGORY_NAME[a.category]}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-bronze">
                    +{money(priceOf(a))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-elevated p-4">
        <Button className="flex-1" onClick={onQuote}>
          Configure &amp; book
        </Button>
        <Button variant="outline" onClick={onToggle} className="gap-1.5">
          Specs
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>
    </Panel>
  );
}

function CompareTable({
  items,
  priceOf,
  onQuote,
}: {
  items: PackageItem[];
  priceOf: (p: PackageItem) => number;
  onQuote: (p: PackageItem) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-elevated text-left">
              <th className="px-5 py-3 micro-label">Package</th>
              <th className="px-4 py-3 micro-label">Category</th>
              <th className="px-4 py-3 micro-label">Included</th>
              <th className="px-4 py-3 micro-label">Turnaround</th>
              <th className="px-4 py-3 micro-label">Warranty</th>
              <th className="px-4 py-3 text-right micro-label">From</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-elevated">
            {items.map((p) => (
              <tr key={p.id} className="align-top transition-colors hover:bg-surface-2/60">
                <td className="px-5 py-4">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 max-w-[240px] text-xs text-muted-foreground">
                    {p.tagline}
                  </p>
                  {p.badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.badges.map((b) => (
                        <Tag key={b.text} tone={b.tone}>
                          {b.text}
                        </Tag>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {CATEGORY_NAME[p.category]}
                </td>
                <td className="px-4 py-4">
                  <ul className="space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-1.5 text-xs text-muted-foreground">
                        <Check className="mt-0.5 size-3 shrink-0 text-revenue" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                  {p.duration}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{p.warranty}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-bronze">
                  {money(priceOf(p))}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button size="sm" onClick={() => onQuote(p)}>
                    Quote
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function QuoteDialog({
  item,
  vclass,
  price,
  onClose,
}: {
  item: PackageItem | null;
  vclass: VehicleClass;
  price: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [addons, setAddons] = useState<string[]>([]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const picked = addons
    .map((id) => PACKAGE_BY_ID[id])
    .filter((a): a is PackageItem => !!a);
  const total =
    price + picked.reduce((t, a) => t + classPrice(a.basePrice, vclass.multiplier), 0);

  const createLead = useMutation({
    mutationFn: async (form: FormData) => {
      if (!item) return;
      if (!orgId) throw new Error("No workspace selected");
      const name = String(form.get("name") || "").trim();
      const email = String(form.get("email") || "").trim();
      const phone = String(form.get("phone") || "").trim();
      const existing = String(form.get("customer_id") || "");

      let customerId: string | null = existing || null;
      if (!customerId && name) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name,
            email: email || null,
            phone: phone || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (error) throw error;
        customerId = data.id;
      }

      const lines = [
        `${item.title} — ${vclass.label}`,
        ...picked.map((a) => `Add-on: ${a.title}`),
        String(form.get("notes") || "").trim(),
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.from("deals").insert({
        title: `${item.title} — ${name || "New enquiry"}`,
        stage: "new_lead",
        value: total,
        probability: 30,
        source: "Packages page",
        notes: lines,
        customer_id: customerId,
        organization_id: orgId,
        location_id: locId,
        last_activity_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead added to the pipeline");
      setAddons([]);
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["customers-lite"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suggestions = (item?.recommendedAddons ?? [])
    .map((id) => PACKAGE_BY_ID[id])
    .filter((a): a is PackageItem => !!a);

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? `Configure ${item.title}` : "Configure"}</DialogTitle>
        </DialogHeader>
        {item && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createLead.mutate(new FormData(e.currentTarget));
            }}
          >
            <div className="rounded-xl border border-elevated bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {vclass.label} · {item.duration}
                  </p>
                </div>
                <p className="font-display text-xl font-semibold tabular-nums text-bronze">
                  {money(total)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="micro-label">Frequently bundled</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((a) => {
                  const on = addons.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setAddons(on ? addons.filter((x) => x !== a.id) : [...addons, a.id])
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        on
                          ? "border-bronze/60 bg-bronze/10 text-bronze"
                          : "border-elevated bg-surface hover:border-hairline",
                      )}
                    >
                      {a.title}
                      <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                        +{money(classPrice(a.basePrice, vclass.multiplier))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-customer">Existing customer</Label>
              <select
                id="pkg-customer"
                name="customer_id"
                className="h-10 w-full rounded-xl border border-elevated bg-surface-2 px-3 text-sm"
                defaultValue=""
              >
                <option value="">New enquiry</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">Name</Label>
                <Input id="pkg-name" name="name" placeholder="Elena Marsh" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-phone">Phone</Label>
                <Input id="pkg-phone" name="phone" placeholder="(704) 555-0110" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pkg-email">Email</Label>
                <Input id="pkg-email" name="email" type="email" placeholder="elena@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-notes">Vehicle & notes</Label>
              <Textarea
                id="pkg-notes"
                name="notes"
                placeholder="2024 Porsche Macan GTS — wants satin finish, garage kept."
              />
            </div>

            <Button type="submit" className="w-full" disabled={createLead.isPending}>
              Send to pipeline
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
