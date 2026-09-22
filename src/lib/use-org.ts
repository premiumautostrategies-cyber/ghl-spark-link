import { useRouteContext } from "@tanstack/react-router";

export function useOrg() {
  const { organization, location, user, profile, roleNames, teamMember } = useRouteContext({ from: "/_authenticated" });
  return {
    organization,
    location,
    user,
    profile,
    roleNames,
    teamMember,
    orgId: organization?.id ?? null,
    locId: location?.id ?? null,
  };
}
