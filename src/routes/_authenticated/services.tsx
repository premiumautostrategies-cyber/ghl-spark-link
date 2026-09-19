import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
import { PanelCoverage } from "@/components/panel-coverage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { label, money } from "@/lib/format";
import {
  COVERAGE_PRESETS,
  OPTION_KINDS,
  OPTION_KIND_LABELS,
  STARTER_CATEGORIES,
  catalogImage,
} from "@/lib/catalog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "Service Library — Systemize" },
      {
        name: "description",
        content: "Your categories, packages, film tiers and coverage maps in one library.",
      },
      { property: "og:title", content: "Service Library — Systemize" },
      {
        property: "og:description",
        content: "Your categories, packages, film tiers and coverage maps in one library.",
      },
    ],
  }),
  component: ServicesPage,
});

type Category = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  accent_color: string | null;
  image_url: string | null;
  sort_order: number;
};

type ServiceOption = {
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

type Service = {
  id: string;
  name: string;
  category: string;
  category_id: string | null;
  description: string | null;
  customer_description: string | null;
  base_price: number | string;
  duration_minutes: number;
  estimated_hours: number | string | null;
  supports_add_ons: boolean;
  pricing_mode: string;
  tags: string[];
  is_public: boolean;
  is_internal: boolean;
  deposit_type: string;
  deposit_value: number | string;
  unit: string;
  is_active: boolean;
  image_url: string | null;
  swatch_color: string | null;
  coverage_panels: string[];
};

type Variant = {
  id: string;
  service_id: string;
  tier_name: string;
  description: string | null;
  price: number | string;
  estimated_hours: number | string;
  sort_order: number;
};

type AddOn = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  estimated_hours: number | string;
  pricing_mode: string;
  hourly_rate: number | string;
  category_id: string | null;
  service_id: string | null;
  is_global: boolean;
  is_active: boolean;
  swatch_color: string | null;
};

type ServiceAddOnLink = {
  id: string;
  service_id: string;
  add_on_id: string;
  is_recommended: boolean;
};

function ServicesPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [activeCat, setActiveCat] = useState<string>("all");
  const [newService, setNewService] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [draftPanels, setDraftPanels] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pricingMode, setPricingMode] = useState<"flat" | "tiered">("flat");
  const [depositType, setDepositType] = useState<"none" | "percent" | "fixed">("none");

  const invalidate = () => {
    for (const k of [
      "service-categories",
      "services",
      "service-options",
      "services-catalog",
      "service-variants",
      "add-ons",
      "service-add-ons",
    ])
      qc.invalidateQueries({ queryKey: [k] });
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as unknown as Service[];
    },
  });

  const { data: options = [] } = useQuery({
    queryKey: ["service-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_options")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as unknown as ServiceOption[];
    },
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["service-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_variants")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Variant[];
    },
  });

  const { data: addOns = [] } = useQuery({
    queryKey: ["add-ons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("add_ons")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as unknown as AddOn[];
    },
  });

  const { data: addOnLinks = [] } = useQuery({
    queryKey: ["service-add-ons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_add_ons").select("*");
      if (error) throw error;
      return data as unknown as ServiceAddOnLink[];
    },
  });

  const optionsFor = (serviceId: string) => options.filter((o) => o.service_id === serviceId);
  const variantsFor = (serviceId: string) => variants.filter((v) => v.service_id === serviceId);
  const linksFor = (serviceId: string) => addOnLinks.filter((l) => l.service_id === serviceId);
  const addOnById = useMemo(
    () => Object.fromEntries(addOns.map((a) => [a.id, a])) as Record<string, AddOn>,
    [addOns],
  );
  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, Category>,
    [categories],
  );

  const addStarterCategories = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("service_categories").insert(
        STARTER_CATEGORIES.map((c, i) => ({
          ...c,
          sort_order: i,
          organization_id: orgId,
          location_id: locId,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Starter categories added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCategory = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: FormData }) => {
      if (!orgId) throw new Error("No workspace selected");
      const payload = {
        name: String(form.get("name")),
        slug: String(form.get("slug") || "") || null,
        description: String(form.get("description") || "") || null,
        accent_color: String(form.get("accent_color") || "#c99a5b"),
        image_url: String(form.get("image_url") || "") || null,
      };
      const { error } = id
        ? await supabase.from("service_categories").update(payload).eq("id", id)
        : await supabase
            .from("service_categories")
            .insert({ ...payload, sort_order: categories.length, organization_id: orgId, location_id: locId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveCat("all");
      toast.success("Category archived");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveService = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: FormData }) => {
      if (!orgId) throw new Error("No workspace selected");
      const categoryId = String(form.get("category_id") || "") || null;
      const cat = categoryId ? catById[categoryId] : undefined;
      const payload = {
        name: String(form.get("name")),
        category_id: categoryId,
        category: cat?.slug || cat?.name?.toLowerCase().replace(/\s+/g, "_") || "other",
        description: String(form.get("description") || "") || null,
        customer_description: String(form.get("customer_description") || "") || null,
        base_price: Number(form.get("base_price") || 0),
        estimated_hours: Number(form.get("estimated_hours") || 2),
        duration_minutes: Math.round(Number(form.get("estimated_hours") || 2) * 60),
        supports_add_ons: form.get("supports_add_ons") === "on",
        unit: String(form.get("unit") || "job"),
        image_url: String(form.get("image_url") || "") || null,
        swatch_color: String(form.get("swatch_color") || "") || null,
        coverage_panels: draftPanels,
        pricing_mode: pricingMode,
        tags: draftTags,
        is_public: form.get("is_public") === "on",
        is_internal: form.get("is_internal") === "on",
        deposit_type: depositType,
        deposit_value: depositType === "none" ? 0 : Number(form.get("deposit_value") || 0),
      };
      const { error } = id
        ? await supabase.from("services").update(payload).eq("id", id)
        : await supabase
            .from("services")
            .insert({ ...payload, organization_id: orgId, location_id: locId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service saved");
      setNewService(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addOption = useMutation({
    mutationFn: async ({ serviceId, form, panels }: { serviceId: string; form: FormData; panels: string[] }) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("service_options").insert({
        service_id: serviceId,
        organization_id: orgId,
        name: String(form.get("name")),
        description: String(form.get("description") || "") || null,
        kind: String(form.get("kind") || "addon"),
        price_delta: Number(form.get("price_delta") || 0),
        duration_delta_minutes: Number(form.get("duration_delta_minutes") || 0),
        swatch_color: String(form.get("swatch_color") || "") || null,
        coverage_panels: panels,
        sort_order: options.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Option added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addVariant = useMutation({
    mutationFn: async ({ serviceId, form }: { serviceId: string; form: FormData }) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("service_variants").insert({
        service_id: serviceId,
        organization_id: orgId,
        tier_name: String(form.get("tier_name")),
        description: String(form.get("description") || "") || null,
        price: Number(form.get("price") || 0),
        estimated_hours: Number(form.get("estimated_hours") || 0),
        sort_order: variantsFor(serviceId).length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAddOn = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const categoryId = String(form.get("category_id") || "");
      const { error } = await supabase.from("add_ons").insert({
        organization_id: orgId,
        name: String(form.get("name")),
        description: String(form.get("description") || "") || null,
        price: Number(form.get("price") || 0),
        estimated_hours: Number(form.get("estimated_hours") || 0),
        pricing_mode: String(form.get("pricing_mode") || "flat"),
        hourly_rate: Number(form.get("hourly_rate") || 0),
        category_id: categoryId && categoryId !== "global" ? categoryId : null,
        is_global: !categoryId || categoryId === "global",
        sort_order: addOns.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Add-on saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAddOn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("add_ons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLink = useMutation({
    mutationFn: async ({
      serviceId,
      addOnId,
      link,
    }: {
      serviceId: string;
      addOnId: string;
      link?: ServiceAddOnLink | undefined;
    }) => {
      if (!orgId) throw new Error("No workspace selected");
      if (link) {
        const { error } = await supabase.from("service_add_ons").delete().eq("id", link.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("service_add_ons").insert({
        service_id: serviceId,
        add_on_id: addOnId,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = services.filter((s) => (activeCat === "all" ? true : s.category_id === activeCat));
  const active = services.filter((s) => s.is_active);
  const avg = active.length
    ? active.reduce((t, s) => t + Number(s.base_price), 0) / active.length
    : 0;

  function openNew() {
    setDraftPanels([]);
    setDraftTags([]);
    setTagInput("");
    setPricingMode("flat");
    setDepositType("none");
    setNewService(true);
  }
  function openEdit(s: Service) {
    setDraftPanels(s.coverage_panels ?? []);
    setDraftTags(s.tags ?? []);
    setTagInput("");
    setPricingMode(s.pricing_mode === "tiered" ? "tiered" : "flat");
    setDepositType(
      s.deposit_type === "percent" ? "percent" : s.deposit_type === "fixed" ? "fixed" : "none",
    );
    setEditing(s);
  }

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    setDraftTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Service Library"
        subtitle="Categories, packages, film tiers and the panels each one covers."
        action={
          <div className="flex gap-2">
            <CategoryDialog
              categories={categories}
              onSave={(form) => saveCategory.mutate({ form })}
            />
            <Button onClick={openNew}>New service</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Categories" value={String(categories.length)} />
        <Kpi label="Active services" value={String(active.length)} tone="rig" />
        <Kpi label="Average ticket" value={money(avg)} tone="revenue" />
      </div>

      {categories.length === 0 && (
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold">No categories yet</p>
            <p className="text-xs text-muted-foreground">
              Load a starter set — PPF, tint, wrap, graphics, coatings, correction — then rename or
              add your own.
            </p>
          </div>
          <Button onClick={() => addStarterCategories.mutate()} disabled={addStarterCategories.isPending}>
            Add starter categories
          </Button>
        </Panel>
      )}

      {categories.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <CatPill
            name="All services"
            count={services.length}
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
          />
          {categories.map((c) => (
            <CatPill
              key={c.id}
              name={c.name}
              accent={c.accent_color}
              count={services.filter((s) => s.category_id === c.id).length}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </div>
      )}

      {activeCat !== "all" && catById[activeCat] && (
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-display text-xl">{catById[activeCat]!.name}</p>
            <p className="text-xs text-muted-foreground">
              {catById[activeCat]!.description || "No description"}
            </p>
          </div>
          <div className="flex gap-2">
            <CategoryDialog
              categories={categories}
              category={catById[activeCat]}
              onSave={(form) => saveCategory.mutate({ id: activeCat, form })}
            />
            <Button
              variant="outline"
              onClick={() => archiveCategory.mutate(activeCat)}
              disabled={archiveCategory.isPending}
            >
              Archive
            </Button>
          </div>
        </Panel>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="No services in this category"
          body="Add a package, film tier or one-off service — each with its own photo and coverage map."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => {
            const cat = s.category_id ? catById[s.category_id] : undefined;
            const opts = optionsFor(s.id);
            return (
              <Panel key={s.id} className="self-start overflow-hidden">
                <button type="button" className="block w-full text-left" onClick={() => openEdit(s)}>
                  <img
                    src={catalogImage(s.image_url, cat?.slug ?? s.category, cat?.image_url)}
                    alt={s.name}
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                </button>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat?.name ?? label(s.category)} · {Math.round(s.duration_minutes / 60)}h · per{" "}
                        {s.unit}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-display text-lg tabular-nums text-bronze">
                      {money(s.base_price)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {s.customer_description || s.description || "No description yet."}
                  </p>
                  {(s.coverage_panels?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-elevated bg-surface-2 p-3">
                      <PanelCoverage panels={s.coverage_panels} compact accent={cat?.accent_color} />
                      <p className="text-[11px] text-muted-foreground">
                        {s.coverage_panels.length} panels covered
                      </p>
                    </div>
                  )}
                  {opts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {opts.slice(0, 5).map((o) => (
                        <span
                          key={o.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-hairline/60 bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                        >
                          {o.swatch_color && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: o.swatch_color }}
                            />
                          )}
                          {o.name}
                        </span>
                      ))}
                      {opts.length > 5 && <Tag tone="muted">+{opts.length - 5}</Tag>}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 border-t border-elevated pt-3">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      Edit &amp; options
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {s.is_active ? "Live" : "Hidden"}
                      </span>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })}
                      />
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Add-on library */}
      <Panel className="space-y-3 p-4">
        <div>
          <p className="micro-label">Add-on library</p>
          <p className="text-xs text-muted-foreground">
            Extras any service can offer — attach them per service in the editor.
          </p>
        </div>
        {addOns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {addOns.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-elevated bg-surface-2 px-3 py-2 text-sm"
              >
                {a.name}
                <span className="tabular-nums text-bronze">+{money(a.price)}</span>
                <span className="text-xs text-muted-foreground">
                  {a.category_id ? catById[a.category_id]?.name : "Global"}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddOn.mutate(a.id)}
                  className="text-muted-foreground hover:text-critical"
                  aria-label="Remove add-on"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="grid gap-2 sm:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveAddOn.mutate(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <Input name="name" placeholder="Add-on name" required />
          <Input name="price" type="number" step="0.01" placeholder="Price" />
          <Input name="estimated_hours" type="number" step="0.25" placeholder="Hours" />
          <select
            name="category_id"
            className="h-10 rounded-md border border-elevated bg-surface-2 px-3 text-sm"
            defaultValue="global"
          >
            <option value="global">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={saveAddOn.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </form>
      </Panel>

      {/* New / edit service */}
      <Dialog
        open={newService || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setNewService(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? editing.name : "New service"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveService.mutate({
                ...(editing ? { id: editing.id } : {}),
                form: new FormData(e.currentTarget),
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sv-name">Name</Label>
                <Input id="sv-name" name="name" defaultValue={editing?.name ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  name="category_id"
                  defaultValue={editing?.category_id ?? (activeCat !== "all" ? activeCat : "")}
                >
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-unit">Sold by</Label>
                <Input id="sv-unit" name="unit" defaultValue={editing?.unit ?? "job"} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Pricing</Label>
                <div className="flex gap-2">
                  {(["flat", "tiered"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPricingMode(m)}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        pricingMode === m
                          ? "border-bronze/60 bg-bronze/10 text-bronze"
                          : "border-elevated bg-surface-2 hover:border-hairline",
                      )}
                    >
                      <span className="block font-medium">
                        {m === "flat" ? "Single base price" : "By vehicle size"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {m === "flat"
                          ? "One price for every vehicle."
                          : "Coupe/sedan, midsize SUV, oversized/truck tiers."}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-price">
                  {pricingMode === "tiered" ? "Starting price" : "Base price"}
                </Label>
                <Input
                  id="sv-price"
                  name="base_price"
                  type="number"
                  step="0.01"
                  defaultValue={String(editing?.base_price ?? 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-dur">Estimated hours</Label>
                <Input
                  id="sv-dur"
                  name="estimated_hours"
                  type="number"
                  step="0.25"
                  defaultValue={String(
                    editing?.estimated_hours ?? (editing ? editing.duration_minutes / 60 : 2),
                  )}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Deposit required</Label>
                <div className="flex flex-wrap gap-2">
                  {(["none", "percent", "fixed"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDepositType(d)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        depositType === d
                          ? "border-bronze/60 bg-bronze/10 text-bronze"
                          : "border-elevated bg-surface-2 hover:border-hairline",
                      )}
                    >
                      {d === "none" ? "No deposit" : d === "percent" ? "Percent of total" : "Fixed amount"}
                    </button>
                  ))}
                  {depositType !== "none" && (
                    <div className="flex items-center gap-2">
                      <Input
                        name="deposit_value"
                        type="number"
                        step={depositType === "percent" ? "1" : "0.01"}
                        className="w-32"
                        defaultValue={String(editing?.deposit_value ?? (depositType === "percent" ? 25 : 250))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {depositType === "percent" ? "%" : "$"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sv-tag">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {draftTags.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-2 rounded-full border border-bronze/50 bg-bronze/10 px-3 py-1 text-xs text-bronze"
                    >
                      {t}
                      <button
                        type="button"
                        aria-label={`Remove ${t}`}
                        onClick={() => setDraftTags((prev) => prev.filter((x) => x !== t))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="sv-tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Most Popular, High Margin, Track Ready…"
                  />
                  <Button type="button" variant="outline" onClick={() => addTag(tagInput)}>
                    Add tag
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Most Popular", "High Margin", "Track Ready", "Lifetime Warranty"]
                    .filter((t) => !draftTags.includes(t))
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addTag(t)}
                        className="rounded-full border border-elevated bg-surface-2 px-3 py-1 text-xs text-muted-foreground hover:border-hairline"
                      >
                        + {t}
                      </button>
                    ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2 sm:col-span-2">
                <span>
                  <span className="block text-sm font-medium">Allow add-ons</span>
                  <span className="block text-xs text-muted-foreground">
                    Lets advisors attach extras from the add-on library when quoting.
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="supports_add_ons"
                  defaultChecked={editing?.supports_add_ons ?? true}
                  className="size-4 accent-bronze"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2">
                <span>
                  <span className="block text-sm font-medium">Show internally</span>
                  <span className="block text-xs text-muted-foreground">
                    Available on estimates and the sales desk.
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="is_internal"
                  defaultChecked={editing?.is_internal ?? true}
                  className="size-4 accent-bronze"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2">
                <span>
                  <span className="block text-sm font-medium">Show to customers</span>
                  <span className="block text-xs text-muted-foreground">
                    Visible on public booking links.
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="is_public"
                  defaultChecked={editing?.is_public ?? true}
                  className="size-4 accent-bronze"
                />
              </label>
              <div className="space-y-2">
                <Label htmlFor="sv-img">Photo URL</Label>
                <Input
                  id="sv-img"
                  name="image_url"
                  placeholder="https://…  (leave blank for the category photo)"
                  defaultValue={editing?.image_url ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-swatch">Swatch colour</Label>
                <Input
                  id="sv-swatch"
                  name="swatch_color"
                  type="color"
                  defaultValue={editing?.swatch_color ?? "#c99a5b"}
                  className="h-10 p-1"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sv-cdesc">Customer-facing description</Label>
                <Textarea
                  id="sv-cdesc"
                  name="customer_description"
                  defaultValue={editing?.customer_description ?? ""}
                  placeholder="What the client reads on the proposal."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sv-desc">Internal notes</Label>
                <Textarea id="sv-desc" name="description" defaultValue={editing?.description ?? ""} />
              </div>
            </div>

            <div className="rounded-xl border border-elevated p-4">
              <p className="micro-label">Panels covered</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COVERAGE_PRESETS.map((p) => (
                  <Button
                    key={p.name}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDraftPanels(p.panels)}
                  >
                    {p.name}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraftPanels([])}>
                  Clear
                </Button>
              </div>
              <div className="mt-4">
                <PanelCoverage
                  panels={draftPanels}
                  onToggle={(p) =>
                    setDraftPanels((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                    )
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saveService.isPending}>
              Save service
            </Button>
          </form>

          {editing && (
            <div className="space-y-3 border-t border-elevated pt-4">
              <p className="micro-label">Vehicle-size tiers</p>
              <div className="space-y-2">
                {variantsFor(editing.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No tiers yet — add Small/Coupe, Midsize/Sedan and Large/SUV pricing.
                  </p>
                )}
                {variantsFor(editing.id).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.tier_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(v.estimated_hours)}h{v.description ? ` · ${v.description}` : ""}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-bronze">{money(v.price)}</span>
                    <button
                      type="button"
                      onClick={() => removeVariant.mutate(v.id)}
                      className="text-muted-foreground hover:text-critical"
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <form
                className="grid gap-2 rounded-xl border border-dashed border-elevated p-4 sm:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addVariant.mutate({ serviceId: editing.id, form: new FormData(e.currentTarget) });
                  e.currentTarget.reset();
                }}
              >
                <Input name="tier_name" placeholder="Large / SUV / Truck" required />
                <Input name="price" type="number" step="0.01" placeholder="Price" />
                <Input name="estimated_hours" type="number" step="0.25" placeholder="Hours" />
                <Button type="submit" variant="outline" disabled={addVariant.isPending}>
                  <Plus className="mr-1 h-4 w-4" /> Add tier
                </Button>
              </form>
            </div>
          )}

          {editing && editing.supports_add_ons && (
            <div className="space-y-3 border-t border-elevated pt-4">
              <p className="micro-label">Allowed add-ons</p>
              {addOns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Build your add-on library below the service grid first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {addOns
                    .filter(
                      (a) =>
                        a.is_global ||
                        !a.category_id ||
                        a.category_id === editing.category_id,
                    )
                    .map((a) => {
                      const link = linksFor(editing.id).find((l) => l.add_on_id === a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            toggleLink.mutate({ serviceId: editing.id, addOnId: a.id, link })
                          }
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                            link
                              ? "border-bronze/60 bg-bronze/10 text-bronze"
                              : "border-elevated bg-surface-2 hover:border-hairline",
                          )}
                        >
                          {a.name}
                          <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                            +{money(a.price)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {editing && (
            <div className="space-y-3 border-t border-elevated pt-4">
              <p className="micro-label">Options &amp; film tiers</p>
              <div className="space-y-2">
                {optionsFor(editing.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No options yet — add film tiers, shades, coverage levels or add-ons.
                  </p>
                )}
                {optionsFor(editing.id).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-xl border border-elevated bg-surface-2 px-3 py-2"
                  >
                    {o.swatch_color && (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-hairline"
                        style={{ backgroundColor: o.swatch_color }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {OPTION_KIND_LABELS[o.kind] ?? o.kind}
                        {o.description ? ` · ${o.description}` : ""}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-bronze">
                      {Number(o.price_delta) >= 0 ? "+" : ""}
                      {money(o.price_delta)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOption.mutate(o.id)}
                      className="text-muted-foreground hover:text-critical"
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <OptionForm
                pending={addOption.isPending}
                onSubmit={(form, panels) =>
                  addOption.mutate({ serviceId: editing.id, form, panels })
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatPill({
  name,
  count,
  active,
  accent,
  onClick,
}: {
  name: string;
  count: number;
  active: boolean;
  accent?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
        active
          ? "border-bronze bg-bronze/15 text-bronze"
          : "border-elevated bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {accent && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
      {name}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function CategoryDialog({
  category,
  categories,
  onSave,
}: {
  category?: Category;
  categories: Category[];
  onSave: (form: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{category ? "Edit category" : "New category"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(new FormData(e.currentTarget));
            setOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder="Paint protection film"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-slug">Short code</Label>
              <Input
                id="c-slug"
                name="slug"
                defaultValue={category?.slug ?? ""}
                placeholder="ppf"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-accent">Accent colour</Label>
              <Input
                id="c-accent"
                name="accent_color"
                type="color"
                defaultValue={category?.accent_color ?? "#c99a5b"}
                className="h-10 p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-img">Category photo URL</Label>
            <Input id="c-img" name="image_url" defaultValue={category?.image_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" name="description" defaultValue={category?.description ?? ""} />
          </div>
          <p className="text-xs text-muted-foreground">
            {categories.length} categories in your library.
          </p>
          <Button type="submit" className="w-full">Save category</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OptionForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (form: FormData, panels: string[]) => void;
}) {
  const [panels, setPanels] = useState<string[]>([]);
  const [showPanels, setShowPanels] = useState(false);
  return (
    <form
      className="space-y-3 rounded-xl border border-dashed border-elevated p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget), panels);
        e.currentTarget.reset();
        setPanels([]);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="o-name" className="text-xs">Option name</Label>
          <Input id="o-name" name="name" placeholder="Ceramic IR 35%" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select name="kind" defaultValue="tier">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPTION_KINDS.map((k) => (
                <SelectItem key={k} value={k}>{OPTION_KIND_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="o-price" className="text-xs">Price change</Label>
          <Input id="o-price" name="price_delta" type="number" step="0.01" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="o-dur" className="text-xs">Extra minutes</Label>
          <Input id="o-dur" name="duration_delta_minutes" type="number" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="o-swatch" className="text-xs">Swatch</Label>
          <Input id="o-swatch" name="swatch_color" type="color" defaultValue="#1f2937" className="h-10 p-1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="o-desc" className="text-xs">Description</Label>
          <Input id="o-desc" name="description" placeholder="Lifetime warranty, 98% IR block" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowPanels((v) => !v)}
        className="text-xs font-semibold uppercase tracking-[0.1em] text-bronze"
      >
        {showPanels ? "Hide coverage map" : `Coverage map (${panels.length})`}
      </button>
      {showPanels && (
        <PanelCoverage
          panels={panels}
          onToggle={(p) =>
            setPanels((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
          }
        />
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="mr-1 h-4 w-4" /> Add option
      </Button>
    </form>
  );
}
