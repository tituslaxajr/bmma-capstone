import {
  LayoutDashboard, FileText, Calendar, User,
  CheckSquare, ShieldCheck, Settings, BarChart3, Users, Megaphone,
} from "lucide-react";
import { DT, withAlpha } from "./cinematic-tokens";

const STUDENT_TABS = [
  { icon: <LayoutDashboard size={20} />, label: "Home", pageIndex: 0 },
  { icon: <FileText size={20} />, label: "Submissions", pageIndex: 1 },
  { icon: <Calendar size={20} />, label: "Defense", pageIndex: 2 },
  { icon: <Megaphone size={20} />, label: "Archive", pageIndex: 4 },
  { icon: <User size={20} />, label: "Settings", pageIndex: 7 },
];

const PANELIST_TABS = [
  { icon: <LayoutDashboard size={20} />, label: "Home", pageIndex: 0 },
  { icon: <ShieldCheck size={20} />, label: "Defense", pageIndex: 2 },
  { icon: <CheckSquare size={20} />, label: "Review", pageIndex: 3 },
  { icon: <BarChart3 size={20} />, label: "Grades", pageIndex: 4 },
  { icon: <Settings size={20} />, label: "Settings", pageIndex: 5 },
];

const COORDINATOR_TABS = [
  { icon: <LayoutDashboard size={20} />, label: "Home", pageIndex: 0 },
  { icon: <Users size={20} />, label: "Users", pageIndex: 1 },
  { icon: <FileText size={20} />, label: "Manuscripts", pageIndex: 4 },
  { icon: <ShieldCheck size={20} />, label: "Defense", pageIndex: 5 },
  { icon: <Settings size={20} />, label: "Settings", pageIndex: 8 },
];

const ACCENT: Record<string, string> = {
  student: DT.blue,
  panelist: DT.purple,
  adviser: DT.success,
  coordinator: DT.red,
};

interface BottomNavBarProps {
  role: "student" | "panelist" | "adviser" | "coordinator";
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export function BottomNavBar({ role, activeIndex, onNavigate }: BottomNavBarProps) {
  const tabs = role === "student" ? STUDENT_TABS : role === "coordinator" ? COORDINATOR_TABS : PANELIST_TABS;
  const accent = ACCENT[role] || DT.blue;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
      aria-label="Main navigation"
      style={{
        height: "56px",
        fontFamily: "var(--font-body)",
        background: DT.deep,
        borderTop: `1px solid ${DT.glassBorder}`,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.30)",
        backdropFilter: "blur(16px)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.pageIndex === activeIndex;
        return (
          <button
            key={tab.label}
            onClick={() => { if (tab.pageIndex >= 0) onNavigate(tab.pageIndex); }}
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.label}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition cursor-pointer relative"
            style={{ minHeight: "44px" }}
          >
            {isActive && (
              <div className="absolute top-1 w-1 h-1 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${withAlpha(accent, 0.4)}` }} aria-hidden="true" />
            )}
            <span className="mt-1" aria-hidden="true" style={{ color: isActive ? accent : DT.textDis }}>{tab.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: isActive ? 600 : 400, color: isActive ? accent : DT.textDis }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}