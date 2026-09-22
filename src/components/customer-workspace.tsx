import { RecordWorkspace } from "@/components/record-workspace";

export function CustomerWorkspace({
  customerId,
  onClose,
  onOpenDeal,
  onAddVehicle,
}: {
  customerId: string | null;
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
  onAddVehicle?: (customerId: string) => void;
}) {
  return <RecordWorkspace customerId={customerId} onClose={onClose} onOpenDeal={onOpenDeal} onAddVehicle={onAddVehicle} />;
}