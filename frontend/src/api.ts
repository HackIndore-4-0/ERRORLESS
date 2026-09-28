import type {
  AuditEvent,
  Employee,
  HealthResponse,
  IntakeResult,
  ReworkSummary,
  SlaDashboard,
  Task,
} from "@/types";

export class ApiError extends Error {
  status: number;
  body?: Record<string, unknown>;
  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const friendlyMessages: Record<number, string> = {
  400: "The request was not valid. Please check your inputs and try again.",
  403: "You do not have permission to do this.",
  404: "The requested item could not be found.",
  409: "This action conflicts with the current state. Refresh and try again.",
  422: "The backend could not process the request. Please check your inputs.",
  500: "The backend reported an internal error. Please try again shortly.",
};

function baseUrl(): string {
  const env = import.meta.env.VITE_HUMAI_API_URL;
  if (env && String(env).trim())
    return String(env).trim().replace(/\/+$/, "").replace(/\/api$/, "");
  return "";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = baseUrl();
  if (!base) {
    throw new ApiError(
      "No backend URL is configured. Set VITE_HUMAI_API_URL in your deployment environment (e.g. Vercel project settings).",
      0,
    );
  }
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach the backend. Check the URL and your connection.",
      0,
    );
  }
  if (!res.ok) {
    let detail = "";
    let parsed: Record<string, unknown> | undefined;
    try {
      const body = await res.json();
      parsed = body && typeof body === "object" ? body : undefined;
      detail =
        (body && (body.detail || body.message || body.error || body.reason)) || "";
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = "";
      }
    }
    const msg = friendlyMessages[res.status] || `Request failed (${res.status}).`;
    throw new ApiError(detail ? `${msg} ${detail}` : msg, res.status, parsed);
  }
  if (res.status === 204) return undefined as unknown as T;
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}


// ---------------------------------------------------------------------------
// Adapters: the backend returns wrapped payloads ({ success, task }) and raw
// DB columns (current_load 0..1, aa_score, sla_status as an object). These
// convert them to the shapes the pages already render. No business logic here.
// ---------------------------------------------------------------------------
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function normalizeEmployee(e: Raw): Employee {
  const load = e.current_load ?? e.load;
  return {
    ...e,
    workload:
      e.workload != null
        ? e.workload
        : load != null
          ? Math.round(Number(load) * 100)
          : 0,
  } as Employee;
}

function normalizeTask(t: Raw | null | undefined): Task {
  const raw: Raw = t ?? {};
  const emp: Raw | null =
    raw.employees && typeof raw.employees === "object" ? raw.employees : null;
  const sla: Raw | null =
    raw.sla_status && typeof raw.sla_status === "object" ? raw.sla_status : null;
  return {
    ...raw,
    sla_status: sla ? sla.label : raw.sla_status,
    sla_elapsed_fraction: sla?.elapsed_fraction,
    employee_id: raw.employee_id ?? raw.assigned_employee_id,
    employee_name: raw.employee_name ?? emp?.name,
    employee_role: raw.employee_role ?? emp?.role,
    assigned_to: raw.assigned_to ?? emp?.name,
    workload:
      raw.workload ??
      (emp?.current_load != null ? Math.round(Number(emp.current_load) * 100) : undefined),
    ai_aptitude:
      raw.ai_aptitude ?? (raw.aa_score != null ? Math.round(Number(raw.aa_score) * 100) : undefined),
    human_need:
      raw.human_need ?? (raw.hn_score != null ? Math.round(Number(raw.hn_score) * 100) : undefined),
    reason: raw.reason ?? raw.routing_reason,
    ai_draft: raw.ai_draft ?? raw.ai_output,
    safety_flags: raw.safety_flags ?? raw.gate_flags,
    gates: raw.gates ?? raw.gate_flags,
    claim_status: raw.claim_status ?? (raw.claimed_at ? "claimed" : undefined),
  } as unknown as Task;
}

function pickTask(data: Raw | undefined): Task {
  return normalizeTask(data && data.task ? data.task : data);
}

function normalizeIntake(data: Raw): IntakeResult {
  const task = normalizeTask(data.task);
  const decision: Raw = data.decision ?? {};
  const emp: Raw | null = data.assigned_to && typeof data.assigned_to === "object" ? data.assigned_to : null;
  const flags: string[] = decision.gateFlags ?? (task.gate_flags as string[] | undefined) ?? [];
  const n: Raw = data.notification ?? {};
  return {
    ...data,
    task,
    route: decision.route ?? task.route,
    ai_aptitude:
      decision.scores?.AA != null ? Math.round(decision.scores.AA * 100) : task.ai_aptitude,
    human_need:
      decision.scores?.HN != null ? Math.round(decision.scores.HN * 100) : task.human_need,
    gate: flags.length ? flags.join(", ") : "",
    gates: flags,
    assigned_employee: emp?.name,
    assigned_email: emp?.email,
    sla_minutes: task.sla_minutes,
    sla_deadline: task.sla_deadline,
    reason: decision.reason ?? task.reason,
    notification: {
      sent: !!n.sent,
      reason: n.reason,
      error: n.error,
      to: n.to ?? emp?.email,
    },
  } as unknown as IntakeResult;
}

function employeeBody(body: Partial<Employee>): Raw {
  const { workload, department: _d, load: _l, ...rest } = body as Raw; // eslint-disable-line @typescript-eslint/no-unused-vars
  const out: Raw = { ...rest };
  if (workload != null && workload !== "") {
    const w = Number(workload);
    out.current_load = Math.max(0, Math.min(1, w > 1 ? w / 100 : w));
  }
  return out;
}

export const api = {
  baseUrl,

  async health(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async listEmployees(): Promise<Employee[]> {
    const data = await request<Employee[] | { employees: Employee[] }>(
      "/api/employees",
    );
    const list = Array.isArray(data) ? data : (data?.employees ?? []);
    return list.map((e) => normalizeEmployee(e as Raw));
  },

  async createEmployee(body: Partial<Employee>): Promise<Employee> {
    const data = await request<Raw>("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeBody(body)),
    });
    return normalizeEmployee(data?.employee ?? data);
  },

  async updateEmployee(id: string, body: Partial<Employee>): Promise<Employee> {
    const data = await request<Raw>(`/api/employees/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(employeeBody(body)),
    });
    return normalizeEmployee(data?.employee ?? data);
  },

  async listTasks(): Promise<Task[]> {
    const data = await request<Task[] | { tasks: Task[] }>("/api/tasks");
    const list = Array.isArray(data) ? data : (data?.tasks ?? []);
    return list.map((t) => normalizeTask(t as Raw));
  },

  async getTask(id: string): Promise<Task> {
    return pickTask(await request<Raw>(`/api/tasks/${encodeURIComponent(id)}`));
  },

  async intake(body: {
    title: string;
    description?: string;
    required_role?: string;
    sla_minutes?: number | string;
  }): Promise<IntakeResult> {
    try {
      const data = await request<Raw>("/api/tasks/intake", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return normalizeIntake(data);
    } catch (e) {
      // 422 = HUMAI refused the task on a safety gate; show it as a decision.
      if (e instanceof ApiError && e.status === 422 && e.body?.refused) {
        return {
          route: "REFUSED",
          reason: String(e.body.reason ?? ""),
          gate: "G4",
        } as unknown as IntakeResult;
      }
      throw e;
    }
  },

  async claim(id: string, employee_id: string): Promise<Task> {
    return pickTask(
      await request<Raw>(`/api/tasks/${encodeURIComponent(id)}/claim`, {
        method: "PATCH",
        body: JSON.stringify({ employee_id }),
      }),
    );
  },

  async progress(id: string, body: Record<string, unknown> = {}): Promise<Task> {
    return pickTask(
      await request<Raw>(`/api/tasks/${encodeURIComponent(id)}/progress`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  },

  async approve(
    id: string,
    body: {
      approver_id: string;
      decision: "approved" | "rejected" | "edited";
      note?: string;
      final_output?: string;
    },
  ): Promise<Task> {
    return pickTask(
      await request<Raw>(`/api/tasks/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  },

  async slaDashboard(): Promise<SlaDashboard> {
    const data = await request<Raw>("/api/dashboard/sla");
    const tasks = ((data?.tasks as Raw[]) ?? []).map(normalizeTask);
    const events = (data?.recent_events as Raw[]) ?? [];
    const c: Raw = data?.counts ?? {};
    return {
      ...data,
      tasks,
      recent_events: events,
      counts: {
        ...c,
        active: tasks.length,
        reassignments: events.filter((e) => e.action === "task_reassigned_sla_breach").length,
        emergency_alerts: events.filter((e) => e.action === "sla_emergency_alert").length,
      },
    } as unknown as SlaDashboard;
  },

  async rework(): Promise<ReworkSummary> {
    const data = await request<Raw>("/api/dashboard/rework");
    const baselines = (data?.baselines as Raw[]) ?? [];
    const flagged = (data?.recent_flagged as Raw[]) ?? [];
    const samples = baselines.reduce((a, b) => a + Number(b.sample_count ?? 0), 0);
    const reworks = baselines.reduce((a, b) => a + Number(b.rework_count ?? 0), 0);
    const maxBaseline = baselines.reduce((m, b) => Math.max(m, Number(b.hn_baseline ?? 0)), 0);
    return {
      ...data,
      human_need_baseline: Math.round(maxBaseline * 100),
      task_samples: samples,
      rework_count: reworks,
      rework_rate: samples > 0 ? Math.round((reworks / samples) * 100) : 0,
      incidents: flagged.map((f) => ({
        task_id: f.task_id,
        task_title: f.tasks?.title,
        drift_ratio: f.drift_ratio,
        date: f.decided_at,
      })),
    } as unknown as ReworkSummary;
  },

  // Audit isn't a listed endpoint in the contract; derive from SLA recent_events
  // plus task history when a dedicated endpoint is unavailable.
  async audit(): Promise<{ events: AuditEvent[] }> {
    const sla = await this.slaDashboard();
    const events: AuditEvent[] = (sla.recent_events ?? []).map((e) => ({
      id: String(e.id ?? e.task_id ?? Math.random()),
      time: e.time || e.timestamp || e.created_at || (e as Raw).ts || "",
      action: e.type || e.event || e.action || "",
      task_id: e.task_id || String((e as Raw).entity ?? "").replace(/^task:/, "") || undefined,
      task_title: e.task_title || e.task,
      employee_id: e.employee_id,
      employee_name: e.employee_name || e.new_employee || e.previous_employee,
      reason: e.reason || (e as Raw).after?.reason,
      details:
        e.previous_employee && e.new_employee
          ? `${e.previous_employee} → ${e.new_employee}`
          : "",
    }));
    return { events };
  },
};
