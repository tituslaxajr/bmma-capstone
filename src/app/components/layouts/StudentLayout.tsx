import { Suspense, lazy, useState, useCallback, useEffect, startTransition } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router";
import { useAuth } from "../../lib/AuthContext";
import { NavBar } from "../NavBar";
import { StudentSidebar } from "../StudentSidebar";
import { BottomNavBar } from "../BottomNavBar";
import { MobileDrawer } from "../MobileDrawer";
import { apiFetch } from "../../lib/supabase";
import { AnimatedOutlet } from "../AnimatedOutlet";
import { CoordinatorViewSwitcher } from "../CoordinatorViewSwitcher";
import { AuthShellLoader } from "./AuthShellLoader";
import {
  LayoutDashboard, FileText,
  Calendar, BarChart3,
  Archive, Users, Settings, BookOpen, Lock,
} from "lucide-react";

const OnboardingTour = lazy(() => import("../OnboardingTour").then((m) => ({ default: m.OnboardingTour })));

const PATHS = [
  "", "submissions", "defense-info", "results",
  "archive", "peer-evaluation", "manuscript-guide", "settings",
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "": "Dashboard",
  submissions: "Submissions",
  "defense-info": "Defense Info",
  results: "My Results",
  archive: "Archive",
  "peer-evaluation": "Peer Evaluation",
  "manuscript-guide": "Manuscript Guide",
  settings: "Settings",
};

const ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { icon: <FileText size={18} />, label: "Submissions" },
  { icon: <Calendar size={18} />, label: "Defense Info" },
  { icon: <BarChart3 size={18} />, label: "My Results" },
  { icon: <Archive size={18} />, label: "Archive" },
  { icon: <Users size={18} />, label: "Peer Evaluation" },
  { icon: <BookOpen size={18} />, label: "Manuscript Guide" },
  { icon: <Settings size={18} />, label: "Settings" },
];

const SECTIONS = [
  { label: null, items: [0] },
  { label: "WORK", items: [1, 6] },
  { label: "DEFENSE", items: [2, 3, 5] },
  { label: null, items: [4, 7] },
];

function pathToIndex(pathname: string): number {
  const seg = pathname.replace(/^\/student\/?/, "").split("/")[0] || "";
  const idx = PATHS.indexOf(seg);
  return idx >= 0 ? idx : 0;
}

export function StudentLayout() {
  const { user, logout, needsProfileSetup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badges] = useState<Record<number, number>>({});
  const [peerEvalLocked, setPeerEvalLocked] = useState(true);

  const activeIndex = pathToIndex(location.pathname);
  const currentSeg = location.pathname.replace(/^\/student\/?/, "").split("/")[0] || "";
  const breadcrumb = BREADCRUMB_LABELS[currentSeg] || "";

  const onNavigate = useCallback((idx: number) => {
    // Block navigation to locked peer eval (index 5)
    if (idx === 5 && peerEvalLocked) return;
    const path = PATHS[idx] || "";
    startTransition(() => {
      navigate(`/student/${path}`);
    });
    setDrawerOpen(false);
  }, [navigate, peerEvalLocked]);

  /* Fetch defense status for peer eval gating */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctxData = await apiFetch<any>("/me/context").catch(() => null);
        if (cancelled) return;

        // Defense status -> peer eval gating
        if (ctxData?.myGroup) {
          const groupNum = ctxData.myGroup.number || ctxData.myGroup.id;
          try {
            const gradesRes = await apiFetch<any>(`/grades/group/${groupNum}`);
            if (cancelled) return;
            const grades = gradesRes.grades || [];
            if (grades.length > 0) {
              const verdictCounts: Record<string, number> = {};
              grades.forEach((g: any) => { verdictCounts[g.verdict] = (verdictCounts[g.verdict] || 0) + 1; });
              const topVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
              const verdictMap: Record<string, string> = { "pass": "passed", "minor": "revisions", "major": "redemonstration", "redemonstration": "redemonstration", "passed": "passed" };
              const normalized = verdictMap[topVerdict] || topVerdict;
              setPeerEvalLocked(normalized !== "passed");
            } else {
              setPeerEvalLocked(true);
            }
          } catch {
            setPeerEvalLocked(true);
          }
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  const isCoordinatorMonitoring = user?.role === "coordinator";

  if (loading) return <AuthShellLoader label="Restoring your workspace..." />;
  if (!user || (user.role !== "student" && user.role !== "coordinator")) return <Navigate to="/login" replace />;
  if (needsProfileSetup) return <Navigate to="/setup" replace />;

  // Build drawer items — augment Peer Evaluation with lock icon when gated
  const drawerItems = ITEMS.map((item, i) => {
    if (i === 5 && peerEvalLocked) {
      return {
        ...item,
        label: "Peer Evaluation",
        icon: (
          <span className="relative">
            <Users size={18} />
            <Lock size={9} className="absolute -bottom-0.5 -right-1" style={{ color: "rgba(238,240,246,0.22)" }} />
          </span>
        ),
      };
    }
    return item;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-body)", background: "#07090F" }}>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold"
        style={{ background: "#4D8FFF", color: "#07090F" }}
      >
        Skip to main content
      </a>
      <NavBar
        userName={user.name}
        role="Student"
        avatarUrl={user.avatarUrl}
        onHamburger={() => setDrawerOpen(true)}
        breadcrumb={currentSeg ? breadcrumb : undefined}
        viewSwitcher={isCoordinatorMonitoring ? <CoordinatorViewSwitcher /> : undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <StudentSidebar
            activeIndex={activeIndex}
            onNavigate={onNavigate}
            onLogout={logout}
            gradesUnlocked={true}
            peerEvalLocked={peerEvalLocked}
            userName={user.name}
            avatarUrl={user.avatarUrl}
            badges={badges}
          />
        </div>
        <main
          id="main-content"
          className="flex-1 overflow-auto pb-20 md:pb-7"
          style={{ background: "#07090F" }}
          aria-label="Student main content"
        >
          <div className="px-4 py-4 sm:p-6 lg:p-8">
            <AnimatedOutlet context={{ onNavigate, user }} />
          </div>
        </main>
      </div>
      <BottomNavBar role="student" activeIndex={activeIndex} onNavigate={onNavigate} />
      <MobileDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        userName={user.name} role="Student" avatarUrl={user.avatarUrl}
        items={drawerItems} sections={SECTIONS}
        activeIndex={activeIndex} onNavigate={onNavigate} onLogout={logout}
        badges={badges}
      />
      {/* Screen reader live region for dynamic updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcements" />
      <Suspense fallback={null}>
        <OnboardingTour role="student" userId={user.id} />
      </Suspense>
    </div>
  );
}
