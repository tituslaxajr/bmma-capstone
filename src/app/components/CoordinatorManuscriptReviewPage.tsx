import { useState, useEffect, useCallback, startTransition, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Search, FileText, Eye, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Filter, MessageSquare, Loader2,
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

function computeOverallStatus(sub: any): OverallStatus {
  const hasLink = !!sub.manuscriptLink;
  const files = sub.preDefenseFiles || [];
  const hasOutput = !!sub.projectOutput;
  if (!hasLink && files.length === 0 && !hasOutput) return "Not Submitted";
  const allApproved = files.length >= 3 && files.every((f: any) => f.reviewStatus === "Approved");
  if (allApproved) return "Approved";
  const hasRevision = files.some((f: any) => f.reviewStatus === "Needs Revision");
  if (hasRevision) return "Needs Revision";
  return "Under Review";
}

/* ═══ Main Export ═══ */
export function CoordinatorManuscriptReviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/submissions/all");
      setData(res.data || []);
    } catch (err) { console.error("Failed to fetch submissions:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build enriched list
  const entries = data.map(d => {
    const gn = d.group.number || d.group.id;
    const sub = d.submission;
    const overallStatus = computeOverallStatus(sub);
    const filesCount = (sub.preDefenseFiles || []).length;
    const commentsCount = (sub.comments || []).length;
    return { ...d, gn, overallStatus, filesCount, commentsCount };
  });

  let filtered = [...entries];
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.group.name?.toLowerCase().includes(q) || e.group.title?.toLowerCase().includes(q) || `group ${e.gn}`.includes(q));
  }
  if (statusFilter) filtered = filtered.filter(e => e.overallStatus === statusFilter);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const approved = entries.filter(e => e.overallStatus === "Approved").length;
  const underReview = entries.filter(e => e.overallStatus === "Under Review").length;
  const needsRevision = entries.filter(e => e.overallStatus === "Needs Revision").length;
  const notSubmitted = entries.filter(e => e.overallStatus === "Not Submitted").length;

  if (loading) {
    return <PageSpinner label="Loading submissions..." />;
  }

  return (
    <PageShell>
      <Fade delay={0}>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Manuscript Review</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Review working manuscripts, pre-defense files, and project outputs across all groups</p>
      </Fade>

      {/* Summary */}
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

      {/* Filter */}
      <Fade delay={120}>
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DT.textTer }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search groups or project titles..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg transition" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} style={{ color: DT.textTer }} />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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

      {/* Table */}
      <Fade delay={180}>
        <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["GROUP", "MANUSCRIPT", "FILES", "OUTPUT", "STATUS", "\uD83D\uDCAC", "ACTIONS"].map((h) => (
                    <th key={h} className={`${["MANUSCRIPT", "FILES", "OUTPUT", "STATUS", "\uD83D\uDCAC"].includes(h) ? "text-center" : h === "ACTIONS" ? "text-right" : "text-left"} px-5 py-3`}
                      style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((e) => (
                  <tr key={e.gn} className="transition hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => startTransition(() => navigate(`/coordinator/manuscripts/${e.gn}`))}
                    style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                    <td className="px-5 py-3">
                      <div style={{ fontWeight: 600, color: DT.textPri }}>Group {e.gn}: {e.group.name}</div>
                      <div className="truncate max-w-[200px]" style={{ fontSize: 11, color: DT.textTer }}>{e.group.title}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.submission.manuscriptLink ? <CheckCircle2 size={14} style={{ color: DT.success }} /> : <FileText size={14} style={{ color: DT.textDis }} />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span style={{ fontSize: 12, fontWeight: 600, color: e.filesCount >= 3 ? DT.success : e.filesCount > 0 ? DT.warning : DT.textDis }}>
                        {e.filesCount}/3
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.submission.projectOutput ? <CheckCircle2 size={14} style={{ color: DT.success }} /> : <span style={{ fontSize: 12, color: DT.textDis }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={e.overallStatus} /></td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: DT.textTer }}>
                        <MessageSquare size={12} /> {e.commentsCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={(ev) => { ev.stopPropagation(); startTransition(() => navigate(`/coordinator/manuscripts/${e.gn}`)); }}
                        className="inline-flex items-center gap-1 cursor-pointer transition hover:opacity-80" style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12" style={{ fontSize: 14, color: DT.textTer }}>No submissions match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            <span style={{ fontSize: 12, color: DT.textTer }}>Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg transition cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 600, background: p === page ? DT.blue : "transparent", color: p === page ? "white" : DT.textTer }}>{p}</button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </Fade>
    </PageShell>
  );
}