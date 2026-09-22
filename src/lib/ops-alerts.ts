import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OpsAlert = {
  id: string;
  job_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  actor: string | null;
  is_read: boolean;
  created_at: string;
};

export const OPS_ALERTS_KEY = ["ops-alerts"] as const;

export async function logOpsAlert(input: {
  organizationId: string;
  jobId?: string | null;
  kind: "qc_requested" | "qc_passed";
  title: string;
  body?: string | null;
  actor?: string | null;
}) {
  const { error } = await supabase.from("ops_alerts").insert({
    organization_id: input.organizationId,
    job_id: input.jobId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    actor: input.actor ?? null,
  });
  if (error) throw error;
}

export function useOpsAlerts() {
  return useQuery({
    queryKey: OPS_ALERTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_alerts")
        .select("id,job_id,kind,title,body,actor,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as OpsAlert[];
    },
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | "all") => {
      const query = supabase.from("ops_alerts").update({ is_read: true });
      const { error } = id === "all" ? await query.eq("is_read", false) : await query.eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPS_ALERTS_KEY }),
  });
}
