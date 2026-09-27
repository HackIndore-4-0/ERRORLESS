import type { Route, SlaEvent, Task } from "@/types";

export function num(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

export function pct(v: unknown, fallback = 0): number {
  const n = num(v, fallback);
  if (n > 1 && n <= 100) return n;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return fallback;
}

export function routeOf(v: unknown): Route | string {
  const s = str(v, "").toUpperCase();
  if (s === "AI" || s === "HUMAN" || s === "HYBRID" || s === "REFUSED")
    return s as Route;
  return str(v, "—");
}

export function isRoute(v: unknown, r: Route): boolean {
  return routeOf(v) === r;
}

export function taskTitle(t: Task): string {
  return str(t.title, "Untitled task");
}

export function taskEmployeeName(t: Task): string {
  if (t.employee_name) return str(t.employee_name);
  if (t.assigned_employee) return str(t.assigned_employee);
  if (typeof t.employee === "string") return t.employee;
  if (t.employee && typeof t.employee === "object" && t.employee.name)
    return str(t.employee.name);
  return str(t.assigned_to, "Unassigned");
}

export function taskWorkload(t: Task): number {
  return pct(t.workload ?? (t.employee && typeof t.employee === "object" ? t.employee.workload ?? t.employee.load : t.workload));
}

export function taskSlaMinutes(t: Task): number {
  return num(t.sla_minutes);
}

export function taskSlaElapsedPct(t: Task): number | null {
  const assigned = t.assigned_at || t.created_at;
  const deadline = t.sla_deadline;
  const mins = taskSlaMinutes(t);
  if (!assigned) return null;
  const start = new Date(assigned).getTime();
  if (Number.isNaN(start)) return null;
  let end: number;
  if (deadline) {
    const d = new Date(deadline).getTime();
    if (!Number.isNaN(d)) end = d;
    else if (mins > 0) end = start + mins * 60_000;
    else return null;
  } else if (mins > 0) {
    end = start + mins * 60_000;
  } else {
    return null;
  }
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = now - start;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export function taskRemainingMs(t: Task): number | null {
  const assigned = t.assigned_at || t.created_at;
  const deadline = t.sla_deadline;
  const mins = taskSlaMinutes(t);
  if (!assigned) return null;
  const start = new Date(assigned).getTime();
  if (Number.isNaN(start)) return null;
  let end: number;
  if (deadline) {
    const d = new Date(deadline).getTime();
    if (!Number.isNaN(d)) end = d;
    else if (mins > 0) end = start + mins * 60_000;
    else return null;
  } else if (mins > 0) {
    end = start + mins * 60_000;
  } else {
    return null;
  }
  return Math.max(0, end - Date.now());
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return str(iso);
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return str(iso);
  return t.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slaStatusLabel(s: string): string {
  return str(s, "not_applicable")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isCascadeEvent(e: SlaEvent): boolean {
  const t = str(e.type || e.event || e.action).toLowerCase();
  return (
    t.includes("reassign") ||
    t.includes("cascade") ||
    t.includes("sla_breach")
  );
}

export function isEmergencyEvent(e: SlaEvent): boolean {
  const t = str(e.type || e.event || e.action).toLowerCase();
  return t.includes("emergency") || t.includes("capacity");
}

export function gateExplanation(gate: string): { title: string; text: string } {
  const g = str(gate).toUpperCase();
  const map: Record<string, { title: string; text: string }> = {
    G2: {
      title: "G2 — Human must execute",
      text: "The task involves an action that should not be completed by AI alone.",
    },
    G3: {
      title: "G3 — Human approval required",
      text: "AI can draft this work, but a human must approve it before it is sent.",
    },
    G4: {
      title: "G4 — Task refused",
      text: "This task cannot be accepted because it violates a safety rule.",
    },
  };
  return (
    map[g] ?? {
      title: g || "Safety gate",
      text: "A safety rule applied to this task.",
    }
  );
}
