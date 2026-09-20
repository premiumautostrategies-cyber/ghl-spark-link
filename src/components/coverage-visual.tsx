import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  SIDE_VIEWBOX,
  TOP_VIEWBOX,
  sideOutline,
  sideWheels,
  sideWindows,
  topOutline,
  topPanels,
  type BodyStyle,
  type Shape,
} from "@/lib/vehicle-art";

/** PPF/wrap panel coverage (top view) or tint coverage (side view), drawn on the
 *  customer's own body style so two packages are visibly different. */
export function CoverageVisual({
  kind,
  body,
  covered,
  accent = "#c99a5b",
  className,
  onToggle,
}: {
  kind: "panels" | "tint";
  body: BodyStyle;
  covered: string[];
  accent?: string | null;
  className?: string;
  onToggle?: (key: string) => void;
}) {
  const id = useId();
  const colour = accent || "#c99a5b";
  const shapes = kind === "tint" ? sideWindows(body) : topPanels(body);
  const outline = kind === "tint" ? sideOutline(body) : topOutline(body);
  const wheels = kind === "tint" ? sideWheels(body) : null;

  return (
    <svg
      viewBox={kind === "tint" ? SIDE_VIEWBOX : TOP_VIEWBOX}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={kind === "tint" ? "Tint coverage diagram" : "Film coverage diagram"}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.95" />
          <stop offset="100%" stopColor={colour} stopOpacity="0.68" />
        </linearGradient>
      </defs>

      {wheels && (
        <g>
          {[wheels.front, wheels.rear].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={wheels.y}
              r={wheels.r}
              className="fill-surface-2 stroke-hairline"
              strokeWidth={2}
            />
          ))}
        </g>
      )}

      <path d={outline} className="fill-surface-2/70 stroke-hairline" strokeWidth={2.5} />

      {Object.entries(shapes).map(([key, list]) =>
        list.map((s, i) => {
          const on = covered.includes(key);
          return (
            <ShapeNode
              key={`${key}-${i}`}
              shape={s}
              on={on}
              fill={`url(#${id}-fill)`}
              stroke={colour}
              onClick={onToggle ? () => onToggle(key) : undefined}
            />
          );
        }),
      )}
    </svg>
  );
}

function ShapeNode({
  shape,
  on,
  fill,
  stroke,
  onClick,
}: {
  shape: Shape;
  on: boolean;
  fill: string;
  stroke: string;
  onClick?: (() => void) | undefined;
}) {
  const common = {
    onClick,
    style: {
      cursor: onClick ? "pointer" : undefined,
      fill: on ? fill : "transparent",
      stroke: on ? stroke : "currentColor",
      strokeWidth: on ? 1.5 : 1.2,
      opacity: on ? 1 : 0.32,
    } as const,
    className: "text-muted-foreground transition-all",
  };
  if (shape.kind === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...common} />;
  }
  return <polygon points={shape.points} {...common} />;
}
