import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  SIDE_VIEWBOX,
  TOP_VIEWBOX,
  sideOutline,
  sidePanels,
  sideWheels,
  sideWindows,
  topOutline,
  topPanels,
  topWindows,
  type BodyStyle,
  type Shape,
} from "@/lib/vehicle-art";

/** Paired top and side coverage views drawn on the customer's own body style. */
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
  onToggle?: ((key: string) => void) | undefined;
}) {
  const id = useId();
  const colour = accent || "#c99a5b";
  return (
    <div
      className={cn("grid w-full grid-cols-[0.72fr_1.45fr] items-center gap-2", className)}
      role="img"
      aria-label={kind === "tint" ? "Top and side tint coverage diagrams" : "Top and side film coverage diagrams"}
    >
      <View
        id={`${id}-top`}
        viewBox={TOP_VIEWBOX}
        shapes={kind === "tint" ? topWindows(body) : topPanels(body)}
        outline={topOutline(body)}
        covered={covered}
        colour={colour}
        onToggle={onToggle}
        label="Top"
      />
      <View
        id={`${id}-side`}
        viewBox={SIDE_VIEWBOX}
        shapes={kind === "tint" ? sideWindows(body) : sidePanels(body)}
        outline={sideOutline(body)}
        wheels={sideWheels(body)}
        covered={covered}
        colour={colour}
        onToggle={onToggle}
        label="Side"
      />
    </div>
  );
}

function View({
  id,
  viewBox,
  shapes,
  outline,
  wheels,
  covered,
  colour,
  onToggle,
  label,
}: {
  id: string;
  viewBox: string;
  shapes: Record<string, Shape[]>;
  outline: string;
  wheels?: ReturnType<typeof sideWheels>;
  covered: string[];
  colour: string;
  onToggle?: (key: string) => void;
  label: string;
}) {
  return (
    <span className="min-w-0">
      <svg viewBox={viewBox} className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity="0.95" />
            <stop offset="100%" stopColor={colour} stopOpacity="0.68" />
          </linearGradient>
        </defs>
        {wheels && (
          <g>
            {[wheels.front, wheels.rear].map((x) => (
              <circle key={x} cx={x} cy={wheels.y} r={wheels.r} className="fill-surface-2 stroke-hairline" strokeWidth={2} />
            ))}
          </g>
        )}
        <path d={outline} className="fill-surface-2/70 stroke-hairline" strokeWidth={2.5} />
        {Object.entries(shapes).flatMap(([key, list]) =>
          list.map((shape, index) => (
            <ShapeNode
              key={`${key}-${index}`}
              shape={shape}
              on={covered.includes(key)}
              fill={`url(#${id}-fill)`}
              stroke={colour}
              onClick={onToggle ? () => onToggle(key) : undefined}
            />
          )),
        )}
      </svg>
      <span className="mt-0.5 block text-center text-[8px] uppercase text-muted-foreground">{label}</span>
    </span>
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
