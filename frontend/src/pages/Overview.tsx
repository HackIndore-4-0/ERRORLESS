import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Brain,
  ClipboardCheck,
  Gauge,
  RefreshCw,
  Route,
  ShieldCheck,
  UserCheck,
  UserSearch,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { ErrorBanner, LoadingState, SectionTitle } from "@/components/Feedback";
import { RouteBadge } from "@/components/StatusBadge";
import { DonutChart, FlowChart } from "@/components/Charts";
import { usePoll } from "@/hooks/usePoll";
import type { Profile } from "@/types";
import { api } from "@/api";
import { demoSlaDashboard, demoTasks } from "@/demo";
import { num, str, taskTitle } from "@/utils";

function FlowStep({
  icon,
  title,
  desc,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm">
        {icon}
      </div>
      <div className="mt-2.5 text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 max-w-[160px] text-xs text-gray-500">{desc}</div>
      {!last && (
        <ArrowRight className="absolute -right-3 top-3.5 hidden h-4 w-4 text-gray-300 sm:block" />
      )}
    </div>
  );
}

export function Overview({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const { data, error, loading } = usePoll(
    () => (demo ? Promise.resolve(demoSlaDashboard) : api.slaDashboard()),
    4000,
    !demo || demo,
  );

  const counts = data?.counts ?? {};
  const tasks = data?.tasks ?? demoTasks;
  const active = num(counts.active ?? tasks.filter((t) => String(t.status).toLowerCase() === "assigned").length);
  const aiTasks = tasks.filter((t) => str(t.route).toUpperCase() === "AI").length;
  const humanTasks = tasks.filter((t) => str(t.route).toUpperCase() === "HUMAN").length;
  const hybridTasks = tasks.filter((t) => str(t.route).toUpperCase() === "HYBRID").length;
  const refusedTasks = tasks.filter((t) => str(t.route).toUpperCase() === "REFUSED").length;
  const atRisk = num(counts.at_risk);
  const breached = num(counts.breached);
  const onTrack = num(
    counts.on_track ?? tasks.filter((t) => str(t.sla_status) === "on_track").length,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Control Room
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          See what HUMAI is doing right now.
        </p>
      </div>

      {/* What is HUMAI? */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">What is HUMAI?</h2>
        <p className="mt-1.5 text-sm text-gray-600">
          HUMAI is a decision layer between incoming work and the person or AI
          that handles it. It decides:
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Should AI do this?",
            "Should a human do this?",
            "Should both work together?",
            "Or should the task be refused?",
          ].map((q) => (
            <div
              key={q}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
            >
              {q}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-600">
          After assignment, HUMAI continues monitoring the work so important
          tasks do not become stuck.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Active Tasks" value={active} tone="info" icon={<Activity className="h-4 w-4" />} />
        <MetricCard label="AI" value={aiTasks} tone="info" />
        <MetricCard label="Human" value={humanTasks} tone="success" />
        <MetricCard label="Hybrid" value={hybridTasks} tone="warning" />
        <MetricCard label="At Risk" value={atRisk} tone={atRisk > 0 ? "warning" : "neutral"} />
        <MetricCard label="Breached" value={breached} tone={breached > 0 ? "danger" : "neutral"} />
      </div>

      {/* Flow */}
      <div className="card p-5">
        <SectionTitle title="How HUMAI works" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <FlowStep icon={<ClipboardCheck className="h-5 w-5" />} title="Task" desc="Work arrives at HUMAI." />
          <FlowStep icon={<Brain className="h-5 w-5" />} title="Analyze" desc="HUMAI reads the task and identifies what kind of work it is." />
          <FlowStep icon={<ShieldCheck className="h-5 w-5" />} title="Safety Check" desc="Sensitive or high-risk work cannot bypass human control." />
          <FlowStep icon={<Route className="h-5 w-5" />} title="Route" desc="The backend chooses AI, Human, Hybrid or Refused." />
          <FlowStep icon={<UserCheck className="h-5 w-5" />} title="Assign" desc="Human work goes to an appropriate available employee." />
          <FlowStep icon={<Gauge className="h-5 w-5" />} title="Monitor" desc="HUMAI watches workload and SLA progress." last />
        </div>
      </div>

      {/* Charts: routing split + SLA health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <SectionTitle title="Task Routing" subtitle="Where work has gone so far" />
          <DonutChart
            centerLabel="Total"
            centerValue={aiTasks + humanTasks + hybridTasks + refusedTasks}
            data={[
              { label: "AI", value: aiTasks, color: "#3b82f6" },
              { label: "Human", value: humanTasks, color: "#10b981" },
              { label: "Hybrid", value: hybridTasks, color: "#f59e0b" },
              { label: "Refused", value: refusedTasks, color: "#ef4444" },
            ]}
          />
        </div>
        <div className="card p-5">
          <SectionTitle title="SLA Health" subtitle="Live status of tracked work" />
          <DonutChart
            centerLabel="Tracked"
            centerValue={onTrack + atRisk + breached}
            data={[
              { label: "On Track", value: onTrack, color: "#10b981" },
              { label: "At Risk", value: atRisk, color: "#f59e0b" },
              { label: "Breached", value: breached, color: "#ef4444" },
            ]}
          />
        </div>
      </div>

      {/* Challenge cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
              Challenge 1
            </span>
            <h3 className="text-base font-semibold text-gray-900">
              Smart Work Allocation
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            HUMAI decides who should handle each task using task
            characteristics, safety rules, human need and employee workload.
          </p>
          <div className="mt-4">
            <FlowChart
              nodes={[
                { id: "task", label: "Task", icon: <ClipboardCheck className="h-4.5 w-4.5" /> },
                { id: "analyze", label: "Analyze", icon: <Brain className="h-4.5 w-4.5" /> },
                { id: "safety", label: "Safety Check", icon: <ShieldCheck className="h-4.5 w-4.5" /> },
                { id: "route", label: "AI / Human / Hybrid", icon: <Route className="h-4.5 w-4.5" />, branch: "warning" },
                { id: "assign", label: "Assign", icon: <UserCheck className="h-4.5 w-4.5" />, branch: "success" },
              ]}
            />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
              Challenge 2
            </span>
            <h3 className="text-base font-semibold text-gray-900">
              SLA-Breach Cascade
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            HUMAI watches assigned work. If a task is not claimed or progressed
            before 75% of its SLA, it looks for another qualified employee
            below the 85% workload limit.
          </p>
          <div className="mt-4">
            <FlowChart
              nodes={[
                { id: "assigned", label: "Assigned", icon: <UserCheck className="h-4.5 w-4.5" /> },
                { id: "monitor", label: "Monitor", icon: <Gauge className="h-4.5 w-4.5" /> },
                { id: "threshold", label: "75% Reached", icon: <AlertTriangle className="h-4.5 w-4.5" />, branch: "warning" },
                { id: "check", label: "Check Progress", icon: <UserSearch className="h-4.5 w-4.5" /> },
                { id: "reassign", label: "Reassign", icon: <RefreshCw className="h-4.5 w-4.5" />, branch: "success" },
                { id: "alert", label: "Alert Manager", icon: <Bell className="h-4.5 w-4.5" />, branch: "danger" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="card p-5">
        <SectionTitle title="Recent tasks" />
        {loading && !data ? (
          <LoadingState />
        ) : error && !demo ? (
          <ErrorBanner message={error} />
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No tasks yet. Submit one from Task Intake.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.slice(0, 5).map((t) => (
              <div key={str(t.id)} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {taskTitle(t)}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {str(t.employee_name || t.assigned_to || "Unassigned")}
                  </div>
                </div>
                <RouteBadge value={t.route} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
