import { useState, useEffect, useCallback, startTransition } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import {
  FileText, Eye, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, ChevronLeft, MessageSquare, Loader2, Inbox,
  Send, BookOpen, FolderOpen, Package, CheckCircle, XCircle,
  Maximize2, Minimize2, Pencil, RefreshCw, ArrowLeft,
} from "lucide-react";
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

/* ═══ Google Doc embed helper ═══ */
function extractGDocId(url: string): string | null {
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function CoordDocEmbed({ link }: { link: string }) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const docId = extractGDocId(link);
  if (!docId) return null;

  const iframeSrc = mode === "edit"
    ? `https://docs.google.com/document/d/${docId}/edit?embedded=true`
    : `https://docs.google.com/document/d/${docId}/preview`;

  useEffect(() => {
    if (!expanded) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expanded]);

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: DT.base }}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: DT.raised, borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: DT.blue }} />
            <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>Working Manuscript</span>
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: mode === "edit" ? DT.blue : DT.textTer, background: mode === "edit" ? DT.blueDim : "rgba(255,255,255,0.04)" }}>
              {mode === "edit" ? "Editing" : "Viewing"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: DT.raised }}>
              <button onClick={() => setMode("edit")} className="flex items-center gap-1 px-3 py-1.5 rounded-md transition cursor-pointer"
                style={{ fontSize: 11, fontWeight: 600, background: mode === "edit" ? DT.blue : "transparent", color: mode === "edit" ? "#fff" : DT.textTer }}>
                <Pencil size={11} /> Edit
              </button>
              <button onClick={() => setMode("preview")} className="flex items-center gap-1 px-3 py-1.5 rounded-md transition cursor-pointer"
                style={{ fontSize: 11, fontWeight: 600, background: mode === "preview" ? DT.blue : "transparent", color: mode === "preview" ? "#fff" : DT.textTer }}>
                <Eye size={11} /> Preview
              </button>
            </div>
            <button onClick={() => { setIframeKey(k => k + 1); setLoading(true); }} className="p-2 rounded-lg transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}><RefreshCw size={14} /></button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg transition hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ExternalLink size={14} /></a>
            <button onClick={() => setExpanded(false)} className="p-2 rounded-lg transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}><Minimize2 size={14} /></button>
          </div>
        </div>
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: DT.base }}>
              <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
              <span style={{ fontSize: 13, color: DT.textTer }}>Loading document...</span>
            </div>
          )}
          <iframe key={iframeKey} src={iframeSrc} className="w-full h-full border-0" style={{ background: "#fff" }}
            onLoad={() => setLoading(false)} allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderSub}` }}>
      <div className="flex items-center justify-between px-3 py-2 gap-2" style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${DT.borderHair}` }}>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 600, color: mode === "edit" ? DT.blue : DT.textTer, background: mode === "edit" ? DT.blueDim : "rgba(255,255,255,0.04)" }}>
            {mode === "edit" ? "Edit Mode" : "Preview"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: DT.raised }}>
            <button onClick={() => setMode("edit")} className="px-2 py-1 rounded transition cursor-pointer"
              style={{ fontSize: 10, fontWeight: 600, background: mode === "edit" ? DT.blue : "transparent", color: mode === "edit" ? "#fff" : DT.textTer }}>
              <Pencil size={10} />
            </button>
            <button onClick={() => setMode("preview")} className="px-2 py-1 rounded transition cursor-pointer"
              style={{ fontSize: 10, fontWeight: 600, background: mode === "preview" ? DT.blue : "transparent", color: mode === "preview" ? "#fff" : DT.textTer }}>
              <Eye size={10} />
            </button>
          </div>
          <button onClick={() => { setIframeKey(k => k + 1); setLoading(true); }} className="p-1.5 rounded transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}><RefreshCw size={12} /></button>
          <a href={link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ExternalLink size={12} /></a>
          <button onClick={() => setExpanded(true)} className="p-1.5 rounded transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}><Maximize2 size={12} /></button>
        </div>
      </div>
      <div className="relative" style={{ height: 600 }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10" style={{ background: DT.base }}>
            <Loader2 size={20} className="animate-spin" style={{ color: DT.blue }} />
            <span style={{ fontSize: 11, color: DT.textTer }}>Loading...</span>
          </div>
        )}
        <iframe key={iframeKey} src={iframeSrc} className="w-full h-full border-0" style={{ background: "#fff" }}
          onLoad={() => setLoading(false)} allow="clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL PAGE — full review with 3 tabs (own route)
   ═══════════════════════════════════════════════════════════════ */
export function CoordinatorManuscriptDetailPage() {
  const { groupNumber } = useParams<{ groupNumber: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentQuote, setCommentQuote] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [reviewingFile, setReviewingFile] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingOutput, setReviewingOutput] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/submissions/all");
      const match = (res.data || []).find((d: any) => String(d.group.number || d.group.id) === groupNumber);
      if (match) setEntry(match);
      else toast.error("Group not found");
    } catch (err) { console.error("Failed to fetch submissions:", err); }
    finally { setLoading(false); }
  }, [groupNumber]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
        <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
        <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Loading group details...</span>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-32" style={{ fontFamily: FT.b }}>
        <p style={{ fontSize: 16, color: DT.textTer }}>Group not found.</p>
        <button onClick={() => startTransition(() => navigate("/coordinator/manuscripts"))} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition hover:opacity-90"
          style={{ background: DT.blue, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Manuscripts
        </button>
      </div>
    );
  }

  const { group, submission: sub } = entry;
  const gn = group.number || group.id;
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
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setAddingComment(false); }
  };

  const handleReviewFile = async (fileId: string, reviewStatus: string) => {
    setReviewingFile(fileId);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/submissions/review-file", {
        method: "PUT",
        body: JSON.stringify({ groupNumber: gn, fileId, reviewStatus, reviewNote }),
      }, session?.access_token!);
      toast.success(`File ${reviewStatus.toLowerCase()}!`);
      setReviewNote("");
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setReviewingFile(null); }
  };

  const handleReviewOutput = async (reviewStatus: string) => {
    setReviewingOutput(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/submissions/review-output", {
        method: "PUT",
        body: JSON.stringify({ groupNumber: gn, reviewStatus, reviewNote }),
      }, session?.access_token!);
      toast.success(`Output ${reviewStatus.toLowerCase()}!`);
      setReviewNote("");
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setReviewingOutput(false); }
  };

  const TABS = [
    { label: "Manuscript", icon: <BookOpen size={14} />, color: DT.blue },
    { label: "Pre-Defense Files", icon: <FolderOpen size={14} />, color: DT.yellow },
    { label: "Project Output", icon: <Package size={14} />, color: DT.success },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      {/* Back + Header */}
      <div>
        <button onClick={() => startTransition(() => navigate("/coordinator/manuscripts"))}
          className="inline-flex items-center gap-1.5 mb-4 cursor-pointer transition hover:opacity-80"
          style={{ fontSize: 13, color: DT.textTer, fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Manuscript Review
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
              Group {gn}: {group.name}
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: DT.textSec }}>{group.title}</p>
            {group.members && (
              <p className="mt-1" style={{ fontSize: 12, color: DT.textTer }}>
                Members: {group.members.map((m: any) => m.name || m).join(", ")}
              </p>
            )}
          </div>
          <StatusBadge status={status} />
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
              border: `1px solid ${tab === i ? withAlpha(t.color, 0.18) : DT.borderHair}`,
              color: tab === i ? t.color : DT.textTer,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 0: Working Manuscript ═══ */}
      {tab === 0 && (
        <>
          {sub.manuscriptLink ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Embed takes 2/3 */}
              <div className="xl:col-span-2">
                <div className="flex items-center gap-2 px-1 mb-2 flex-wrap">
                  <CheckCircle2 size={13} style={{ color: DT.success }} />
                  <span style={{ fontSize: 11, color: DT.success, fontWeight: 600 }}>Link active</span>
                  <span className="truncate flex-1 min-w-0" style={{ fontSize: 10, color: DT.textTer, fontFamily: FT.m }}>{sub.manuscriptLink}</span>
                </div>
                {sub.manuscriptLinkUpdatedAt && (
                  <p className="px-1 mb-3" style={{ fontSize: 10, color: DT.textTer }}>Updated {timeAgo(sub.manuscriptLinkUpdatedAt)} by {sub.manuscriptLinkUpdatedBy}</p>
                )}
                <CoordDocEmbed link={sub.manuscriptLink} />
              </div>
              {/* Comments sidebar takes 1/3 */}
              <div className="xl:col-span-1">
                <div style={{ ...sectionBg, display: "flex", flexDirection: "column", height: "100%" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={14} style={{ color: DT.blue }} />
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>Comments ({comments.length})</span>
                  </div>
                  <div className="flex-1 overflow-auto space-y-3 mb-3" style={{ maxHeight: 460 }}>
                    {comments.length === 0 ? (
                      <p className="text-center py-8" style={{ fontSize: 12, color: DT.textDis }}>No comments yet. Be the first to leave feedback.</p>
                    ) : comments.map((c: any, i: number) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                        {c.quote && <p className="mb-1.5 pl-2" style={{ fontSize: 11, color: DT.textTer, borderLeft: `2px solid ${DT.blue}`, fontStyle: "italic" }}>"{c.quote}"</p>}
                        <p style={{ fontSize: 12, color: DT.textSec }}>{c.comment}</p>
                        <div className="flex items-center gap-2 mt-1.5" style={{ fontSize: 10, color: DT.textDis }}>
                          <span>{c.author || "Coordinator"}</span>
                          {c.createdAt && <span>· {timeAgo(c.createdAt)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Add comment */}
                  <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                    <input value={commentQuote} onChange={(e) => setCommentQuote(e.target.value)} placeholder="Quote (optional)..."
                      className="w-full px-3 py-2 rounded-lg transition" style={{ ...inputStyle, fontSize: 11 }} onFocus={focusIn} onBlur={focusOut} />
                    <div className="flex gap-2">
                      <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 rounded-lg transition" style={{ ...inputStyle, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                      <button onClick={handleAddComment} disabled={addingComment || !commentText.trim()}
                        className="px-3 py-2 rounded-lg cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                        style={{ background: DT.blue, color: "white", fontSize: 12, fontWeight: 600 }}>
                        {addingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={sectionBg} className="text-center py-16">
              <BookOpen size={40} style={{ color: DT.textDis, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: DT.textTer }}>No manuscript link submitted yet</p>
              <p style={{ fontSize: 13, color: DT.textDis, marginTop: 4 }}>The group hasn't connected their Google Doc.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB 1: Pre-Defense Files ═══ */}
      {tab === 1 && (
        <>
          {files.length === 0 ? (
            <div className="text-center py-16">
              <Inbox size={40} style={{ color: DT.textDis, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: DT.textTer }}>No pre-defense files submitted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {files.map((f: any) => {
                const isApproved = f.reviewStatus === "Approved";
                const needsRev = f.reviewStatus === "Needs Revision";
                const fileStatusColor = isApproved ? DT.success : needsRev ? DT.red : DT.warning;
                return (
                  <div key={f.fileId} style={sectionBg}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: withAlpha(fileStatusColor, 0.08), color: fileStatusColor }}>
                        <FileText size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{f.fileName || f.fileId}</span>
                          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: fileStatusColor, background: withAlpha(fileStatusColor, 0.07), border: `1px solid ${withAlpha(fileStatusColor, 0.12)}` }}>{f.reviewStatus || "Submitted"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap" style={{ fontSize: 10, color: DT.textTer }}>
                          {f.uploadDate && <span>Uploaded {timeAgo(f.uploadDate)}</span>}
                          {f.uploadedBy && <span>by {f.uploadedBy}</span>}
                        </div>
                        {f.linkUrl && (
                          <a href={f.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 transition hover:opacity-80"
                            style={{ fontSize: 12, color: DT.blue, textDecoration: "none" }}>
                            <ExternalLink size={11} /> Open file
                          </a>
                        )}
                        {f.reviewNote && <p className="mt-1 text-xs" style={{ color: DT.textTer, fontStyle: "italic" }}>Note: {f.reviewNote}</p>}
                      </div>
                    </div>
                    {/* Review actions */}
                    {!isApproved && (
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                        <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Review note (optional)..."
                          className="flex-1 px-2.5 py-1.5 rounded-md transition" style={{ ...inputStyle, fontSize: 11 }} onFocus={focusIn} onBlur={focusOut} />
                        <button onClick={() => handleReviewFile(f.fileId, "Approved")} disabled={reviewingFile === f.fileId}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                          style={{ background: DT.success, color: "white", fontSize: 11, fontWeight: 600 }}>
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => handleReviewFile(f.fileId, "Needs Revision")} disabled={reviewingFile === f.fileId}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                          style={{ background: DT.red, color: "white", fontSize: 11, fontWeight: 600 }}>
                          <XCircle size={12} /> Revise
                        </button>
                      </div>
                    )}
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
        </>
      )}

      {/* ═══ TAB 2: Project Output ═══ */}
      {tab === 2 && (
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
              <a href={output.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:opacity-80"
                style={{ fontSize: 13, color: DT.blue, textDecoration: "none" }}>
                <ExternalLink size={14} /> {output.link}
              </a>
              <div className="mt-1 flex items-center gap-2" style={{ fontSize: 10, color: DT.textTer }}>
                <span>Submitted {timeAgo(output.submittedAt)}</span>
                <span>by {output.submittedBy}</span>
              </div>
              {output.reviewNote && <p className="mt-2" style={{ fontSize: 12, color: DT.textTer, fontStyle: "italic" }}>Review note: {output.reviewNote}</p>}

              {/* Review actions */}
              {output.reviewStatus !== "Approved" && (
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                  <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Review note..."
                    className="flex-1 px-2.5 py-1.5 rounded-md transition" style={{ ...inputStyle, fontSize: 11 }} onFocus={focusIn} onBlur={focusOut} />
                  <button onClick={() => handleReviewOutput("Approved")} disabled={reviewingOutput}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: DT.success, color: "white", fontSize: 11, fontWeight: 600 }}>
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button onClick={() => handleReviewOutput("Needs Revision")} disabled={reviewingOutput}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: DT.red, color: "white", fontSize: 11, fontWeight: 600 }}>
                    <XCircle size={12} /> Revise
                  </button>
                </div>
              )}
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