import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getWaiverByToken, signWaiver } from "@/lib/portal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { label } from "@/lib/format";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/p/waiver/$token")({
  head: () => ({
    meta: [
      { title: "Vehicle check-in — Systemize" },
      { name: "description", content: "Review the pre-existing condition report for your vehicle and sign off before work begins." },
      { property: "og:title", content: "Vehicle check-in report" },
      { property: "og:description", content: "Review the pre-existing condition report for your vehicle and sign off before work begins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getWaiverByToken({ data: { token: params.token } }),
  errorComponent: () => <Shell><p className="text-sm text-muted-foreground">This check-in link could not be opened.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-sm text-muted-foreground">Check-in not found.</p></Shell>,
  component: WaiverPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}

function WaiverPage() {
  const data = Route.useLoaderData();
  const [name, setName] = useState(data?.inspection.acknowledged_by ?? data?.customerName ?? "");
  const [signed, setSigned] = useState(!!data?.inspection.acknowledged_at);
  const [busy, setBusy] = useState(false);

  if (!data) {
    return <Shell><p className="text-sm text-muted-foreground">This check-in link is no longer active.</p></Shell>;
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Type your name to sign");
      return;
    }
    setBusy(true);
    try {
      await signWaiver({ data: { token: data!.inspection.waiver_token as string, name: name.trim() } });
      setSigned(true);
      toast.success("Signed — thank you");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="micro-label">{data.shopName}</p>
      <h1 className="display-title mt-2 text-3xl">Vehicle check-in report</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {[data.customerName, data.vehicle, data.plate].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-5 rounded-2xl border border-elevated bg-surface p-4">
        <p className="micro-label">Pre-existing condition found at intake</p>
        {data.defects.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No pre-existing damage was recorded on your vehicle.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.defects.map((d) => (
              <li key={d.id} className="flex items-start gap-2 rounded-xl border border-elevated bg-surface-2 p-3">
                <span
                  className={
                    d.severity === "critical"
                      ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-critical"
                      : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-urgent"
                  }
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {label(d.defect_type)} — {label(d.panel)}
                  </span>
                  {d.note && <span className="block text-xs text-muted-foreground">{d.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.inspection.mileage != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mileage at check-in: {Number(data.inspection.mileage).toLocaleString()}
          </p>
        )}
      </div>

      {signed ? (
        <div className="mt-4 rounded-2xl border border-revenue/40 bg-revenue/10 p-5">
          <ShieldCheck className="h-6 w-6 text-revenue" />
          <p className="mt-2 text-sm text-muted-foreground">
            Signed by {name}. Work is cleared to start — we'll keep you posted with photos.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-elevated bg-surface p-4">
          <p className="text-xs text-muted-foreground">
            By signing you confirm this report reflects the condition of the vehicle before work begins.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="wsig" className="text-xs">Type your full name</Label>
            <Input id="wsig" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <Button className="mt-3" onClick={submit} disabled={busy}>
            Sign check-in report
          </Button>
        </div>
      )}
    </Shell>
  );
}
