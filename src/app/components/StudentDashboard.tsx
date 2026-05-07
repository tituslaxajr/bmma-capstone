import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import { useOutletContext } from "react-router";
import {
  FileText, ChevronRight, CheckCircle,
  BookOpen, Archive,
  Calendar, ArrowRight, ShieldCheck, Send, Clock,
  Upload, ExternalLink, RotateCcw, CheckSquare, AlertCircle, FileCheck,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { useInView, Fade } from "./ui/shared-ui";
import { apiFetch, fetchBootstrap } from "../lib/supabase";
import { PageShell } from "./PageShell";
import { KF_DASHBOARD } from "./animations";

function daysUntil(d: string): number | null {
  if (!d) return null;
  try {
    const diff = Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000);
    return diff;
  } catch { return null; }
}

/* ═══ Submission types ═══ */
interface PreDefenseFile {
  fileId: string;
  fileName: string;
  fileSize?: string;
  linkUrl?: string;
  status?: string;
  uploadDate?: string;
  uploadedBy?: string;
  reviewStatus?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

interface SubmissionRecord {
  manuscriptLink?: string | null;
  manuscriptLinkUpdatedAt?: string;
  manuscriptLinkUpdatedBy?: string;
  preDefenseFiles?: PreDefenseFile[];
  projectOutput?: { fileName?: string; reviewStatus?: string; uploadDate?: string } | null;
  comments?: any[];
}

interface GroupRevision {
  revisionStatus?: string;
  revisionSubmittedAt?: string;
  revisionChecklist?: { label: string; done?: boolean }[];
  revisionReviewNote?: string;
  revisionReviewedBy?: string;
  revisionReviewedAt?: string;
}

interface GroupMember {
  name: string;
  avatarUrl?: string;
  email?: string;
}

/* ═══ Profile Avatar — reusable with glow ring ═══ */
function ProfileAvatar({ url, name, size = 52, ringColor = DT.blue, showGlow = true }: {
  url?: string; name: string; size?: number; ringColor?: string; showGlow?: boolean;
}) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const ringSize = size + 6;
  return (
    <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
      {/* Glow */}
      {showGlow && (
        <div className="absolute inset-0 rounded-full" style={{
          background: `radial-gradient(circle, ${withAlpha(ringColor, 0.25)} 0%, transparent 70%)`,
          filter: "blur(8px)",
          animation: "cpPulse 3s ease-in-out infinite",
        }} />
      )}
      {/* Ring */}
      <div className="absolute inset-0 rounded-full" style={{
        background: `conic-gradient(from 0deg, ${ringColor}, ${withAlpha(ringColor, 0.3)}, ${ringColor})`,
        padding: 2,
      }}>
        <div className="w-full h-full rounded-full" style={{ background: DT.base, padding: 2 }}>
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: url ? "transparent" : `linear-gradient(135deg, ${ringColor}, ${withAlpha(ringColor, 0.6)})` }}>
            {url ? (
              <img src={url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontFamily: FT.h, fontSize: size * 0.3, fontWeight: 700, color: DT.base }}>{initials}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Mini member avatar ═══ */
function MemberChip({ member, index }: { member: GroupMember; index: number }) {
  const initials = (member.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [DT.blue, DT.purple, DT.success, "#F59E0B", DT.red];
  const color = colors[index % colors.length];
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
      style={{
        background: member.avatarUrl ? "transparent" : `linear-gradient(135deg, ${color}, ${withAlpha(color, 0.6)})`,
        border: `2px solid ${DT.base}`,
        marginLeft: index > 0 ? -6 : 0,
        zIndex: 10 - index,
      }}>
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: 8, fontWeight: 700, color: DT.base, fontFamily: FT.h }}>{initials}</span>
      )}
    </div>
  );
}

/* ═══ Preset Timeline — Read-only guide ═══ */
const CAPSTONE_TIMELINE = [
  { phase: "Pre-Defense", icon: <FileText size={16} />, color: DT.blue, steps: [
    "Upload and submit your manuscript and project files",
    "Await scheduled defense date",
  ]},
  { phase: "Defense Day", icon: <ShieldCheck size={16} />, color: DT.purple, steps: [
    "Present your capstone project to the panel",
    "Answer questions from panelists",
    "Receive verdict: Pass, Pass with Minor Revision, Re-demonstration, or Fail",
  ]},
  { phase: "Post-Defense", icon: <CheckCircle size={16} />, color: DT.success, steps: [
    "Complete required revisions (if any)",
    "Submit final revised manuscript",
    "Complete peer evaluation form",
    "Receive final grade",
  ]},
];

function TimelineGuide({ onNavigate }: { onNavigate: (idx: number) => void }) {
  return (
    <Fade delay={140}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}`,
      }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: DT.textTer }} />
            <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Capstone Timeline</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: DT.blueDim, color: DT.blue }}>
            Guide
          </span>
        </div>

        <div className="px-5 py-4 space-y-5">
          {CAPSTONE_TIMELINE.map((phase, pi) => (
            <div key={phase.phase} className="relative">
              {/* Connector line */}
              {pi < CAPSTONE_TIMELINE.length - 1 && (
                <div className="absolute left-[15px] top-[36px] bottom-[-12px] w-px" style={{ background: DT.borderDef }} />
              )}

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: withAlpha(phase.color, 0.08), color: phase.color, border: `1px solid ${withAlpha(phase.color, 0.15)}` }}>
                  {phase.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: phase.color, marginBottom: 6 }}>
                    {phase.phase}
                  </h4>
                  <div className="space-y-1.5">
                    {phase.steps.map((step, si) => (
                      <div key={si} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0" style={{ background: DT.textDis }} />
                        <span style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <button onClick={() => onNavigate(6)} className="flex items-center gap-1.5 transition cursor-pointer hover:gap-2.5" style={{ color: DT.blue, fontSize: 12, fontWeight: 600 }}>
            <BookOpen size={13} /> View Manuscript Guide <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Fade>
  );
}

/* ═══════════════════════════════════════════
   RECENT SUBMISSIONS — Pre-defense files + manuscript link
   ═══════════════════════════════════════════ */
function RecentSubmissions({ submission, onNavigate }: { submission: SubmissionRecord | null; onNavigate: (idx: number) => void }) {
  if (!submission) return null;

  const files = (submission.preDefenseFiles || []).slice().sort((a, b) =>
    new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
  );

  const hasManuscript = !!submission.manuscriptLink;
  const hasOutput = !!submission.projectOutput;
  const hasAnything = hasManuscript || files.length > 0 || hasOutput;
  if (!hasAnything) return null;

  const reviewBadge = (status?: string) => {
    if (!status) return null;
    const lower = (status || "").toLowerCase();
    let bg = DT.blueDim, text = DT.blue, label = status;
    if (lower.includes("approved") || lower.includes("accepted")) {
      bg = DT.successDim; text = DT.success; label = "Approved";
    } else if (lower.includes("revision") || lower.includes("rejected") || lower.includes("needs")) {
      bg = DT.redDim; text = DT.red; label = "Needs Revision";
    } else if (lower.includes("submitted") || lower.includes("review")) {
      bg = DT.warningDim; text = DT.warning; label = "Under Review";
    }
    return (
      <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, background: bg, color: text }}>
        {label}
      </span>
    );
  };

  const formatDate = (d?: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <Fade delay={260}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}`,
      }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="flex items-center gap-2">
            <Upload size={14} style={{ color: DT.textTer }} />
            <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Recent Submissions</h3>
          </div>
          <button onClick={() => onNavigate(1)} className="flex items-center gap-1 transition cursor-pointer hover:gap-2" style={{ color: DT.blue, fontSize: 11, fontWeight: 600 }}>
            View All <ChevronRight size={12} />
          </button>
        </div>

        <div className="px-5 py-3 space-y-1">
          {/* Manuscript Link */}
          {hasManuscript && (
            <div className="flex items-center gap-3 py-2.5 group" style={{ borderBottom: files.length > 0 || hasOutput ? `1px solid ${DT.borderHair}` : "none" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DT.blueDim, color: DT.blue }}>
                <ExternalLink size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>Manuscript Link</p>
                <p className="truncate" style={{ fontSize: 10, color: DT.textTer, fontFamily: FT.m }}>
                  {submission.manuscriptLinkUpdatedAt ? `Updated ${formatDate(submission.manuscriptLinkUpdatedAt)}` : "Linked"}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, background: DT.successDim, color: DT.success }}>
                Linked
              </span>
            </div>
          )}

          {/* Pre-Defense Files */}
          {files.slice(0, 4).map((f, i) => (
            <div key={f.fileId || i} className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: i < Math.min(files.length, 4) - 1 || hasOutput ? `1px solid ${DT.borderHair}` : "none" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DT.purpleDim, color: DT.purple }}>
                <FileCheck size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: DT.textPri }}>{f.fileName || f.fileId}</p>
                <p style={{ fontSize: 10, color: DT.textTer, fontFamily: FT.m }}>
                  {f.uploadedBy ? `by ${f.uploadedBy} · ` : ""}{formatDate(f.uploadDate)}
                </p>
              </div>
              {reviewBadge(f.reviewStatus)}
            </div>
          ))}
          {files.length > 4 && (
            <button onClick={() => onNavigate(1)} className="w-full py-2 text-center transition cursor-pointer hover:underline"
              style={{ fontSize: 11, fontWeight: 600, color: DT.textTer }}>
              +{files.length - 4} more file{files.length - 4 > 1 ? "s" : ""}
            </button>
          )}

          {/* Project Output */}
          {hasOutput && (
            <div className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DT.yellowDim, color: DT.yellow }}>
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: DT.textPri }}>
                  {submission.projectOutput?.fileName || "Project Output"}
                </p>
                <p style={{ fontSize: 10, color: DT.textTer, fontFamily: FT.m }}>
                  {formatDate(submission.projectOutput?.uploadDate)}
                </p>
              </div>
              {reviewBadge(submission.projectOutput?.reviewStatus)}
            </div>
          )}
        </div>
      </div>
    </Fade>
  );
}

/* ══════════════════════════════════════════
   REVISION TRACKER — Post-defense revision status
   ═══════════════════════════════════════════ */
function RevisionTracker({ group, onNavigate }: { group: GroupRevision | null; onNavigate: (idx: number) => void }) {
  if (!group) return null;
  const status = group.revisionStatus;
  if (!status) return null;

  const lower = (status || "").toLowerCase();
  const isApproved = lower === "approved";
  const isSubmitted = lower === "submitted";
  const isNeedsRevision = lower.includes("needs") || lower.includes("revision");

  const accent = isApproved ? DT.success : isSubmitted ? DT.blue : isNeedsRevision ? DT.warning : DT.textSec;
  const accentDim = isApproved ? DT.successDim : isSubmitted ? DT.blueDim : isNeedsRevision ? DT.warningDim : DT.hoverBg;
  const statusLabel = isApproved ? "Approved" : isSubmitted ? "Submitted" : isNeedsRevision ? "Needs Revision" : status;
  const statusIcon = isApproved ? <CheckCircle size={18} /> : isSubmitted ? <Clock size={18} /> : <RotateCcw size={18} />;

  const checklist = group.revisionChecklist || [];
  const doneCount = checklist.filter(c => c.done).length;

  const formatDate = (d?: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    catch { return ""; }
  };

  return (
    <Fade delay={300}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${accentDim}, ${withAlpha(accent, 0.015)})`,
        border: `1px solid ${withAlpha(accent, 0.15)}`,
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${withAlpha(accent, 0.07)}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: withAlpha(accent, 0.1), color: accent }}>
              {statusIcon}
            </div>
            <div>
              <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Post-Defense Revisions</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: withAlpha(accent, 0.12), color: accent }}>
                  {statusLabel}
                </span>
                {group.revisionSubmittedAt && (
                  <span style={{ fontSize: 10, color: DT.textTer, fontFamily: FT.m }}>
                    {isSubmitted ? "Submitted" : "Updated"} {formatDate(group.revisionSubmittedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate(3)} className="flex items-center gap-1 transition cursor-pointer hover:gap-2" style={{ color: accent, fontSize: 11, fontWeight: 600 }}>
            Details <ChevronRight size={12} />
          </button>
        </div>

        {/* Checklist progress */}
        {checklist.length > 0 && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <span style={{ fontSize: 11, fontWeight: 600, color: DT.textSec }}>Revision Checklist</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: FT.m }}>
                {doneCount}/{checklist.length}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: DT.borderDef }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${checklist.length > 0 ? (doneCount / checklist.length) * 100 : 0}%`,
                background: accent,
                boxShadow: `0 0 8px ${withAlpha(accent, 0.25)}`,
              }} />
            </div>
            {/* Items */}
            <div className="space-y-1.5">
              {checklist.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckSquare size={12} style={{ color: item.done ? DT.success : DT.textDis, flexShrink: 0 }} />
                  <span style={{
                    fontSize: 12, color: item.done ? DT.textSec : DT.textTer,
                    textDecoration: item.done ? "line-through" : "none",
                    lineHeight: 1.4,
                  }}>{item.label}</span>
                </div>
              ))}
              {checklist.length > 5 && (
                <span style={{ fontSize: 10, color: DT.textDis, paddingLeft: 20 }}>
                  +{checklist.length - 5} more items
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reviewer feedback */}
        {group.revisionReviewNote && (
          <div className="mx-5 mb-4 p-3 rounded-xl" style={{ background: DT.hoverBg, border: `1px solid ${DT.borderHair}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={10} style={{ color: DT.textTer }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: DT.textTer }}>
                {group.revisionReviewedBy ? `${group.revisionReviewedBy}'s Note` : "Reviewer Note"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{group.revisionReviewNote}</p>
          </div>
        )}
      </div>
    </Fade>
  );
}

/* ═══════════════════════════════════════════
   QUICK LINKS — Desktop grid + Mobile floating bar
   ═══════════════════════════════════════════ */
function QuickLinks({ onNavigate }: { onNavigate: (idx: number) => void }) {
  const links = [
    { icon: <FileText size={20} />, mobileIcon: <FileText size={18} />, label: "Submissions", accent: "#4ADE80", idx: 1 },
    { icon: <Calendar size={20} />, mobileIcon: <Calendar size={18} />, label: "Defense", accent: DT.purple, idx: 2 },
    { icon: <BookOpen size={20} />, mobileIcon: <BookOpen size={18} />, label: "Manuscript", accent: DT.blue, idx: 6 },
    { icon: <Archive size={20} />, mobileIcon: <Archive size={18} />, label: "Archive", accent: DT.warning, idx: 4 },
  ];

  return (
    <>
      {/* Desktop — static grid (hidden on mobile) */}
      <Fade delay={320} className="hidden sm:block">
        <div className="grid grid-cols-4 gap-3">
          {links.map(l => (
            <button key={l.label} onClick={() => onNavigate(l.idx)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all cursor-pointer group hover:-translate-y-[1px]"
              style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = withAlpha(l.accent, 0.19); }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = DT.borderSub; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:scale-110"
                style={{ background: withAlpha(l.accent, 0.08), color: l.accent }}>
                {l.icon}
              </div>
              <p style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.textPri }}>{l.label}</p>
            </button>
          ))}
        </div>
      </Fade>

      {/* Mobile — floating bottom action bar (hidden on desktop) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50" style={{
        background: `linear-gradient(180deg, transparent, ${DT.base} 20%)`,
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}>
        <div className="flex items-center justify-around mx-4 py-2.5 rounded-2xl" style={{
          background: DT.raised,
          border: `1px solid ${DT.borderSub}`,
          boxShadow: `0 -4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${DT.borderHair}`,
          backdropFilter: "blur(16px)",
        }}>
          {links.map(l => (
            <button key={l.label} onClick={() => onNavigate(l.idx)}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: withAlpha(l.accent, 0.08), color: l.accent }}>
                {l.mobileIcon}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: DT.textTer, fontFamily: FT.h }}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   SUBMISSION STATUS — Quick glance at recent submission
   ═══════════════════════════════════════════ */
function SubmissionStatus({ submission, onNavigate }: { submission: SubmissionRecord | null; onNavigate: (idx: number) => void }) {
  if (!submission) return null;

  // Derive status from the most recent pre-defense file or overall state
  const files = submission.preDefenseFiles || [];
  const latestFile = files.length > 0
    ? files.reduce((a, b) => new Date(b.uploadDate || 0).getTime() > new Date(a.uploadDate || 0).getTime() ? b : a)
    : null;

  let status = "pending";
  let title = "Manuscript";
  let subtitle = submission.manuscriptLink ? "Manuscript link submitted" : "No submissions yet";

  if (latestFile) {
    const rs = (latestFile.reviewStatus || "").toLowerCase();
    if (rs.includes("approved") || rs.includes("accepted")) status = "approved";
    else if (rs.includes("revision") || rs.includes("rejected")) status = "rejected";
    else status = "pending";
    title = latestFile.fileName || "Latest Upload";
    subtitle = latestFile.reviewStatus || "Pending Review";
  } else if (!submission.manuscriptLink && files.length === 0) {
    return null; // Nothing to show
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: DT.warningDim, text: DT.warning, label: "Pending Review" },
    approved: { bg: DT.successDim, text: DT.success, label: "Approved" },
    rejected: { bg: DT.redDim, text: DT.red, label: "Needs Revision" },
  };
  const st = statusColors[status] || statusColors.pending;

  return (
    <Fade delay={200}>
      <button
        onClick={() => onNavigate(1)}
        className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all cursor-pointer group hover:-translate-y-[1px]"
        style={{
          background: `linear-gradient(135deg, ${st.bg}, ${withAlpha(st.text, 0.015)})`,
          border: `1px solid ${withAlpha(st.text, 0.15)}`,
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: withAlpha(st.text, 0.09), color: st.text }}>
          {status === "approved" ? <CheckCircle size={20} /> : status === "pending" ? <Clock size={20} /> : <Send size={20} />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: withAlpha(st.text, 0.12), color: st.text }}>
              {st.label}
            </span>
          </div>
          <p className="truncate" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{title}</p>
          <p className="truncate" style={{ fontSize: 12, color: DT.textTer, marginTop: 1 }}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 transition group-hover:translate-x-1" style={{ color: st.text, fontSize: 12, fontWeight: 600 }}>
          View <ArrowRight size={14} />
        </div>
      </button>
    </Fade>
  );
}

/* ═══════════════════════════════════════════
   STUDENT PROFILE CARD — 3:4 portrait photocard
   ═══════════════════════════════════════════ */
function StudentProfileCard({ name, avatarUrl, program, section, groupName, defenseStatus, onClick }: {
  name: string; avatarUrl?: string; program: string; section: string;
  groupName: string; defenseStatus: string; onClick: () => void;
}) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const statusColor = defenseStatus.toLowerCase().includes("post") ? DT.success
    : defenseStatus.toLowerCase().includes("cleared") || defenseStatus.toLowerCase().includes("defense") ? DT.purple
    : DT.blue;

  return (
    <button onClick={onClick}
      className="w-full rounded-2xl overflow-hidden transition-all cursor-pointer group hover:-translate-y-[1px]"
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
        boxShadow: DT.shadowSm,
        aspectRatio: "3/4",
      }}>
      {/* Portrait photo area — fills top ~60% */}
      <div className="relative w-full overflow-hidden" style={{ height: "60%" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name}
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
            style={{ objectFit: "cover", objectPosition: "center top" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${statusColor}, ${withAlpha(statusColor, 0.5)})` }}>
            <span style={{ fontFamily: FT.h, fontSize: 48, fontWeight: 800, color: DT.base, opacity: 0.7 }}>{initials}</span>
          </div>
        )}
        {/* Gradient overlay at bottom of image for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-10"
          style={{ background: `linear-gradient(to top, ${DT.raised}, transparent)` }} />
      </div>

      {/* Info area — bottom ~40% */}
      <div className="flex flex-col items-center justify-center px-4 py-3 gap-1.5" style={{ height: "40%" }}>
        <p className="truncate" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri, maxWidth: "100%" }}>{name}</p>
        <p style={{ fontSize: 11, color: DT.textTer }}>{program}{section ? ` - ${section}` : ""}</p>
        {groupName && (
          <p className="truncate text-center" style={{ fontSize: 11, color: DT.textSec, fontWeight: 500, maxWidth: "100%" }}>{groupName}</p>
        )}
        <span className="px-2.5 py-1 rounded-full" style={{
          fontSize: 9, fontWeight: 700, background: withAlpha(statusColor, 0.1), color: statusColor,
          border: `1px solid ${withAlpha(statusColor, 0.15)}`,
        }}>
          {defenseStatus || "Pre-Defense"}
        </span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   WHAT'S NEXT CARD — Contextual next-action prompt
   ═══════════════════════════════════════════ */
function WhatsNextCard({ phase, manuscriptSubmitted, filesUploaded, defenseDate, verdictReceived, revisionsNeeded, revisionsSubmitted, peerEvalDone, onAction }: {
  phase: string; manuscriptSubmitted: boolean; filesUploaded: boolean;
  defenseDate: string | null; verdictReceived: boolean; revisionsNeeded: boolean;
  revisionsSubmitted: boolean; peerEvalDone: boolean; onAction: () => void;
}) {
  let title = "Submit Your Manuscript";
  let description = "Upload your manuscript and project files to get started.";
  let accent = DT.blue;
  let icon = <Upload size={20} />;

  if (phase === "post-defense") {
    if (revisionsNeeded && !revisionsSubmitted) {
      title = "Complete Revisions";
      description = "Submit your revised manuscript based on panel feedback.";
      accent = DT.warning;
      icon = <RotateCcw size={20} />;
    } else if (!peerEvalDone) {
      title = "Peer Evaluation";
      description = "Complete your peer evaluation form.";
      accent = DT.purple;
      icon = <CheckSquare size={20} />;
    } else {
      title = "All Tasks Complete";
      description = "You've completed all post-defense requirements.";
      accent = DT.success;
      icon = <CheckCircle size={20} />;
    }
  } else if (phase === "defense") {
    title = "Defense Upcoming";
    description = defenseDate ? `Your defense is scheduled. Review your materials and prepare.` : "Your defense date will be announced soon.";
    accent = DT.purple;
    icon = <ShieldCheck size={20} />;
  } else {
    if (!manuscriptSubmitted) {
      title = "Submit Your Manuscript";
      description = "Link your manuscript document to begin the review process.";
    } else if (!filesUploaded) {
      title = "Upload Pre-Defense Files";
      description = "Upload your project files for panel review.";
      icon = <FileText size={20} />;
    } else {
      title = "Awaiting Schedule";
      description = "Your files are submitted. Wait for your defense schedule.";
      accent = DT.success;
      icon = <Clock size={20} />;
    }
  }

  return (
    <button onClick={onAction}
      className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all cursor-pointer group hover:-translate-y-[1px]"
      style={{
        background: `linear-gradient(135deg, ${withAlpha(accent, 0.06)}, ${withAlpha(accent, 0.02)})`,
        border: `1px solid ${withAlpha(accent, 0.15)}`,
      }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: withAlpha(accent, 0.09), color: accent }}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
          What's Next
        </p>
        <p style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{title}</p>
        <p className="truncate" style={{ fontSize: 12, color: DT.textTer, marginTop: 1 }}>{description}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-1" style={{ color: accent }} />
    </button>
  );
}

/* ═══════════════════════════════════════════
   DEFENSE TIMELINE — Visual milestone tracker
   ═══════════════════════════════════════════ */
function DefenseTimeline({ milestones }: {
  milestones: { phase: string; status: "completed" | "current" | "upcoming"; date?: string; description: string }[];
}) {
  const phaseIcons: Record<string, ReactNode> = {
    "Pre-Defense": <FileText size={16} />,
    "Defense": <ShieldCheck size={16} />,
    "Post-Defense": <CheckCircle size={16} />,
  };
  const phaseColors: Record<string, string> = {
    "Pre-Defense": DT.blue,
    "Defense": DT.purple,
    "Post-Defense": DT.success,
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}`,
    }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Defense Progress</h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {milestones.map((m, i) => {
          const color = phaseColors[m.phase] || DT.textSec;
          const isCompleted = m.status === "completed";
          const isCurrent = m.status === "current";
          return (
            <div key={m.phase} className="relative">
              {i < milestones.length - 1 && (
                <div className="absolute left-[15px] top-[36px] bottom-[-8px] w-px" style={{
                  background: isCompleted ? color : DT.borderDef,
                }} />
              )}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{
                  background: isCompleted || isCurrent ? withAlpha(color, 0.1) : "rgba(255,255,255,0.03)",
                  color: isCompleted || isCurrent ? color : DT.textDis,
                  border: `1px solid ${isCompleted || isCurrent ? withAlpha(color, 0.15) : DT.borderDef}`,
                }}>
                  {phaseIcons[m.phase] || <Clock size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: isCompleted || isCurrent ? color : DT.textDis }}>
                      {m.phase}
                    </span>
                    {isCompleted && (
                      <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 8, fontWeight: 700, background: withAlpha(color, 0.1), color }}>
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 8, fontWeight: 700, background: withAlpha(color, 0.1), color }}>
                        Current
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2, lineHeight: 1.4 }}>{m.description}</p>
                  {m.date && (
                    <p style={{ fontSize: 10, color: DT.textDis, marginTop: 2, fontFamily: FT.m }}>{m.date}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════ */
function DashboardSkeleton() {
  const s: CSSProperties = {
    background: `linear-gradient(90deg, ${DT.raised} 25%, ${DT.elevated} 50%, ${DT.raised} 75%)`,
    backgroundSize: "200% 100%", animation: "cpShimmer 1.5s ease-in-out infinite", borderRadius: 16,
  };
  return (
    <div className="max-w-[900px] mx-auto space-y-5" style={{ fontFamily: FT.b }}>
      <style>{KF_DASHBOARD}</style>
      <div><div style={{ ...s, width: "50%", height: 32, marginBottom: 8 }} /><div style={{ ...s, width: "30%", height: 16 }} /></div>
      <div style={{ ...s, height: 80 }} />
      <div style={{ ...s, height: 280 }} />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} style={{ ...s, height: 100 }} />)}</div>
      <div style={{ ...s, height: 120 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════ */
export function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [userName, setUserName] = useState("Student");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [defense, setDefense] = useState<{ date: string; time?: string; room?: string } | null>(null);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [groupRevision, setGroupRevision] = useState<GroupRevision | null>(null);
  const [program, setProgram] = useState("");
  const [section, setSection] = useState("");
  const [capstoneTitle, setCapstonTitle] = useState("");
  const [defenseStatus, setDefenseStatus] = useState("");

  let contextUser: any = null;
  let contextNavigate: any = null;
  try {
    const ctx = useOutletContext<any>();
    contextUser = ctx?.user;
    contextNavigate = ctx?.onNavigate;
  } catch { /* safe fallback */ }

  const navTo = useCallback((idx: number) => {
    if (contextNavigate) contextNavigate(idx);
  }, [contextNavigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bootData = await fetchBootstrap().catch(() => null);
        if (cancelled) return;

        if (bootData) {
          const profile = bootData.context?.profile || {};
          setUserName(profile.name || contextUser?.name || "Student");
          setAvatarUrl(profile.avatarUrl || contextUser?.avatarUrl);
          setProgram(profile.program || profile.course || "BMMA");
          setSection(profile.section || "");
          const myGroup = bootData.context?.myGroup;
          setGroupName(myGroup?.title || myGroup?.name || "");
          setCapstonTitle(myGroup?.capstoneTitle || myGroup?.title || "");

          // Extract group members
          const members = (myGroup?.members || []).map((m: any) => ({
            name: m.name || m.email?.split("@")[0] || "?",
            avatarUrl: m.avatarUrl,
            email: m.email,
          }));
          setGroupMembers(members);

          // Extract defense info
          const defenseCtx = bootData.context?.myDefense || {};
          if (defenseCtx.date) {
            setDefense({ date: defenseCtx.date, time: defenseCtx.time, room: defenseCtx.room });
          }

          // Derive defense status
          const dStatus = myGroup?.defenseStatus || defenseCtx.status || "";
          if (dStatus) {
            setDefenseStatus(dStatus);
          } else if (myGroup?.revisionStatus) {
            setDefenseStatus("Post-Defense");
          } else if (defenseCtx.date) {
            setDefenseStatus("Cleared for Defense");
          } else {
            setDefenseStatus("Pre-Defense");
          }

          // Extract revision info from group
          if (myGroup?.revisionStatus) {
            setGroupRevision({
              revisionStatus: myGroup.revisionStatus,
              revisionSubmittedAt: myGroup.revisionSubmittedAt,
              revisionChecklist: myGroup.revisionChecklist,
              revisionReviewNote: myGroup.revisionReviewNote,
              revisionReviewedBy: myGroup.revisionReviewedBy,
              revisionReviewedAt: myGroup.revisionReviewedAt,
            });
          }

          // Fetch submission data for the group
          const groupNumber = myGroup?.number;
          if (groupNumber) {
            try {
              const subRes = await apiFetch<any>(`/submissions/group/${groupNumber}`);
              if (!cancelled && subRes?.submission) {
                setSubmission(subRes.submission);
              }
            } catch { /* silent */ }
          }
        } else if (contextUser?.name) {
          setUserName(contextUser.name);
          setAvatarUrl(contextUser?.avatarUrl);
        }
      } catch (err) { console.error("Dashboard fetch error:", err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <DashboardSkeleton />;

  const firstName = userName.split(" ")[0] || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Hey there" : "Evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <PageShell className="max-w-[960px] mx-auto" dashboard>
      {/* ── Desktop: 2-column hero — Photocard left, greeting right ── */}
      {/* ── Mobile: stacked — photocard on top, compact ── */}
      <Fade delay={0}>
        <div className="flex flex-col sm:flex-row gap-5 mb-6">

          {/* ── Portrait Photocard (3:4) ── */}
          <div className="w-[180px] sm:w-[220px] shrink-0 mx-auto sm:mx-0">
            <StudentProfileCard
              name={userName}
              avatarUrl={avatarUrl}
              program={program}
              section={section}
              groupName={capstoneTitle || groupName}
              defenseStatus={defenseStatus}
              onClick={() => navTo(7)}
            />
          </div>

          {/* ── Right side: Greeting + Details ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Greeting card */}
            <div className="rounded-2xl p-5 sm:p-6 flex-1" style={{
              background: `linear-gradient(135deg, ${DT.raised}, ${withAlpha(DT.blue, 0.04)})`,
              border: `1px solid ${DT.borderSub}`,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{
                background: `radial-gradient(circle at top right, ${withAlpha(DT.blue, 0.06)} 0%, transparent 70%)`,
              }} />

              <div className="relative z-10">
                <p className="mb-1" style={{ fontSize: 12, color: DT.textTer, fontFamily: FT.m }}>{today}</p>
                <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {greeting}, <span style={{ color: DT.blue }}>{firstName}</span>
                </h1>
                {groupName && (
                  <p className="mt-1.5" style={{ fontSize: 13, color: DT.textSec, fontWeight: 500 }}>{groupName}</p>
                )}

                {/* Group members row */}
                {groupMembers.length > 0 && (
                  <div className="flex items-center gap-2.5 mt-4">
                    <div className="flex items-center">
                      {groupMembers.slice(0, 5).map((m, i) => (
                        <MemberChip key={m.email || i} member={m} index={i} />
                      ))}
                      {groupMembers.length > 5 && (
                        <span className="ml-1.5" style={{ fontSize: 10, color: DT.textDis, fontWeight: 600 }}>+{groupMembers.length - 5}</span>
                      )}
                    </div>
                    <div className="w-px h-4" style={{ background: DT.borderDef }} />
                    <span style={{ fontSize: 11, color: DT.textTer, fontWeight: 500 }}>
                      {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Defense countdown — inline card */}
            {defense && (() => {
              const days = daysUntil(defense.date);
              if (days === null || days < 0) return null;
              const dateStr = new Date(defense.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const isClose = days <= 7;
              const accent = isClose ? DT.yellow : DT.textSec;
              return (
                <button
                  onClick={() => navTo(2)}
                  className="flex items-center gap-3 rounded-2xl px-5 py-3.5 transition-all cursor-pointer group hover:-translate-y-[1px]"
                  style={{
                    background: isClose
                      ? `linear-gradient(135deg, ${withAlpha(DT.yellow, 0.08)}, ${withAlpha(DT.yellow, 0.03)})`
                      : `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
                    border: `1px solid ${isClose ? withAlpha(DT.yellow, 0.18) : DT.borderSub}`,
                    boxShadow: isClose ? `0 0 16px ${withAlpha(DT.yellow, 0.06)}` : DT.shadowSm,
                  }}
                >
                  <ShieldCheck size={16} style={{ color: accent }} />
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: isClose ? DT.yellow : DT.textPri }}>
                      {days === 0 ? "Defense Today!" : `Defense in ${days} day${days !== 1 ? "s" : ""}`}
                    </span>
                    <div className="w-px h-3.5" style={{ background: DT.borderDef }} />
                    <span style={{ fontFamily: FT.m, fontSize: 11, color: DT.textTer }}>{dateStr}</span>
                    {defense.time && (
                      <span style={{ fontSize: 11, color: DT.textDis }}>{defense.time}</span>
                    )}
                  </div>
                  <ChevronRight size={14} className="transition group-hover:translate-x-0.5" style={{ color: DT.textDis }} />
                </button>
              );
            })()}
          </div>
        </div>
      </Fade>

      <div className="flex flex-col gap-5 pb-20 sm:pb-0">
        {/* ── #0 What's Next Card ── */}
        <Fade delay={80}>
          <WhatsNextCard
            phase={defenseStatus.toLowerCase().includes("post") ? "post-defense" : defenseStatus.toLowerCase().includes("cleared") || defense ? "defense" : "pre-defense"}
            manuscriptSubmitted={!!submission?.manuscriptLink}
            filesUploaded={(submission?.preDefenseFiles || []).length > 0}
            defenseDate={defense?.date || null}
            verdictReceived={!!groupRevision?.revisionStatus}
            revisionsNeeded={!!groupRevision?.revisionStatus && groupRevision.revisionStatus.toLowerCase() !== "approved"}
            revisionsSubmitted={groupRevision?.revisionStatus?.toLowerCase() === "submitted"}
            peerEvalDone={false}
            onAction={() => {
              if (!submission?.manuscriptLink) navTo(1);
              else if (defense) navTo(2);
              else if (groupRevision) navTo(3);
              else navTo(1);
            }}
          />
        </Fade>

        {/* ── #1 Latest Submission Status ── */}
        <SubmissionStatus submission={submission} onNavigate={navTo} />

        {/* ── #2 Revision Tracker (post-defense) ── */}
        <RevisionTracker group={groupRevision} onNavigate={navTo} />

        {/* ── #3 Defense Timeline ── */}
        <Fade delay={240}>
          <DefenseTimeline milestones={[
            {
              phase: "Pre-Defense",
              status: defenseStatus.toLowerCase().includes("post") || defense ? "completed" : "current",
              date: submission?.manuscriptLinkUpdatedAt ? new Date(submission.manuscriptLinkUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
              description: (submission?.preDefenseFiles || []).length > 0 ? `${(submission?.preDefenseFiles || []).length} file(s) uploaded` : "Upload your manuscript and project files",
            },
            {
              phase: "Defense",
              status: defenseStatus.toLowerCase().includes("post") ? "completed" : defense ? "current" : "upcoming",
              date: defense?.date ? new Date(defense.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
              description: defense ? `${defense.time || ""} ${defense.room ? `at ${defense.room}` : ""}`.trim() : "Awaiting schedule",
            },
            {
              phase: "Post-Defense",
              status: defenseStatus.toLowerCase().includes("post") ? "current" : "upcoming",
              date: groupRevision?.revisionSubmittedAt ? new Date(groupRevision.revisionSubmittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
              description: groupRevision ? `Revisions: ${groupRevision.revisionStatus}` : "Complete revisions and peer evaluation",
            },
          ]} />
        </Fade>

        {/* ── #4 Recent Submissions ── */}
        <RecentSubmissions submission={submission} onNavigate={navTo} />

        {/* ── #5 Capstone Timeline Guide ── */}
        <TimelineGuide onNavigate={navTo} />

        {/* ── #6 Quick Links ── */}
        <QuickLinks onNavigate={navTo} />
      </div>
    </PageShell>
  );
}