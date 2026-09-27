import { useState } from "react";
import {
  Check,
  ClipboardCheck,
  Edit3,
  Loader2,
  X,
} from "lucide-react";
import { ErrorBanner, EmptyState, LoadingState, SectionTitle } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import { RouteBadge, SlaStatusBadge, Pill } from "@/components/StatusBadge";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/api";
import type { Profile, Task } from "@/types";
import {
  formatRelativeTime,
  str,
  taskEmployeeName,
  taskTitle,
} from "@/utils";

type Decision = "approved" | "rejected" | "edited";

export function Approval({ profile }: { profile: Profile }) {
  const { data, error, loading, refresh } = usePoll<Task[]>(
    () => api.listTasks(),
    5000,
    !profile.demoMode,
  );

  const pending = (data ?? []).filter((t) =>
    ["approval", "pending_approval", "awaiting_approval", "needs_approval"].includes(
      str(t.status || t.state).toLowerCase(),
    ) || str(t.safety || t.gate).toUpperCase() === "G3",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Human Approval
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Some work should not be completed without a human decision.
        </p>
      </div>

      <div className="card p-5">
        <SectionTitle title="Pending approvals" right={
          <button onClick={() => void refresh()} className="btn-ghost text-xs">Refresh</button>
        } />
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : pending.length === 0 ? (
          <EmptyState
            title="Nothing waiting for approval"
            description="When HUMAI routes a task through the approval gate, it will appear here."
            icon={<ClipboardCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <ApprovalCard key={str(t.id)} task={t} profile={profile} onDone={() => void refresh()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({
  task,
  profile,
  onDone,
}: {
  task: Task;
  profile: Profile;
  onDone: () => void;
}) {
  const [modal, setModal] = useState<null | Decision>(null);
  const [note, setNote] = useState("");
  const [finalOutput, setFinalOutput] = useState(str(task.ai_draft, ""));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  const open = (d: Decision) => {
    setErr("");
    setResult("");
    setNote("");
    setFinalOutput(str(task.ai_draft, ""));
    setModal(d);
  };

  const submit = async () => {
    if (modal === "rejected" && !note.trim()) {
      setErr("Please add a reason for rejecting.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const approverId = str(profile.email);
      if (profile.demoMode) {
        setResult(`Task ${modal} (demo)`);
      } else {
        await api.approve(str(task.id), {
          approver_id: approverId,
          decision: modal as Decision,
          note: note.trim() || undefined,
          final_output: modal === "edited" ? finalOutput.trim() : undefined,
        });
        setResult(`Task ${modal}.`);
      }
      setModal(null);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{taskTitle(task)}</h3>
            <RouteBadge value={task.route} />
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{str(task.description)}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Assigned to: <span className="text-gray-700">{taskEmployeeName(task)}</span></span>
            <span>Age: <span className="text-gray-700">{formatRelativeTime(task.created_at || task.assigned_at)}</span></span>
            <span>SLA: <SlaStatusBadge value={str(task.sla_status, "not_applicable")} /></span>
          </div>
        </div>
      </div>

      {task.ai_draft && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <Pill tone="info">AI Draft</Pill>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{str(task.ai_draft)}</p>
        </div>
      )}

      {result && <p className="mt-2 text-xs font-medium text-emerald-600">{result}</p>}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => open("approved")} className="btn-primary text-xs">
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button onClick={() => open("edited")} className="btn-secondary text-xs">
          <Edit3 className="h-3.5 w-3.5" /> Edit &amp; Approve
        </button>
        <button onClick={() => open("rejected")} className="btn-danger text-xs">
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>

      <Modal
        open={modal === "rejected"}
        onClose={() => setModal(null)}
        title="Reject task"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-danger text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm reject"}
            </button>
          </>
        }
      >
        <label className="label">Reason for rejection (required)</label>
        <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain why this is being rejected…" />
      </Modal>

      <Modal
        open={modal === "edited"}
        onClose={() => setModal(null)}
        title="Edit & approve"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-primary text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit edit"}
            </button>
          </>
        }
      >
        <label className="label">Final output</label>
        <textarea className="input min-h-[140px]" value={finalOutput} onChange={(e) => setFinalOutput(e.target.value)} />
        <label className="label mt-3">Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any comment for the audit trail" />
      </Modal>

      <Modal
        open={modal === "approved"}
        onClose={() => setModal(null)}
        title="Approve task"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-primary text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm approve"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Approve the AI draft as-is. This will mark the task complete with the
          current AI output.
        </p>
        <label className="label mt-3">Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any comment for the audit trail" />
      </Modal>
    </div>
  );
}
