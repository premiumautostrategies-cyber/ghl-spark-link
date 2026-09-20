import { createServerFn } from "@tanstack/react-start";

/* Customer-facing portal reads/writes. Everything is scoped by an unguessable
   token; no anon table access is granted. */

type SelectionInput = { token: string; tierId: string | null; addonIds: string[] };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function totalsFor(
  tier: { price: number | string; labor_hours: number | string; film_feet: number | string } | null,
  addons: Array<{ price: number | string; labor_hours: number | string; film_feet: number | string }>,
) {
  const price = Number(tier?.price ?? 0) + addons.reduce((t, a) => t + Number(a.price), 0);
  const hours = Number(tier?.labor_hours ?? 0) + addons.reduce((t, a) => t + Number(a.labor_hours), 0);
  const feet = Number(tier?.film_feet ?? 0) + addons.reduce((t, a) => t + Number(a.film_feet), 0);
  return { price, hours, feet };
}

export const getProposalByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: proposal } = await db
      .from("proposals")
      .select(
        "id,token,title,status,deposit_percent,selected_tier_id,selected_addon_ids,total,deposit_amount,labor_hours,film_feet,signature_name,signed_at,notes,organization_id,customer_id,vehicle_id",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (!proposal) return null;

    if (proposal.status === "sent") {
      await db
        .from("proposals")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", proposal.id);
    }

    const [{ data: tiers }, { data: addons }, { data: org }, { data: customer }, { data: vehicle }] =
      await Promise.all([
        db.from("proposal_tiers").select("*").eq("proposal_id", proposal.id).order("sort_order"),
        db.from("proposal_addons").select("*").eq("proposal_id", proposal.id).order("sort_order"),
        db.from("organizations").select("name,accent_color").eq("id", proposal.organization_id).maybeSingle(),
        proposal.customer_id
          ? db.from("customers").select("name").eq("id", proposal.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        proposal.vehicle_id
          ? db.from("vehicles").select("year,make,model,color").eq("id", proposal.vehicle_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    return {
      proposal,
      tiers: tiers ?? [],
      addons: addons ?? [],
      shopName: org?.name ?? "Our shop",
      accent: org?.accent_color ?? null,
      customerName: (customer as { name?: string } | null)?.name ?? null,
      vehicle: vehicle
        ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
        : null,
      vehicleParts: vehicle
        ? {
            year: vehicle.year ?? null,
            make: vehicle.make ?? null,
            model: vehicle.model ?? null,
            color: vehicle.color ?? null,
          }
        : null,
    };
  });

export const saveProposalSelection = createServerFn({ method: "POST" })
  .inputValidator((d: SelectionInput) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: proposal } = await db
      .from("proposals")
      .select("id,deposit_percent,status")
      .eq("token", data.token)
      .maybeSingle();
    if (!proposal) throw new Error("This proposal link is no longer valid.");

    const [{ data: tiers }, { data: addons }] = await Promise.all([
      db.from("proposal_tiers").select("*").eq("proposal_id", proposal.id),
      db.from("proposal_addons").select("*").eq("proposal_id", proposal.id),
    ]);
    const tier = (tiers ?? []).find((t) => t.id === data.tierId) ?? null;
    const picked = (addons ?? []).filter((a) => data.addonIds.includes(a.id));
    const { price, hours, feet } = totalsFor(tier, picked);
    const deposit = Math.round(price * (Number(proposal.deposit_percent) / 100) * 100) / 100;

    await db
      .from("proposals")
      .update({
        selected_tier_id: data.tierId,
        selected_addon_ids: data.addonIds,
        total: price,
        labor_hours: hours,
        film_feet: feet,
        deposit_amount: deposit,
      })
      .eq("id", proposal.id);

    return { total: price, hours, feet, deposit };
  });

export const signProposal = createServerFn({ method: "POST" })
  .inputValidator((d: SelectionInput & { signatureName: string; payDeposit: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: proposal } = await db
      .from("proposals")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!proposal) throw new Error("This proposal link is no longer valid.");

    const [{ data: tiers }, { data: addons }] = await Promise.all([
      db.from("proposal_tiers").select("*").eq("proposal_id", proposal.id),
      db.from("proposal_addons").select("*").eq("proposal_id", proposal.id),
    ]);
    const tier = (tiers ?? []).find((t) => t.id === data.tierId) ?? null;
    const picked = (addons ?? []).filter((a) => data.addonIds.includes(a.id));
    const { price, hours, feet } = totalsFor(tier, picked);
    const deposit = Math.round(price * (Number(proposal.deposit_percent) / 100) * 100) / 100;
    const now = new Date().toISOString();

    await db
      .from("proposals")
      .update({
        selected_tier_id: data.tierId,
        selected_addon_ids: data.addonIds,
        total: price,
        labor_hours: hours,
        film_feet: feet,
        deposit_amount: deposit,
        signature_name: data.signatureName,
        signed_at: now,
        status: data.payDeposit ? "paid" : "signed",
        ...(data.payDeposit ? { paid_at: now } : {}),
      })
      .eq("id", proposal.id);

    if (data.payDeposit && deposit > 0) {
      await db.from("payments").insert({
        organization_id: proposal.organization_id,
        location_id: proposal.location_id,
        customer_id: proposal.customer_id,
        amount: deposit,
        kind: "deposit",
        method: "card",
        status: "paid",
        paid_at: now,
        reference: `Proposal ${proposal.token}`,
      });
    }

    if (proposal.deal_id) {
      await db
        .from("deals")
        .update({ stage: "won", probability: 100, value: price, last_activity_at: now })
        .eq("id", proposal.deal_id);
      await db.from("messages").insert({
        organization_id: proposal.organization_id,
        deal_id: proposal.deal_id,
        customer_id: proposal.customer_id,
        channel: "note",
        direction: "in",
        is_automated: true,
        author_name: data.signatureName,
        body: data.payDeposit
          ? `Proposal signed and ${deposit.toFixed(2)} deposit paid online — ${tier?.name ?? "package"} selected.`
          : `Proposal signed online — ${tier?.name ?? "package"} selected.`,
      });
    }

    return { total: price, deposit, paid: data.payDeposit };
  });

export const getWaiverByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: inspection } = await db
      .from("inspections")
      .select("*")
      .eq("waiver_token", data.token)
      .maybeSingle();
    if (!inspection) return null;
    const [{ data: defects }, { data: org }, { data: customer }, { data: vehicle }] = await Promise.all([
      db.from("inspection_defects").select("*").eq("inspection_id", inspection.id),
      db.from("organizations").select("name").eq("id", inspection.organization_id).maybeSingle(),
      inspection.customer_id
        ? db.from("customers").select("name").eq("id", inspection.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      inspection.vehicle_id
        ? db.from("vehicles").select("year,make,model,color,plate").eq("id", inspection.vehicle_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      inspection,
      defects: defects ?? [],
      shopName: org?.name ?? "Our shop",
      customerName: (customer as { name?: string } | null)?.name ?? null,
      vehicle: vehicle
        ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
        : null,
      plate: (vehicle as { plate?: string | null } | null)?.plate ?? null,
    };
  });

export const signWaiver = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; name: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const now = new Date().toISOString();
    const { error } = await db
      .from("inspections")
      .update({
        acknowledged_by: data.name,
        signature_name: data.name,
        acknowledged_at: now,
        status: "acknowledged",
      })
      .eq("waiver_token", data.token);
    if (error) throw new Error("Could not record the signature.");
    return { signedAt: now };
  });

export const getWarrantyByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: warranty } = await db
      .from("warranties")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!warranty) return null;
    const [{ data: org }, { data: customer }, { data: vehicle }] = await Promise.all([
      db.from("organizations").select("name").eq("id", warranty.organization_id).maybeSingle(),
      warranty.customer_id
        ? db.from("customers").select("name").eq("id", warranty.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      warranty.vehicle_id
        ? db.from("vehicles").select("year,make,model,color").eq("id", warranty.vehicle_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      warranty,
      shopName: org?.name ?? "Our shop",
      customerName: (customer as { name?: string } | null)?.name ?? null,
      vehicle: vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : null,
    };
  });

/* Customer hub — one link per customer, showing their own work only. */
export const getCustomerPortal = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: customer } = await db
      .from("customers")
      .select("id,name,email,phone,organization_id")
      .eq("portal_token", data.token)
      .maybeSingle();
    if (!customer) return null;

    const [
      { data: org },
      { data: vehicles },
      { data: deals },
      { data: proposals },
      { data: warranties },
      { data: aftercare },
      { data: payments },
    ] = await Promise.all([
      db.from("organizations").select("name,accent_color,review_url").eq("id", customer.organization_id ?? "").maybeSingle(),
      db.from("vehicles").select("id,year,make,model,color,plate").eq("customer_id", customer.id),
      db
        .from("deals")
        .select("id,title,stage,value,vehicle_id,updated_at")
        .eq("customer_id", customer.id)
        .order("updated_at", { ascending: false }),
      db
        .from("proposals")
        .select("id,token,title,status,total,deposit_amount,signed_at,updated_at,vehicle_id")
        .eq("customer_id", customer.id)
        .order("updated_at", { ascending: false }),
      db
        .from("warranties")
        .select("id,token,certificate_number,product,issued_at,expires_at,status,roll_lots,vehicle_id")
        .eq("customer_id", customer.id)
        .order("issued_at", { ascending: false }),
      db
        .from("aftercare_tasks")
        .select("id,kind,body,status,scheduled_for,sent_at")
        .eq("customer_id", customer.id)
        .order("scheduled_for"),
      db
        .from("payments")
        .select("id,amount,kind,status,paid_at,method")
        .eq("customer_id", customer.id)
        .order("paid_at", { ascending: false }),
    ]);

    const vehicleLabel = (id: string | null) => {
      const v = (vehicles ?? []).find((x) => x.id === id);
      return v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : null;
    };

    return {
      shopName: org?.name ?? "Our shop",
      reviewUrl: org?.review_url ?? null,
      accent: org?.accent_color ?? null,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      vehicles: (vehicles ?? []).map((v) => ({
        id: v.id,
        label: [v.year, v.make, v.model, v.color].filter(Boolean).join(" ") || "Vehicle",
        plate: v.plate,
      })),
      deals: (deals ?? []).map((d) => ({ ...d, vehicle: vehicleLabel(d.vehicle_id) })),
      proposals: (proposals ?? []).map((p) => ({ ...p, vehicle: vehicleLabel(p.vehicle_id) })),
      warranties: (warranties ?? []).map((w) => ({ ...w, vehicle: vehicleLabel(w.vehicle_id) })),
      aftercare: (aftercare ?? []).filter((t) => t.status === "sent" || new Date(t.scheduled_for) <= new Date()),
      payments: payments ?? [],
    };
  });
