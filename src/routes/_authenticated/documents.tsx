import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Kpi, Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dayDate } from "@/lib/format";
import { DOC_CATEGORIES, STARTER_LIBRARY, docCategoryLabel } from "@/lib/doc-library";
import { toast } from "sonner";
import { Copy, FileText, Pencil, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document library — Systemize" },
      {
        name: "description",
        content:
          "Warranty terms, liability releases, care instructions and shop policies kept in one place.",
      },
      { property: "og:title", content: "Document library — Systemize" },
      {
        property: "og:description",
        content:
          "Warranty terms, liability releases, care instructions and shop policies kept in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

type Doc = {
  id: string;
  name: string;
  doc_type: string;
  body: string | null;
  status: string;
  source_url: string | null;
  updated_at: string;
};

const DOC_BUILDER_URL = "https://systemize-shop-systems.lovable.app";

function DocumentsPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Doc> | null>(null);
  const [reading, setReading] = useState<Doc | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,name,doc_type,body,status,source_url,updated_at")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as Doc[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const save = useMutation({
    mutationFn: async (doc: Partial<Doc>) => {
      if (!orgId) throw new Error("No workspace selected");
      if (doc.id) {
        const { error } = await supabase
          .from("documents")
          .update({
            name: doc.name ?? "Untitled",
            doc_type: doc.doc_type ?? "warranty",
            body: doc.body ?? null,
            status: doc.status ?? "published",
            source_url: doc.source_url ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documents").insert({
          name: doc.name!,
          doc_type: doc.doc_type ?? "warranty",
          body: doc.body ?? null,
          status: doc.status ?? "published",
          source_url: doc.source_url ?? null,
          organization_id: orgId,
          location_id: locId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Document saved");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed from the library");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadStarter = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No workspace selected");
      const existing = new Set(docs.map((d) => d.name.toLowerCase()));
      const rows = STARTER_LIBRARY.filter((d) => !existing.has(d.name.toLowerCase())).map((d) => ({
        name: d.name,
        doc_type: d.doc_type,
        body: d.body,
        status: "published",
        organization_id: orgId,
        location_id: locId,
      }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("documents").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `${n} documents added` : "Library already up to date");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (category === "all" || d.doc_type === category) &&
        (!q || d.name.toLowerCase().includes(q) || (d.body ?? "").toLowerCase().includes(q)),
    );
  }, [docs, query, category]);

  const grouped = DOC_CATEGORIES.map((c) => ({
    ...c,
    docs: filtered.filter((d) => d.doc_type === c.key),
  })).filter((g) => g.docs.length > 0);

  const other = filtered.filter((d) => !DOC_CATEGORIES.some((c) => c.key === d.doc_type));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-elevated pb-5">
        <div>
          <p className="micro-label">Operations</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">Document library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Warranty terms, liability releases, care instructions and shop policies — written once,
            attached wherever they are needed. Write them here or paste in paperwork built elsewhere.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={DOC_BUILDER_URL} target="_blank" rel="noreferrer">
              Create a document
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => loadStarter.mutate()}
            disabled={loadStarter.isPending}
          >
            Load starter set
          </Button>
          <Button onClick={() => setEditing({ doc_type: "warranty", status: "published" })}>
            New document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Documents" value={String(docs.length)} tone="revenue" />
        <Kpi
          label="Care instructions"
          value={String(docs.filter((d) => d.doc_type === "care_guide").length)}
          tone="comms"
        />
        <Kpi
          label="Warranty & liability"
          value={String(
            docs.filter((d) => d.doc_type === "warranty" || d.doc_type === "release").length,
          )}
          tone="muted"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and contents"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {DOC_CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Panel>
          <p className="px-5 py-10 text-center text-xs text-muted-foreground">Loading library…</p>
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {docs.length === 0
              ? "Nothing in the library yet — load the starter set to begin with warranty terms, releases and care instructions."
              : "No documents match that search."}
          </p>
        </Panel>
      ) : (
        <div className="space-y-5">
          {[...grouped, ...(other.length ? [{ key: "other", label: "Other", docs: other }] : [])].map(
            (group) => (
              <Panel key={group.key}>
                <SectionTitle title={group.label} hint={`${group.docs.length} document${group.docs.length === 1 ? "" : "s"}`} />
                <div className="divide-y divide-elevated">
                  {group.docs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setReading(d)}
                      className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left transition hover:bg-elevated/40"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(d.body ?? "No contents yet").replace(/\s+/g, " ").slice(0, 120)}
                        </p>
                      </div>
                      <Tag tone={d.status === "published" ? "revenue" : "muted"}>
                        {d.status === "published" ? "Published" : "Draft"}
                      </Tag>
                      <span className="text-xs text-muted-foreground">
                        updated {dayDate(d.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(d);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Duplicate"
                          onClick={(e) => {
                            e.stopPropagation();
                            save.mutate({
                              name: `${d.name} (copy)`,
                              doc_type: d.doc_type,
                              body: d.body,
                              status: "draft",
                            });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove.mutate(d.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
            ),
          )}
        </div>
      )}

      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reading?.name}</DialogTitle>
          </DialogHeader>
          <p className="micro-label">{docCategoryLabel(reading?.doc_type ?? "")}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {reading?.body || "No contents yet."}
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {reading?.source_url && (
              <Button variant="ghost" asChild>
                <a href={reading.source_url} target="_blank" rel="noreferrer">
                  Open original
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(reading?.body ?? "");
                toast.success("Contents copied");
              }}
            >
              Copy text
            </Button>
            <Button
              onClick={() => {
                setEditing(reading);
                setReading(null);
              }}
            >
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit document" : "New document"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save.mutate({
                ...(editing?.id ? { id: editing.id } : {}),
                name: String(f.get("name")),
                doc_type: String(f.get("doc_type")),
                status: String(f.get("status")),
                source_url: String(f.get("source_url") || "") || null,
                body: String(f.get("body") || ""),
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Title</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Paint protection film — aftercare"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="doc_type" defaultValue={editing?.doc_type ?? "warranty"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "published"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_url">Link to the original (optional)</Label>
              <Input
                id="source_url"
                name="source_url"
                type="url"
                defaultValue={editing?.source_url ?? ""}
                placeholder="https://systemize-shop-systems.lovable.app/..."
              />
              <p className="text-xs text-muted-foreground">
                Built the paperwork elsewhere? Paste the link and keep it filed here with the rest
                of the library.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Contents</Label>
              <Textarea id="body" name="body" rows={14} defaultValue={editing?.body ?? ""} />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              Save document
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
