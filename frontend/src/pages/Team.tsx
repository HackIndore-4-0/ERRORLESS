import { useState } from "react";
import { Loader2, Mail, Plus, UserPlus } from "lucide-react";
import { ErrorBanner, EmptyState, LoadingState, SectionTitle } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/StatusBadge";
import { BarChart } from "@/components/Charts";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/api";
import { demoEmployees } from "@/demo";
import type { Employee, Profile } from "@/types";
import { formatRelativeTime, num, str } from "@/utils";

export function Team({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const { data, error, loading, refresh } = usePoll<Employee[]>(
    () => (demo ? Promise.resolve(demoEmployees) : api.listEmployees()),
    6000,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  const employees = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Team &amp; Capacity
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          HUMAI uses employee workload when deciding where human work should go.
        </p>
      </div>

      {/* 85% ceiling callout */}
      <div className="card flex items-center gap-3 border-gray-300 bg-gray-50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
          <span className="text-sm font-bold">85%</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Employee workload limit
          </div>
          <p className="text-xs text-gray-500">
            HUMAI never assigns work to an employee at or above 85% workload.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Pill tone="success">Healthy · 0–60%</Pill>
        <Pill tone="warning">Near Limit · 60–85%</Pill>
        <Pill tone="danger">Saturated · 85%+</Pill>
      </div>

      {employees.length > 0 && (
        <div className="card p-5">
          <SectionTitle title="Workload by team member" />
          <BarChart
            data={employees.map((emp) => {
              const load = num(emp.workload ?? emp.load);
              const cap = capacityState(load);
              const color = cap.tone === "danger" ? "#ef4444" : cap.tone === "warning" ? "#f59e0b" : "#10b981";
              return { label: str(emp.name), value: load, color };
            })}
            max={100}
            valueFormatter={(v) => `${v}%`}
          />
        </div>
      )}

      <div className="card p-5">
        <SectionTitle
          title="Team members"
          right={
            <button onClick={() => setAddOpen(true)} className="btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Team Member
            </button>
          }
        />
        {loading && !data ? (
          <LoadingState />
        ) : error && !demo ? (
          <ErrorBanner message={error} />
        ) : employees.length === 0 ? (
          <EmptyState
            title="No team members yet"
            description="Add your first employee so HUMAI can assign human work."
            icon={<UserPlus className="h-8 w-8" />}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {employees.map((emp) => (
              <EmployeeCard
                key={str(emp.id)}
                emp={emp}
                demo={demo}
                onChanged={() => void refresh()}
              />
            ))}
          </div>
        )}
      </div>

      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        demo={demo}
        busy={busy}
        error={formErr}
        onSubmit={async (body) => {
          setBusy(true);
          setFormErr("");
          try {
            if (!demo) await api.createEmployee(body);
            setAddOpen(false);
            void refresh();
          } catch (e) {
            setFormErr(e instanceof Error ? e.message : "Could not add employee.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function capacityState(load: number): { tone: "success" | "warning" | "danger"; label: string } {
  if (load >= 85) return { tone: "danger", label: "Saturated" };
  if (load >= 60) return { tone: "warning", label: "Near Limit" };
  return { tone: "success", label: "Healthy" };
}

function EmployeeCard({
  emp,
  demo,
  onChanged,
}: {
  emp: Employee;
  demo: boolean;
  onChanged: () => void;
}) {
  const load = num(emp.workload ?? emp.load);
  const cap = capacityState(load);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(load));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const skills = Array.isArray(emp.skills)
    ? emp.skills
    : str(emp.skills)
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (!demo) await api.updateEmployee(str(emp.id), { workload: Number(val) } as Partial<Employee>);
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{str(emp.name)}</div>
          <div className="text-xs text-gray-500">{str(emp.role || "—")}</div>
        </div>
        <Pill tone={cap.tone}>{cap.label}</Pill>
      </div>
      {emp.email && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Mail className="h-3 w-3" />
          {str(emp.email)}
        </div>
      )}
      {skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-gray-500">Workload</span>
          <span className="font-semibold text-gray-700">{load}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${cap.tone === "danger" ? "bg-red-500" : cap.tone === "warning" ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, load)}%` }}
          />
        </div>
        {editing ? (
          <div className="mt-2 flex items-center gap-2">
            <input className="input py-1 text-xs" type="number" value={val} onChange={(e) => setVal(e.target.value)} />
            <button onClick={save} disabled={busy} className="btn-secondary text-xs">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-2 text-xs text-gray-500 hover:text-gray-700">
            Update workload
          </button>
        )}
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
      {emp.active_tasks != null && (
        <div className="mt-2 text-xs text-gray-400">
          Active tasks: {num(emp.active_tasks)}
        </div>
      )}
    </div>
  );
}

function AddEmployeeModal({
  open,
  onClose,
  onSubmit,
  busy,
  error,
  demo,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: Partial<Employee>) => void;
  busy: boolean;
  error: string;
  demo: boolean;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [department, setDepartment] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");

  const reset = () => {
    setName("");
    setRole("");
    setEmail("");
    setSkills("");
    setDepartment("");
    setManagerName("");
    setManagerEmail("");
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add team member"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => {
              onSubmit({
                name: name.trim(),
                role: role.trim(),
                email: email.trim(),
                skills: skills.trim().split(/[,;]/).map((s) => s.trim()).filter(Boolean),
                department: department.trim(),
                manager_name: managerName.trim() || undefined,
                manager_email: managerEmail.trim() || undefined,
                workload: 0,
              });
              reset();
            }}
            disabled={busy || !name.trim() || !role.trim() || !email.trim()}
            className="btn-primary text-sm"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add member"}
          </button>
        </>
      }
    >
      {demo && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
          Demo mode is on — new members are not sent to the backend.
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Department</label>
            <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <label className="label">Skills (comma-separated)</label>
            <input className="input" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Manager name</label>
            <input className="input" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
          </div>
          <div>
            <label className="label">Manager email</label>
            <input className="input" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

void formatRelativeTime;
