import { useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  Hand,
  Loader2,
  Siren,
  Timer,
} from "lucide-react";
import { ErrorBanner, LoadingState, SectionTitle } from "@/components/Feedback";
import { MetricCard } from "@/components/MetricCard";
import { RouteBadge, SlaStatusBadge } from "@/components/StatusBadge";
import { SlaProgress } from "@/components/SlaProgress";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/api";
import { demoSlaDashboard } from "@/demo";
import type { Profile, SlaDashboard, SlaEvent, Task } from "@/types";
import {
  formatRelativeTime,
  isCascadeEvent,
  isEmergencyEvent,
  num,
  str,
  taskEmployeeName,
  taskTitle,
} from "@/utils";

export function WorkStatus({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const { data, error, loading, refresh } = usePoll<SlaDashboard>(
    () => (demo ? Promise.resolve(demoSlaDashboard) : api.slaDashboard()),
    4000,
  );

  const counts = data?.counts ?? {};
  const tasks = data?.tasks ?? [];
  const events = data?.recent_events ?? [];

  const cascades = events.filter(isCascadeEvent);
  const emergencies = events.filter(isEmergencyEvent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Work Status
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          HUMAI watches assigned work and prevents tasks from getting stuck.
        </p>
      </div>

      {/* Cascade + Emergency banners */}
      {cascades.map((e, i) => (
        <CascadeBanner key={`c-${i}`} event={e} />
      ))}
      {emergencies.map((e, i) => (
        <EmergencyBanner key={`e-${i}`} event={e} />
      ))}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Active" value={num(counts.active)} tone="info" />
        <MetricCard label="On Track" value={num(counts.on_track)} tone="success" />
        <MetricCard label="At Risk" value={num(counts.at_risk)} tone="warning" />
        <MetricCard label="Breached" value={num(counts.breached)} tone="danger" />
        <MetricCard label="Reassignments" value={num(counts.reassignments)} tone="info" />
        <MetricCard label="Emergency Alerts" value={num(counts.emergency_alerts)} tone="danger" />
      </div>

      {/* Live SLA task list */}
      <div className="card p-5">
        <SectionTitle
          title="Live SLA Countdown"
          subtitle="Each task HUMAI is currently watching."
          right={
            <button onClick={() => void refresh()} className="btn-ghost text-xs">
              Refresh
            </button>
          }
        />
        {loading && !data ? (
          <LoadingState label="Loading SLA data…" />
        ) : error && !demo ? (
          <ErrorBanner message={error} />
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No active tasks with SLA right now.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <TaskRow key={str(t.id)} task={t} profile={profile} onChanged={() => void refresh()} />
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div className="card p-5">
        <SectionTitle title="Recent events" />
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No recent events.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.slice(0, 12).map((e, i) => (
              <li key={str(e.id, `e${i}`)} className="flex items-start gap-3 py-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {prettyEvent(str(e.type || e.event || e.action))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {str(e.task_title || e.task)} {e.reason ? `— ${e.reason}` : ""}
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(e.time || e.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CascadeBanner({ event }: { event: SlaEvent }) {
  return (
    <div className="card animate-fade-up border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-amber-800">
        <ArrowRightLeft className="h-5 w-5" />
        <h3 className="text-base font-bold">SLA CASCADE DETECTED</h3>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <div className="text-xs text-gray-500">Previous employee</div>
          <div className="text-sm font-semibold text-gray-900">
            {str(event.previous_employee, "—")}
          </div>
          <div className="text-xs text-gray-500">
            Workload: {num(event.previous_workload)}%
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <div className="text-xs text-gray-500">New employee</div>
          <div className="text-sm font-semibold text-gray-900">
            {str(event.new_employee, "—")}
          </div>
          <div className="text-xs text-gray-500">
            Workload: {num(event.new_workload)}%
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-amber-800">
        {str(event.reason, "The task reached the SLA threshold without a claim or progress update.")}
      </p>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        0.85 capacity limit respected
      </div>
    </div>
  );
}

function EmergencyBanner({ event }: { event: SlaEvent }) {
  return (
    <div className="card animate-fade-up border-red-300 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-800">
        <Siren className="h-5 w-5" />
        <h3 className="text-base font-bold">EMERGENCY CAPACITY ALERT</h3>
      </div>
      <p className="mt-2 text-sm text-red-800">
        All qualified employees are currently at or above the 85% workload limit.
      </p>
      <p className="mt-1 text-sm text-red-700">
        HUMAI did not overload another employee. The task was escalated to the manager.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-red-700">
        {event.task_title && <span>Task: {event.task_title}</span>}
        {event.time && <span>Time: {formatRelativeTime(event.time)}</span>}
        {event.role && <span>Role: {event.role}</span>}
        {event.department && <span>Department: {event.department}</span>}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  profile,
  onChanged,
}: {
  task: Task;
  profile: Profile;
  onChanged: () => void;
}) {
  const demo = !!profile.demoMode;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const claimed = !!task.claimed_at || str(task.claim_status).toLowerCase() === "claimed";
  const employeeId = str(task.employee_id || task.assigned_to);

  const claim = async () => {
    if (!employeeId || busy) return;
    setBusy(true);
    setErr("");
    try {
      if (demo) {
        setMsg("Claimed (demo)");
      } else {
        await api.claim(str(task.id), employeeId);
        setMsg("Claimed");
      }
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not claim.");
    } finally {
      setBusy(false);
    }
  };

  const progress = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      if (demo) {
        setMsg("Progress recorded (demo)");
      } else {
        await api.progress(str(task.id), { employee_id: employeeId });
        setMsg("Progress recorded");
      }
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not record progress.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {taskTitle(task)}
            </h3>
            <RouteBadge value={task.route} />
            <SlaStatusBadge value={str(task.sla_status, "on_track")} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Employee: <span className="text-gray-700">{taskEmployeeName(task)}</span></span>
            {task.employee_role && <span>Role: <span className="text-gray-700">{str(task.employee_role)}</span></span>}
            <span>Workload: <span className="text-gray-700">{num(task.workload)}%</span></span>
            <span>SLA: <span className="text-gray-700">{num(task.sla_minutes)} min</span></span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.claimed_at ? `Claimed ${formatRelativeTime(task.claimed_at)}` : "Unclaimed"}
            </span>
            {task.last_progress_at && (
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Last progress {formatRelativeTime(task.last_progress_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <SlaProgress task={task} />
        <div className="flex flex-wrap gap-2">
          {!claimed && (
            <button onClick={claim} disabled={busy || !employeeId} className="btn-secondary text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hand className="h-3.5 w-3.5" />}
              Claim work
            </button>
          )}
          <button onClick={progress} disabled={busy} className="btn-secondary text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Timer className="h-3.5 w-3.5" />}
            I'm working on this
          </button>
        </div>
      </div>

      {msg && <p className="mt-2 text-xs font-medium text-emerald-600">{msg}</p>}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function prettyEvent(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bSla\b/g, "SLA");
}

// silence unused import warnings for icons used conditionally
void AlertTriangle;
