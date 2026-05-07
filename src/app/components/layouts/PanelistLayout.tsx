import { useState, useCallback, startTransition } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router";
import { useAuth } from "../../lib/AuthContext";
import { NavBar } from "../NavBar";
import { Sidebar } from "../Sidebar";
import { BottomNavBar } from "../BottomNavBar";
import { MobileDrawer } from "../MobileDrawer";
import { AnimatedOutlet } from "../AnimatedOutlet";
import { OnboardingTour } from "../OnboardingTour";
import {
  LayoutDashboard, FileText, ShieldCheck, CheckSquare, Settings, BarChart3,
} from "lucide-react";

const PATHS = ["", "pre-defense", "defense-session", "post-defense", "grade-aggregator", "settings"];

const BREADCRUMB_LABELS: Record<string, string> = {
  "": "Dashboard",
  "pre-defense": "Pre-Defense Files",
  "defense-session": "Defense Session",
  "post-defense": "Post-Defense Review",
  "grade-aggregator": "Grade Aggregator",
  settings: "Settings",
};

const ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { icon: <FileText size={18} />, label: "Pre-Defense Files" },
  { icon: <ShieldCheck size={18} />, label: "Defense Session" },
  { icon: <CheckSquare size={18} />, label: "Post-Defense Review" },
  { icon: <BarChart3 size={18} />, label: "Grade Aggregator" },
  { icon: <Settings size={18} />, label: "Settings" },
];

const SECTIONS = [
  { label: null, items: [0] },
  { label: "DEFENSE", items: [1, 2, 3] },
  { label: null, items: [4] },
  { label: null, items: [5] },
];

function pathToIndex(pathname: string): number {
  const seg = pathname.replace(/^\/(panelist|adviser)\/?/, "").split("/")[0] || "";
  const idx = PATHS.indexOf(seg);
  return idx >= 0 ? idx : 0;
}

export function PanelistLayout() {
  const { user, logout, needsProfileSetup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdviser = user?.role === "adviser";
  const basePath = isAdviser ? "/adviser" : "/panelist";
  const roleLabel = isAdviser ? "Adviser" : "Panelist";

  const activeIndex = pathToIndex(location.pathname);
  const currentSeg = location.pathname.replace(/^\/(panelist|adviser)\/?/, "").split("/")[0] || "";
  const breadcrumb = BREADCRUMB_LABELS[currentSeg] || "";

  const onNavigate = useCallback((idx: number) => {
    const path = PATHS[idx] || "";
    startTransition(() => {
      navigate(`${basePath}/${path}`);
    });
    setDrawerOpen(false);
  }, [navigate, basePath]);

  if (!user || (user.role !== "panelist" && user.role !== "adviser")) return <Navigate to="/login" replace />;
  if (needsProfileSetup) return <Navigate to="/setup" replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-body)", background: "#07090F" }}>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold"
        style={{ background: "#A78BFA", color: "#07090F" }}
      >
        Skip to main content
      </a>
      <NavBar
        userName={user.name}
        role={roleLabel}
        avatarUrl={user.avatarUrl}
        onHamburger={() => setDrawerOpen(true)}
        breadcrumb={currentSeg ? breadcrumb : undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar
            activeIndex={activeIndex}
            onNavigate={onNavigate}
            onLogout={logout}
            userName={user.name}
            avatarUrl={user.avatarUrl}
            roleLabel={roleLabel}
            accentColor={isAdviser ? "#2DD4BF" : undefined}
            accentDark={isAdviser ? "#14B8A6" : undefined}
          />
        </div>
        <main
          id="main-content"
          className="flex-1 overflow-auto pb-20 md:pb-7"
          style={{ background: "#07090F" }}
          aria-label={`${roleLabel} main content`}
        >
          <div className="p-6 lg:p-8">
            <AnimatedOutlet context={{ onNavigate, user }} />
          </div>
        </main>
      </div>
      <BottomNavBar role={user.role} activeIndex={activeIndex} onNavigate={onNavigate} />
      <MobileDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        userName={user.name} role={roleLabel} avatarUrl={user.avatarUrl}
        items={ITEMS} sections={SECTIONS}
        activeIndex={activeIndex} onNavigate={onNavigate} onLogout={logout}
      />
      {/* Screen reader live region for dynamic updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcements" />
      <OnboardingTour role={user.role} userId={user.id} />
    </div>
  );
}