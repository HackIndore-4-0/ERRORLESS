import { Brain, TrendingUp } from "lucide-react";
import { ErrorBanner, EmptyState, LoadingState, SectionTitle } from "@/components/Feedback";
import { MetricCard } from "@/components/MetricCard";
import { BarChart } from "@/components/Charts";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/api";
import { demoRework } from "@/demo";
import type { Profile, ReworkSummary } from "@/types";
import { formatRelativeTime, num, str } from "@/utils";

export function Rework({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const { data, error, loading } = usePoll<ReworkSummary>(
    () => (demo ? Promise.resolve(demoRework) : api.rework()),
    10000,
  );

  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Rework &amp; Learning
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          When humans repeatedly need to heavily change AI output, HUMAI
          increases the human involvement needed for similar tasks.
        </p>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error && !demo ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Human Need Baseline" value={`${num(data?.human_need_baseline)}%`} tone="info" />
            <MetricCard label="Task Samples" value={num(data?.task_samples)} />
            <MetricCard label="Rework Count" value={num(data?.rework_count)} tone="warning" />
            <MetricCard label="Rework Rate" value={`${num(data?.rework_rate)}%`} tone={num(data?.rework_rate) > 10 ? "warning" : "neutral"} />
          </div>

          {incidents.length > 0 && (
            <div className="card p-5">
              <SectionTitle title="Drift ratio by incident" subtitle="Share of AI output a human had to change" />
              <BarChart
                data={incidents.map((inc) => ({
                  label: str(inc.task_title || inc.task, str(inc.task_id, "—")),
                  value: Math.round(num(inc.drift_ratio) * 100),
                  color: num(inc.drift_ratio) > 0.5 ? "#f59e0b" : "#111827",
                }))}
                max={100}
                valueFormatter={(v) => `${v}%`}
              />
            </div>
          )}

          <div className="card p-5">
            <SectionTitle title="Recent rework incidents" />
            {incidents.length === 0 ? (
              <EmptyState title="No rework incidents" description="When a human heavily edits AI output, it shows up here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4 font-medium">Task</th>
                      <th className="py-2 pr-4 font-medium">Drift Ratio</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {incidents.map((inc, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">
                          {str(inc.task_title || inc.task, str(inc.task_id, "—"))}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`tabular-nums font-medium ${num(inc.drift_ratio) > 0.5 ? "text-amber-600" : "text-gray-700"}`}>
                            {num(inc.drift_ratio).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">
                          {formatRelativeTime(inc.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card flex items-start gap-3 p-5">
            <TrendingUp className="mt-0.5 h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                How HUMAI learns from rework
              </div>
              <p className="mt-1 text-sm text-gray-600">
                A high drift ratio means the human changed most of the AI output.
                HUMAI treats this as a signal that similar future tasks need
                more human involvement.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-5">
            <Brain className="mt-0.5 h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Technical Details
              </div>
              <p className="mt-1 text-sm text-gray-600">
                The drift ratio is the fraction of AI output that was changed
                by the human reviewer. The human-need baseline adjusts upward
                when rework rates are consistently high for a task type.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
