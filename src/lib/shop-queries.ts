import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopJob = {
  id: string;
  title: string;
  service_type: string | null;
  status: string;
  installer: string | null;
  price: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  updated_at: string;
  location_id: string | null;
  customer_id: string | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
  vehicles: { year: number | null; make: string | null; model: string | null } | null;
};

export function useShopJobs() {
  return useQuery({
    queryKey: ["shop-jobs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,service_type,status,installer,price,scheduled_start,scheduled_end,updated_at,location_id,customer_id,customers(name,phone,email),vehicles(year,make,model)",
        )
        .order("scheduled_start", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as ShopJob[];
    },
  });
}

export function useShopPayments() {
  return useQuery({
    queryKey: ["shop-payments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,job_id,amount,status,paid_at,kind")
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShopDeals() {
  return useQuery({
    queryKey: ["shop-deals-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,stage,source,value,created_at,loss_reason")
        .is("deleted_at", null)
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const vehicleLabel = (v: ShopJob["vehicles"]) =>
  v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "Vehicle";

export const isDone = (s: string) => ["completed", "invoiced", "delivered"].includes(s);
