import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  CheckCircle2, Clock, AlertTriangle, Loader2, Inbox, Send,
  ChevronDown, ChevronUp, FileText, ExternalLink, MessageSquare,
  ThumbsUp, RotateCcw, Eye, Package, ClipboardCheck, XCircle,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { cardBg } from "./ui/shared-ui";

const KF = `@keyframes pdrFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const cardStyle: CSSProperties = { background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, borderRadius: 16 };

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type RevisionStatus = "Submitted" | "Approved" | "Needs Revision" | "Pending";
const statusConfig: Record<RevisionStatus, { color: string; bg: string; icon: ReactNode; label: string }> = {
  Submitted: { color: DT.warning, bg: DT.warningDim, icon: <Clock size={12} />, label: "Submitted — Awaiting Review" },
  Approved: { color: DT.success, bg: DT.successDim, icon: <CheckCircle2 size={12} />, label: "Approved" },
  "Needs Revision": { color: DT.red, bg: DT.redDim, icon: <AlertTriangle size={12} />, label: "Needs More Work" },
  Pending: { color: DT.textDis, bg: "rgba(255,255,255,0.04)", icon: <Clock size={12} />, label: "No Revisions Submitted" },
};

/* ═══ Group Card for Post-Defense ═══ */
function GroupReviewCard({ group, grade, onApprove, onRequestChanges, isProcessing }: {
  group: any; grade: any; onApprove: (groupId: number, note: string) => void;
  onRequestChanges: (groupId: number, note: string) => void; isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const revStatus: RevisionStatus = group.revisionStatus || "Pending";
  const sc = statusConfig[revStatus] || statusConfig.Pending;

  const members = group.members || [];
  const revisionChecklist: any[] = group.revisionChecklist || [];
  const requiredRevisions: any[] = grade?.revisions || [];
  const verdict = grade?.verdict || "pending";
  const verdictLabel = verdict === "pass" ? "PASS" : verdict === "minor" ? "MINOR REVISION" : verdict === "major" || verdict === "redemonstration" ? "MAJOR REVISION / RE-DEMONSTRATION" : verdict === "failed" ? "FAILED" : "PENDING";
  const verdictColor = verdict === "pass" ? DT.success : verdict === "minor" ? DT.blue : verdict === "major" ? DT.warning : verdict === "failed" ? DT.error : DT.textDis;

  const needsReview = revStatus === "Submitted";
  const alreadyApproved = revStatus === "Approved";

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      {/* Header — always visible */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 cursor-pointer transition hover:bg-white/[0.02]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${verdictColor}, ${verdictColor}80)` }}>
            <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: "white" }}>{group.number || group.id}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{group.name || `Group ${group.number}`}</span>
              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: verdictColor, background: withAlpha(verdictColor, 0.07), border: `1px solid ${withAlpha(verdictColor, 0.12)}` }}>
                {verdictLabel}
              </span>
            </div>
            {group.title && <p className="mt-0.5 line-clamp-1" style={{ fontSize: 13, color: DT.textTer }}>{group.title}</p>}

            {/* Member row */}
            <div className="flex items-center gap-1.5 mt-2">
              {members.slice(0, 5).map((m: any, i: number) => {
                const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={m.name || i} className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: m.avatarUrl ? "transparent" : DT.blue, border: "2px solid #0C0F1A", marginLeft: i > 0 ? -4 : 0 }}>
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 7, fontWeight: 700, color: "white" }}>{init}</span>}
                  </div>
                );
              })}
              <span className="ml-1" style={{ fontSize: 11, color: DT.textTer }}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Revision status badge */}
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg }}>
                {sc.icon} {sc.label}
              </span>
              {group.revisionSubmittedAt && <span style={{ fontSize: 10, color: DT.textTer }}>{timeAgo(group.revisionSubmittedAt)}</span>}
            </div>
          </div>
          <div className="shrink-0 mt-1">
            {expanded ? <ChevronUp size={18} style={{ color: DT.textTer }} /> : <ChevronDown size={18} style={{ color: DT.textTer }} />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${DT.borderHair}`, animation: "pdrFade 250ms ease-out" }}>

          {/* Required Revisions (from panelist grade) */}
          {requiredRevisions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck size={14} style={{ color: DT.yellow }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: DT.yellow }}>YOUR REQUIRED REVISIONS ({requiredRevisions.length})</span>
              </div>
              <div className="space-y-1.5">
                {requiredRevisions.map((rev: any, i: number) => {
                  const prioColor = rev.priority === "High" ? DT.red : rev.priority === "Low" ? DT.textTer : DT.warning;
                  return (
                    <div key={rev.id || i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                      <span className="px-1.5 py-0.5 rounded shrink-0" style={{ fontSize: 9, fontWeight: 700, color: prioColor, background: withAlpha(prioColor, 0.07) }}>{rev.priority}</span>
                      <span style={{ fontSize: 12, color: DT.textSec }}>{rev.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student's Revision Checklist */}
          {revisionChecklist.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} style={{ color: DT.blue }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: DT.blue }}>STUDENT REVISION SUBMISSION</span>
              </div>
              <div className="space-y-1.5">
                {revisionChecklist.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    {item.completed ? <CheckCircle2 size={14} style={{ color: DT.success }} className="shrink-0 mt-0.5" /> : <XCircle size={14} style={{ color: DT.textDis }} className="shrink-0 mt-0.5" />}
                    <div>
                      <span style={{ fontSize: 12, color: item.completed ? DT.textPri : DT.textTer }}>{item.text || item.description || `Item ${i + 1}`}</span>
                      {item.note && <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2 }}>{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous review note */}
          {group.revisionReviewNote && (
            <div className="rounded-lg p-3" style={{ borderLeft: `3px solid ${group.revisionStatus === "Approved" ? DT.success : DT.warning}`, background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={12} style={{ color: DT.textTer }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: DT.textTer }}>Previous review by {group.revisionReviewedBy || "panelist"}</span>
                {group.revisionReviewedAt && <span style={{ fontSize: 10, color: DT.textDis }}>{timeAgo(group.revisionReviewedAt)}</span>}
              </div>
              <p style={{ fontSize: 12, color: DT.textSec }}>{group.revisionReviewNote}</p>
            </div>
          )}

          {/* Grade summary */}
          {grade && (
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Your Defense Grade</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color: verdictColor }}>{verdictLabel}</span>
                  {grade.weightedTotal && <span style={{ fontSize: 11, color: DT.textTer }}>({grade.weightedTotal}%)</span>}
                </div>
              </div>
              {grade.feedback && (
                <p className="mt-2" style={{ fontSize: 12, color: DT.textTer, fontStyle: "italic" }}>"{grade.feedback}"</p>
              )}
            </div>
          )}

          {/* Review actions */}
          {needsReview && (
            <div className="space-y-3 pt-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Review Note (optional)</label>
                <textarea
                  value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note about the revisions..."
                  className="w-full rounded-xl px-4 py-3 transition"
                  style={{ background: DT.raised, border: `1px solid ${DT.borderDef}`, color: DT.textPri, fontFamily: FT.b, fontSize: 13, outline: "none", resize: "none" as const }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = DT.borderDef; }}
                />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => onApprove(group.id || group.number, reviewNote)} disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ background: DT.success, color: "white", fontSize: 14, fontWeight: 700 }}>
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                  Approve Revisions
                </button>
                <button onClick={() => onRequestChanges(group.id || group.number, reviewNote)} disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ background: DT.redDim, color: DT.red, border: `1px solid rgba(248,113,113,0.2)`, fontSize: 14, fontWeight: 700 }}>
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  Request Changes
                </button>
              </div>
            </div>
          )}

          {alreadyApproved && (
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl" style={{ background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)` }}>
              <CheckCircle2 size={16} style={{ color: DT.success }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: DT.success }}>Revisions approved{group.revisionReviewedBy ? ` by ${group.revisionReviewedBy}` : ""}</span>
            </div>
          )}

          {!needsReview && !alreadyApproved && revStatus === "Pending" && (
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
              <Clock size={16} style={{ color: DT.textDis }} />
              <span style={{ fontSize: 13, color: DT.textTer }}>Waiting for the group to submit their revisions.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════ */
export function PanelistPostDefenseReviewPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "approved">("all");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token!;

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/grades/my");
      const assignedGroups: any[] = res.assignedGroups || [];
      const myGrades: any[] = res.grades || [];

      // Only show groups that have been graded (defense completed)
      const gradedGroupIds = new Set(myGrades.map((g: any) => g.groupId));
      const postDefenseGroups = assignedGroups.filter(g => gradedGroupIds.has(g.id));

      setGroups(postDefenseGroups);
      setGrades(myGrades);
    } catch (err) { console.error("Failed to fetch post-defense data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = useCallback(async (groupId: number, note: string) => {
    setProcessingId(groupId);
    try {
      const token = await getToken();
      await apiFetch(`/groups/${groupId}/review-revisions`, {
        method: "PUT",
        body: JSON.stringify({ status: "Approved", reviewNote: note }),
      }, token);
      toast.success("Revisions approved!");
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed to approve."); }
    finally { setProcessingId(null); }
  }, [fetchData]);

  const handleRequestChanges = useCallback(async (groupId: number, note: string) => {
    if (!note.trim()) { toast.error("Please add a note explaining what needs to change."); return; }
    setProcessingId(groupId);
    try {
      const token = await getToken();
      await apiFetch(`/groups/${groupId}/review-revisions`, {
        method: "PUT",
        body: JSON.stringify({ status: "Needs Revision", reviewNote: note }),
      }, token);
      toast.success("Revision feedback sent to the group.");
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed to request changes."); }
    finally { setProcessingId(null); }
  }, [fetchData]);

  // Filter groups
  const filtered = groups.filter(g => {
    if (filter === "all") return true;
    const rs = g.revisionStatus || "Pending";
    if (filter === "pending") return rs === "Pending" || rs === "Needs Revision";
    if (filter === "submitted") return rs === "Submitted";
    if (filter === "approved") return rs === "Approved";
    return true;
  });

  // Stats
  const pendingCount = groups.filter(g => !g.revisionStatus || g.revisionStatus === "Pending" || g.revisionStatus === "Needs Revision").length;
  const submittedCount = groups.filter(g => g.revisionStatus === "Submitted").length;
  const approvedCount = groups.filter(g => g.revisionStatus === "Approved").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3" style={{ fontFamily: FT.b }}>
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14 }}>Loading post-defense data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-5 pb-8" style={{ fontFamily: FT.b, animation: "pdrFade 400ms ease-out" }}>
      <style>{KF}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
          Post-Defense Review
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
          Review submitted revisions from your assigned groups and approve or request changes.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Awaiting Submission", count: pendingCount, color: DT.textTer, icon: <Clock size={16} /> },
          { label: "Ready for Review", count: submittedCount, color: DT.warning, icon: <Eye size={16} /> },
          { label: "Approved", count: approvedCount, color: DT.success, icon: <CheckCircle2 size={16} /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>{s.icon}
              <span style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800 }}>{s.count}</span>
            </div>
            <span style={{ fontSize: 11, color: DT.textTer }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { key: "all", label: "All Groups", count: groups.length },
          { key: "submitted", label: "Ready for Review", count: submittedCount },
          { key: "pending", label: "Awaiting", count: pendingCount },
          { key: "approved", label: "Approved", count: approvedCount },
        ] as { key: typeof filter; label: string; count: number }[]).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer"
            style={{
              fontSize: 12, fontWeight: filter === t.key ? 700 : 500,
              background: filter === t.key ? DT.blueDim : "transparent",
              border: `1px solid ${filter === t.key ? "rgba(77,143,255,0.2)" : DT.borderHair}`,
              color: filter === t.key ? DT.blue : DT.textTer,
            }}>
            {t.label}
            <span className="px-1.5 py-0 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: filter === t.key ? "rgba(77,143,255,0.15)" : "rgba(255,255,255,0.06)", color: filter === t.key ? DT.blue : DT.textDis }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Group cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={cardStyle}>
          <Inbox size={40} style={{ color: DT.textDis, marginBottom: 12 }} />
          <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>
            {groups.length === 0 ? "No Post-Defense Groups" : "No groups match this filter"}
          </h3>
          <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>
            {groups.length === 0
              ? "Groups will appear here after you submit defense grades."
              : "Try a different filter to see more groups."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(g => {
            const grade = grades.find((gr: any) => gr.groupId === g.id);
            return (
              <GroupReviewCard
                key={g.id || g.number}
                group={g}
                grade={grade}
                onApprove={handleApprove}
                onRequestChanges={handleRequestChanges}
                isProcessing={processingId === (g.id || g.number)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
