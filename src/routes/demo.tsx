import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/demo-data";

const DEMO_EMAIL = "demo.shop@systemize.app";
const DEMO_PASSWORD = "systemize-demo-2026";

export const Route = createFileRoute("/demo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Open the Systemize demo shop" },
      {
        name: "description",
        content:
          "Step straight into a fully loaded Systemize demo shop — quotes, bays, production, QC and warranty, no sign-up required.",
      },
      { property: "og:title", content: "Open the Systemize demo shop" },
      {
        property: "og:description",
        content: "A loaded demo workspace: quotes, bay schedule, shop floor, QC and warranty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoEntry,
});

function DemoEntry() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Opening the demo shop…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const existing = await supabase.auth.getSession();
        if (!existing.data.session) {
          const attempt = await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
          if (attempt.error) {
            setStatus("Building the demo shop…");
            const { error } = await supabase.auth.signUp({
              email: DEMO_EMAIL,
              password: DEMO_PASSWORD,
              options: { data: { shop_name: "Apex Restyling (Demo)" } },
            });
            if (error) throw error;
            const retry = await supabase.auth.signInWithPassword({
              email: DEMO_EMAIL,
              password: DEMO_PASSWORD,
            });
            if (retry.error) throw retry.error;

          }
        }

        setStatus("Loading demo vehicles and jobs…");
        await supabase.rpc("bootstrap_user_workspace", {
          _shop_name: "Apex Restyling (Demo)",
        });
        const profile = await supabase
          .from("profiles")
          .select("organization_id,location_id")
          .maybeSingle();
        const orgId = profile.data?.organization_id;
        if (orgId) {
          const jobs = await supabase.from("jobs").select("id", { count: "exact", head: true });
          if (!jobs.count) await seedDemoData(orgId, profile.data?.location_id ?? null);
        }
        if (!cancelled) navigate({ to: "/command-center", replace: true });
      } catch {
        if (!cancelled) navigate({ to: "/auth", replace: true });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="surface-grid flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="display-title text-3xl font-bold">
        System<span className="text-primary">ize</span>
      </span>
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
