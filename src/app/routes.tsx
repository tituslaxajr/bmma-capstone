import { createBrowserRouter, Navigate, useOutletContext, useNavigate } from "react-router";
import { useAuth } from "./lib/AuthContext";
import React, { Suspense, startTransition } from "react";
import { DT } from "./components/cinematic-tokens";

/* ─── Layouts (kept eager — they wrap every page) ─── */
import { RootLayout } from "./components/layouts/RootLayout";
import { StudentLayout } from "./components/layouts/StudentLayout";
import { PanelistLayout } from "./components/layouts/PanelistLayout";
import { CoordinatorLayout } from "./components/layouts/CoordinatorLayout";

/* ─── Lazy-loaded page components ─── */
const LandingPage = React.lazy(() => import("./components/LandingPage").then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import("./components/LoginPage").then(m => ({ default: m.LoginPage })));
const ProfileSetupPage = React.lazy(() => import("./components/ProfileSetupPage").then(m => ({ default: m.ProfileSetupPage })));

const StudentDashboard = React.lazy(() => import("./components/StudentDashboard").then(m => ({ default: m.StudentDashboard })));
const ManuscriptSubmissionPage = React.lazy(() => import("./components/ManuscriptSubmissionPage").then(m => ({ default: m.ManuscriptSubmissionPage })));
const DefenseInfoPage = React.lazy(() => import("./components/DefenseInfoPage").then(m => ({ default: m.DefenseInfoPage })));
const DefenseResultsPage = React.lazy(() => import("./components/DefenseResultsPage").then(m => ({ default: m.DefenseResultsPage })));
const StudentArchivePage = React.lazy(() => import("./components/StudentArchivePage").then(m => ({ default: m.StudentArchivePage })));
const PeerEvaluationForm = React.lazy(() => import("./components/PeerEvaluationForm").then(m => ({ default: m.PeerEvaluationForm })));
const StudentProfileEditPage = React.lazy(() => import("./components/StudentProfileEditPage").then(m => ({ default: m.StudentProfileEditPage })));
const ManuscriptGuidePage = React.lazy(() => import("./components/ManuscriptGuidePage").then(m => ({ default: m.ManuscriptGuidePage })));

const PanelistDashboardPage = React.lazy(() => import("./components/PanelistDashboardPage").then(m => ({ default: m.PanelistDashboardPage })));
const PanelistManuscriptsPage = React.lazy(() => import("./components/PanelistManuscriptsPage").then(m => ({ default: m.PanelistManuscriptsPage })));
const PanelistManuscriptDetailPage = React.lazy(() => import("./components/PanelistManuscriptDetailPage").then(m => ({ default: m.PanelistManuscriptDetailPage })));
const PanelistDefenseSessionPage = React.lazy(() => import("./components/PanelistDefenseSessionPage").then(m => ({ default: m.PanelistDefenseSessionPage })));
const PanelistPostDefenseReviewPage = React.lazy(() => import("./components/PanelistPostDefenseReviewPage").then(m => ({ default: m.PanelistPostDefenseReviewPage })));
const PanelistSettingsPage = React.lazy(() => import("./components/PanelistSettingsPage").then(m => ({ default: m.PanelistSettingsPage })));
const PanelistGradeAggregatorPage = React.lazy(() => import("./components/PanelistGradeAggregatorPage").then(m => ({ default: m.PanelistGradeAggregatorPage })));
const AdviserGradingPage = React.lazy(() => import("./components/AdviserGradingPage").then(m => ({ default: m.AdviserGradingPage })));

const CoordinatorDashboard = React.lazy(() => import("./components/CoordinatorDashboard").then(m => ({ default: m.CoordinatorDashboard })));
const UserManagementPage = React.lazy(() => import("./components/UserManagementPage").then(m => ({ default: m.UserManagementPage })));
const GroupsTeamsPage = React.lazy(() => import("./components/GroupsTeamsPage").then(m => ({ default: m.GroupsTeamsPage })));
const PanelistAssignmentPage = React.lazy(() => import("./components/PanelistAssignmentPage").then(m => ({ default: m.PanelistAssignmentPage })));
const CoordinatorManuscriptReviewPage = React.lazy(() => import("./components/CoordinatorManuscriptReviewPage").then(m => ({ default: m.CoordinatorManuscriptReviewPage })));
const CoordinatorManuscriptDetailPage = React.lazy(() => import("./components/CoordinatorManuscriptDetailPage").then(m => ({ default: m.CoordinatorManuscriptDetailPage })));
const CoordinatorDefenseOverviewPage = React.lazy(() => import("./components/CoordinatorDefenseOverviewPage").then(m => ({ default: m.CoordinatorDefenseOverviewPage })));
const CoordinatorGradingPage = React.lazy(() => import("./components/CoordinatorGradingPage").then(m => ({ default: m.CoordinatorGradingPage })));
const CoordinatorArchivePage = React.lazy(() => import("./components/CoordinatorArchivePage").then(m => ({ default: m.CoordinatorArchivePage })));
const CoordinatorSettingsPage = React.lazy(() => import("./components/CoordinatorSettingsPage").then(m => ({ default: m.CoordinatorSettingsPage })));
const DataIntegrityDashboard = React.lazy(() => import("./components/DataIntegrityDashboard").then(m => ({ default: m.DataIntegrityDashboard })));

const NotFoundPage = React.lazy(() => import("./components/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

/* ─── Suspense fallback ─── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          aria-hidden="true"
          style={{
            borderColor: `${DT.borderSub}`,
            borderTopColor: DT.blue,
          }}
        />
        <span className="text-sm" style={{ color: DT.textSec }}>Loading...</span>
        <span className="sr-only">Loading page content, please wait.</span>
      </div>
    </div>
  );
}

/** Wrap a lazy component in Suspense */
function lazy(Component: React.ComponentType<any>) {
  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

/* ═══════════════════════════════════════════
   Outlet context helper — gets onNavigate
   from the role layout
   ═══════════════════════════════════════════ */
function useLayoutNav() {
  return useOutletContext<{ onNavigate: (idx: number) => void }>();
}

/* ─── Wrappers for pages that need onNavigate or onLogout ─── */
function PanelistDashboardWrapper() {
  const { onNavigate } = useLayoutNav();
  return (
    <Suspense fallback={<PageLoader />}>
      <PanelistDashboardPage onNavigate={onNavigate} />
    </Suspense>
  );
}

function StudentArchiveWrapper() {
  const { onNavigate } = useLayoutNav();
  return (
    <Suspense fallback={<PageLoader />}>
      <StudentArchivePage onNavigate={onNavigate} />
    </Suspense>
  );
}

function StudentSettingsWrapper() {
  const { logout } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <StudentProfileEditPage onLogout={logout} />
    </Suspense>
  );
}

function PanelistSettingsWrapper() {
  const { logout } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <PanelistSettingsPage onLogout={logout} />
    </Suspense>
  );
}

function CoordinatorSettingsWrapper() {
  const { logout } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <CoordinatorSettingsPage onLogout={logout} />
    </Suspense>
  );
}

/* ─── Public page wrappers ─── */
function LandingWrapper() {
  const { user, needsProfileSetup } = useAuth();
  const navigate = useNavigate();
  if (user) {
    if (needsProfileSetup) return <Navigate to="/setup" replace />;
    return <Navigate to={`/${user.role}`} replace />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage onEnterPortal={() => startTransition(() => navigate("/login"))} />
    </Suspense>
  );
}

function LoginWrapper() {
  const { user, needsProfileSetup, login } = useAuth();
  const navigate = useNavigate();
  if (user) {
    if (needsProfileSetup) return <Navigate to="/setup" replace />;
    return <Navigate to={`/${user.role}`} replace />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginPage onLogin={login} onBackToLanding={() => startTransition(() => navigate("/"))} />
    </Suspense>
  );
}

function SetupWrapper() {
  const { user, needsProfileSetup, completeProfileSetup } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!needsProfileSetup) return <Navigate to={`/${user.role}`} replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfileSetupPage
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
        onComplete={completeProfileSetup}
      />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════
   Router
   ═══════════════════════════════════════════ */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      /* Public */
      { index: true, Component: LandingWrapper },
      { path: "login", Component: LoginWrapper },
      { path: "setup", Component: SetupWrapper },

      /* Student */
      {
        path: "student",
        Component: StudentLayout,
        children: [
          { index: true, Component: lazy(StudentDashboard) },
          { path: "submissions", Component: lazy(ManuscriptSubmissionPage) },
          { path: "defense-info", Component: lazy(DefenseInfoPage) },
          { path: "results", Component: lazy(DefenseResultsPage) },
          { path: "archive", Component: StudentArchiveWrapper },
          { path: "peer-evaluation", Component: lazy(PeerEvaluationForm) },
          { path: "manuscript-guide", Component: lazy(ManuscriptGuidePage) },
          { path: "settings", Component: StudentSettingsWrapper },
        ],
      },

      /* Panelist */
      {
        path: "panelist",
        Component: PanelistLayout,
        children: [
          { index: true, Component: PanelistDashboardWrapper },
          { path: "pre-defense", Component: lazy(PanelistManuscriptsPage) },
          { path: "pre-defense/:groupNumber", Component: lazy(PanelistManuscriptDetailPage) },
          { path: "defense-session", Component: lazy(PanelistDefenseSessionPage) },
          { path: "post-defense", Component: lazy(PanelistPostDefenseReviewPage) },
          { path: "grade-aggregator", Component: lazy(PanelistGradeAggregatorPage) },
          { path: "settings", Component: PanelistSettingsWrapper },
        ],
      },

      /* Adviser (same layout & pages as Panelist) */
      {
        path: "adviser",
        Component: PanelistLayout,
        children: [
          { index: true, Component: PanelistDashboardWrapper },
          { path: "pre-defense", Component: lazy(PanelistManuscriptsPage) },
          { path: "pre-defense/:groupNumber", Component: lazy(PanelistManuscriptDetailPage) },
          { path: "defense-session", Component: lazy(PanelistDefenseSessionPage) },
          { path: "post-defense", Component: lazy(PanelistPostDefenseReviewPage) },
          { path: "grade-aggregator", Component: lazy(AdviserGradingPage) },
          { path: "settings", Component: PanelistSettingsWrapper },
        ],
      },

      /* Coordinator */
      {
        path: "coordinator",
        Component: CoordinatorLayout,
        children: [
          { index: true, Component: lazy(CoordinatorDashboard) },
          { path: "users", Component: lazy(UserManagementPage) },
          { path: "groups", Component: lazy(GroupsTeamsPage) },
          { path: "assignments", Component: lazy(PanelistAssignmentPage) },
          { path: "manuscripts", Component: lazy(CoordinatorManuscriptReviewPage) },
          { path: "manuscripts/:groupNumber", Component: lazy(CoordinatorManuscriptDetailPage) },
          { path: "defense", Component: lazy(CoordinatorDefenseOverviewPage) },
          { path: "grading", Component: lazy(CoordinatorGradingPage) },
          { path: "archive", Component: lazy(CoordinatorArchivePage) },
          { path: "settings", Component: CoordinatorSettingsWrapper },
          { path: "data-integrity", Component: lazy(DataIntegrityDashboard) },
        ],
      },

      /* Catch-all */
      { path: "*", Component: lazy(NotFoundPage) },
    ],
  },
]);
