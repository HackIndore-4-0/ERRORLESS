import { supabase } from "../supabase.js";
import { logAudit } from "./auditLog.js";
import { computeDriftRatio } from "./editDistance.js";

const DRIFT_THRESHOLD = 0.4; // 40%, per the challenge spec
const HN_BASELINE_STEP = 0.08; // how much a single hidden-rework incident raises the floor
const HN_BASELINE_MAX = 1.0;

/**
 * Reads the current learned HN baseline for a task type. Returns 0 if none
 * recorded yet (no effect on scoring).
 */
export async function getHnBaseline(taskType) {
  if (!taskType) return 0;

  const { data, error } = await supabase
    .from("task_type_baselines")
    .select("hn_baseline")
    .eq("task_type", taskType)
    .maybeSingle();

  if (error) {
    console.error(`[reworkTracker] failed to read baseline for "${taskType}":`, error.message);
    return 0;
  }

  return data?.hn_baseline ?? 0;
}

/**
 * Call this when a hybrid task's human-edited final output is known.
 * Computes drift, records it on the approval row (via the caller), and —
 * if drift exceeds the threshold — ratchets up that task type's HN
 * baseline and writes an audit penalty.
 *
 * @returns {{ driftRatio: number, isHiddenRework: boolean }}
 */
export async function evaluateRework({ taskId, taskType, aiOutput, finalOutput }) {
  const driftRatio = computeDriftRatio(aiOutput, finalOutput);
  const isHiddenRework = driftRatio > DRIFT_THRESHOLD;

  const normalizedType = taskType || "general";

  // Always update sample_count so the dashboard can show a true rework
  // *rate*, not just a raw count of flagged incidents.
  const { data: existing, error: readErr } = await supabase
    .from("task_type_baselines")
    .select("*")
    .eq("task_type", normalizedType)
    .maybeSingle();

  if (readErr) {
    console.error(`[reworkTracker] failed to read baseline row for "${normalizedType}":`, readErr.message);
  }

  const nextSampleCount = (existing?.sample_count ?? 0) + 1;
  const nextReworkCount = (existing?.rework_count ?? 0) + (isHiddenRework ? 1 : 0);
  const nextBaseline = isHiddenRework
    ? Math.min(HN_BASELINE_MAX, (existing?.hn_baseline ?? 0) + HN_BASELINE_STEP)
    : existing?.hn_baseline ?? 0;

  const { error: upsertErr } = await supabase.from("task_type_baselines").upsert(
    {
      task_type: normalizedType,
      hn_baseline: nextBaseline,
      rework_count: nextReworkCount,
      sample_count: nextSampleCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "task_type" }
  );

  if (upsertErr) {
    console.error(`[reworkTracker] failed to upsert baseline for "${normalizedType}":`, upsertErr.message);
  }

  if (isHiddenRework) {
    await logAudit({
      actor: "system",
      action: "misallocation_penalty",
      entity: `task:${taskId}`,
      before: { hn_baseline: existing?.hn_baseline ?? 0 },
      after: {
        hn_baseline: nextBaseline,
        task_type: normalizedType,
        drift_ratio: Number(driftRatio.toFixed(3)),
        reason: `Human rewrote ${Math.round(driftRatio * 100)}% of the AI draft (threshold: ${Math.round(
          DRIFT_THRESHOLD * 100
        )}%) — classified as hidden rework. Human Need baseline for "${normalizedType}" raised to ${nextBaseline.toFixed(
          2
        )}.`,
      },
    });
  }

  return { driftRatio, isHiddenRework };
}
