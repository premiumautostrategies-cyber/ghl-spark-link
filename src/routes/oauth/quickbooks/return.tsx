import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/quickbooks/return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing QuickBooks connection — Systemize" },
      { name: "description", content: "Completing the QuickBooks connection for your shop." },
      { property: "og:title", content: "Finishing QuickBooks connection — Systemize" },
      {
        property: "og:description",
        content: "Completing the QuickBooks connection for your shop.",
      },
    ],
  }),
  component: QuickbooksReturn,
});

function QuickbooksReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const realmId = params.get("realmId");
    const post = (ok: boolean) => {
      window.opener?.postMessage(
        {
          type: ok ? "systemizeQuickbooksComplete" : "systemizeQuickbooksFailed",
          code,
          realmId,
        },
        window.location.origin,
      );
      window.close();
    };
    if (!code || !realmId) {
      setMessage(params.get("error") ?? "QuickBooks did not finish the sign-in.");
      post(false);
      return;
    }
    post(true);
  }, []);

  return <p className="p-8 text-sm text-muted-foreground">{message}</p>;
}
