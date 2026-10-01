import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import { money } from "@/lib/local-store";
import { useShopJobs, isDone } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/corporate")({
  head: () => ({
    meta: [
      { title: "Locations Rollup — Systemize" },
      { name: "description", content: "Revenue, jobs and average ticket across every shop location." },
      { property: "og:title", content: "Locations Rollup — Systemize" },
      { property: "og:description", content: "Revenue, jobs and average ticket across every shop location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Corporate,
});

function Corporate() {
  const { data: jobs = [] } = useShopJobs();
  const { data: locs = [] } = useQuery({
    queryKey: ["corp-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id,name,city,state").is("deleted_at", null);
      return data ?? [];
    },
  });
  const rows = locs.map((l) => {
    const mine = jobs.filter((j) => j.location_id === l.id);
    const done = mine.filter((j) => isDone(j.status));
    const rev = done.reduce((a, j) => a + Number(j.price ?? 0), 0);
    const open = mine.filter((j) => j.status === "scheduled" || j.status === "in_progress").length;
    return { l, jobs: done.length, rev, avg: done.length ? rev / done.length : 0, open };
  });
  const total = rows.reduce((a, r) => a + r.rev, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Locations" subtitle={`All locations side by side · ${money(total)} completed revenue`} />
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">{["Location", "Completed jobs", "Revenue", "Avg ticket", "Open work", "Share"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.l.id} className="border-b border-elevated/60 last:border-0">
                <td className="px-4 py-2.5"><p className="font-medium">{r.l.name}</p><p className="text-xs text-muted-foreground">{[r.l.city, r.l.state].filter(Boolean).join(", ")}</p></td>
                <td className="px-4 py-2.5 tabular-nums">{r.jobs}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(r.rev)}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(r.avg)}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.open}</td>
                <td className="px-4 py-2.5">
                  <div className="h-1.5 w-32 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-bronze" style={{ width: `${total ? (r.rev / total) * 100 : 0}%` }} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
