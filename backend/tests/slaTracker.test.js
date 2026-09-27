// Offline unit tests for Challenge 2's pure logic — no Supabase, no
// network. Run with: node tests/slaTracker.test.js
//
// Covers:
//   - deriveSlaMinutes (time-budget derivation + override)
//   - computeSlaDeadline
//   - computeSlaStatus (on_track / at_risk / breached / claimed, and the
//     75%-elapsed breach_eligible trigger from the challenge spec)
//   - findBestEmployee's excludeIds param + the 0.85 load-ceiling rule,
//     which is what services/slaMonitor.js relies on to cascade without
//     looping or overloading anyone.

import assert from "node:assert/strict";
import {
  deriveSlaMinutes,
  computeSlaDeadline,
  computeSlaStatus,
} from "../services/slaTracker.js";
import { findBestEmployee, LOAD_CEILING } from "../scoring/assignEmployee.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("deriveSlaMinutes");
test("floors at 30 minutes when t=0", () => {
  assert.equal(deriveSlaMinutes({ t: 0 }), 30);
});
test("caps at 480 minutes when t=1", () => {
  assert.equal(deriveSlaMinutes({ t: 1 }), 480);
});
test("interpolates linearly, rounded to nearest 5", () => {
  assert.equal(deriveSlaMinutes({ t: 0.5 }), 255);
});
test("explicit override always wins", () => {
  assert.equal(deriveSlaMinutes({ t: 1 }, 15), 15);
});

console.log("computeSlaDeadline");
test("adds sla_minutes to the start time", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const deadline = computeSlaDeadline(start, 60);
  assert.equal(deadline.toISOString(), "2026-01-01T01:00:00.000Z");
});

console.log("computeSlaStatus");
test("closed tasks are never breach-eligible", () => {
  const status = computeSlaStatus({ status: "completed", sla_deadline: "2020-01-01T00:00:00Z" });
  assert.equal(status.label, "closed");
  assert.equal(status.breach_eligible, false);
});

test("no sla_deadline => not_applicable (e.g. AI-only tasks)", () => {
  const status = computeSlaStatus({ status: "completed", sla_deadline: null });
  assert.equal(status.label, "closed"); // status precedence check above
  const status2 = computeSlaStatus({ status: "pending_approval", sla_deadline: null });
  assert.equal(status2.label, "not_applicable");
  assert.equal(status2.breach_eligible, false);
});

test("on_track before 75% elapsed", () => {
  const now = new Date("2026-01-01T00:50:00.000Z"); // 50/60 min = 83%... use a smaller fraction
  const task = {
    status: "pending_approval",
    assigned_at: "2026-01-01T00:00:00.000Z",
    sla_deadline: "2026-01-01T01:00:00.000Z",
    claimed_at: null,
    last_progress_at: null,
  };
  const early = computeSlaStatus(task, new Date("2026-01-01T00:30:00.000Z")); // 50%
  assert.equal(early.label, "on_track");
  assert.equal(early.breach_eligible, false);
});

test("at_risk right at the 75% mark, and breach_eligible flips true", () => {
  const task = {
    status: "pending_approval",
    assigned_at: "2026-01-01T00:00:00.000Z",
    sla_deadline: "2026-01-01T01:00:00.000Z", // 60 min window
    claimed_at: null,
    last_progress_at: null,
  };
  const at75 = computeSlaStatus(task, new Date("2026-01-01T00:45:00.000Z")); // exactly 75%
  assert.equal(at75.label, "at_risk");
  assert.equal(at75.breach_eligible, true);
});

test("breached once the deadline has fully passed and still unclaimed", () => {
  const task = {
    status: "pending_approval",
    assigned_at: "2026-01-01T00:00:00.000Z",
    sla_deadline: "2026-01-01T01:00:00.000Z",
    claimed_at: null,
    last_progress_at: null,
  };
  const late = computeSlaStatus(task, new Date("2026-01-01T02:00:00.000Z"));
  assert.equal(late.label, "breached");
  assert.equal(late.breach_eligible, true);
});

test("claiming before 75% exempts the task from cascade", () => {
  const task = {
    status: "in_progress",
    assigned_at: "2026-01-01T00:00:00.000Z",
    sla_deadline: "2026-01-01T01:00:00.000Z",
    claimed_at: "2026-01-01T00:10:00.000Z",
    last_progress_at: null,
  };
  const afterClaim = computeSlaStatus(task, new Date("2026-01-01T00:50:00.000Z")); // 83% elapsed
  assert.equal(afterClaim.label, "claimed");
  assert.equal(afterClaim.breach_eligible, false); // acted, so exempt even past 75%
});

test("progress heartbeat also exempts, same as claiming", () => {
  const task = {
    status: "in_progress",
    assigned_at: "2026-01-01T00:00:00.000Z",
    sla_deadline: "2026-01-01T01:00:00.000Z",
    claimed_at: null,
    last_progress_at: "2026-01-01T00:50:00.000Z",
  };
  const afterProgress = computeSlaStatus(task, new Date("2026-01-01T00:55:00.000Z"));
  assert.equal(afterProgress.breach_eligible, false);
});

console.log("findBestEmployee — cascade exclusion + load ceiling");
const employees = [
  { id: "a", role: "Coder", current_load: 0.9 }, // over ceiling
  { id: "b", role: "Coder", current_load: 0.5 }, // eligible
  { id: "c", role: "Coder", current_load: 0.2 }, // most eligible (lowest load)
];

test("picks the lowest-load eligible match by default", () => {
  const { employee } = findBestEmployee(employees, "Coder");
  assert.equal(employee.id, "c");
});

test("excludeIds removes the previous assignee from consideration", () => {
  const { employee } = findBestEmployee(employees, "Coder", ["c"]);
  assert.equal(employee.id, "b");
});

test("excluding everyone eligible leaves only the over-ceiling employee, or nothing", () => {
  // Exclude both under-ceiling employees — only the overloaded one is left.
  // findBestEmployee's fallback still returns *someone* (never leaves a task
  // unassigned at intake time) — the load-ceiling check is the CALLER's
  // job (see slaMonitor.js's `eligible` guard), which is exactly why that
  // guard exists rather than trusting findBestEmployee alone here.
  const { employee, fallback } = findBestEmployee(employees, "Coder", ["b", "c"]);
  assert.equal(employee.id, "a");
  assert.equal(fallback, true);
  assert.ok(employee.current_load >= LOAD_CEILING, "caller must reject this candidate");
});

test("excluding literally everyone returns null, not a crash", () => {
  const { employee } = findBestEmployee(employees, "Coder", ["a", "b", "c"]);
  assert.equal(employee, null);
});

console.log(`\n${passed} test(s) passed.`);
if (process.exitCode) {
  console.error("\nSome tests FAILED.");
} else {
  console.log("All tests passed.");
}
