import { useState } from "react";
import { Header, Sidebar, type PageId } from "@/components/Layout";
import { Onboarding } from "@/pages/Onboarding";
import { Overview } from "@/pages/Overview";
import { Intake } from "@/pages/Intake";
import { WorkStatus } from "@/pages/WorkStatus";
import { Approval } from "@/pages/Approval";
import { Team } from "@/pages/Team";
import { Rework } from "@/pages/Rework";
import { Audit } from "@/pages/Audit";
import { Settings } from "@/pages/Settings";
import { useProfile } from "@/hooks/useProfile";
import { useHealth } from "@/hooks/useHealth";
import { ErrorBanner } from "@/components/Feedback";

function App() {
  const { profile, persist, clear } = useProfile();
  const { health } = useHealth(15000);
  const [page, setPage] = useState<PageId>("overview");
  const [collapsed, setCollapsed] = useState(false);

  if (!profile) {
    return <Onboarding onComplete={persist} />;
  }

  const showOfflineBanner =
    health.state === "offline" && !profile.demoMode && page !== "settings";

  const renderPage = () => {
    switch (page) {
      case "overview":
        return <Overview profile={profile} />;
      case "intake":
        return <Intake profile={profile} />;
      case "work":
        return <WorkStatus profile={profile} />;
      case "approval":
        return <Approval profile={profile} />;
      case "team":
        return <Team profile={profile} />;
      case "rework":
        return <Rework profile={profile} />;
      case "audit":
        return <Audit profile={profile} />;
      case "settings":
        return (
          <Settings
            profile={profile}
            onSave={(p) => persist(p)}
            onClear={clear}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        current={page}
        onNavigate={setPage}
        collapsed={collapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          health={health}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {showOfflineBanner && (
              <div className="mb-4">
                <ErrorBanner message="HUMAI cannot currently connect to the backend. Make sure VITE_HUMAI_API_URL is set correctly in your Vercel project settings, or enable Demo Mode to explore the interface." />
              </div>
            )}
            <div key={page} className="animate-fade-up">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
