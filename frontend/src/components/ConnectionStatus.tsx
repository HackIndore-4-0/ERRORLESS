import { CheckCircle2, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { HealthInfo } from "@/hooks/useHealth";

export function ConnectionStatus({ health }: { health: HealthInfo }) {
  if (health.state === "checking" || health.state === "unknown") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking…
      </span>
    );
  }
  if (health.state === "online") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        <Wifi className="h-3.5 w-3.5" />
        LIVE BACKEND
        {health.latencyMs != null && (
          <span className="font-normal text-emerald-600/70">
            · {health.latencyMs}ms
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
      <WifiOff className="h-3.5 w-3.5" />
      BACKEND OFFLINE
    </span>
  );
}

export function DemoBadge({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      DEMO MODE
    </span>
  );
}
