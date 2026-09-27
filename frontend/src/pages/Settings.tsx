import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/StatusBadge";
import { api } from "@/api";
import type { Profile } from "@/types";

export function Settings({
  profile,
  onSave,
  onClear,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClear: () => void;
}) {
  const [company, setCompany] = useState(profile.company);
  const [team, setTeam] = useState(profile.team || "");
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department || "");
  const [managerName, setManagerName] = useState(profile.managerName || "");
  const [managerEmail, setManagerEmail] = useState(profile.managerEmail || "");
  const [demoMode, setDemoMode] = useState(!!profile.demoMode);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const backendUrl = api.baseUrl();

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.health();
      setTestResult({ ok: true, msg: "Connected successfully." });
    } catch {
      setTestResult({ ok: false, msg: "Could not reach the backend." });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    onSave({
      ...profile,
      company: company.trim(),
      team: team.trim() || undefined,
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      department: department.trim() || undefined,
      managerName: managerName.trim() || undefined,
      managerEmail: managerEmail.trim() || undefined,
      demoMode,
    });
    setSavedMsg("Settings saved.");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tightish text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Change workspace and connection settings.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">Workspace</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Company</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="label">Team</label>
            <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">My Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <label className="label">Manager name</label>
            <input className="input" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
          </div>
          <div>
            <label className="label">Manager email</label>
            <input className="input" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">Backend</h2>
        <p className="mt-1 text-sm text-gray-500">
          The backend URL is set through the <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">VITE_HUMAI_API_URL</code> environment variable in your Vercel project settings. It cannot be changed from the browser.
        </p>
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Current backend URL</div>
          <div className="mt-0.5 truncate font-mono text-sm text-gray-900">
            {backendUrl || "Not configured"}
          </div>
        </div>
        <div className="mt-3">
          <button onClick={test} disabled={testing} className="btn-secondary">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </button>
          {testResult && (
            <p className={`mt-2 text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.msg}
            </p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">Application Mode</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setDemoMode(false)}
            className={`btn ${!demoMode ? "bg-gray-900 text-white" : "btn-secondary"}`}
          >
            LIVE BACKEND
          </button>
          <button
            onClick={() => setDemoMode(true)}
            className={`btn ${demoMode ? "bg-amber-500 text-white" : "btn-secondary"}`}
          >
            DEMO MODE
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {demoMode
            ? "Demo mode shows sample data. No real backend calls are made."
            : "Live mode connects to your real HUMAI backend."}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900">Local Data</h2>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => setConfirmClear(true)} className="btn-danger">
            <Trash2 className="h-4 w-4" /> Clear Profile
          </button>
          <p className="text-xs text-gray-500">
            Removes your saved profile from this browser. You will need to set up again.
          </p>
        </div>
      </div>

      {savedMsg && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {savedMsg}
        </div>
      )}

      {confirmClear && (
        <Modal
          open={confirmClear}
          onClose={() => setConfirmClear(false)}
          title="Clear profile?"
          footer={
            <>
              <button onClick={() => setConfirmClear(false)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => {
                  setConfirmClear(false);
                  onClear();
                }}
                className="btn-danger text-sm"
              >
                Yes, clear everything
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            This removes your workspace and profile from this browser. You will
            need to complete onboarding again.
          </p>
        </Modal>
      )}

      <div className="flex items-center justify-end gap-3">
        <Pill tone="neutral">
          {demoMode ? "Demo mode" : "Live backend"}
        </Pill>
        <button onClick={save} className="btn-primary">Save settings</button>
      </div>
    </div>
  );
}
