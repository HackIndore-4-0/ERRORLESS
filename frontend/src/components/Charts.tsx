import { useId } from "react";

export interface DonutSlice {
  label: string;
  value: number;
  color: string; // tailwind hex, e.g. "#3b82f6"
}

/**
 * Compact donut chart with a legend. Pure inline SVG — no charting
 * dependency required. Values are proportioned automatically; a slice
 * with value 0 is skipped.
 */
export function DonutChart({
  data,
  size = 132,
  thickness = 16,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const gradId = useId();
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = total > 0 ? d.value / total : 0;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const rotation = (offset / total) * 360 - 90;
      offset += d.value;
      return { ...d, dash, gap, rotation, fraction };
    });

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={thickness}
          />
          {total === 0 ? null : (
            arcs.map((arc, i) => (
              <circle
                key={`${gradId}-${i}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={thickness}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeLinecap={arcs.length > 1 ? "butt" : "round"}
                transform={`rotate(${arc.rotation} ${cx} ${cy})`}
                className="transition-all duration-700 ease-out"
              />
            ))
          )}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <div className="text-xl font-bold tabular-nums text-gray-900">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="text-[10px] uppercase tracking-wide text-gray-400">
                {centerLabel}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="min-w-0 flex-1 truncate text-gray-600">{d.label}</span>
            <span className="flex-shrink-0 font-semibold tabular-nums text-gray-900">
              {d.value}
            </span>
            <span className="w-9 flex-shrink-0 text-right text-gray-400">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * Horizontal bar chart. Good for ranked/comparative values (rework drift,
 * per-employee workload, etc). No axis clutter — value is printed inline.
 */
export function BarChart({
  data,
  max,
  color = "#111827",
  valueFormatter,
}: {
  data: BarDatum[];
  max?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const width = m > 0 ? Math.min(100, (Math.max(0, d.value) / m) * 100) : 0;
        return (
          <div key={`${d.label}-${i}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-gray-600">{d.label}</span>
              <span className="flex-shrink-0 font-semibold tabular-nums text-gray-900">
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${width}%`, backgroundColor: d.color ?? color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface FlowNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  branch?: "success" | "warning" | "danger"; // tints the node for a decision outcome
}

const branchTone: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

/**
 * Compact horizontal flow diagram — a row of icon nodes joined by
 * connector lines, for showing a short process as a chart rather than
 * prose. Scrolls horizontally on narrow screens instead of wrapping, so
 * the connectors never break.
 */
export function FlowChart({ nodes }: { nodes: FlowNode[] }) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {nodes.map((n, i) => (
        <div key={n.id} className="flex items-start">
          <div className="flex w-[92px] flex-shrink-0 flex-col items-center text-center">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border shadow-sm ${
                n.branch ? branchTone[n.branch] : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {n.icon}
            </div>
            <div className="mt-2 text-[11px] font-semibold leading-tight text-gray-800">
              {n.label}
            </div>
          </div>
          {i < nodes.length - 1 && (
            <div className="mt-5 h-[2px] w-6 flex-shrink-0 bg-gray-200 sm:w-9" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}
