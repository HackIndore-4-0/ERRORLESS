-- Per-employee manager, used for SLA emergency alerts.
-- Falls back to the MANAGER_EMAIL env var when manager_email is null.
alter table employees add column if not exists manager_name text;
alter table employees add column if not exists manager_email text;
