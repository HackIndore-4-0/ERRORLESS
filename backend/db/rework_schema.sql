-- HUMAI — Challenge 1: Automated Downstream Rework & Token Churn Telemetry
-- Run this AFTER db/schema.sql. Adds what's needed to detect "hidden
-- rework" (a hybrid task where the human effectively rewrote the AI draft)
-- and feed that back into future routing decisions for that task type.

-- Every task now records a task_type (derived from its first extracted tag,
-- or required_role, or "general") so rework outcomes can be aggregated per
-- type rather than per individual task.
alter table tasks add column if not exists task_type text;
create index if not exists idx_tasks_task_type on tasks (task_type);

-- Each approval now records how much the human actually changed the draft.
alter table approvals add column if not exists drift_ratio float;
alter table approvals add column if not exists is_hidden_rework boolean not null default false;

-- Per-task-type learned baseline. hn_baseline acts as a floor: once a task
-- type accumulates enough hidden-rework incidents, new tasks of that type
-- are scored with at least this much Human Need, regardless of what the
-- per-task formula alone would have said. This is the "automated database
-- logic that adjusts subsequent scoring parameters" the challenge asks for.
create table if not exists task_type_baselines (
  task_type text primary key,
  hn_baseline float not null default 0.0 check (hn_baseline >= 0 and hn_baseline <= 1),
  rework_count int not null default 0,     -- how many hidden-rework incidents raised this
  sample_count int not null default 0,     -- how many approvals of this type were measured at all
  updated_at timestamptz not null default now()
);
