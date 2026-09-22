import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ListChecks, Loader2, Sparkles, Target } from "lucide-react";
import { summarizeConversation, type ConversationSummary } from "@/lib/conversation-summary.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SummaryTurn = { speaker: string; channel: string; at: string; text: string };

type Props = {
  customer: string;
  vehicle: string;
  opportunity: string;
  stage: string;
  value: string;
  turns: SummaryTurn[];
};

const SENTIMENT: Record<string, string> = {
  hot: "text-emerald-400",
  warm: "text-bronze",
  cooling: "text-amber-400",
  unclear: "text-muted-foreground",
};

export function ConversationSummaryButton(props: Props) {
  const [open, setOpen] = useState(false);
  const summarize = useServerFn(summarizeConversation);
  const mutation = useMutation<ConversationSummary, Error>({
    mutationFn: () =>
      summarize({
        data: {
          customer: props.customer,
          vehicle: props.vehicle,
          opportunity: props.opportunity,
          stage: props.stage,
          value: props.value,
          turns: props.turns.slice(0, 80).map((turn) => ({ ...turn, text: turn.text.slice(0, 4000) })),
        },
      }),
  });

  const run = () => {
    setOpen(true);
    mutation.mutate();
  };

  return (
    <>
      <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={run} disabled={!props.turns.length}>
        <Sparkles className="mr-1.5 size-3.5" />
        Summarize
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversation brief</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-xs text-muted-foreground">
            {props.customer} · {props.vehicle} · {props.turns.length} messages reviewed
          </p>

          {mutation.isPending && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Reading the thread…
            </div>
          )}

          {mutation.isError && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-destructive">{mutation.error.message}</p>
              <Button size="sm" variant="secondary" onClick={() => mutation.mutate()}>Try again</Button>
            </div>
          )}

          {mutation.data && (
            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <p className="micro-label mb-1.5">Where it stands</p>
                <p className="text-sm leading-6">{mutation.data.summary}</p>
                <p className={cn("mt-2 text-xs font-medium uppercase tracking-wide", SENTIMENT[mutation.data.sentiment] ?? SENTIMENT['unclear'])}>
                  {mutation.data.sentiment}
                </p>
              </div>
              <Section icon={Target} label="Key needs" items={mutation.data.needs} empty="Nothing specific stated yet." />
              <Section icon={AlertTriangle} label="Objections" items={mutation.data.objections} empty="No objections raised." />
              <Section icon={ListChecks} label="Next steps" items={mutation.data.next_steps} empty="No follow-up needed." />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ icon: Icon, label, items, empty }: { icon: typeof Target; label: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="micro-label mb-2 flex items-center gap-1.5"><Icon className="size-3.5 text-bronze" />{label}</p>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={`${label}-${index}`} className="flex gap-2 text-sm leading-6">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
