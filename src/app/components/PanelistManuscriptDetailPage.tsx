import { startTransition, type ReactNode, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useLocation } from "react-router";
import {
  FileText, Eye, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, MessageSquare, Loader2, Inbox, Send,
  FolderOpen, Package, ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { inputStyle, focusIn, focusOut, sectionBg } from "./ui/shared-ui";

/* ═══ Helpers ═══ */

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

type ReviewStatus = "Approved" | "Needs Revision" | "Submitted" | "Not Submitted";
const statusColors: Record<ReviewStatus, { c: string; bg: string }> = {
  Approved: { c: DT.success, bg: DT.successDim },
  "Needs Revision": { c: DT.red, bg: DT.redDim },
  Submitted: { c: DT.warning, bg: DT.warningDim },
  "Not Submitted": { c: DT.textTer, bg: "rgba(255,255,255,0.04)" },
};
function FileStatusBadge({ status }: { status: ReviewStatus }) {
  const s = statusColors[status] || statusColors["Not Submitted"];
  const icon = status === "Approved" ? <CheckCircle2 size={10} /> : status === "Needs Revision" ? <AlertTriangle size={10} /> : status === "Submitted" ? <Clock size={10} /> : <FileText size={10} />;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: s.c, background: s.bg }}>{icon} {status}</span>;
}

type OverallStatus = "Approved" | "Under Review" | "Needs Revision" | "Not Submitted";
const overallColors: Record<OverallStatus, { c: string; bg: string; b: string }> = {
  Approved: { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)" },
  "Under Review": { c: DT.warning, bg: DT.warningDim, b: "rgba(251,191,36,0.15)" },
  "Needs Revision": { c: DT.red, bg: DT.redDim, b: "rgba(248,113,113,0.15)" },
  "Not Submitted": { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
};
const overallIcons: Record<OverallStatus, ReactNode> = {
  Approved: <CheckCircle2 size={12} />, "Under Review": <Clock size={12} />,
  "Needs Revision": <AlertTriangle size={12} />, "Not Submitted": <FileText size={12} />,
};
function OverallStatusBadge({ status }: { status: OverallStatus }) {
  const s = overallColors[status];
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{overallIcons[status]} {status}</span>;
}

function computeOverallStatus(sub: any): OverallStatus {
  const files = sub.preDefenseFiles || [];
  const hasOutput = !!sub.projectOutput;
  if (files.length === 0 && !hasOutput) return "Not Submitted";
  const allApproved = files.length >= 3 && files.every((f: any) => f.reviewStatus === "Approved");
  if (allApproved) return "Approved";
  const hasRevision = files.some((f: any) => f.reviewStatus === "Needs Revision");
  if (hasRevision) return "Needs Revision";
  return "Under Review";
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL PAGE — full review with 2 tabs (own route)
   ═══════════════════════════════════════════════════════════════ */
export function PanelistManuscriptDetailPage() {
  const { groupNumber } = useParams<{ groupNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdviserView = location.pathname.startsWith("/adviser");
  const basePath = isAdviserView ? "/adviser" : "/panelist";
  const [group, setGroup] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentQuote, setCommentQuote] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Get assigned groups from /me/context
      const ctx = await apiFetch<any>("/me/context");
      const scopedGroups: any[] = isAdviserView ? (ctx.advisedGroups || []) : (ctx.assignedGroups || []);
      const match = scopedGroups.find((g: any) => String(g.number ?? g.id) === groupNumber);

      if (!match) {
        toast.error("Group not found or not assigned to you");
        setLoading(false);
        return;
      }

      setGroup(match);

      // Fetch submission
      const gn = match.number ?? match.id;
      try {
        const { submission } = await apiFetch<{ submission: any }>(`/submissions/group/${gn}`);
        setSub(submission || { manuscriptLink: "", preDefenseFiles: [], projectOutput: null, comments: [] });
      } catch {
        setSub({ manuscriptLink: "", preDefenseFiles: [], projectOutput: null, comments: [] });
      }
    } catch (err) { console.error("Failed to fetch group detail:", err); }
    finally { setLoading(false); }
  }, [groupNumber, isAdviserView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
        <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
        <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Loading group details...</span>
      </div>
    );
  }

  if (!group || !sub) {
    return (
      <div className="text-center py-32" style={{ fontFamily: FT.b }}>
        <p style={{ fontSize: 16, color: DT.textTer }}>Group not found or not assigned to you.</p>
        <button onClick={() => startTransition(() => navigate(`${basePath}/pre-defense`))} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition hover:opacity-90"
          style={{ background: DT.blue, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Pre-Defense Files
        </button>
      </div>
    );
  }

  const gn = group.number ?? group.id;
  const comments = sub.comments || [];
  const files = sub.preDefenseFiles || [];
  const output = sub.projectOutput;
  const status = computeOverallStatus(sub);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/submissions/comments", {
        method: "POST",
        body: JSON.stringify({ groupNumber: gn, quote: commentQuote, comment: commentText.trim() }),
      }, session?.access_token!);
      toast.success("Comment added!");
      setCommentText(""); setCommentQuote("");
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed to add comment"); }
    finally { setAddingComment(false); }
  };

  const TABS = [
    { label: "Pre-Defense Files", icon: <FolderOpen size={14} />, color: DT.yellow },
    { label: "Project Output", icon: <Package size={14} />, color: DT.success },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      {/* Back + Header */}
      <div>
        <button onClick={() => startTransition(() => navigate(`${basePath}/pre-defense`))}
          className="inline-flex items-center gap-1.5 mb-4 cursor-pointer transition hover:opacity-80"
          style={{ fontSize: 13, color: DT.textTer, fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Pre-Defense Files
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: DT.yellow, fontSize: 12, fontWeight: 700, color: DT.base }}>
                G{gn}
              </div>
              <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
                {group.name || `Group ${gn}`}
              </h1>
            </div>
            <p className="mt-0.5" style={{ fontSize: 14, color: DT.textSec }}>{group.title || "Untitled Project"}</p>
            {group.type && <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.blue, background: DT.blueDim }}>{group.type}</span>}
            {group.members && group.members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {group.members.map((m: any, mi: number) => {
                  const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.email || mi} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DT.borderHair}` }}>
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: m.avatarUrl ? "transparent" : DT.blue }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 7, fontWeight: 700, color: "white" }}>{init}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: DT.textSec }}>{m.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <OverallStatusBadge status={status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer"
            style={{
              fontSize: 13, fontWeight: tab === i ? 700 : 500,
              background: tab === i ? withAlpha(t.color, 0.08) : "rgba(255,255,255,0.03)",
              border: `1px solid ${tab === i ? withAlpha(t.color, 0.19) : DT.borderHair}`,
              color: tab === i ? t.color : DT.textTer,
            }}>
            {t.icon} {t.label}
            {i === 0 && <span className="ml-0.5 px-1.5 py-0 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: tab === 0 ? withAlpha(DT.yellow, 0.12) : "rgba(255,255,255,0.06)", color: tab === 0 ? DT.yellow : DT.textDis }}>{files.length}</span>}
          </button>
        ))}
      </div>

      {/* ═══ TAB 0: Pre-Defense Files ═══ */}
      {tab === 0 && (
        <>
          {files.length === 0 ? (
            <div className="text-center py-16">
              <Inbox size={40} style={{ color: DT.textDis, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: DT.textTer }}>No pre-defense files submitted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {files.map((f: any) => {
                const reviewStatus: ReviewStatus = f.reviewStatus || "Submitted";
                return (
                  <div key={f.fileId} style={sectionBg}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: DT.redDim }}>
                        <FileText size={17} style={{ color: DT.red }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{f.fileName || f.fileId}</span>
                          <FileStatusBadge status={reviewStatus} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap" style={{ fontSize: 10, color: DT.textTer }}>
                          {f.uploadDate && <span>Uploaded {timeAgo(f.uploadDate)}</span>}
                          {f.uploadedBy && <span>by {f.uploadedBy}</span>}
                        </div>
                        {f.linkUrl && (
                          <a href={f.linkUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg transition hover:opacity-80"
                            style={{ fontSize: 11, fontWeight: 600, color: DT.blue, background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)`, textDecoration: "none" }}>
                            <ExternalLink size={12} /> Open File
                          </a>
                        )}
                        {f.reviewNote && (
                          <div className="mt-2 rounded-md p-2" style={{ borderLeft: `2px solid ${DT.warning}`, background: DT.warningDim }}>
                            <p style={{ fontSize: 11, color: DT.textSec, fontStyle: "italic" }}>Review note: {f.reviewNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Expected files not yet submitted */}
          {(() => {
            const expected = ["manuscript", "brief", "endorsement"];
            const missing = expected.filter(id => !files.find((f: any) => f.fileId === id));
            if (missing.length === 0) return null;
            const labels: Record<string, string> = { manuscript: "Complete Manuscript (PDF)", brief: "Project Development Brief", endorsement: "Endorsement Form" };
            return (
              <div className="mt-4" style={sectionBg}>
                <p className="mb-2" style={{ fontSize: 13, fontWeight: 600, color: DT.textTer }}>Awaiting Submission</p>
                {missing.map(id => (
                  <div key={id} className="flex items-center gap-2 py-1.5" style={{ fontSize: 12, color: DT.textDis }}>
                    <Clock size={12} /> {labels[id] || id}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Comments */}
          <div className="mt-4" style={sectionBg}>
            <p className="mb-3" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>
              <MessageSquare size={12} className="inline mr-1" /> Feedback ({comments.length})
            </p>
            <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
              <input value={commentQuote} onChange={(e) => setCommentQuote(e.target.value)} placeholder="Quote from manuscript (optional)"
                className="w-full px-2.5 py-1.5 rounded-md mb-1.5 transition" style={{ ...inputStyle, fontSize: 11, fontStyle: "italic" }} onFocus={focusIn} onBlur={focusOut} />
              <div className="flex gap-1.5">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add feedback..."
                  className="flex-1 px-2.5 py-1.5 rounded-md transition" style={{ ...inputStyle, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} />
                <button onClick={handleAddComment} disabled={addingComment || !commentText.trim()}
                  className="px-2.5 py-1.5 rounded-md cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: DT.blue, color: "white", fontSize: 11, fontWeight: 600 }}>
                  {addingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>
            </div>
            {comments.length === 0 ? (
              <p style={{ fontSize: 12, color: DT.textTer }}>No feedback yet. Be the first to comment.</p>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {comments.map((c: any, idx: number) => {
                  const roleColor = c.role === "Adviser" ? DT.success : c.role === "Coordinator" ? DT.red : DT.blue;
                  return (
                    <div key={c.id || idx}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: roleColor, fontSize: 7, fontWeight: 700, color: "white" }}>{c.initials || (c.name || "?")[0]}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>{c.name || c.author || "Anonymous"}</span>
                        {c.role && <span className="px-1.5 py-0 rounded-full" style={{ fontSize: 9, fontWeight: 600, color: roleColor, background: withAlpha(roleColor, 0.08) }}>{c.role}</span>}
                        <span className="ml-auto" style={{ fontSize: 10, color: DT.textTer }}>{timeAgo(c.time || c.createdAt)}</span>
                      </div>
                      {c.quote && <div className="ml-7 rounded-md p-2 mb-1" style={{ borderLeft: `2px solid ${DT.yellow}`, background: DT.yellowDim, fontSize: 11, color: DT.textSec, fontStyle: "italic" }}>{c.quote}</div>}
                      <p className="ml-7" style={{ fontSize: 12, color: DT.textSec }}>{c.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ TAB 1: Project Output ═══ */}
      {tab === 1 && (
        <>
          {output ? (
            <div className="max-w-2xl" style={sectionBg}>
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} style={{ color: DT.success }} />
                <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{output.title || "Project Output"}</span>
                {output.reviewStatus && (
                  <span className="px-2 py-0.5 rounded-full" style={{
                    fontSize: 10, fontWeight: 600,
                    color: output.reviewStatus === "Approved" ? DT.success : output.reviewStatus === "Needs Revision" ? DT.red : DT.warning,
                    background: output.reviewStatus === "Approved" ? DT.successDim : output.reviewStatus === "Needs Revision" ? DT.redDim : DT.warningDim,
                  }}>{output.reviewStatus}</span>
                )}
              </div>
              {output.type && <p style={{ fontSize: 12, color: DT.textTer, marginBottom: 4 }}>Type: {output.type}</p>}
              {output.link && (
                <a href={output.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:opacity-80"
                  style={{ fontSize: 13, color: DT.blue, textDecoration: "none" }}>
                  <ExternalLink size={14} /> {output.link}
                </a>
              )}
              <div className="mt-1 flex items-center gap-2" style={{ fontSize: 10, color: DT.textTer }}>
                {output.submittedAt && <span>Submitted {timeAgo(output.submittedAt)}</span>}
                {output.submittedBy && <span>by {output.submittedBy}</span>}
              </div>
              {output.reviewNote && <p className="mt-2" style={{ fontSize: 12, color: DT.textTer, fontStyle: "italic" }}>Review note: {output.reviewNote}</p>}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package size={40} style={{ color: DT.textDis, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: DT.textTer }}>No project output submitted yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
