import { useEffect, useState } from "react";
import { formatDuration, num, taskRemainingMs, taskSlaElapsedPct } from "@/utils";
import type { Task } from "@/types";

export function SlaProgress({ task }: { task: Task }) {
  const elapsedPct = taskSlaElapsedPct(task);
  const remaining = taskRemainingMs(task);
  const [, force] = useState(0);

  // tick every second so the countdown stays live
  useEffect(() => {
    if (remaining == null) return;
    const id = window.setInterval(() => force((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  if (elapsedPct == null) {
    return (
      <div className="text-xs text-gray-400">
        No SLA timer for this task.
      </div>
    );
  }

  const status = String(task.sla_status || "on_track").toLowerCase();
  const barClass =
    status === "breached"
      ? "bg-red-500"
      : status === "at_risk"
        ? "bg-amber-500"
        : status === "claimed"
          ? "bg-blue-500"
          : status === "claimed_overdue"
            ? "bg-purple-500"
            : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">SLA elapsed</span>
        <span className="tabular-nums font-medium text-gray-700">
          {elapsedPct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${Math.min(100, elapsedPct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Remaining</span>
        <span className="tabular-nums font-semibold text-gray-900">
          {formatDuration(remaining ?? 0)}
        </span>
      </div>
    </div>
  );
}

export function SlaRing({
  elapsed,
  size = 56,
}: {
  elapsed: number;
  size?: number;
}) {
  const v = num(elapsed, 0);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, v) / 100) * c;
  const color =
    v >= 100 ? "#ef4444" : v >= 75 ? "#f59e0b" : "#10b981";
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        className="fill-gray-700 text-[11px] font-semibold"
      >
        {Math.round(v)}%
      </text>
    </svg>
  );
}
