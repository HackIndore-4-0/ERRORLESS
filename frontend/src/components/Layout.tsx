import {
  Activity,
  Brain,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { DemoBadge } from "@/components/ConnectionStatus";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import type { HealthInfo } from "@/hooks/useHealth";
import type { Profile } from "@/types";

export type PageId =
  | "overview"
  | "intake"
  | "work"
  | "approval"
  | "team"
  | "rework"
  | "audit"
  | "settings";

export const NAV: { id: PageId; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", hint: "See what HUMAI is doing now.", icon: LayoutDashboard },
  { id: "intake", label: "Task Intake", hint: "Give HUMAI a new task.", icon: ClipboardList },
  { id: "work", label: "Work Status", hint: "See whether assigned work is progressing.", icon: Activity },
  { id: "approval", label: "Approval Inbox", hint: "Review work that needs a human.", icon: Inbox },
  { id: "team", label: "Team", hint: "See employees and workload.", icon: Users },
  { id: "rework", label: "Rework & Learning", hint: "See where humans are correcting AI.", icon: Wrench },
  { id: "audit", label: "Audit", hint: "See what HUMAI did and why.", icon: ShieldCheck },
  { id: "settings", label: "Settings", hint: "Change workspace and connection settings.", icon: Settings },
];

export function Sidebar({
  current,
  onNavigate,
  collapsed,
}: {
  current: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
}) {
  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
          <Brain className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tightish text-gray-900">
              HUMAI
            </div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">
              Human + AI
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = current === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.hint}
              className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function Header({
  profile,
  health,
  onToggleSidebar,
}: {
  profile: Profile;
  health: HealthInfo;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="hidden sm:block">
          <div className="text-xs text-gray-400">Workspace</div>
          <div className="text-sm font-semibold text-gray-900">
            {profile.company}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 md:flex">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {profile.name}
            </div>
            <div className="text-[11px] text-gray-400">{profile.role}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ConnectionStatus health={health} />
          <DemoBadge on={!!profile.demoMode} />
        </div>
      </div>
    </header>
  );
}
