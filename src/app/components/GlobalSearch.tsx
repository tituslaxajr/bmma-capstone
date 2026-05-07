import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { useNavigate } from "react-router";
import {
  Search, FileText, Users, FolderKanban, LayoutDashboard,
  CornerDownLeft, ClipboardList, Clock, Calendar, BarChart3,
  Archive, Settings, ShieldCheck, CheckSquare,
  Link2, NotebookPen, Award, Loader2, Trophy,
  BookOpen, Database,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { apiFetch } from "../lib/supabase";

/* ─── Cinematic Dark Tokens ─── */
function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
}
const DS = {
  base: "#07090F",
  raised: "#161B2E",
  elevated: "#1B2236",
  borderSub: "rgba(255,255,255,0.06)",
  borderHair: "rgba(255,255,255,0.04)",
  textPri: "#EEF0F6",
  textSec: "rgba(238,240,246,0.65)",
  textTer: "rgba(238,240,246,0.38)",
  textDis: "rgba(238,240,246,0.22)",
  blue: "#4D8FFF",
  blueDim: "rgba(77,143,255,0.10)",
};

/* ─── Page definitions per role ─── */
interface PageDef { icon: React.ReactNode; name: string; context: string; path: string }

const STUDENT_PAGES: PageDef[] = [
  { icon: <LayoutDashboard size={16} />, name: "Dashboard", context: "Overview", path: "/student" },
  { icon: <ClipboardList size={16} />, name: "My Checklist", context: "Tasks & requirements", path: "/student/checklist" },
  { icon: <Clock size={16} />, name: "Timeline", context: "Project timeline", path: "/student/timeline" },
  { icon: <FileText size={16} />, name: "Submissions", context: "Manuscript uploads", path: "/student/submissions" },
  { icon: <NotebookPen size={16} />, name: "Progress Reports", context: "Weekly reports", path: "/student/progress-reports" },
  { icon: <Calendar size={16} />, name: "Defense Info", context: "Schedule & details", path: "/student/defense-info" },
  { icon: <BarChart3 size={16} />, name: "My Results", context: "Grades & feedback", path: "/student/results" },
  { icon: <Archive size={16} />, name: "Archive", context: "Past submissions", path: "/student/archive" },
  { icon: <Users size={16} />, name: "Peer Evaluation", context: "Evaluate teammates", path: "/student/peer-evaluation" },
  { icon: <BookOpen size={16} />, name: "Manuscript Guide", context: "STI chapter framework & best practices", path: "/student/manuscript-guide" },
  { icon: <Settings size={16} />, name: "Settings", context: "Profile settings", path: "/student/settings" },
];

const PANELIST_PAGES: PageDef[] = [
  { icon: <LayoutDashboard size={16} />, name: "Dashboard", context: "Overview", path: "/panelist" },
  { icon: <FileText size={16} />, name: "Pre-Defense Files", context: "Manuscripts to review", path: "/panelist/pre-defense" },
  { icon: <ShieldCheck size={16} />, name: "Defense Session", context: "Live grading", path: "/panelist/defense-session" },
  { icon: <CheckSquare size={16} />, name: "Post-Defense Review", context: "Revision reviews", path: "/panelist/post-defense" },
  { icon: <Settings size={16} />, name: "Settings", context: "Profile & preferences", path: "/panelist/settings" },
];

const COORDINATOR_PAGES: PageDef[] = [
  { icon: <LayoutDashboard size={16} />, name: "Overview", context: "Dashboard", path: "/coordinator" },
  { icon: <Users size={16} />, name: "User Accounts", context: "Manage users", path: "/coordinator/users" },
  { icon: <FolderKanban size={16} />, name: "Groups & Teams", context: "Manage groups", path: "/coordinator/groups" },
  { icon: <Link2 size={16} />, name: "Assignments", context: "Panelist assignments", path: "/coordinator/assignments" },
  { icon: <FileText size={16} />, name: "Manuscript Review", context: "Review submissions", path: "/coordinator/manuscripts" },
  { icon: <NotebookPen size={16} />, name: "Progress Reports", context: "Student reports", path: "/coordinator/progress-reports" },
  { icon: <ShieldCheck size={16} />, name: "Defense Overview", context: "Schedule & manage", path: "/coordinator/defense" },
  { icon: <Award size={16} />, name: "Grading", context: "View & manage grades", path: "/coordinator/grading" },
  { icon: <Trophy size={16} />, name: "Deadline Review & Milestones", context: "Confirm deadlines, track milestones", path: "/coordinator/milestone-review" },
  { icon: <Archive size={16} />, name: "Archive & Records", context: "Past records", path: "/coordinator/archive" },
  { icon: <Database size={16} />, name: "Data Integrity", context: "System data integrity dashboard", path: "/coordinator/data-integrity" },
  { icon: <Settings size={16} />, name: "Settings", context: "System settings", path: "/coordinator/settings" },
];

/* ─── Component ─── */
interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [backendResults, setBackendResults] = useState<{ groups: any[]; users: any[] }>({ groups: [], users: [] });
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const pages = user?.role === "coordinator" ? COORDINATOR_PAGES
    : (user?.role === "panelist" || user?.role === "adviser") ? PANELIST_PAGES.map(p => ({
        ...p,
        path: user?.role === "adviser" ? p.path.replace(/^\/panelist/, "/adviser") : p.path,
      }))
    : STUDENT_PAGES;

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(-1);
      setBackendResults({ groups: [], users: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ESC to close */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Debounced backend search */
  const searchBackend = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setBackendResults({ groups: [], users: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ groups: any[]; users: any[] }>(`/search?q=${encodeURIComponent(q)}`);
        setBackendResults(data);
      } catch {
        setBackendResults({ groups: [], users: [] });
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setActiveIdx(-1);
    searchBackend(val);
  };

  const handleSelect = (path: string) => {
    onClose();
    startTransition(() => navigate(path));
  };

  if (!open) return null;

  /* Filter pages client-side */
  const hasQuery = query.trim().length > 0;
  const q = query.toLowerCase();
  const matchedPages = hasQuery
    ? pages.filter(p => p.name.toLowerCase().includes(q) || p.context.toLowerCase().includes(q))
    : [];

  /* Build flat item list for keyboard nav */
  type ResultItem = { type: "page" | "group" | "user"; label: string; sub: string; icon: React.ReactNode; path: string };
  const allItems: ResultItem[] = [];

  matchedPages.forEach(p => allItems.push({
    type: "page", label: p.name, sub: p.context, icon: p.icon, path: p.path,
  }));
  backendResults.groups.forEach(g => allItems.push({
    type: "group", label: g.name || g.title, sub: `${g.type || "Group"} · ${g.status || ""}`, icon: <FolderKanban size={16} />,
    path: user?.role === "coordinator" ? "/coordinator/groups" : "/student",
  }));
  backendResults.users.forEach(u => allItems.push({
    type: "user", label: u.name, sub: `${u.role || ""} · ${u.email || ""}`, icon: <Users size={16} />,
    path: user?.role === "coordinator" ? "/coordinator/users" : `/${user?.role || "student"}`,
  }));

  /* Keyboard nav */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0 && allItems[activeIdx]) {
      e.preventDefault();
      handleSelect(allItems[activeIdx].path);
    }
  };

  /* Section grouping */
  const pageSection = allItems.filter(i => i.type === "page");
  const groupSection = allItems.filter(i => i.type === "group");
  const userSection = allItems.filter(i => i.type === "user");

  let flatIdx = -1;

  const renderItem = (item: ResultItem, animDelay: number) => {
    flatIdx++;
    const idx = flatIdx;
    const isActive = idx === activeIdx;
    return (
      <button
        key={`${item.type}-${item.label}-${idx}`}
        onClick={() => handleSelect(item.path)}
        onMouseEnter={() => setActiveIdx(idx)}
        className="w-full flex items-center gap-3 px-5 py-2.5 transition cursor-pointer group"
        style={{
          background: isActive ? DS.blueDim : "transparent",
          animation: `searchResultIn 150ms ease-out ${animDelay}ms both`,
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition"
          style={{ background: isActive ? withAlpha(DS.blue, 0.12) : withAlpha(DS.blue, 0.05), color: isActive ? DS.blue : DS.textSec }}>
          {item.icon}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 600, color: DS.textPri }}>
            {item.label}
          </div>
          <div className="truncate" style={{ fontSize: "12px", color: DS.textTer }}>{item.sub}</div>
        </div>
        <CornerDownLeft size={14} className="shrink-0 transition" style={{ color: isActive ? DS.blue : DS.textDis }} />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" style={{ fontFamily: "var(--font-body)" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)", animation: "searchFadeIn 150ms ease" }} onClick={onClose} />
      <style>{`
        @keyframes searchFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes searchModalIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes searchResultIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Modal */}
      <div
        className="relative rounded-2xl w-full max-w-[600px] mx-4 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${DS.raised} 0%, ${DS.base} 100%)`,
          border: `1px solid ${DS.borderSub}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          animation: "searchModalIn 200ms ease-out",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5" style={{ height: "56px", borderBottom: `1px solid ${DS.borderHair}` }}>
          <Search size={20} className="shrink-0" style={{ color: DS.blue }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search pages, groups, users..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "16px", color: DS.textPri, caretColor: DS.blue }}
          />
          {searching && <Loader2 size={16} className="animate-spin" style={{ color: DS.blue }} />}
          <kbd className="hidden sm:flex items-center px-2 py-0.5 rounded-md" style={{ fontSize: "11px", background: DS.blueDim, color: DS.textTer, border: `1px solid ${DS.borderSub}` }}>
            ESC
          </kbd>
        </div>

        {/* Quick Links (no query) */}
        {!hasQuery && (
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${DS.borderHair}` }}>
            <div className="mb-2" style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: DS.textDis }}>
              Quick Links
            </div>
            <div className="flex flex-wrap gap-2">
              {pages.slice(0, 5).map(p => (
                <button
                  key={p.path}
                  onClick={() => handleSelect(p.path)}
                  className="px-3 py-1.5 rounded-full transition cursor-pointer hover:opacity-80"
                  style={{ fontSize: "12px", fontWeight: 500, background: DS.blueDim, color: DS.textSec, border: `1px solid ${DS.borderSub}` }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasQuery && (
          <div className="max-h-[380px] overflow-y-auto py-2">
            {allItems.length === 0 && !searching ? (
              <div className="py-8 text-center">
                <p style={{ fontSize: "14px", color: DS.textTer }}>No results for "{query}"</p>
              </div>
            ) : (
              <>
                {pageSection.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1">
                      <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: DS.textDis }}>Pages</span>
                    </div>
                    {pageSection.map((item, i) => renderItem(item, i * 40))}
                  </div>
                )}
                {groupSection.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1">
                      <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: DS.textDis }}>Groups</span>
                    </div>
                    {groupSection.map((item, i) => renderItem(item, (pageSection.length + i) * 40))}
                  </div>
                )}
                {userSection.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1">
                      <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: DS.textDis }}>Users</span>
                    </div>
                    {userSection.map((item, i) => renderItem(item, (pageSection.length + groupSection.length + i) * 40))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: `1px solid ${DS.borderHair}`, background: withAlpha(DS.raised, 0.5) }}>
          <span style={{ fontSize: "11px", color: DS.textDis }}>
            <kbd className="px-1 py-0.5 rounded mr-1" style={{ fontSize: "10px", background: DS.blueDim, border: `1px solid ${DS.borderSub}` }}>↑↓</kbd>
            Navigate
            <kbd className="px-1 py-0.5 rounded mx-1" style={{ fontSize: "10px", background: DS.blueDim, border: `1px solid ${DS.borderSub}` }}>↵</kbd>
            Select
          </span>
          <span style={{ fontSize: "11px", color: DS.textDis }}>
            <kbd className="px-1 py-0.5 rounded mr-1" style={{ fontSize: "10px", background: DS.blueDim, border: `1px solid ${DS.borderSub}` }}>ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}