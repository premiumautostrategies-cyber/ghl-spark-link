import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { label, money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles — Systemize" },
      { name: "description", content: "Every vehicle the shop has touched, with service history." },
      { property: "og:title", content: "Vehicles — Systemize" },
      {
        property: "og:description",
        content: "Every vehicle the shop has touched, with service history.",
      },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["vehicles-history"],
    queryFn: async () => {
      const [vehicles, jobs] = await Promise.all([
        supabase
          .from("vehicles")
          .select("*, customers(name)")
          .order("created_at", { ascending: false }),
        supabase.from("jobs").select("id,title,vehicle_id,status,price,scheduled_start,service_type"),
      ]);
      if (vehicles.error) throw vehicles.error;
      if (jobs.error) throw jobs.error;
      return { vehicles: vehicles.data, jobs: jobs.data };
    },
  });

  const vehicles = data?.vehicles ?? [];
  const jobs = data?.jobs ?? [];

  const filtered = vehicles.filter((v) =>
    [v.year, v.make, v.model, v.plate, v.vin, v.color, v.customers?.name]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const lifetime = jobs.reduce((t, j) => t + Number(j.price), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Service history by VIN and plate — protection, coatings and film."
        action={
          <Input
            placeholder="Search plate, VIN, make…"
            className="w-56"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Vehicles on file" value={String(vehicles.length)} />
        <StatCard label="Jobs recorded" value={String(jobs.length)} />
        <StatCard label="Lifetime work value" value={money(lifetime)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          body="Vehicles are added from a customer record, and every job attaches to one."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((v) => {
            const history = jobs.filter((j) => j.vehicle_id === v.id);
            return (
              <div key={v.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {v.customers?.name ?? "No owner"} · {v.color || "No colour"} ·{" "}
                      {v.plate || "No plate"}
                    </p>
                  </div>
                  <Badge variant="outline">{history.length} jobs</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground">No service history yet.</p>
                  )}
                  {history.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {label(j.service_type)} · {shortDate(j.scheduled_start)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap font-medium">{money(j.price)}</span>
                    </div>
                  ))}
                </div>
                {v.vin && <p className="mt-3 text-xs text-muted-foreground">VIN {v.vin}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
