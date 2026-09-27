import { useState } from "react";
import { Brain, ChevronRight } from "lucide-react";
import type { Profile } from "@/types";

export function Onboarding({ onComplete }: { onComplete: (p: Profile) => void }) {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [error, setError] = useState("");

  const canSubmit = company.trim() && name.trim() && email.trim() && role.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    const profile: Profile = {
      company: company.trim(),
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      department: department.trim() || undefined,
      team: team.trim() || undefined,
      managerName: managerName.trim() || undefined,
      managerEmail: managerEmail.trim() || undefined,
      demoMode: false,
    };
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tightish text-gray-900">
              HUMAI
            </h1>
            <p className="text-sm text-gray-500">Human + AI work orchestration</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome to HUMAI
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            HUMAI helps decide which work should be handled by AI, a person, or
            both. Set up your workspace to get started.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Required
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Company name</label>
                  <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
                </div>
                <div>
                  <label className="label">Your name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
                </div>
                <div>
                  <label className="label">Email / Gmail</label>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                </div>
                <div>
                  <label className="label">Your role</label>
                  <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Operations Lead" />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Optional
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Support" />
                </div>
                <div>
                  <label className="label">Team name</label>
                  <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Tier 2" />
                </div>
                <div>
                  <label className="label">Manager name</label>
                  <input className="input" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Alex Morgan" />
                </div>
                <div>
                  <label className="label">Manager email</label>
                  <input className="input" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="alex@company.com" />
                </div>
              </div>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">
                HUMAI never asks for passwords or secret keys.
              </p>
              <button type="submit" disabled={!canSubmit} className="btn-primary">
                Enter workspace
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          HUMAI — Decide what deserves a human.
        </p>
      </div>
    </div>
  );
}
