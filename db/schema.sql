-- HUMAI database schema (Supabase / Postgres)
-- Scope: demo build. No feedback/weight_state tables — the weight-learning
-- loop was deliberately cut from the hackathon scope (see HANDOFF.md).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,              -- occupation, e.g. "Coder", "HR", "Cloud Manager"
  email text not null,             -- where task-assignment notifications go
  skills text[] default '{}',
  current_load float not null default 0.0 check (current_load >= 0 and current_load <= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_role on employees (role);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text not null,
  required_role text,                          -- role hint for assignment matching

  -- extracted feature scores (0..1), see scoring/scoreTask.js
  metrics jsonb not null,                       -- {c,k,e,s,r,t,l}

  route text not null check (route in ('ai', 'human', 'hybrid')),
  aa_score float not null,
  hn_score float not null,
  gate_flags text[] default '{}',               -- e.g. {G1,G3}
  routing_reason text not null,

  assigned_employee_id uuid references employees(id),

  status text not null default 'pending'
    check (status in ('pending', 'pending_approval', 'in_progress', 'completed', 'rejected')),

  ai_output text,                               -- AI-only execution result or hybrid draft

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_status on tasks (status);
create index if not exists idx_tasks_assignee on tasks (assigned_employee_id);
create index if not exists idx_tasks_route on tasks (route);

-- ---------------------------------------------------------------------------
-- approvals  (records the human sign-off for hybrid / gated tasks)
-- ---------------------------------------------------------------------------
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id),
  approver_id uuid references employees(id),
  decision text not null check (decision in ('approved', 'rejected', 'edited')),
  note text,
  final_output text,                            -- edited output, if decision = 'edited'
  decided_at timestamptz not null default now()
);

create index if not exists idx_approvals_task on approvals (task_id);

-- ---------------------------------------------------------------------------
-- audit_log  (append-only)
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,          -- 'system' | employee id | 'manager'
  action text not null,         -- e.g. 'task_intake', 'task_routed', 'task_approved'
  entity text not null,         -- e.g. 'task:<id>'
  before jsonb,
  after jsonb,
  ts timestamptz not null default now()
);

create index if not exists idx_audit_entity on audit_log (entity);
