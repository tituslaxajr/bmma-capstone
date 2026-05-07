import { startTransition, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BookOpen, ChevronDown, GraduationCap, Settings, ShieldCheck } from "lucide-react";

type ViewRole = "coordinator" | "student" | "panelist" | "adviser";

const VIEWS = [
  { role: "coordinator", label: "Coordinator", path: "/coordinator", icon: Settings, color: "#F87171" },
  { role: "student", label: "Student", path: "/student", icon: GraduationCap, color: "#4D8FFF" },
  { role: "panelist", label: "Panelist", path: "/panelist", icon: ShieldCheck, color: "#A78BFA" },
  { role: "adviser", label: "Adviser", path: "/adviser", icon: BookOpen, color: "#4ADE80" },
] as const;

function getCurrentView(pathname: string, views: readonly typeof VIEWS[number][]) {
  return views.find((view) => pathname.startsWith(view.path)) || views[0] || VIEWS[0];
}

export function CoordinatorViewSwitcher({ allowedRoles }: { allowedRoles?: ViewRole[] }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const views = allowedRoles?.length ? VIEWS.filter((view) => allowedRoles.includes(view.role)) : VIEWS;
  const current = getCurrentView(location.pathname, views);
  const CurrentIcon = current.icon;

  const switchView = (path: string) => {
    setOpen(false);
    startTransition(() => navigate(path));
  };

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-10 flex items-center gap-2 px-3 rounded-xl transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)]"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#EEF0F6" }}
        title="Switch portal view"
      >
        <CurrentIcon size={15} style={{ color: current.color }} />
        <span className="hidden lg:inline" style={{ fontSize: 12, fontWeight: 700 }}>
          View: {current.label}
        </span>
        <ChevronDown size={13} style={{ color: "rgba(238,240,246,0.38)" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden py-1 z-50"
          style={{ background: "#111620", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}
        >
          {views.map((view) => {
            const Icon = view.icon;
            const active = view.role === current.role;
            return (
              <button
                key={view.role}
                type="button"
                onClick={() => switchView(view.path)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)]"
                style={{ color: active ? "#EEF0F6" : "rgba(238,240,246,0.68)", background: active ? "rgba(255,255,255,0.04)" : "transparent" }}
              >
                <Icon size={15} style={{ color: view.color }} />
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{view.label} View</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
