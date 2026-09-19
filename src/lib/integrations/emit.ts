import { useServerFn } from "@tanstack/react-start";
import { emitDomainEvent } from "@/lib/integrations.functions";
import type { DomainEventType } from "./registry";

/**
 * Fire-and-forget domain event emitter. Sync failures never block the UI —
 * they land in the Integrations activity log with a retry button.
 */
export function useEmitEvent() {
  const emit = useServerFn(emitDomainEvent);
  return (input: {
    event: DomainEventType;
    payload: Record<string, unknown>;
    localType?: string;
    localId?: string;
    summary?: string;
  }) => {
    void emit({ data: input }).catch((err) => {
      console.error("sync emit failed", err);
    });
  };
}
