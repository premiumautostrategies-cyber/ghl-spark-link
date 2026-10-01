import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/local-store";
import { useShopJobs, isDone } from "@/lib/shop-queries";

export const Route = createFileRoute("/_authenticated/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Systemize" },
      { name: "description", content: "Commission rates and earnings from completed work for each team member." },
      { property: "og:title", content: "Commissions — Systemize" },
      { property: "og:description", content: "Commission rates and earnings from completed work for each team member." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Commissions,
});

function Commissions() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useShopJobs();
  const { data: team = [] } = useQuery({
    queryKey: ["commission-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name,title,commission_rate,is_active")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const save = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await supabase.from("team_members").update({ commission_rate: rate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-team"] });
      toast.success("Commission rate saved");
    },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const rows = team.map((t) => {
    const mine = jobs.filter((j) => isDone(j.status) && j.installer === t.full_name);
    const month = mine.filter((j) => new Date(j.scheduled_end ?? j.updated_at) >= monthStart);
    const rate = Number(t.commission_rate ?? 0);
    const sum = (l: typeof mine) => l.reduce((a, j) => a + Number(j.price ?? 0), 0);
    return { t, rate, jobs: mine.length, mtd: sum(month) * (rate / 100), total: sum(mine) * (rate / 100), sales: sum(mine) };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" subtitle="Set each person's rate. Earnings come from completed jobs they worked." />
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">
              {["Team member", "Rate %", "Completed jobs", "Job value", "This month", "All time"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, rate, jobs: n, mtd, total, sales }) => (
              <tr key={t.id} className="border-b border-elevated/60 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{t.full_name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </td>
                <td className="px-4 py-2.5">
                  <Input
                    type="number"
                    className="h-8 w-20"
                    defaultValue={rate}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== rate && v >= 0 && v <= 100) save.mutate({ id: t.id, rate: v });
                    }}
                  />
                </td>
                <td className="px-4 py-2.5 tabular-nums">{n}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(sales)}</td>
                <td className="px-4 py-2.5 tabular-nums">{money(mtd)}</td>
                <td className="px-4 py-2.5 font-medium tabular-nums">{money(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
