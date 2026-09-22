import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tag } from "@/components/os-ui";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Search, UserPlus } from "lucide-react";

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
};

type VehicleRow = {
  id: string;
  customer_id: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
};

const digits = (v: string) => v.replace(/\D/g, "");

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="micro-label">{label}</Label>
      {children}
    </div>
  );
}

function Block({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-elevated bg-surface p-4">
      <div className="flex items-baseline gap-2">
        <span className="micro-label text-bronze">{step}</span>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function DayBookingSheet({
  date,
  onClose,
}: {
  date: Date | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();

  const [mode, setMode] = useState<"find" | "new">("find");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [custNotes, setCustNotes] = useState("");

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  const [service, setService] = useState<string>("tint");
  const [start, setStart] = useState("09:00");
  const [hours, setHours] = useState("3");
  const [price, setPrice] = useState("");
  const [installer, setInstaller] = useState("");
  const [bay, setBay] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [jobNotes, setJobNotes] = useState("");

  const open = !!date;

  const { data: customers = [] } = useQuery({
    queryKey: ["booking-customers"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,phone,email,company")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["booking-vehicles", customerId],
    enabled: open && !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,customer_id,year,make,model,color")
        .eq("customer_id", customerId as string);
      if (error) throw error;
      return (data ?? []) as VehicleRow[];
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["booking-team"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bays = [] } = useQuery({
    queryKey: ["booking-bays"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bays")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    const qd = digits(q);
    return customers
      .filter((c) => {
        const hay = [c.name, c.company, c.email].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q) || (qd.length >= 4 && digits(c.phone ?? "").includes(qd));
      })
      .slice(0, 12);
  }, [customers, search]);

  /** Duplicate guard: same phone digits or same email as an existing record. */
  const duplicates = useMemo(() => {
    if (mode !== "new") return [] as CustomerRow[];
    const pd = digits(phone);
    const em = email.trim().toLowerCase();
    if (pd.length < 7 && !em) return [] as CustomerRow[];
    return customers.filter((c) => {
      const samePhone = pd.length >= 7 && digits(c.phone ?? "") === pd;
      const sameEmail = !!em && (c.email ?? "").trim().toLowerCase() === em;
      return samePhone || sameEmail;
    });
  }, [customers, mode, phone, email]);

  const selected = customers.find((c) => c.id === customerId) ?? null;

  const reset = () => {
    setMode("find");
    setSearch("");
    setCustomerId(null);
    setVehicleId(null);
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setCustNotes("");
    setYear("");
    setMake("");
    setModel("");
    setColor("");
    setPlate("");
    setService("tint");
    setStart("09:00");
    setHours("3");
    setPrice("");
    setInstaller("");
    setBay("");
    setIsMobile(false);
    setAddress("");
    setCity("");
    setJobNotes("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const book = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("No date selected");
      if (!orgId) throw new Error("No workspace selected");

      let cid = customerId;
      if (!cid) {
        const cleanName = name.trim();
        if (!cleanName) throw new Error("Add a customer name");
        const { data: cust, error } = await supabase
          .from("customers")
          .insert({
            name: cleanName,
            phone: phone.trim() || null,
            email: email.trim() || null,
            company: company.trim() || null,
            notes: custNotes.trim() || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (error) throw error;
        cid = cust.id;
      }

      let vid = vehicleId;
      if (!vid && (make.trim() || model.trim() || year.trim())) {
        const { data: veh, error } = await supabase
          .from("vehicles")
          .insert({
            customer_id: cid,
            owner_id: cid,
            year: year.trim() ? Number(year.trim()) : null,
            make: make.trim() || null,
            model: model.trim() || null,
            color: color.trim() || null,
            plate: plate.trim() || null,
            organization_id: orgId,
            location_id: locId,
          })
          .select("id")
          .single();
        if (error) throw error;
        vid = veh.id;
      }

      const [hh, mm] = start.split(":");
      const startAt = new Date(date);
      startAt.setHours(Number(hh ?? 9), Number(mm ?? 0), 0, 0);
      const dur = Math.max(Number(hours) || 1, 0.5);
      const endAt = new Date(startAt.getTime() + dur * 3600000);

      const veh = vehicles.find((v) => v.id === vid);
      const vehLabel = veh
        ? [veh.year, veh.make, veh.model].filter(Boolean).join(" ")
        : [year, make, model].filter((v) => v.trim()).join(" ");
      const title = `${vehLabel || selected?.name || name || "Appointment"} — ${SERVICE_TYPE_LABELS[service] ?? service}`;

      const { error: jobErr } = await supabase.from("jobs").insert({
        title,
        service_type: service,
        status: "scheduled",
        customer_id: cid,
        vehicle_id: vid,
        installer: installer || null,
        bay: isMobile ? null : bay || null,
        price: price.trim() ? Number(price) : null,
        estimated_hours: dur,
        scheduled_start: startAt.toISOString(),
        scheduled_end: endAt.toISOString(),
        is_mobile: isMobile,
        service_address: isMobile ? address.trim() || null : null,
        service_city: isMobile ? city.trim() || null : null,
        notes: jobNotes.trim() || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (jobErr) throw jobErr;

      const { data: deal, error: dealErr } = await supabase
        .from("deals")
        .insert({
          title,
          stage: "scheduled",
          value: price.trim() ? Number(price) : 0,
          probability: 90,
          notes: jobNotes.trim() || null,
          customer_id: cid,
          vehicle_id: vid,
          organization_id: orgId,
          location_id: locId,
        })
        .select("id")
        .single();
      if (dealErr) throw dealErr;

      await supabase.from("lead_events").insert({
        organization_id: orgId,
        deal_id: deal.id,
        actor: "shop",
        kind: "stage_moved",
        detail: `Appointment booked for ${startAt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`,
      });
    },
    onSuccess: () => {
      toast.success("Appointment booked");
      for (const key of [
        "calendar-jobs",
        "jobs",
        "deals",
        "customers",
        "customers-lite",
        "booking-customers",
        "pipeline-events",
      ])
        qc.invalidateQueries({ queryKey: [key] });
      close();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canBook = !!customerId || !!name.trim();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-elevated px-5 py-4">
          <SheetTitle className="display-title text-lg">
            New appointment
            {date && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Block
            step="01"
            title="Customer"
            hint="Search first — we check the number and email against every record you already have."
          >
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "find" ? "default" : "outline"}
                onClick={() => setMode("find")}
              >
                <Search className="mr-1.5 size-3.5" /> Existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => {
                  setMode("new");
                  setCustomerId(null);
                  setVehicleId(null);
                }}
              >
                <UserPlus className="mr-1.5 size-3.5" /> New customer
              </Button>
            </div>

            {mode === "find" && (
              <>
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone or email"
                />
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {results.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No match. Switch to New customer to add them.
                    </p>
                  )}
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id === customerId ? null : c.id);
                        setVehicleId(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border border-elevated bg-surface-2 px-3 py-2 text-left transition-colors hover:border-bronze/50",
                        customerId === c.id && "border-bronze/70",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[c.phone, c.email, c.company].filter(Boolean).join(" · ") || "No contact"}
                        </span>
                      </span>
                      {customerId === c.id && <Check className="size-4 shrink-0 text-bronze" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === "new" && (
              <div className="space-y-3">
                <Field label="Full name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Mitchell" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(704) 555-0134"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@email.com"
                    />
                  </Field>
                </div>
                <Field label="Company (optional)">
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field label="Customer notes">
                  <Textarea
                    rows={2}
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="Referred by…"
                  />
                </Field>

                {duplicates.length > 0 && (
                  <div className="rounded-lg border border-urgent/50 bg-urgent/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-urgent">
                      <AlertTriangle className="size-3.5" />
                      Already in your database
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {duplicates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setMode("find");
                            setCustomerId(c.id);
                            setSearch(c.name ?? "");
                          }}
                          className="block w-full rounded-md bg-surface-2 px-2.5 py-1.5 text-left text-xs hover:bg-elevated"
                        >
                          <span className="font-semibold">{c.name}</span>{" "}
                          <span className="text-muted-foreground">
                            {[c.phone, c.email].filter(Boolean).join(" · ")}
                          </span>{" "}
                          — use this record
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Block>

          <Block step="02" title="Vehicle" hint="Pick a car on file or add a new one.">
            {selected && vehicles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleId(v.id === vehicleId ? null : v.id)}
                    className={cn(
                      "rounded-full border border-elevated bg-surface-2 px-3 py-1 text-xs transition-colors hover:border-bronze/50",
                      vehicleId === v.id && "border-bronze/70 text-bronze",
                    )}
                  >
                    {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                  </button>
                ))}
              </div>
            )}
            {!vehicleId && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Year">
                    <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
                  </Field>
                  <Field label="Make">
                    <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="BMW" />
                  </Field>
                  <Field label="Model">
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="X5" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Color">
                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black Sapphire" />
                  </Field>
                  <Field label="Plate">
                    <Input value={plate} onChange={(e) => setPlate(e.target.value)} />
                  </Field>
                </div>
              </>
            )}
          </Block>

          <Block step="03" title="Work & time" hint="This drops straight onto the shop calendar.">
            <Field label="Service">
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_TYPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setService(s)}
                    className={cn(
                      "rounded-full border border-elevated bg-surface-2 px-3 py-1 text-xs transition-colors hover:border-bronze/50",
                      service === s && "border-bronze/70 text-bronze",
                    )}
                  >
                    {SERVICE_TYPE_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start">
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Hours">
                <Input value={hours} onChange={(e) => setHours(e.target.value)} />
              </Field>
              <Field label="Price">
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2195" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Installer">
                <select
                  className="h-9 w-full rounded-md border border-elevated bg-surface-2 px-2 text-sm"
                  value={installer}
                  onChange={(e) => setInstaller(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.full_name ?? ""}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bay">
                <select
                  className="h-9 w-full rounded-md border border-elevated bg-surface-2 px-2 text-sm disabled:opacity-50"
                  value={bay}
                  disabled={isMobile}
                  onChange={(e) => setBay(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {bays.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-elevated bg-surface-2 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Mobile job</p>
                <p className="text-[11px] text-muted-foreground">We go to the vehicle</p>
              </div>
              <Switch checked={isMobile} onCheckedChange={setIsMobile} />
            </div>
            {isMobile && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
              </div>
            )}
            <Field label="Job notes">
              <Textarea
                rows={2}
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value)}
                placeholder="Full front PPF plus 70% ceramic on the front doors."
              />
            </Field>
          </Block>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-elevated px-5 py-4">
          <Tag tone={canBook ? "bronze" : "muted"}>
            {selected ? selected.name : name.trim() ? name.trim() : "No customer yet"}
          </Tag>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!canBook || book.isPending} onClick={() => book.mutate()}>
              {book.isPending ? "Booking…" : "Book appointment"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
