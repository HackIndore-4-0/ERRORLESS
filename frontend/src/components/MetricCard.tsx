import { num, str } from "@/utils";

export function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number | undefined | null;
  sub?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "text-gray-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    info: "text-blue-600",
  };
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${tones[tone]}`}>
        {value == null ? "—" : str(value)}
      </div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export function StatBar({
  label,
  value,
  max = 100,
  tone,
}: {
  label: string;
  value: number | unknown;
  max?: number;
  tone?: "on_track" | "at_risk" | "breached" | "claimed" | "claimed_overdue";
}) {
  const v = num(value);
  const toneClass =
    tone === "breached"
      ? "bg-red-500"
      : tone === "at_risk"
        ? "bg-amber-500"
        : tone === "claimed"
          ? "bg-blue-500"
          : tone === "claimed_overdue"
            ? "bg-purple-500"
            : "bg-emerald-500";
  const width = max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-gray-700">
          {Math.round(width)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${toneClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
