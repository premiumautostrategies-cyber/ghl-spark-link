import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOC_TYPES, dayDate, label } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Systemize" },
      { name: "description", content: "Contracts, warranties, releases and care guides." },
      { property: "og:title", content: "Documents — Systemize" },
      { property: "og:description", content: "Contracts, warranties, releases and care guides." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [open, setOpen] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, customers(name), jobs(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addDoc = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("documents").insert({
        name: String(form.get("name")),
        doc_type: String(form.get("doc_type")),
        status: String(form.get("status")),
        body: String(form.get("body") || "") || null,
        customer_id: String(form.get("customer_id") || "") || null,
        organization_id: orgId,
        location_id: locId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sign = useMutation({
    mutationFn: async ({ id, signer }: { id: string; signer: string }) => {
      const { error } = await supabase
        .from("documents")
        .update({ status: "signed", signed_at: new Date().toISOString(), signer_name: signer })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked signed");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const awaiting = docs.filter((d) => d.status === "awaiting_signature");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Contracts, warranties, releases and aftercare — attached to the job."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New document</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New document</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDoc.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Title</Label>
                  <Input id="name" name="name" placeholder="PPF installation agreement" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select name="doc_type" defaultValue="contract">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {label(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue="draft">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="awaiting_signature">Awaiting signature</SelectItem>
                        <SelectItem value="signed">Signed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Customer</Label>
                    <Select name="customer_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Contents</Label>
                  <Textarea id="body" name="body" rows={5} />
                </div>
                <Button type="submit" className="w-full" disabled={addDoc.isPending}>
                  Save document
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documents" value={String(docs.length)} />
        <StatCard label="Awaiting signature" value={String(awaiting.length)} />
        <StatCard label="Signed" value={String(docs.filter((d) => d.status === "signed").length)} />
      </div>

      {docs.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Keep agreements, warranties and release forms with the job they belong to."
        />
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {docs.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {label(d.doc_type)} · {d.customers?.name ?? "No customer"} ·{" "}
                  {d.jobs?.title ?? "No job"}
                  {d.signed_at ? ` · signed ${dayDate(d.signed_at)}` : ""}
                </p>
              </div>
              <Badge variant={d.status === "signed" ? "secondary" : "outline"}>
                {label(d.status)}
              </Badge>
              {d.status !== "signed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    sign.mutate({ id: d.id, signer: d.customers?.name ?? "Customer" })
                  }
                >
                  Mark signed
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
