import { PANEL_ROWS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Top-down vehicle map used to show (or pick) which panels a package covers.
 */
export function PanelCoverage({
  panels,
  onToggle,
  accent,
  compact,
}: {
  panels: string[];
  onToggle?: (panel: string) => void;
  accent?: string | null | undefined;
  compact?: boolean;
}) {
  const style = accent ? { backgroundColor: accent, borderColor: accent } : undefined;
  return (
    <div className={cn("mx-auto w-full", compact ? "max-w-[150px]" : "max-w-[240px]")}>
      <div className="space-y-1">
        {PANEL_ROWS.map((row, i) => (
          <div key={i} className="grid grid-cols-3 gap-1">
            {row.map((p) => {
              const on = panels.includes(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={!onToggle}
                  title={p.label}
                  onClick={() => onToggle?.(p.key)}
                  style={on ? style : undefined}
                  className={cn(
                    "rounded-[4px] border text-[9px] font-semibold uppercase tracking-[0.06em] transition-colors",
                    compact ? "h-3.5" : "h-6 px-1",
                    p.wide && "col-span-3",
                    on
                      ? "border-bronze bg-bronze text-primary-foreground"
                      : "border-hairline/60 bg-surface-2 text-muted-foreground",
                    onToggle && "hover:border-bronze/60",
                  )}
                >
                  {compact ? "" : p.label.replace(/^[LR] /, "")}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
