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
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  if (env && String(env).trim()) return String(env).replace(/\/+$/, "");
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
    try {
      const body = await res.json();
      detail =
        (body && (body.detail || body.message || body.error)) || "";
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = "";
      }
    }
    const msg = friendlyMessages[res.status] || `Request failed (${res.status}).`;
    throw new ApiError(detail ? `${msg} ${detail}` : msg, res.status);
  }
  if (res.status === 204) return undefined as unknown as T;
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
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
    return Array.isArray(data) ? data : (data?.employees ?? []);
  },

  async createEmployee(body: Partial<Employee>): Promise<Employee> {
    return request<Employee>("/api/employees", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async updateEmployee(id: string, body: Partial<Employee>): Promise<Employee> {
    return request<Employee>(`/api/employees/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async listTasks(): Promise<Task[]> {
    const data = await request<Task[] | { tasks: Task[] }>("/api/tasks");
    return Array.isArray(data) ? data : (data?.tasks ?? []);
  },

  async getTask(id: string): Promise<Task> {
    return request<Task>(`/api/tasks/${encodeURIComponent(id)}`);
  },

  async intake(body: {
    title: string;
    description?: string;
    required_role?: string;
    sla_minutes?: number | string;
  }): Promise<IntakeResult> {
    return request<IntakeResult>("/api/tasks/intake", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async claim(id: string, employee_id: string): Promise<Task> {
    return request<Task>(`/api/tasks/${encodeURIComponent(id)}/claim`, {
      method: "PATCH",
      body: JSON.stringify({ employee_id }),
    });
  },

  async progress(id: string, body: Record<string, unknown> = {}): Promise<Task> {
    return request<Task>(`/api/tasks/${encodeURIComponent(id)}/progress`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
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
    return request<Task>(`/api/tasks/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async slaDashboard(): Promise<SlaDashboard> {
    return request<SlaDashboard>("/api/dashboard/sla");
  },

  async rework(): Promise<ReworkSummary> {
    return request<ReworkSummary>("/api/dashboard/rework");
  },

  // Audit isn't a listed endpoint in the contract; derive from SLA recent_events
  // plus task history when a dedicated endpoint is unavailable.
  async audit(): Promise<{ events: AuditEvent[] }> {
    const sla = await this.slaDashboard();
    const events: AuditEvent[] = (sla.recent_events ?? []).map((e) => ({
      id: String(e.id ?? e.task_id ?? Math.random()),
      time: e.time || e.timestamp || e.created_at || "",
      action: e.type || e.event || e.action || "",
      task_id: e.task_id,
      task_title: e.task_title || e.task,
      employee_id: e.employee_id,
      employee_name: e.employee_name || e.new_employee || e.previous_employee,
      reason: e.reason,
      details:
        e.previous_employee && e.new_employee
          ? `${e.previous_employee} → ${e.new_employee}`
          : "",
    }));
    return { events };
  },
};
