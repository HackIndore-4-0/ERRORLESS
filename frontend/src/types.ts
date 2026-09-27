// ---- HUMAI types ----
// These reflect the existing backend's API contract. The frontend only
// displays backend results; it never re-implements HUMAI logic.

export type Route = "AI" | "HUMAN" | "HYBRID" | "REFUSED";

export interface Employee {
  id: string;
  name: string;
  role?: string;
  email?: string;
  skills?: string[] | string;
  department?: string;
  load?: number;
  workload?: number;
  capacity_state?: string;
  active_tasks?: number;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  title?: string;
  description?: string;
  route?: Route | string;
  status?: string;
  state?: string;
  required_role?: string;
  sla_minutes?: number | string;
  sla_deadline?: string;
  sla_status?: string;
  assigned_to?: string;
  assigned_employee?: string;
  employee_id?: string;
  employee_name?: string;
  employee_role?: string;
  employee?: Employee | string;
  ai_aptitude?: number | string;
  human_need?: number | string;
  safety?: string;
  safety_flags?: string[];
  gates?: string[] | string;
  gate?: string;
  reason?: string;
  ai_draft?: string;
  final_output?: string;
  approver_id?: string;
  decision?: string;
  note?: string;
  assigned_at?: string;
  claimed_at?: string;
  last_progress_at?: string;
  claim_status?: string;
  workload?: number | string;
  age_minutes?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface SlaCounts {
  active?: number;
  on_track?: number;
  at_risk?: number;
  breached?: number;
  reassignments?: number;
  emergency_alerts?: number;
  claimed?: number;
  claimed_overdue?: number;
  closed?: number;
  not_applicable?: number;
  total?: number;
  [key: string]: unknown;
}

export interface SlaEvent {
  id?: string;
  type?: string;
  event?: string;
  action?: string;
  task_id?: string;
  task_title?: string;
  task?: string;
  employee_id?: string;
  employee_name?: string;
  previous_employee?: string;
  previous_workload?: number | string;
  new_employee?: string;
  new_workload?: number | string;
  reason?: string;
  role?: string;
  department?: string;
  time?: string;
  timestamp?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SlaDashboard {
  counts?: SlaCounts;
  tasks?: Task[];
  recent_events?: SlaEvent[];
  [key: string]: unknown;
}

export interface ReworkSummary {
  human_need_baseline?: number | string;
  task_samples?: number;
  rework_count?: number;
  rework_rate?: number | string;
  incidents?: Array<{
    task_id?: string;
    task_title?: string;
    task?: string;
    drift_ratio?: number | string;
    date?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AuditEvent {
  id?: string;
  time?: string;
  timestamp?: string;
  action?: string;
  task_id?: string;
  task_title?: string;
  task?: string;
  employee_id?: string;
  employee_name?: string;
  employee?: string;
  reason?: string;
  details?: string;
  [key: string]: unknown;
}

export interface IntakeResult {
  task?: Task;
  route?: Route | string;
  ai_aptitude?: number | string;
  human_need?: number | string;
  safety?: string;
  gate?: string;
  gates?: string[] | string;
  assigned_to?: string;
  assigned_employee?: string;
  employee_name?: string;
  sla_minutes?: number | string;
  sla_deadline?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  status?: string;
  uptime?: number;
  latency?: number;
  [key: string]: unknown;
}

export interface Profile {
  company: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  team?: string;
  managerName?: string;
  managerEmail?: string;
  demoMode?: boolean;
}
