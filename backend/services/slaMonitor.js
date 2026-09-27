// HUMAI — Challenge 2: Dynamic SLA-Breach Cascade Rebalancing
//
// An async background worker (polling, not a real queue — fine for the
// demo's scale) that:
//   1. Finds human/hybrid tasks whose assignee hasn't claimed or made
//      progress before 75% of the SLA window has elapsed.
//   2. Recalculates live team capacity and cascades the task to the next
//      qualified employee under the 0.85 load ceiling — never violating
//      that ceiling and never touching the four hard gates (gates decide
//      *route*, this worker only ever changes *assignee*).
//   3. Fires an emergency manager alert (logged + emailed) if the entire
//      qualified team is saturated, instead of looping forever.
//   4. Logs every handover / alert to the append-only audit_log.

import { supabase } from "../supabase.js";
import { findBestEmployee, LOAD_CEILING } from "../scoring/assignEmployee.js";
import { computeSlaStatus, computeSlaDeadline } from "./slaTracker.js";
import { notifyAssignee, notifyManagerEscalation } from "./notifyAssignee.js";
import { logAudit } from "./auditLog.js";

const LOAD_INCREMENT = 0.1; // kept in sync with routes/tasks.js's per-task load bump
const OPEN_STATUSES = ["pending_approval", "in_progress"];

/**
 * One polling pass: fetch every open, SLA-tracked task, and cascade/alert
 * whichever ones are breach-eligible. Returns a small summary (useful for
 * tests and for the manual "run once" trigger).
 */
export async function pollSlaBreaches(now = new Date()) {
  const summary = { checked: 0, cascaded: [], escalated: [], errors: [] };

  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .in("status", OPEN_STATUSES)
    .not("sla_deadline", "is", null);

  if (taskErr) {
    console.error("[slaMonitor] failed to fetch open tasks:", taskErr.message);
    summary.errors.push(taskErr.message);
    return summary;
  }

  summary.checked = tasks?.length ?? 0;

  for (const task of tasks || []) {
    const sla = computeSlaStatus(task, now);
    if (!sla.breach_eligible) continue;

    try {
      const result = await handleBreach(task, sla, now);
      if (result.outcome === "cascaded") summary.cascaded.push(result);
      else if (result.outcome === "escalated") summary.escalated.push(result);
    } catch (err) {
      console.error(`[slaMonitor] error handling task ${task.id}:`, err.message);
      summary.errors.push(`${task.id}: ${err.message}`);
    }
  }

  return summary;
}

/**
 * Deterministic reassignment for a single stale task: find the next
 * qualified employee under the load ceiling, excluding everyone this task
 * has already been tried on (so it can't ping-pong between two idle
 * people). Falls through to an emergency manager alert if nobody qualifies.
 */
async function handleBreach(task, sla, now) {
  const { data: employees, error: empErr } = await supabase.from("employees").select("*");
  if (empErr) throw empErr;

  const history = Array.isArray(task.reassignment_history) ? task.reassignment_history : [];
  const excludeIds = [
    ...(task.assigned_employee_id ? [task.assigned_employee_id] : []),
    ...history.map((h) => h.employee_id).filter(Boolean),
  ];

  const { employee: candidate } = findBestEmployee(employees || [], task.required_role, excludeIds);

  // Hard requirement: never hand a stale task to someone already at/above
  // the ceiling, even as a "no one else left" fallback.
  const eligible = candidate && (candidate.current_load ?? 0) < LOAD_CEILING;

  if (!eligible) {
    return escalate(task, sla);
  }

  return cascade(task, candidate, employees || [], now);
}

async function cascade(task, newAssignee, employees, now) {
  const history = Array.isArray(task.reassignment_history) ? task.reassignment_history : [];
  const previousAssigneeId = task.assigned_employee_id;

  const slaMinutes = task.sla_minutes ?? 60;
  const newDeadline = computeSlaDeadline(now, slaMinutes);

  const updatedHistory = [
    ...history,
    { employee_id: previousAssigneeId, at: now.toISOString(), reason: "sla_breach" },
  ];

  const { data: updatedTask, error: updateErr } = await supabase
    .from("tasks")
    .update({
      assigned_employee_id: newAssignee.id,
      assigned_at: now.toISOString(),
      sla_deadline: newDeadline.toISOString(),
      claimed_at: null,
      last_progress_at: null,
      reassignment_count: (task.reassignment_count ?? 0) + 1,
      reassignment_history: updatedHistory,
      escalated: false, // a fresh assignee means a fresh episode
      updated_at: now.toISOString(),
    })
    .eq("id", task.id)
    // Optimistic guard: only apply if nobody else (e.g. the employee
    // claiming it, or a concurrent poll) has already moved this task on.
    .eq("assigned_employee_id", previousAssigneeId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Load rebalancing: free up the stale assignee, bump the new one — the
  // same LOAD_INCREMENT convention used at intake.
  if (previousAssigneeId) {
    const prevEmployee = employees.find((e) => e.id === previousAssigneeId);
    if (prevEmployee) {
      await supabase
        .from("employees")
        .update({ current_load: Math.max(0, (prevEmployee.current_load ?? 0) - LOAD_INCREMENT) })
        .eq("id", previousAssigneeId);
    }
  }
  await supabase
    .from("employees")
    .update({ current_load: Math.min(1, (newAssignee.current_load ?? 0) + LOAD_INCREMENT) })
    .eq("id", newAssignee.id);

  const notification = await notifyAssignee(newAssignee, { ...task, route: task.route });

  await logAudit({
    actor: "system",
    action: "task_reassigned_sla_breach",
    entity: `task:${task.id}`,
    before: { assigned_employee_id: previousAssigneeId, sla_deadline: task.sla_deadline },
    after: {
      assigned_employee_id: newAssignee.id,
      sla_deadline: newDeadline.toISOString(),
      reassignment_count: (task.reassignment_count ?? 0) + 1,
      reason: `SLA breach: task unclaimed past 75% of its ${slaMinutes}-minute window. Cascaded from ${
        previousAssigneeId || "(unassigned)"
      } to ${newAssignee.id} (load ${newAssignee.current_load ?? 0} -> under ${LOAD_CEILING} ceiling).`,
    },
  });

  return {
    outcome: "cascaded",
    taskId: task.id,
    from: previousAssigneeId,
    to: newAssignee.id,
    notification,
    task: updatedTask,
  };
}

async function escalate(task, sla) {
  if (task.escalated) {
    // Already alerted for this episode — don't spam, just note it happened.
    return { outcome: "already_escalated", taskId: task.id };
  }

  const now = new Date();

  const { error: updateErr } = await supabase
    .from("tasks")
    .update({ escalated: true, escalated_at: now.toISOString() })
    .eq("id", task.id)
    .eq("escalated", false); // guard against a concurrent poll double-firing

  if (updateErr) throw updateErr;

  const reason = `SLA breach at ${Math.round(
    sla.elapsed_fraction * 100
  )}% of the time budget — every employee qualified for role "${
    task.required_role || "(any)"
  }" is at/above the ${Math.round(LOAD_CEILING * 100)}% load ceiling.`;

  await logAudit({
    actor: "system",
    action: "sla_emergency_alert",
    entity: `task:${task.id}`,
    before: { escalated: false },
    after: { escalated: true, reassignment_count: task.reassignment_count ?? 0, reason },
  });

  const notification = await notifyManagerEscalation(
    { ...task, load_ceiling: LOAD_CEILING },
    reason
  );

  return { outcome: "escalated", taskId: task.id, reason, notification };
}

/**
 * Starts the polling loop. Call once at server boot. Returns a stop()
 * function (useful for tests) and never throws — a single bad poll is
 * logged and the loop continues.
 */
export function startSlaMonitor({ intervalMs = 30_000 } = {}) {
  const handle = setInterval(() => {
    pollSlaBreaches().catch((err) => console.error("[slaMonitor] poll failed:", err.message));
  }, intervalMs);

  console.log(`[slaMonitor] started — polling every ${Math.round(intervalMs / 1000)}s`);

  return () => clearInterval(handle);
}
