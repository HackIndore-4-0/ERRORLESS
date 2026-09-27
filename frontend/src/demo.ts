// Demo-mode fixtures. ONLY used when the user explicitly enables DEMO MODE.
// These never replace the backend in live mode.

import type {
  AuditEvent,
  Employee,
  ReworkSummary,
  SlaDashboard,
  SlaEvent,
  Task,
} from "@/types";

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const demoEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "Rahul Verma",
    role: "Senior Support Agent",
    email: "rahul@company.com",
    skills: ["complaints", "billing", "refunds"],
    department: "Support",
    load: 62,
    workload: 62,
    capacity_state: "near_limit",
    active_tasks: 3,
  },
  {
    id: "emp-2",
    name: "Sara Khan",
    role: "Support Agent",
    email: "sara@company.com",
    skills: ["complaints", "onboarding"],
    department: "Support",
    load: 42,
    workload: 42,
    capacity_state: "healthy",
    active_tasks: 2,
  },
  {
    id: "emp-3",
    name: "Daniel Park",
    role: "Compliance Officer",
    email: "daniel@company.com",
    skills: ["compliance", "legal", "audit"],
    department: "Compliance",
    load: 88,
    workload: 88,
    capacity_state: "saturated",
    active_tasks: 5,
  },
  {
    id: "emp-4",
    name: "Mei Tanaka",
    role: "Support Agent",
    email: "mei@company.com",
    skills: ["refunds", "billing"],
    department: "Support",
    load: 28,
    workload: 28,
    capacity_state: "healthy",
    active_tasks: 1,
  },
];

export const demoTasks: Task[] = [
  {
    id: "task-1",
    title: "Customer Complaint — Order #48213",
    description: "Customer reports being charged twice and wants a refund.",
    route: "HYBRID",
    status: "assigned",
    required_role: "Support Agent",
    sla_minutes: 20,
    sla_status: "at_risk",
    assigned_at: iso(15 * 60 * 1000),
    sla_deadline: new Date(now + 5 * 60 * 1000).toISOString(),
    assigned_to: "emp-1",
    employee_name: "Rahul Verma",
    employee_role: "Senior Support Agent",
    workload: 62,
    claim_status: "unclaimed",
    ai_aptitude: 70,
    human_need: 55,
    safety: "G3",
    reason: "Billing issue with refund — AI can draft a response but a human must approve before sending.",
  },
  {
    id: "task-2",
    title: "Password Reset Request",
    description: "User requested a password reset link.",
    route: "AI",
    status: "closed",
    required_role: "Support Agent",
    sla_minutes: 10,
    sla_status: "closed",
    assigned_at: iso(30 * 60 * 1000),
    ai_aptitude: 95,
    human_need: 10,
    safety: "none",
    reason: "Routine, low-risk request. AI can handle fully.",
  },
  {
    id: "task-3",
    title: "Contract Review — Vendor X",
    description: "Legal review requested for new vendor agreement terms.",
    route: "HUMAN",
    status: "assigned",
    required_role: "Compliance Officer",
    sla_minutes: 60,
    sla_status: "on_track",
    assigned_at: iso(10 * 60 * 1000),
    sla_deadline: new Date(now + 50 * 60 * 1000).toISOString(),
    assigned_to: "emp-3",
    employee_name: "Daniel Park",
    employee_role: "Compliance Officer",
    workload: 88,
    claim_status: "claimed",
    claimed_at: iso(8 * 60 * 1000),
    last_progress_at: iso(2 * 60 * 1000),
    ai_aptitude: 20,
    human_need: 90,
    safety: "G2",
    reason: "Legal contract — a human must execute this. AI cannot finalise legal terms.",
  },
];

export const demoRecentEvents: SlaEvent[] = [
  {
    id: "evt-1",
    type: "task_reassigned_sla_breach",
    task_id: "task-9",
    task_title: "Refund Escalation — Order #47100",
    previous_employee: "Daniel Park",
    previous_workload: 88,
    new_employee: "Mei Tanaka",
    new_workload: 42,
    reason:
      "The task reached the SLA threshold without a claim or progress update.",
    time: iso(3 * 60 * 1000),
  },
  {
    id: "evt-2",
    type: "sla_emergency_alert",
    task_id: "task-11",
    task_title: "Compliance Sign-off — Vendor Y",
    reason:
      "All qualified employees are currently at or above the 85% workload limit.",
    role: "Compliance Officer",
    department: "Compliance",
    time: iso(6 * 60 * 1000),
  },
  {
    id: "evt-3",
    type: "task_claimed",
    task_id: "task-3",
    task_title: "Contract Review — Vendor X",
    employee_name: "Daniel Park",
    time: iso(8 * 60 * 1000),
  },
];

export const demoSlaDashboard: SlaDashboard = {
  counts: {
    active: 2,
    on_track: 1,
    at_risk: 1,
    breached: 0,
    reassignments: 1,
    emergency_alerts: 1,
  },
  tasks: demoTasks,
  recent_events: demoRecentEvents,
};

export const demoRework: ReworkSummary = {
  human_need_baseline: 38,
  task_samples: 120,
  rework_count: 14,
  rework_rate: 11.7,
  incidents: [
    {
      task_id: "task-7",
      task_title: "Draft refund email",
      drift_ratio: 0.62,
      date: iso(2 * 60 * 60 * 1000),
    },
    {
      task_id: "task-12",
      task_title: "Onboarding summary",
      drift_ratio: 0.41,
      date: iso(5 * 60 * 60 * 1000),
    },
    {
      task_id: "task-19",
      task_title: "Compliance checklist",
      drift_ratio: 0.55,
      date: iso(26 * 60 * 60 * 1000),
    },
  ],
};

export const demoAudit: AuditEvent[] = demoRecentEvents.map((e) => ({
  id: String(e.id),
  time: e.time,
  action: e.type,
  task_id: e.task_id,
  task_title: e.task_title || e.task,
  employee_name: e.employee_name || e.new_employee || e.previous_employee,
  reason: e.reason,
  details:
    e.previous_employee && e.new_employee
      ? `${e.previous_employee} → ${e.new_employee}`
      : "",
}));

export function demoIntake(title: string, description: string): {
  task: Task;
  route: string;
  ai_aptitude: number;
  human_need: number;
  safety: string;
  gate: string;
  assigned_to: string;
  employee_name: string;
  sla_minutes: number;
  reason: string;
} {
  const text = `${title} ${description}`.toLowerCase();
  let route = "AI";
  let gate = "";
  let reason = "Routine, low-risk request. AI can handle fully.";
  let ai = 90;
  let human = 12;
  if (/refund|billing|charge|complaint|payment/.test(text)) {
    route = "HYBRID";
    gate = "G3";
    ai = 70;
    human = 55;
    reason = "Billing issue — AI can draft a response but a human must approve before sending.";
  } else if (/legal|contract|compliance|sign|agree/.test(text)) {
    route = "HUMAN";
    gate = "G2";
    ai = 20;
    human = 90;
    reason = "Legal/contract work — a human must execute this.";
  } else if (/delete|delete user|danger|unsafe|hack|exploit|weapon/.test(text)) {
    route = "REFUSED";
    gate = "G4";
    ai = 0;
    human = 0;
    reason = "This task violates a safety rule and cannot be accepted.";
  }
  return {
    task: {
      id: `demo-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      route: route as Task["route"],
      sla_minutes: 20,
      sla_status: "on_track",
      assigned_at: new Date().toISOString(),
    },
    route,
    ai_aptitude: ai,
    human_need: human,
    safety: gate || "none",
    gate,
    assigned_to: route === "AI" ? "" : "emp-2",
    employee_name: route === "AI" ? "" : "Sara Khan",
    sla_minutes: 20,
    reason,
  };
}
