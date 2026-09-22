import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kiosk")({
  beforeLoad: () => {
    throw redirect({ to: "/jobs", replace: true });
  },
});
