import { routeOf } from "@/utils";

const routeStyles: Record<string, string> = {
  AI: "bg-blue-50 text-blue-700 border-blue-200",
  HUMAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HYBRID: "bg-amber-50 text-amber-700 border-amber-200",
  REFUSED: "bg-red-50 text-red-700 border-red-200",
};

export function RouteBadge({ value }: { value: unknown }) {
  const r = routeOf(value) as string;
  const cls = routeStyles[r] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${cls}`}
    >
      {r}
    </span>
  );
}

const slaStyles: Record<string, string> = {
  on_track: "bg-emerald-50 text-emerald-700 border-emerald-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
  breached: "bg-red-50 text-red-700 border-red-200",
  claimed: "bg-blue-50 text-blue-700 border-blue-200",
  claimed_overdue: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  not_applicable: "bg-gray-100 text-gray-500 border-gray-200",
};

export function SlaStatusBadge({ value }: { value: string }) {
  const key = (value || "not_applicable").toLowerCase();
  const cls = slaStyles[key] || slaStyles.not_applicable;
  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
