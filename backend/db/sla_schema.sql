-- HUMAI — Challenge 2: Dynamic SLA-Breach Cascade Rebalancing
-- Run this AFTER db/schema.sql (and after db/rework_schema.sql, if you're
-- using Challenge 1 too — this file doesn't depend on it, order between the
-- two doesn't matter).
--
-- Adds what's needed to (a) give every human/hybrid task a time budget,
-- (b) record whether/when the assignee claimed or progressed it, and
-- (c) track reassignment history + escalation so the SLA monitor
-- (services/slaMonitor.js) can cascade stale tasks without looping back to
-- the same overloaded people or bypassing the 0.85 load ceiling / hard gates.

-- When the SLA clock last started for this task's *current* assignee — set
-- at intake, and reset to now() every time the task is cascaded to someone
-- new. Distinct from created_at, which never changes.
alter table tasks add column if not exists assigned_at timestamptz;

-- How long (in minutes) this task's assignee has before it counts as aging.
-- Derived from the task's time-cost metric at intake (see
-- services/slaTracker.js#deriveSlaMinutes), or set explicitly via
-- POST /api/tasks/intake { sla_minutes }.
alter table tasks add column if not exists sla_minutes int;

-- Absolute deadline = assignment time + sla_minutes. Recomputed (restarted)
-- every time a task is cascaded to a new assignee.
alter table tasks add column if not exists sla_deadline timestamptz;

-- Set by PATCH /api/tasks/:id/claim — the employee has picked the task up.
alter table tasks add column if not exists claimed_at timestamptz;

-- Set by PATCH /api/tasks/:id/progress — a heartbeat showing active work.
-- Either claimed_at OR last_progress_at being present before the 75% mark
-- is what exempts a task from cascade.
alter table tasks add column if not exists last_progress_at timestamptz;

-- How many times this task has been auto-cascaded to a new assignee.
alter table tasks add column if not exists reassignment_count int not null default 0;

-- Append-only history of {employee_id, at, reason} objects — used so the
-- cascade never re-offers the task to someone it was already pulled from
-- (prevents reassignment loops between two idle employees).
alter table tasks add column if not exists reassignment_history jsonb not null default '[]';

-- True once an emergency manager alert has fired for the *current* SLA
-- breach episode (whole qualified team saturated at/above 0.85 load).
-- Reset to false whenever a cascade successfully finds a new assignee, so a
-- later breach on the same task can alert again.
alter table tasks add column if not exists escalated boolean not null default false;
alter table tasks add column if not exists escalated_at timestamptz;

create index if not exists idx_tasks_sla_deadline on tasks (sla_deadline)
  where sla_deadline is not null;
