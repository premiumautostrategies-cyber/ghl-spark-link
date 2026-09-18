import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "bronze" | "critical" | "revenue" | "urgent" | "comms" | "rig" | "muted";

const TONE: Record<Tone, string> = {
  bronze: "border-bronze/35 bg-bronze/10 text-bronze",
  critical: "border-critical/40 bg-critical/12 text-critical",
  revenue: "border-revenue/35 bg-revenue/10 text-revenue",
  urgent: "border-urgent/40 bg-urgent/10 text-urgent",
  comms: "border-comms/40 bg-comms/12 text-comms",
  rig: "border-rig/40 bg-rig/10 text-rig",
  muted: "border-hairline/60 bg-surface-2 text-muted-foreground",
};

export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("rounded-2xl border border-elevated bg-surface", className)}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  right,
  hint,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
      <div>
        <p className="micro-label">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Tag({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "bronze",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const accent: Record<Tone, string> = {
    bronze: "text-bronze",
    critical: "text-critical",
    revenue: "text-revenue",
    urgent: "text-urgent",
    comms: "text-comms",
    rig: "text-rig",
    muted: "text-foreground",
  };
  return (
    <Panel className="relative overflow-hidden p-5">
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-current opacity-50",
          accent[tone],
        )}
      />
      <p className="micro-label">{label}</p>
      <p className={cn("mt-3 font-display text-3xl font-semibold tabular-nums", accent[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-full border border-elevated bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
            value === o.value
              ? "bg-bronze text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
