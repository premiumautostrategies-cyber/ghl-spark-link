import { RecordWorkspace } from "@/components/record-workspace";

export function LeadWorkspace({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  return <RecordWorkspace dealId={dealId} onClose={onClose} />;
}