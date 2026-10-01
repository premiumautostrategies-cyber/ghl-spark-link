import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/lib/use-org";
import { useLocalStore } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Shop Setup — Systemize" },
      { name: "description", content: "Guided shop setup and a go-live checklist." },
      { property: "og:title", content: "Shop Setup — Systemize" },
      { property: "og:description", content: "Guided shop setup and a go-live checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

type SetupData = {
  shopName: string;
  address: string;
  timezone: string;
  open: string;
  close: string;
  days: string[];
  bays: number;
  taxRate: number;
  depositPct: number;
  services: string[];
  step: number;
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SERVICES = ["Paint protection film", "Window tint", "Ceramic coating", "Vinyl wrap", "Paint correction", "Detailing", "Paintless dent repair"];
const STEPS = ["Shop", "Location", "Hours", "Bays", "Tax & deposit", "Services"];

async function count(table: "customers" | "team_members" | "deals" | "jobs" | "documents" | "integration_connections" | "services") {
  const { count: n } = await supabase.from(table).select("id", { count: "exact", head: true });
  return n ?? 0;
}

function Setup() {
  const { organization } = useOrg();
  const [d, setD] = useLocalStore<SetupData>("setup", {
    shopName: organization?.name ?? "",
    address: "",
    timezone: "America/Detroit",
    open: "08:00",
    close: "17:30",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    bays: 4,
    taxRate: 6,
    depositPct: 25,
    services: ["Paint protection film", "Window tint", "Ceramic coating"],
    step: 0,
  });
  const [finished, setFinished] = useState(false);
  const set = (p: Partial<SetupData>) => setD({ ...d, ...p });

  const { data: c } = useQuery({
    queryKey: ["golive-counts"],
    queryFn: async () => ({
      customers: await count("customers"),
      team: await count("team_members"),
      deals: await count("deals"),
      jobs: await count("jobs"),
      docs: await count("documents"),
      integ: await count("integration_connections"),
      services: await count("services"),
    }),
  });

  const checklist = [
    { label: "Finish shop setup", done: d.step >= STEPS.length || finished, to: "/setup" },
    { label: "Set service prices", done: (c?.services ?? 0) > 0, to: "/services" },
    { label: "Import customers or past jobs", done: (c?.customers ?? 0) > 0, to: "/import" },
    { label: "Invite your team", done: (c?.team ?? 0) > 0, to: "/team" },
    { label: "Build your first quote", done: (c?.deals ?? 0) > 0, to: "/sales" },
    { label: "Book your first job", done: (c?.jobs ?? 0) > 0, to: "/calendar" },
    { label: "Add a waiver or SOP", done: (c?.docs ?? 0) > 0, to: "/documents" },
    { label: "Connect texting or payments", done: (c?.integ ?? 0) > 0, to: "/integrations" },
  ] as const;
  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Shop Setup" subtitle="Six quick steps, then a checklist to go live." />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel className="p-5">
          <div className="mb-5 flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => set({ step: i })}
                className={`rounded-md border px-2.5 py-1 text-xs ${i === d.step ? "border-bronze/50 bg-bronze/10 text-bronze" : i < d.step ? "border-elevated text-foreground" : "border-elevated text-muted-foreground"}`}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <div className="min-h-48 space-y-3">
            {d.step === 0 && <Field label="Shop name"><Input value={d.shopName} onChange={(e) => set({ shopName: e.target.value })} /></Field>}
            {d.step === 1 && (
              <>
                <Field label="Address"><Input value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder="1180 Industrial Way, Troy, MI" /></Field>
                <Field label="Time zone"><Input value={d.timezone} onChange={(e) => set({ timezone: e.target.value })} /></Field>
              </>
            )}
            {d.step === 2 && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((x) => (
                    <button key={x} onClick={() => set({ days: d.days.includes(x) ? d.days.filter((y) => y !== x) : [...d.days, x] })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${d.days.includes(x) ? "border-bronze/50 bg-bronze/10 text-bronze" : "border-elevated text-muted-foreground"}`}>{x}</button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Field label="Opens"><Input type="time" value={d.open} onChange={(e) => set({ open: e.target.value })} /></Field>
                  <Field label="Closes"><Input type="time" value={d.close} onChange={(e) => set({ close: e.target.value })} /></Field>
                </div>
              </>
            )}
            {d.step === 3 && <Field label="Number of bays"><Input type="number" min={1} max={20} value={d.bays} onChange={(e) => set({ bays: Number(e.target.value) })} /></Field>}
            {d.step === 4 && (
              <div className="flex gap-3">
                <Field label="Sales tax %"><Input type="number" value={d.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })} /></Field>
                <Field label="Deposit %"><Input type="number" value={d.depositPct} onChange={(e) => set({ depositPct: Number(e.target.value) })} /></Field>
              </div>
            )}
            {d.step === 5 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <label key={s} className="flex items-center gap-2 rounded-md border border-elevated px-3 py-2 text-sm">
                    <input type="checkbox" checked={d.services.includes(s)} onChange={() => set({ services: d.services.includes(s) ? d.services.filter((x) => x !== s) : [...d.services, s] })} />
                    {s}
                  </label>
                ))}
              </div>
            )}
            {d.step >= STEPS.length && <p className="text-sm text-muted-foreground">Setup saved. Work through the checklist to go live.</p>}
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="outline" disabled={d.step === 0} onClick={() => set({ step: d.step - 1 })}>Back</Button>
            {d.step < STEPS.length - 1 ? (
              <Button onClick={() => set({ step: d.step + 1 })}>Next <ChevronRight className="size-4" /></Button>
            ) : d.step === STEPS.length - 1 ? (
              <Button onClick={() => { set({ step: STEPS.length }); setFinished(true); toast.success("Shop setup saved"); }}>Finish setup</Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-baseline justify-between">
            <p className="micro-label">Go-live checklist</p>
            <span className="text-xs tabular-nums text-muted-foreground">{doneCount}/{checklist.length}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-bronze" style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
          <ul className="mt-3 divide-y divide-elevated/60">
            {checklist.map((i) => (
              <li key={i.label}>
                <Link to={i.to} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={`grid size-5 place-items-center rounded-full border ${i.done ? "border-revenue bg-revenue/15 text-revenue" : "border-elevated"}`}>{i.done && <Check className="size-3" />}</span>
                  <span className={`flex-1 ${i.done ? "text-muted-foreground line-through" : ""}`}>{i.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="micro-label">{label}</span>
      {children}
    </label>
  );
}
