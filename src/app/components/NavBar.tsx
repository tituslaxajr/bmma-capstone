import { Menu, Bell, Search, ChevronDown } from "lucide-react";
import { useState, useCallback, useEffect, lazy, Suspense, type ReactNode } from "react";
import { useNotificationCount } from "./notification-store";

const NotificationCenter = lazy(() => import("./NotificationCenter").then((m) => ({ default: m.NotificationCenter })));
const GlobalSearch = lazy(() => import("./GlobalSearch").then((m) => ({ default: m.GlobalSearch })));

/* ─── Role Chip Colors ─── */
const ROLE_CHIP: Record<string, { bg: string; text: string }> = {
  Student: { bg: "bg-[#4D8FFF]/10", text: "text-[#4D8FFF]" },
  Panelist: { bg: "bg-[#A78BFA]/10", text: "text-[#A78BFA]" },
  Adviser: { bg: "bg-[#4ADE80]/10", text: "text-[#4ADE80]" },
  Coordinator: { bg: "bg-[#F87171]/10", text: "text-[#F87171]" },
};

const ROLE_AVATAR: Record<string, string> = {
  Student: "#4D8FFF",
  Panelist: "#A78BFA",
  Adviser: "#4ADE80",
  Coordinator: "#F87171",
};

const ROLE_ROOT_LABEL: Record<string, string> = {
  Student: "Dashboard",
  Panelist: "Dashboard",
  Adviser: "Dashboard",
  Coordinator: "Overview",
};

interface NavBarProps {
  userName?: string;
  role?: string;
  avatarUrl?: string;
  breadcrumb?: string;
  onHamburger?: () => void;
  viewSwitcher?: ReactNode;
}

export function NavBar({ userName = "Maria Santos", role = "Student", avatarUrl, breadcrumb, onHamburger, viewSwitcher }: NavBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifCount = useNotificationCount();
  const chip = ROLE_CHIP[role ?? "Student"] ?? ROLE_CHIP.Student;
  const avatarColor = ROLE_AVATAR[role ?? "Student"] ?? "#4D8FFF";
  const rootLabel = ROLE_ROOT_LABEL[role ?? "Student"] ?? "Dashboard";
  const closeNotif = useCallback(() => setNotifOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  /* ── Ctrl+K to open search ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <nav
        className="px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 shrink-0 z-30 relative"
        style={{
          height: "64px",
          fontFamily: "var(--font-body)",
          background: "#07090F",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Left: Hamburger (mobile) + Wordmark ── */}
        <div className="flex items-center gap-2 shrink min-w-0">
          <button
            className="md:hidden w-9 h-9 rounded-[10px] flex items-center justify-center transition cursor-pointer"
            style={{ color: "rgba(238,240,246,0.55)" }}
            onClick={onHamburger}
          >
            <Menu size={20} />
          </button>

          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(77,143,255,0.15), rgba(255,209,0,0.10))", border: "1px solid rgba(255,255,255,0.11)" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 800, color: "#FFD100" }}>C</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, lineHeight: 1.15, color: "#EEF0F6" }}>
              Hue We Are
            </span>
            <span className="hidden sm:block" style={{ fontSize: "11px", lineHeight: 1, color: "rgba(238,240,246,0.35)" }}>BMMA · STI SF</span>
          </div>
        </div>

        {/* ── Center: Breadcrumb ── */}
        {breadcrumb && (
          <div className="hidden lg:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
            <span style={{ fontSize: "13px", color: "rgba(238,240,246,0.38)" }}>{rootLabel}</span>
            <span style={{ fontSize: "12px", color: "rgba(238,240,246,0.22)" }}>/</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "#EEF0F6" }}>{breadcrumb}</span>
          </div>
        )}

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="hidden sm:block">
            {viewSwitcher}
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)]"
            style={{ color: "rgba(238,240,246,0.38)" }}
            title="Search (Ctrl+K)"
            aria-label="Search (Ctrl+K)"
          >
            <Search size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)]"
              style={{ color: "rgba(238,240,246,0.38)" }}
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-white"
                  style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1, background: "#4D8FFF" }}
                >
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>
            {notifOpen ? (
              <Suspense fallback={null}>
                <NotificationCenter open={notifOpen} onClose={closeNotif} />
              </Suspense>
            ) : null}
          </div>

          <div className="hidden sm:block w-px h-9 mx-0.5" style={{ background: "rgba(255,255,255,0.06)" }} />

          <button className="flex items-center gap-2 px-1.5 sm:px-2.5 py-2 rounded-xl transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)] max-w-[132px] sm:max-w-none">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ background: avatarColor }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: "#07090F" }}>
                  {userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>
            <div className="hidden md:flex min-w-0 flex-col items-start">
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, lineHeight: 1.2, color: "#EEF0F6" }}>{userName}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${chip.bg} ${chip.text}`} style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1 }}>
                {role}
              </span>
            </div>
            <ChevronDown size={14} className="hidden md:block" style={{ color: "rgba(238,240,246,0.38)" }} />
          </button>
        </div>
      </nav>

      {searchOpen ? (
        <Suspense fallback={null}>
          <GlobalSearch open={searchOpen} onClose={closeSearch} />
        </Suspense>
      ) : null}
    </>
  );
}
