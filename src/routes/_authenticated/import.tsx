import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMPORT_TARGETS,
  suggestCsvMapping,
  type ImportTarget,
  type MappingSuggestion,
} from "@/lib/imports.functions";
import { Sparkles, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Data Import — Systemize" },
      {
        name: "description",
        content:
          "Bring customers, vehicles and open quotes over from your old shop system with AI column matching.",
      },
      { property: "og:title", content: "Data Import — Systemize" },
      {
        property: "og:description",
        content:
          "Bring customers, vehicles and open quotes over from your old shop system with AI column matching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

/* ---------- CSV parsing (quoted fields, escaped quotes, CRLF) ---------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const TARGET_KEYS = Object.keys(IMPORT_TARGETS) as ImportTarget[];

type Parsed = { fileName: string; headers: string[]; rows: string[][] };

function ImportPage() {
  const { orgId, locId } = useOrg();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const suggest = useServerFn(suggestCsvMapping);

  const [target, setTarget] = useState<ImportTarget>("customers");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [ai, setAi] = useState<MappingSuggestion | null>(null);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);

  const history = useQuery({
    queryKey: ["import-batches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const fields = IMPORT_TARGETS[target].fields;
  const mappedCount = useMemo(
    () => Object.values(mapping).filter((v) => v && v !== "skip").length,
    [mapping],
  );

  function guessLocally(headers: string[]) {
    const next: Record<string, string> = {};
    for (const h of headers) {
      const norm = h.toLowerCase().replace(/[^a-z]/g, "");
      const hit = fields.find((f) => norm === f.replace(/_/g, "") || norm.includes(f.replace(/_/g, "")));
      next[h] = hit ?? "skip";
    }
    return next;
  }

  async function onFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      toast.error("That file needs a header row and at least one row of data.");
      return;
    }
    const headers = rows[0]!.map((h) => h.trim());
    const body = rows.slice(1);
    setParsed({ fileName: file.name, headers, rows: body });
    setMapping(guessLocally(headers));
    setAi(null);
  }

  async function askAi() {
    if (!parsed) return;
    setThinking(true);
    try {
      const result = await suggest({
        data: {
          target,
          headers: parsed.headers,
          sampleRows: parsed.rows.slice(0, 5),
        },
      });
      setAi(result);
      setMapping((prev) => {
        const next = { ...prev };
        for (const m of result.mappings) {
          if (parsed.headers.includes(m.column)) {
            next[m.column] = fields.includes(m.field as never) ? m.field : "skip";
          }
        }
        return next;
      });
      toast.success(`Columns matched — looks like ${result.source_system}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The column matcher couldn't run.");
    } finally {
      setThinking(false);
    }
  }

  function rowValues(row: string[]) {
    const out: Record<string, string> = {};
    parsed?.headers.forEach((h, i) => {
      const field = mapping[h];
      if (!field || field === "skip") return;
      const val = (row[i] ?? "").trim();
      if (val) out[field] = val;
    });
    return out;
  }

  async function commit() {
    if (!parsed || !orgId) return;
    setSaving(true);
    let imported = 0;
    let errors = 0;
    try {
      const records = parsed.rows.map(rowValues);

      if (target === "customers") {
        const rows = records
          .filter((r) => r['name'])
          .map((r) => ({
            organization_id: orgId,
            location_id: locId,
            name: r['name']!,
            email: r['email'] ?? null,
            phone: r['phone'] ?? null,
            company: r['company'] ?? null,
            notes: r['notes'] ?? null,
          }));
        errors = records.length - rows.length;
        if (rows.length) {
          const { error, data } = await supabase.from("customers").insert(rows).select("id");
          if (error) throw error;
          imported = data?.length ?? 0;
        }
      } else {
        const { data: customers, error: cErr } = await supabase
          .from("customers")
          .select("id, name")
          .eq("organization_id", orgId);
        if (cErr) throw cErr;
        const byName = new Map(
          (customers ?? []).map((c) => [c.name.trim().toLowerCase(), c.id] as const),
        );

        async function customerId(name?: string) {
          const key = (name ?? "").trim().toLowerCase();
          if (!key) return null;
          const existing = byName.get(key);
          if (existing) return existing;
          const { data, error } = await supabase
            .from("customers")
            .insert({ organization_id: orgId, location_id: locId, name: name!.trim() })
            .select("id")
            .single();
          if (error) throw error;
          byName.set(key, data.id);
          return data.id;
        }

        for (const r of records) {
          try {
            const cid = await customerId(r['customer_name']);
            if (!cid) {
              errors++;
              continue;
            }
            if (target === "vehicles") {
              const year = Number(r['year']);
              const { error } = await supabase.from("vehicles").insert({
                organization_id: orgId,
                customer_id: cid,
                year: Number.isFinite(year) && year > 1900 ? year : null,
                make: r['make'] ?? null,
                model: r['model'] ?? null,
                color: r['color'] ?? null,
                plate: r['plate'] ?? null,
                vin: r['vin'] ?? null,
                location_id: locId,
              });
              if (error) throw error;
            } else {
              const value = Number(String(r['value'] ?? "").replace(/[^0-9.]/g, ""));
              const { error } = await supabase.from("deals").insert({
                organization_id: orgId,
                location_id: locId,
                customer_id: cid,
                title: r['title'] ?? `${r['customer_name']} — imported`,
                stage: r['stage'] ?? "new_lead",
                value: Number.isFinite(value) ? value : 0,
                notes: r['notes'] ?? null,
              });
              if (error) throw error;
            }
            imported++;
          } catch {
            errors++;
          }
        }
      }

      await supabase.from("import_batches").insert({
        organization_id: orgId,
        name: `${IMPORT_TARGETS[target].label} · ${parsed.fileName}`,
        source_system: ai?.source_system ?? null,
        target,
        file_name: parsed.fileName,
        mapping,
        row_count: parsed.rows.length,
        imported_count: imported,
        error_count: errors,
        notes: ai?.summary ?? null,
        status: errors && !imported ? "failed" : "completed",
      });

      await queryClient.invalidateQueries();
      toast.success(`${imported} ${IMPORT_TARGETS[target].label.toLowerCase()} brought in.`);
      setParsed(null);
      setAi(null);
      setMapping({});
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The import stopped partway.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Import"
        subtitle="Drop a spreadsheet from your old system and we'll line the columns up for you."
        action={
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 size-4" /> Choose CSV
          </Button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bringing in" value={IMPORT_TARGETS[target].label} hint="Pick below" />
        <StatCard
          label="Rows found"
          value={parsed ? String(parsed.rows.length) : "—"}
          hint={parsed?.fileName ?? "No file yet"}
        />
        <StatCard
          label="Columns matched"
          value={parsed ? `${mappedCount}/${parsed.headers.length}` : "—"}
          hint={ai ? `Looks like ${ai.source_system}` : "Match by hand or with AI"}
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <Label className="micro-label">What's in this file</Label>
            <Select
              value={target}
              onValueChange={(v) => {
                setTarget(v as ImportTarget);
                if (parsed) setMapping(guessLocally(parsed.headers));
                setAi(null);
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {IMPORT_TARGETS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={!parsed || thinking} onClick={() => void askAi()}>
            <Sparkles className="mr-2 size-4" />
            {thinking ? "Matching columns…" : "Match columns with AI"}
          </Button>
          <Button disabled={!parsed || saving || !mappedCount} onClick={() => void commit()}>
            {saving ? "Importing…" : "Import rows"}
          </Button>
        </div>
        {ai?.summary && <p className="mt-4 text-sm text-muted-foreground">{ai.summary}</p>}
      </Panel>

      {!parsed ? (
        <EmptyState
          title="No file loaded"
          body="Export customers, vehicles or open quotes from your old system as a CSV, then choose the file above."
        />
      ) : (
        <>
          <Panel>
            <SectionTitle title="Column matching" hint="Send a column nowhere by choosing Skip." />
            <div className="divide-y divide-hairline/60 border-t border-elevated">
              {parsed.headers.map((h, i) => {
                const note = ai?.mappings.find((m) => m.column === h);
                return (
                  <div key={h} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-48 flex-1">
                      <p className="text-sm font-semibold">{h}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {parsed.rows[0]?.[i] || "—"}
                      </p>
                    </div>
                    {note?.note && (
                      <p className="hidden max-w-64 flex-1 text-xs text-muted-foreground md:block">
                        {note.note}
                      </p>
                    )}
                    {note && <Tag tone="bronze">{Math.round(note.confidence * 100)}%</Tag>}
                    <Select
                      value={mapping[h] ?? "skip"}
                      onValueChange={(v) => setMapping((p) => ({ ...p, [h]: v }))}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip this column</SelectItem>
                        {fields.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Preview" hint="First five rows, the way they'll land." />
            <div className="overflow-x-auto border-t border-elevated">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    {fields.map((f) => (
                      <th key={f} className="micro-label px-4 py-2">
                        {f.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((r, idx) => {
                    const v = rowValues(r);
                    return (
                      <tr key={idx} className="border-t border-hairline/50">
                        {fields.map((f) => (
                          <td key={f} className="px-4 py-2 text-muted-foreground">
                            {v[f] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <Panel>
        <SectionTitle title="Past imports" />
        <div className="divide-y divide-hairline/60 border-t border-elevated">
          {(history.data ?? []).length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Nothing imported yet.</p>
          ) : (
            (history.data ?? []).map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()}
                    {b.source_system ? ` · from ${b.source_system}` : ""}
                  </p>
                </div>
                <Tag tone="revenue">{b.imported_count} in</Tag>
                {b.error_count > 0 && <Tag tone="urgent">{b.error_count} skipped</Tag>}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
