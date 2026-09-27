import express from "express";
import { supabase } from "../supabase.js";

const router = express.Router();

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
