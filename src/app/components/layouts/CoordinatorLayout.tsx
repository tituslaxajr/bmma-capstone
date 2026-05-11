import { Suspense, lazy, useState, useCallback, startTransition } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router";
import { useAuth } from "../../lib/AuthContext";
import { NavBar } from "../NavBar";
import { CoordinatorSidebar } from "../CoordinatorSidebar";
import { MobileDrawer } from "../MobileDrawer";
import { BottomNavBar } from "../BottomNavBar";
import { AnimatedOutlet } from "../AnimatedOutlet";
import { CoordinatorViewSwitcher } from "../CoordinatorViewSwitcher";
import { AuthShellLoader } from "./AuthShellLoader";
import {
  LayoutDashboard, Users, FolderKanban, Link2,
  FileText, ShieldCheck, Award, Archive, Settings, Database,
} from "lucide-react";

const OnboardingTour = lazy(() => import("../OnboardingTour").then((m) => ({ default: m.OnboardingTour })));

const PATHS = [
  "", "users", "groups", "assignments",
  "manuscripts", "defense", "grading", "archive", "settings", "data-integrity",
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "": "Overview",
  users: "User Accounts",
  groups: "Groups & Teams",
  assignments: "Panel Assignments",
  manuscripts: "Manuscript Review",
  defense: "Defense Overview",
  grading: "Grading",
  archive: "Archive & Records",
  settings: "Settings",
  "data-integrity": "Data Integrity",
};

const ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: "Overview" },
  { icon: <Users size={18} />, label: "Users" },
  { icon: <FolderKanban size={18} />, label: "Groups & Teams" },
  { icon: <Link2 size={18} />, label: "Panel Assignments" },
  { icon: <FileText size={18} />, label: "Manuscripts" },
  { icon: <Award size={18} />, label: "Defense Overview" },
  { icon: <ShieldCheck size={18} />, label: "Grading" },
  { icon: <Archive size={18} />, label: "Archive" },
  { icon: <Settings size={18} />, label: "Settings" },
  { icon: <Database size={18} />, label: "Data Integrity" },
];

const SECTIONS = [
  { label: null, items: [0] },
  { label: "PEOPLE", items: [1, 2, 3] },
  { label: "CAPSTONE", items: [5, 6, 4] },
  { label: "SYSTEM", items: [9] },
  { label: null, items: [7, 8] },
];

function pathToIndex(pathname: string): number {
  const seg = pathname.replace(/^\/coordinator\/?/, "").split("/")[0] || "";
  const idx = PATHS.indexOf(seg);
  return idx >= 0 ? idx : 0;
}

export function CoordinatorLayout() {
  const { user, logout, needsProfileSetup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badges] = useState<Record<number, number>>({});

  const activeIndex = pathToIndex(location.pathname);
  const currentSeg = location.pathname.replace(/^\/coordinator\/?/, "").split("/")[0] || "";
  const breadcrumb = BREADCRUMB_LABELS[currentSeg] || "";

  const onNavigate = useCallback((idx: number) => {
    const path = PATHS[idx] || "";
    startTransition(() => {
      navigate(`/coordinator/${path}`);
    });
    setDrawerOpen(false);
  }, [navigate]);

  if (loading) return <AuthShellLoader label="Restoring your workspace..." />;
  if (!user || user.role !== "coordinator") return <Navigate to="/login" replace />;
  if (needsProfileSetup) return <Navigate to="/setup" replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-body)", background: "#07090F" }}>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold"
        style={{ background: "#F87171", color: "#07090F" }}
      >
        Skip to main content
      </a>
      <NavBar
        userName={user.name}
        role="Coordinator"
        avatarUrl={user.avatarUrl}
        onHamburger={() => setDrawerOpen(true)}
        breadcrumb={currentSeg ? breadcrumb : undefined}
        viewSwitcher={<CoordinatorViewSwitcher />}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <CoordinatorSidebar
            activeIndex={activeIndex}
            onNavigate={onNavigate}
            onLogout={logout}
            userName={user.name}
            avatarUrl={user.avatarUrl}
            badges={badges}
          />
        </div>
        <main
          id="main-content"
          className="flex-1 overflow-auto pb-20 md:pb-7"
          style={{ background: "#07090F" }}
          aria-label="Coordinator main content"
        >
          <div className="px-4 py-4 sm:p-6 lg:p-8">
            <AnimatedOutlet context={{ onNavigate, user }} />
          </div>
        </main>
      </div>
      <MobileDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        userName={user.name} role="Coordinator" avatarUrl={user.avatarUrl}
        items={ITEMS} sections={SECTIONS}
        activeIndex={activeIndex} onNavigate={onNavigate} onLogout={logout}
        badges={badges}
      />
      <BottomNavBar role="coordinator" activeIndex={activeIndex} onNavigate={onNavigate} />
      {/* Screen reader live region for dynamic updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcements" />
      <Suspense fallback={null}>
        <OnboardingTour role="coordinator" userId={user.id} />
      </Suspense>
    </div>
  );
}
