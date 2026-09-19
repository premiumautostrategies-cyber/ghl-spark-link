import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/connector/return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing connection — Systemize" },
      { name: "description", content: "Completing an integration sign-in for your shop." },
      { property: "og:title", content: "Finishing connection — Systemize" },
      {
        property: "og:description",
        content: "Completing an integration sign-in for your shop.",
      },
    ],
  }),
  component: ConnectorReturn,
});

function ConnectorReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider") ?? "";
    const notify = (ok: boolean, code?: string) => {
      window.opener?.postMessage(
        {
          type: ok ? "systemizeConnectorComplete" : "systemizeConnectorFailed",
          provider,
          code: code ?? null,
        },
        window.location.origin,
      );
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "The connection did not complete.");
      notify(false);
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify(true);
        return;
      }
      setMessage("The connection completed without a code.");
      notify(false);
      return;
    }
    notify(true, code);
  }, []);

  return <p className="p-8 text-sm text-muted-foreground">{message}</p>;
}
