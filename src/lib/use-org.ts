import { useRouteContext } from "@tanstack/react-router";

export function useOrg() {
  const { organization, location, user } = useRouteContext({ from: "/_authenticated" });
  return {
    organization,
    location,
    user,
    orgId: organization?.id ?? null,
    locId: location?.id ?? null,
  };
}
