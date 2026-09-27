import express from "express";
import { supabase } from "../supabase.js";
import { computeSlaStatus } from "../services/slaTracker.js";

const router = express.Router();

// -----------------------------------------------------------------------
// GET /api/dashboard/sla
// Challenge 2: the "work status window" — every open human/hybrid task
// with its live SLA countdown/progress, plus a recent feed of cascade
// reassignments and emergency alerts pulled from the audit trail.
// -----------------------------------------------------------------------
router.get("/sla", async (req, res) => {
  try {
    const { data: tasks, error: taskErr } = await supabase
      .from("tasks")
      .select("*, employees:assigned_employee_id (id, name, role, email, current_load)")
      .in("status", ["pending_approval", "in_progress"])
      .not("sla_deadline", "is", null)
      .order("sla_deadline", { ascending: true });

    if (taskErr) throw taskErr;

    const withStatus = (tasks || []).map((t) => ({ ...t, sla_status: computeSlaStatus(t) }));

    const counts = withStatus.reduce(
      (acc, t) => {
        acc[t.sla_status.label] = (acc[t.sla_status.label] || 0) + 1;
        return acc;
      },
      { on_track: 0, at_risk: 0, breached: 0, claimed: 0, claimed_overdue: 0 }
    );

    const { data: recentEvents, error: eventsErr } = await supabase
      .from("audit_log")
      .select("*")
      .in("action", ["task_reassigned_sla_breach", "sla_emergency_alert"])
      .order("ts", { ascending: false })
      .limit(20);

    if (eventsErr) throw eventsErr;

    res.json({ success: true, counts, tasks: withStatus, recent_events: recentEvents || [] });
  } catch (err) {
    console.error("[dashboard/sla] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/dashboard/rework
// Powers the "true human time spent revising AI drafts alongside the
// re-weighted routing metrics" dashboard requirement.
//
// Returns:
//  - baselines: per-task-type learned HN floor, rework rate, sample size
//  - recent_flagged: the most recent hidden-rework incidents, with task
//    context, for a human-readable feed
// -----------------------------------------------------------------------
router.get("/rework", async (req, res) => {
  try {
    const { data: baselines, error: baselineErr } = await supabase
      .from("task_type_baselines")
      .select("*")
      .order("hn_baseline", { ascending: false });

    if (baselineErr) throw baselineErr;

    const { data: recentFlagged, error: flaggedErr } = await supabase
      .from("approvals")
      .select("id, task_id, drift_ratio, is_hidden_rework, decided_at, tasks:task_id (title, task_type)")
      .eq("is_hidden_rework", true)
      .order("decided_at", { ascending: false })
      .limit(20);

    if (flaggedErr) throw flaggedErr;

    const withRate = (baselines || []).map((b) => ({
      ...b,
      rework_rate: b.sample_count > 0 ? Number((b.rework_count / b.sample_count).toFixed(3)) : 0,
    }));

    res.json({
      success: true,
      baselines: withRate,
      recent_flagged: recentFlagged || [],
    });
  } catch (err) {
    console.error("[dashboard/rework] error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
