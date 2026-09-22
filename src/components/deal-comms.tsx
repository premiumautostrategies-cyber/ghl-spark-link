import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Mail, MessageSquare, Phone, StickyNote } from "lucide-react";

const CHANNELS = [
  { key: "sms", label: "Text", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
  { key: "call", label: "Call log", icon: Phone },
  { key: "note", label: "Note", icon: StickyNote },
] as const;

type Message = {
  id: string;
  channel: string;
  direction: string;
  body: string;
  sent_at: string;
  is_automated: boolean;
  author_name: string | null;
};

export function DealComms({
  dealId,
  customerId,
  customerName,
  variant = "panel",
}: {
  dealId: string;
  customerId: string | null;
  customerName?: string | null;
  variant?: "panel" | "inbox";
}) {
  const qc = useQueryClient();
  const { orgId, locId } = useOrg();
  const [channel, setChannel] = useState<string>("sms");
  const [body, setBody] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["deal-messages", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,channel,direction,body,sent_at,is_automated,author_name")
        .eq("deal_id", dealId)
        .order("sent_at");
      if (error) throw error;
      return data as Message[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id,name,body,category")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (payload: { channel: string; body: string; direction?: string }) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("messages").insert({
        organization_id: orgId,
        location_id: locId,
        deal_id: dealId,
        customer_id: customerId,
        channel: payload.channel,
        direction: payload.direction ?? (payload.channel === "call" ? "in" : "out"),
        body: payload.body,
      });
      if (error) throw error;
      await supabase
        .from("deals")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", dealId);
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["deal-messages", dealId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const content = (
      <div className={cn("flex min-h-0 flex-col", variant === "inbox" ? "flex-1" : "border-t border-elevated p-4")}>
        <div className={cn("space-y-3 overflow-y-auto pr-1", variant === "inbox" ? "min-h-0 flex-1 p-5" : "max-h-72")}>
          {messages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-elevated p-5 text-center text-xs text-muted-foreground">
              Nothing logged yet. The speed-to-lead text fires automatically on new leads.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.direction === "out";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl border px-3 py-2",
                      mine ? "border-bronze/35 bg-bronze/10" : "border-elevated bg-surface-2",
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {m.channel} · {new Date(m.sent_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {m.is_automated ? " · auto" : ""}
                      {m.author_name ? ` · ${m.author_name}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={cn("flex flex-wrap gap-1.5", variant === "inbox" ? "border-t border-elevated px-4 pt-3" : "mt-3")}>
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannel(c.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                channel === c.key
                  ? "border-bronze bg-bronze/15 text-bronze"
                  : "border-elevated bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          ))}
        </div>

        {templates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBody(t.body)}
                className="rounded-full border border-elevated bg-surface-2 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className={cn(variant === "inbox" && "px-4 pb-4")}>
          <Textarea className="mt-2" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel === "call" ? "What was said on the call…" : "Type your message…"} />
          <Button className="mt-2" disabled={!body.trim() || send.isPending} onClick={() => send.mutate({ channel, body: body.trim() })}>{channel === "call" ? "Log call" : channel === "note" ? "Save note" : "Send"}</Button>
        </div>
      </div>
  );

  if (variant === "inbox") return content;

  return <Panel className="min-w-0"><SectionTitle title="Communication centre" hint={`Texts, email and call logs with ${customerName ?? "this customer"}.`} right={<Tag tone="comms">{messages.length} in thread</Tag>} />{content}</Panel>;
}
