import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Panel, Tag } from "@/components/os-ui";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/films")({
  head: () => ({
    meta: [
      { title: "Film Catalog — Systemize" },
      { name: "description", content: "PPF, tint and wrap film lines with warranty terms and shades." },
      { property: "og:title", content: "Film Catalog — Systemize" },
      { property: "og:description", content: "PPF, tint and wrap film lines with warranty terms and shades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Films,
});

const FILMS = [
  { brand: "XPEL", line: "Ultimate Plus", kind: "PPF", finish: "Gloss", warranty: "10 yr", note: "Self-healing, stain resistant" },
  { brand: "XPEL", line: "Stealth", kind: "PPF", finish: "Satin", warranty: "10 yr", note: "Turns gloss paint satin" },
  { brand: "SunTek", line: "Ultra", kind: "PPF", finish: "Gloss", warranty: "12 yr", note: "Hydrophobic top coat" },
  { brand: "STEK", line: "DYNOshield", kind: "PPF", finish: "Gloss", warranty: "10 yr", note: "High clarity" },
  { brand: "XPEL", line: "Prime XR Plus", kind: "Tint", finish: "5 / 15 / 20 / 35 / 50 / 70%", warranty: "Lifetime", note: "Nano-ceramic, 98% IR rejection" },
  { brand: "SunTek", line: "Evolve", kind: "Tint", finish: "5 / 20 / 35 / 50%", warranty: "Lifetime", note: "Nano-ceramic, signal friendly" },
  { brand: "3M", line: "Ceramic IR", kind: "Tint", finish: "5 / 15 / 25 / 35 / 50%", warranty: "Lifetime", note: "Up to 95% IR rejection" },
  { brand: "Avery Dennison", line: "Supreme Wrapping Film", kind: "Wrap", finish: "Gloss / Satin / Matte", warranty: "7 yr", note: "Easy-apply, repositionable" },
  { brand: "3M", line: "Wrap Film 2080", kind: "Wrap", finish: "Gloss / Satin / Matte", warranty: "8 yr", note: "Protective cap on gloss" },
  { brand: "KPMF", line: "K75400", kind: "Wrap", finish: "Gloss / Matte", warranty: "6 yr", note: "Wide color range" },
];
const KINDS = ["All", "PPF", "Tint", "Wrap"];

function Films() {
  const [kind, setKind] = useState("All");
  const [q, setQ] = useState("");
  const list = FILMS.filter((f) => (kind === "All" || f.kind === kind) && `${f.brand} ${f.line}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <PageHeader title="Film Catalog" subtitle="Film lines you install, with finishes, shades and warranty terms." />
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-md border px-3 py-1 text-xs ${kind === k ? "border-bronze/50 bg-bronze/10 text-bronze" : "border-elevated text-muted-foreground"}`}>{k}</button>
        ))}
        <Input className="ml-auto max-w-xs" placeholder="Search brand or line" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-elevated">{["Brand", "Line", "Type", "Finish / shades", "Warranty", "Notes"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.brand + f.line} className="border-b border-elevated/60 last:border-0">
                <td className="px-4 py-2.5 font-medium">{f.brand}</td>
                <td className="px-4 py-2.5">{f.line}</td>
                <td className="px-4 py-2.5"><Tag>{f.kind}</Tag></td>
                <td className="px-4 py-2.5 text-muted-foreground">{f.finish}</td>
                <td className="px-4 py-2.5 tabular-nums">{f.warranty}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
