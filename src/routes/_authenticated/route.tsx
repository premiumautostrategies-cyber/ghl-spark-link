import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error || !authData.user) throw redirect({ to: "/auth" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, organization:organizations(*), location:locations(*)")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) throw redirect({ to: "/auth" });

    return {
      user: authData.user,
      organization: (profile as typeof profile & { organization?: Organization }).organization ?? null,
      location: (profile as typeof profile & { location?: Location }).location ?? null,
    };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
