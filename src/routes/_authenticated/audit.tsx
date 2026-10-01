import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Systemize" },
      { name: "description", content: "Every change made in the shop, newest first." },
      { property: "og:title", content: "Audit Log — Systemize" },
      { property: "og:description", content: "Every change made in the shop, newest first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("id,table_name,action,record_id,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" subtitle="Who changed what, newest first." />
      {!isLoading && data.length === 0 ? (
        <EmptyState title="No changes logged yet" body="Edits to customers, jobs, quotes and payments will appear here." />
      ) : (
        <Panel className="divide-y divide-elevated/60">
          {data.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Tag tone={e.action === "delete" ? "critical" : e.action === "insert" ? "revenue" : "muted"}>{e.action}</Tag>
              <span className="flex-1 capitalize">{e.table_name.replace(/_/g, " ")}</span>
              <span className="font-mono text-xs text-muted-foreground">{e.record_id?.slice(0, 8)}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
