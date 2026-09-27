# HUMAI Backend

AI/human task allocation engine — Node.js/Express + Supabase + Groq.

## Local setup
```bash
npm install
cp .env.example .env   # fill in Supabase, Groq, Gmail values
npm run dev
```

Run the migrations in `db/` against your Supabase project in order:
`schema.sql` → `rework_schema.sql` (Challenge 1) → `sla_schema.sql` (Challenge 2).

## Challenge 2 — Dynamic SLA-Breach Cascade Rebalancing

Every task routed to `human` or `hybrid` gets an SLA time budget on intake
(`services/slaTracker.js#deriveSlaMinutes`, from the task's time-cost metric,
or an explicit `sla_minutes` in the `/api/tasks/intake` body). A background
worker (`services/slaMonitor.js`, started in `server.js`, polls every
`SLA_POLL_INTERVAL_MS`) watches every open task:

- If the assignee neither claims (`PATCH /api/tasks/:id/claim`) nor logs
  progress (`PATCH /api/tasks/:id/progress`) before **75%** of the SLA
  window elapses, the task is **breach-eligible**.
- The worker recalculates live team capacity and cascades the task to the
  next qualified employee under the **0.85 load ceiling**
  (`scoring/assignEmployee.js`), excluding anyone the task has already been
  tried on (`reassignment_history`) so it can't ping-pong between two idle
  people. The SLA clock restarts for the new assignee.
- If nobody qualified is under the ceiling, it fires one **emergency
  manager alert** per breach episode (`audit_log` entry +
  `MANAGER_EMAIL`), rather than reassigning to an overloaded employee or
  looping forever.
- Hard gates are untouched by any of this — the worker only ever changes
  *who* a task is assigned to, never its `route`.

`GET /api/dashboard/sla` is the "work status window": every open task with
its live SLA status (`on_track` / `at_risk` / `breached` / `claimed` /
`claimed_overdue`), plus a recent feed of cascade/escalation events. Any
task returned by `GET /api/tasks` or `GET /api/tasks/:id` also carries a
computed `sla_status` field for a per-task countdown/progress bar.

**Verifying it:** `tests/slaTracker.test.js` covers the pure SLA math
(deadline derivation, status/breach-eligibility, the load-ceiling exclusion
logic) with no DB required — run with `node tests/slaTracker.test.js`. To
see an actual cascade happen end-to-end against your Supabase project:
1. Add two employees with the same role, one at `current_load` ~0.05.
2. `POST /api/tasks/intake` with `required_role` matching them and a small
   `sla_minutes` (e.g. `2`) so you don't have to wait.
3. Don't claim or progress the task. After ~90 seconds (75% of 2 minutes)
   and the next poll tick, check `GET /api/dashboard/sla` — the task should
   show `assigned_employee_id` changed to the second employee, and
   `audit_log` should have a new `task_reassigned_sla_breach` row.

## Deploying on Railway
1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo** → select this repo.
3. Railway auto-detects Node.js from `package.json` and runs `npm start`.
4. In the Railway project → **Variables** tab, add every key from `.env.example`
   with your real values (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GROQ_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_URL`). Do **not**
   commit `.env` — it's git-ignored on purpose.
5. Railway assigns a public URL once deployed — check it with `GET /health`.
6. Once your Vercel frontend has its own URL, update `APP_URL` here so
   assignment emails link to the right place.
