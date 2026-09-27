// HUMAI — Challenge 2: Dynamic SLA-Breach Cascade Rebalancing
//
// Pure helpers (no Supabase, no network) so the SLA math can be unit-tested
// in isolation — see tests/slaTracker.test.js. Side-effecting orchestration
// (reading/writing tasks, reassigning, alerting) lives in services/slaMonitor.js.

const SLA_MIN_MINUTES = 30; // floor: even the most trivial human/hybrid task gets this much
const SLA_MAX_MINUTES = 480; // ceiling: 8 working hours
const BREACH_FRACTION = 0.75; // per the challenge spec: cascade triggers at 75% of the time budget

/**
 * Derives a task's SLA budget in minutes from its normalized time-cost
 * metric `t` (0..1, from scoring/scoreTask.js). Assumption, stated plainly:
 * higher `t` -> more time-consuming task -> larger budget, linearly
 * interpolated between SLA_MIN_MINUTES and SLA_MAX_MINUTES.
 *
 * An explicit `override` (e.g. a manager-specified sla_minutes on intake)
 * always wins.
 */
export function deriveSlaMinutes(metrics, override) {
  if (typeof override === "number" && override > 0) {
    return Math.round(override);
  }
  const t = Math.max(0, Math.min(1, Number(metrics?.t) || 0));
  const minutes = SLA_MIN_MINUTES + t * (SLA_MAX_MINUTES - SLA_MIN_MINUTES);
  return Math.round(minutes / 5) * 5; // round to nearest 5 minutes
}

/**
 * @param {string|Date} assignedAt - when the SLA clock starts (task creation,
 *   or the moment it was cascaded to a new assignee)
 * @param {number} slaMinutes
 * @returns {Date}
 */
export function computeSlaDeadline(assignedAt, slaMinutes) {
  const start = new Date(assignedAt).getTime();
  return new Date(start + slaMinutes * 60 * 1000);
}

/**
 * Computes a task's live SLA status — the "work status window" the
 * dashboard/frontend renders as a per-task countdown/progress bar.
 *
 * @param {object} task - needs assigned_at (or created_at as fallback),
 *   sla_deadline, claimed_at, last_progress_at, status
 * @param {Date} [now]
 * @returns {{
 *   label: 'not_applicable'|'closed'|'on_track'|'at_risk'|'breached'|'claimed'|'claimed_overdue',
 *   elapsed_fraction: number|null,   // 0..1
 *   remaining_ms: number|null,
 *   breach_eligible: boolean         // true => this task is a cascade candidate right now
 * }}
 */
export function computeSlaStatus(task, now = new Date()) {
  if (task.status === "completed" || task.status === "rejected") {
    return { label: "closed", elapsed_fraction: null, remaining_ms: null, breach_eligible: false };
  }

  if (!task.sla_deadline) {
    // AI-only tasks, or anything not yet assigned to a human, never enter
    // the SLA clock at all.
    return { label: "not_applicable", elapsed_fraction: null, remaining_ms: null, breach_eligible: false };
  }

  const start = new Date(task.assigned_at || task.created_at).getTime();
  const deadline = new Date(task.sla_deadline).getTime();
  const nowMs = now.getTime();

  const totalMs = Math.max(1, deadline - start); // avoid divide-by-zero on malformed rows
  const elapsedFraction = Math.min(1, Math.max(0, (nowMs - start) / totalMs));
  const remainingMs = deadline - nowMs;

  const acted = Boolean(task.claimed_at || task.last_progress_at);

  let label;
  if (acted) {
    label = elapsedFraction >= 1 ? "claimed_overdue" : "claimed";
  } else if (elapsedFraction >= 1) {
    label = "breached";
  } else if (elapsedFraction >= BREACH_FRACTION) {
    label = "at_risk";
  } else {
    label = "on_track";
  }

  const breachEligible = !acted && elapsedFraction >= BREACH_FRACTION;

  return {
    label,
    elapsed_fraction: Math.round(elapsedFraction * 1000) / 1000,
    remaining_ms: remainingMs,
    breach_eligible: breachEligible,
  };
}

export { BREACH_FRACTION };
