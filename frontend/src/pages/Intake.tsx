import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { ErrorBanner } from "@/components/Feedback";
import { RouteBadge } from "@/components/StatusBadge";
import { Pill } from "@/components/StatusBadge";
import { api } from "@/api";
import { demoIntake } from "@/demo";
import type { IntakeResult, Profile } from "@/types";
import { gateExplanation, num, str } from "@/utils";

export function Intake({ profile }: { profile: Profile }) {
  const demo = !!profile.demoMode;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredRole, setRequiredRole] = useState("");
  const [slaMinutes, setSlaMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
      };
      if (requiredRole.trim()) body.required_role = requiredRole.trim();
      if (slaMinutes.trim()) body.sla_minutes = Number(slaMinutes.trim());
      const r = demo
        ? demoIntake(title.trim(), description.trim())
        : await api.intake({
            title: title.trim(),
            description: description.trim(),
            required_role: requiredRole.trim() || undefined,
            sla_minutes: slaMinutes.trim() ? Number(slaMinutes.trim()) : undefined,
          });
      setResult(r as IntakeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the task.");
    } finally {
      setLoading(false);
    }
  };

  const route = result ? str(result.route || result.task?.route) : "";
  const gate = result ? str(result.gate || result.safety || result.task?.gate) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
          Give HUMAI a Task
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          HUMAI will decide who should handle this work.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <form onSubmit={submit} className="card space-y-4 p-5">
            <div>
              <label className="label">Task title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Customer complaint about a double charge" />
            </div>
            <div>
              <label className="label">Task description</label>
              <textarea className="input min-h-[120px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work in plain language…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Required role</label>
                <input className="input" value={requiredRole} onChange={(e) => setRequiredRole(e.target.value)} placeholder="Support Agent" />
              </div>
              <div>
                <label className="label">SLA duration override</label>
                <input className="input" type="number" value={slaMinutes} onChange={(e) => setSlaMinutes(e.target.value)} placeholder="minutes" />
                <p className="mt-1 text-xs text-gray-400">
                  Leave empty to let HUMAI choose the SLA.
                </p>
              </div>
            </div>
            {error && <ErrorBanner message={error} />}
            <button type="submit" disabled={!title.trim() || loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Analyze &amp; Assign
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="card flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8">
              <Brain className="h-10 w-10 animate-pulse-soft text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">
                HUMAI IS ANALYZING THE TASK…
              </p>
              <p className="text-xs text-gray-400">
                Reading the request, running safety checks, and choosing a route.
              </p>
            </div>
          ) : result ? (
            <ResultPanel result={result} route={route} gate={gate} />
          ) : (
            <div className="card flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
              <Brain className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                Submit a task to see HUMAI's decision here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  route,
  gate,
}: {
  result: IntakeResult;
  route: string;
  gate: string;
}) {
  const expl = gate ? gateExplanation(gate) : null;
  const refused = route === "REFUSED";
  const assigned = str(result.assigned_employee || result.assigned_to || result.task?.employee_name || result.task?.assigned_to);

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          HUMAI Decision
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold tracking-tightish text-gray-900">
            <RouteBadge value={route} />
          </div>
          {refused && (
            <Pill tone="danger">
              <ShieldAlert className="mr-1 h-3 w-3" />
              Task refused
            </Pill>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="AI Aptitude" value={`${num(result.ai_aptitude ?? result.task?.ai_aptitude)}%`} />
          <Field label="Human Need" value={`${num(result.human_need ?? result.task?.human_need)}%`} />
          <Field
            label="Safety"
            value={gate && gate !== "none" ? gate : "None"}
          />
          <Field label="Assigned To" value={assigned || "—"} icon={<UserCheck className="h-3.5 w-3.5" />} />
          <Field label="SLA" value={`${num(result.sla_minutes ?? result.task?.sla_minutes)} min`} icon={<Clock className="h-3.5 w-3.5" />} />
          {assigned && result.notification && (
            <Field
              label="Email"
              value={
                result.notification.sent
                  ? `Email sent${result.assigned_email ? ` to ${result.assigned_email}` : ""}`
                  : `Email not sent (${str(result.notification.reason, "unknown")})`
              }
            />
          )}
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Reason
          </div>
          <p className="mt-1 text-sm text-gray-700">
            {str(result.reason || result.task?.reason, "No reason provided.")}
          </p>
        </div>

        {expl && expl.title !== "Safety gate" && (
          <div className={`rounded-lg border p-3 ${refused ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className={`text-sm font-semibold ${refused ? "text-red-800" : "text-amber-800"}`}>
              {expl.title}
            </div>
            <p className={`mt-0.5 text-sm ${refused ? "text-red-700" : "text-amber-700"}`}>
              {expl.text}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Decision complete
          </div>
          <p className="mt-0.5 text-sm text-emerald-700">
            This result comes directly from the HUMAI backend.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        {icon}
        {value}
      </div>
    </div>
  );
}
