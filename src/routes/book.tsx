import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Appointment — Systemize" },
      { name: "description", content: "Request a tint, PPF, ceramic or wrap appointment online." },
      { property: "og:title", content: "Book an Appointment — Systemize" },
      { property: "og:description", content: "Request a tint, PPF, ceramic or wrap appointment online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Book,
});

const SERVICES = ["Window tint", "Paint protection film", "Ceramic coating", "Vinyl wrap", "Paint correction", "Dent repair"];

function Book() {
  const [svc, setSvc] = useState<string[]>([]);
  const [f, setF] = useState({ name: "", phone: "", email: "", vehicle: "", date: "", notes: "" });
  const [done, setDone] = useState(false);
  const ok = f.name && (f.phone || f.email) && f.vehicle && svc.length && f.date;

  if (done)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Panel className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-revenue" />
          <h1 className="mt-4 text-xl font-semibold">Request received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks {f.name.split(" ")[0]} — we'll text you to confirm {new Date(f.date).toLocaleDateString()} for your {f.vehicle}.
          </p>
        </Panel>
      </main>
    );

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Book an appointment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick your services and a preferred day. We'll confirm by text.</p>
      </div>
      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map((s) => (
            <button key={s} onClick={() => setSvc(svc.includes(s) ? svc.filter((x) => x !== s) : [...svc, s])}
              className={`rounded-md border px-3 py-1.5 text-sm ${svc.includes(s) ? "border-bronze/50 bg-bronze/10 text-bronze" : "border-elevated text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <Input placeholder="Year, make and model" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} />
        <Input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Mobile" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Textarea placeholder="Anything we should know?" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <Button className="w-full" disabled={!ok} onClick={() => setDone(true)}>Request appointment</Button>
      </Panel>
    </main>
  );
}
