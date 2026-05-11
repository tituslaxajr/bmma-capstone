import { useState, useEffect, useCallback, startTransition, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router";
import {
  FileText, Eye, Search, Loader2, Inbox, FolderOpen,
  CheckCircle2, Clock, AlertTriangle, MessageSquare, Package,
  Filter, BookOpen,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut, PageSpinner } from "./ui/shared-ui";
import { PageShell } from "./PageShell";

/* ═══ Helpers ═══ */

type OverallStatus = "Approved" | "Under Review" | "Needs Revision" | "Not Submitted";
const statusColors: Record<OverallStatus, { c: string; bg: string; b: string }> = {
  Approved: { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)" },
  "Under Review": { c: DT.warning, bg: DT.warningDim, b: "rgba(251,191,36,0.15)" },
  "Needs Revision": { c: DT.red, bg: DT.redDim, b: "rgba(248,113,113,0.15)" },
  "Not Submitted": { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
};
const statusIcons: Record<OverallStatus, ReactNode> = {
  Approved: <CheckCircle2 size={12} />, "Under Review": <Clock size={12} />,
  "Needs Revision": <AlertTriangle size={12} />, "Not Submitted": <FileText size={12} />,
};
function StatusBadge({ status }: { status: OverallStatus }) {
  const s = statusColors[status];
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{statusIcons[status]} {status}</span>;
}

interface GroupEntry {
  groupNumber: number;
  groupName: string;
  title: string;
  type: string;
  members: any[];
  preDefenseFiles: any[];
  projectOutput: any | null;
  comments: any[];
}

function computeOverallStatus(e: GroupEntry): OverallStatus {
  const files = e.preDefenseFiles || [];
  const hasOutput = !!e.projectOutput;
  if (files.length === 0 && !hasOutput) return "Not Submitted";
  const allApproved = files.length >= 3 && files.every((f: any) => f.reviewStatus === "Approved");
  if (allApproved) return "Approved";
  const hasRevision = files.some((f: any) => f.reviewStatus === "Needs Revision");
  if (hasRevision) return "Needs Revision";
  return "Under Review";
}

/* ═══ Main Export ═══ */
export function PanelistManuscriptsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdviserView = location.pathname.startsWith("/adviser");
  const basePath = isAdviserView ? "/adviser" : "/panelist";
  const [entries, setEntries] = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const ctx = await apiFetch<any>("/me/context");
      const scopedGroups: any[] = isAdviserView ? (ctx.advisedGroups || []) : (ctx.assignedGroups || []);
      if (scopedGroups.length === 0) { setEntries([]); setLoading(false); return; }

      const results = await Promise.all(
        scopedGroups.map(async (g: any) => {
          const gn = g.number ?? g.id;
          try {
            const { submission } = await apiFetch<{ submission: any }>(`/submissions/group/${gn}`);
            return {
              groupNumber: gn,
              groupName: g.name || `Group ${gn}`,
              title: g.title || "Untitled Project",
              type: g.type || "",
              members: g.members || [],
              preDefenseFiles: submission?.preDefenseFiles || [],
              projectOutput: submission?.projectOutput || null,
              comments: submission?.comments || [],
            } as GroupEntry;
          } catch {
            return { groupNumber: gn, groupName: g.name || `Group ${gn}`, title: g.title || "Untitled", type: "", members: [], preDefenseFiles: [], projectOutput: null, comments: [] } as GroupEntry;
          }
        })
      );
      results.sort((a, b) => a.groupNumber - b.groupNumber);
      setEntries(results);
    } catch (err) { console.error("Failed to fetch panelist manuscript data:", err); }
    finally { setLoading(false); }
  }, [isAdviserView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive status per entry
  const enriched = entries.map(e => ({ ...e, overallStatus: computeOverallStatus(e) }));

  let filtered = [...enriched];
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.groupName.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || `group ${e.groupNumber}`.includes(q));
  }
  if (statusFilter) filtered = filtered.filter(e => e.overallStatus === statusFilter);

  const approved = enriched.filter(e => e.overallStatus === "Approved").length;
  const underReview = enriched.filter(e => e.overallStatus === "Under Review").length;
  const needsRevision = enriched.filter(e => e.overallStatus === "Needs Revision").length;
  const notSubmitted = enriched.filter(e => e.overallStatus === "Not Submitted").length;

  if (loading) {
    return <PageSpinner label="Loading submissions..." />;
  }

  if (entries.length === 0) {
    return (
      <PageShell className="max-w-[1280px] mx-auto space-y-5">
        <Fade delay={0}>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Pre-Defense Files & Output</h1>
          <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
            Review pre-defense file submissions and project outputs from your {isAdviserView ? "advised" : "assigned"} groups.
          </p>
        </Fade>
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <Inbox size={40} style={{ color: DT.textDis, marginBottom: 12 }} />
          <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>
            {isAdviserView ? "No advised groups" : "No assigned groups"}
          </h3>
          <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>
            {isAdviserView ? "You have no advised groups yet. Contact the coordinator." : "You have no groups assigned to you yet. Contact the coordinator."}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <Fade delay={0}>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Pre-Defense Files & Output</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
          Review pre-defense file submissions and project outputs from your {isAdviserView ? "advised" : "assigned"} groups.
        </p>
      </Fade>

      {/* Summary Cards */}
      <Fade delay={60}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Approved", count: approved, icon: <CheckCircle2 size={18} />, accent: DT.success },
            { label: "Under Review", count: underReview, icon: <Clock size={18} />, accent: DT.warning },
            { label: "Needs Revision", count: needsRevision, icon: <AlertTriangle size={18} />, accent: DT.red },
            { label: "Not Submitted", count: notSubmitted, icon: <FileText size={18} />, accent: DT.textTer },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: withAlpha(s.accent, 0.08), color: s.accent }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: FT.h, color: DT.textPri }}>{s.count}</p>
                <p style={{ fontSize: 11, color: DT.textTer }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Fade>

      {/* Filter Bar */}
      <Fade delay={120}>
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DT.textTer }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups or project titles..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg transition" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} style={{ color: DT.textTer }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg cursor-pointer transition" style={inputStyle as any}>
              <option value="">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Under Review">Under Review</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Not Submitted">Not Submitted</option>
            </select>
          </div>
        </div>
      </Fade>

      {/* Group Cards */}
      <Fade delay={180}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const filesCount = e.preDefenseFiles.length;
            const hasOutput = !!e.projectOutput;
            return (
              <button key={e.groupNumber}
                onClick={() => startTransition(() => navigate(`${basePath}/pre-defense/${e.groupNumber}`))}
                className="w-full text-left rounded-[20px] p-5 transition cursor-pointer group"
                style={{
                  background: cardBg,
                  border: `1px solid ${DT.borderSub}`,
                  boxShadow: DT.shadowSm,
                }}>
                {/* Top row: avatar + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: DT.yellow, fontSize: 12, fontWeight: 700, color: DT.base }}>
                    G{e.groupNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{e.groupName}</span>
                    </div>
                    <StatusBadge status={e.overallStatus} />
                  </div>
                </div>

                {/* Title */}
                <p className="line-clamp-2 mb-2" style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.5 }}>{e.title}</p>
                {e.type && <span className="inline-block mb-2 px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 600, color: DT.blue, background: DT.blueDim }}>{e.type}</span>}

                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-3" style={{ fontSize: 11, color: DT.textTer }}>
                  <span className="inline-flex items-center gap-1" style={{ color: filesCount >= 3 ? DT.success : filesCount > 0 ? DT.warning : DT.textDis }}>
                    <FolderOpen size={11} /> {filesCount}/3 files
                  </span>
                  {hasOutput && (
                    <span className="inline-flex items-center gap-1" style={{ color: DT.success }}>
                      <Package size={11} /> Output
                    </span>
                  )}
                </div>

                {/* Members */}
                {e.members.length > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    {e.members.slice(0, 4).map((m: any, mi: number) => {
                      const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={m.email || mi} className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                          style={{ background: m.avatarUrl ? "transparent" : DT.blue, border: `2px solid ${DT.base}`, marginLeft: mi > 0 ? -4 : 0, zIndex: e.members.length - mi }}>
                          {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <span style={{ fontSize: 7, fontWeight: 700, color: "white" }}>{init}</span>}
                        </div>
                      );
                    })}
                    {e.members.length > 4 && <span style={{ fontSize: 10, color: DT.textDis, marginLeft: 2 }}>+{e.members.length - 4}</span>}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                  <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: DT.textTer }}><MessageSquare size={11} /> {e.comments.length} comments</span>
                  <span className="inline-flex items-center gap-1 transition group-hover:translate-x-0.5" style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>
                    <Eye size={13} /> Review
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 rounded-xl" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
            <p style={{ fontSize: 14, color: DT.textTer }}>No groups match your filters.</p>
          </div>
        )}
      </Fade>
    </PageShell>
  );
}
