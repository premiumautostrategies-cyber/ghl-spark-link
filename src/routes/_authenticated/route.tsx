import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type TeamMember = Pick<Database["public"]["Tables"]["team_members"]["Row"], "id" | "full_name" | "title">;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location: routeLocation }) => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error || !authData.user) throw redirect({ to: "/auth" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, organization:organizations(*), location:locations(*)")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) throw redirect({ to: "/auth" });

    const [{ data: roleRows }, { data: teamMember }] = await Promise.all([
      supabase.from("user_roles").select("role:roles(name,permissions)").eq("user_id", authData.user.id),
      supabase.from("team_members").select("id,full_name,title").eq("user_id", authData.user.id).is("deleted_at", null).maybeSingle(),
    ]);
    const roleNames = (roleRows ?? []).flatMap((row) => {
      const role = row.role as { name?: string } | { name?: string }[] | null;
      if (Array.isArray(role)) return role.map((item) => item.name).filter((name): name is string => Boolean(name));
      return role?.name ? [role.name] : [];
    });
    const isTechnician = roleNames.some((name) => /technician|installer/i.test(name));
    if (isTechnician && !["/jobs", "/kiosk"].includes(routeLocation.pathname)) {
      throw redirect({ to: "/jobs" });
    }

    return {
      user: authData.user,
      organization: (profile as typeof profile & { organization?: Organization }).organization ?? null,
      location: (profile as typeof profile & { location?: Location }).location ?? null,
      profile,
      roleNames,
      teamMember: (teamMember as TeamMember | null) ?? null,
    };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
