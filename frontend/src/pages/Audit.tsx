import { Activity, Clock, Server } from "lucide-react";
import { ErrorBanner, EmptyState, LoadingState, SectionTitle } from "@/components/Feedback";
import { Pill } from "@/components/StatusBadge";
import { useHealth } from "@/hooks/useHealth";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/api";
import { demoAudit } from "@/demo";
import type { AuditEvent, Profile } from "@/types";
import { formatRelativeTime, str } from "@/utils";

const HIGHLIGHT = ["task_claimed", "task_reassigned_sla_breach", "sla_emergency_alert"];

function actionTone(action: string): "neutral" | "info" | "warning" | "danger" {
  const a = action.toLowerCase();
  if (a.includes("emergency") || a.includes("breach")) return "danger";
  if (a.includes("reassign") || a.includes("cascade")) return "warning";
  if (a.includes("claim")) return "info";
  return "neutral";
}

export function Audit({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const { data, error, loading } = usePoll<{ events: AuditEvent[] }>(
    () => (demo ? Promise.resolve({ events: demoAudit }) : api.audit()),
    6000,
  );
  const { health } = useHealth(15000);

  const events = data?.events ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Audit Trail
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every important HUMAI action is recorded so the team can understand
          what happened.
        </p>
      </div>

      {/* Backend health */}
      <div className="card p-5">
        <SectionTitle title="Backend health" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Connection</div>
              <div className={`text-sm font-semibold ${health.state === "online" ? "text-emerald-600" : health.state === "offline" ? "text-red-600" : "text-gray-700"}`}>
                {health.state === "online" ? "Connected" : health.state === "offline" ? "Offline" : "Checking…"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Latency</div>
              <div className="text-sm font-semibold text-gray-700">
                {health.latencyMs != null ? `${health.latencyMs}ms` : "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Last checked</div>
              <div className="text-sm font-semibold text-gray-700">
                {health.lastChecked ? formatRelativeTime(new Date(health.lastChecked).toISOString()) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <SectionTitle title="Recent audit events" />
        {loading && !data ? (
          <LoadingState />
        ) : error && !demo ? (
          <ErrorBanner message={error} />
        ) : events.length === 0 ? (
          <EmptyState title="No audit events yet" description="Important HUMAI actions will be recorded here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Task</th>
                  <th className="py-2 pr-4 font-medium">Employee</th>
                  <th className="py-2 pr-4 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map((e, i) => {
                  const action = str(e.action);
                  const tone = actionTone(action);
                  const highlight = HIGHLIGHT.includes(action.toLowerCase());
                  return (
                    <tr key={i} className={`hover:bg-gray-50/60 ${highlight ? "bg-gray-50/40" : ""}`}>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-gray-500">
                        {formatRelativeTime(e.time || e.timestamp)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Pill tone={tone}>{action.replace(/_/g, " ")}</Pill>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {str(e.task_title || e.task, str(e.task_id, "—"))}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {str(e.employee_name || e.employee, "—")}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {str(e.reason, "—")}
                        {e.details && <span className="block text-xs text-gray-400">{e.details}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
