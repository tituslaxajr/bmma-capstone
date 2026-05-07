import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  FileText, Upload, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, Pencil, Send, Package, Info,
  BookOpen, FileCheck, ClipboardSignature, Loader2,
  Shield, ArrowUpRight, Download,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { ContextualTip, TIPS } from "./ContextualTip";
import { validateManuscript } from "../lib/fileValidation";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut, PageSpinner } from "./ui/shared-ui";
import { PageShell } from "./PageShell";

/* ═══ Helpers ═══ */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function DBadge({ label, variant }: { label: string; variant: "success" | "warning" | "info" | "muted" | "red" | "coordinator" | "student" | "adviser" }) {
  const map: Record<string, { c: string; bg: string; b: string }> = {
    success: { c: DT.success, bg: DT.successDim, b: withAlpha(DT.success, 0.15) },
    warning: { c: DT.warning, bg: DT.warningDim, b: withAlpha(DT.warning, 0.15) },
    info: { c: DT.blue, bg: DT.blueDim, b: withAlpha(DT.blue, 0.15) },
    muted: { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
    red: { c: DT.red, bg: DT.redDim, b: withAlpha(DT.red, 0.15) },
    coordinator: { c: DT.red, bg: DT.redDim, b: withAlpha(DT.red, 0.15) },
    student: { c: DT.blue, bg: DT.blueDim, b: withAlpha(DT.blue, 0.15) },
    adviser: { c: DT.success, bg: DT.successDim, b: withAlpha(DT.success, 0.15) },
  };
  const s = map[variant] || map.muted;
  return <span className="inline-flex items-center px-2.5 py-[3px] rounded-full" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{label}</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ═══ Progress Ring ═══ */
function MiniProgressRing({ value, size = 48, stroke = 4, color = DT.blue }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value);
  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DT.borderDef} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — Pre-Defense Files
   ═══════════════════════════════════════════════════════════════ */
type FileStatus = "submitted" | "pending" | "missing";

const STATUS_MAP: Record<FileStatus, { label: string; icon: ReactNode; c: string; bg: string; b: string }> = {
  submitted: { label: "Submitted", icon: <CheckCircle2 size={14} />, c: DT.success, bg: DT.successDim, b: withAlpha(DT.success, 0.15) },
  pending: { label: "Under Review", icon: <Clock size={14} />, c: DT.warning, bg: DT.warningDim, b: withAlpha(DT.warning, 0.15) },
  missing: { label: "Not Submitted", icon: <AlertTriangle size={14} />, c: DT.red, bg: DT.redDim, b: withAlpha(DT.red, 0.15) },
};

interface PreDefFile { fileId: string; label: string; description: string; icon: ReactNode; }

const PRE_DEFENSE_DEFS: PreDefFile[] = [
  { fileId: "manuscript", label: "Complete Manuscript (PDF)", description: "Full manuscript — all chapters combined into a single PDF with appendices.", icon: <BookOpen size={22} /> },
  { fileId: "brief", label: "Project Development Brief", description: "One-page summary of your project scope, objectives, methodology, and expected deliverables.", icon: <FileCheck size={22} /> },
  { fileId: "endorsement", label: "Endorsement Form (Signed by Adviser)", description: "Signed endorsement form from your capstone adviser confirming your group is ready for pre-defense.", icon: <ClipboardSignature size={22} /> },
];

function PreDefenseFilesTab({ groupNumber, submission, onRefresh }: { groupNumber: number; submission: any; onRefresh: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const savedFiles = submission?.preDefenseFiles || [];
  const getSavedFile = (fileId: string) => savedFiles.find((f: any) => f.fileId === fileId);

  const submitted = PRE_DEFENSE_DEFS.filter(d => getSavedFile(d.fileId)).length;
  const total = PRE_DEFENSE_DEFS.length;
  const pct = total > 0 ? submitted / total : 0;

  /* PDF upload */
  const handlePdfUpload = async (fileId: string, file: File) => {
    const result = validateManuscript(file);
    if (!result.valid) {
      toast.error(result.error!);
      return;
    }
    setSaving(fileId);
    setUploadProgress(prev => ({ ...prev, [fileId]: "Uploading..." }));
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupNumber", String(groupNumber));
      formData.append("fileId", fileId);

      await apiFetch<any>("/submissions/pre-defense-upload", {
        method: "POST",
        body: formData,
        headers: {},
      }, session?.access_token!);

      toast.success(`${file.name} uploaded successfully!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setSaving(null);
      setUploadProgress(prev => { const p = { ...prev }; delete p[fileId]; return p; });
    }
  };

  /* Download a stored PDF */
  const handleDownload = async (fileId: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await apiFetch<any>(`/submissions/pre-defense-download/${groupNumber}/${fileId}`, {}, session?.access_token!);
      if (res.signedUrl) {
        window.open(res.signedUrl, "_blank");
      }
    } catch (err: any) {
      toast.error("Failed to get download link");
    }
  };

  return (
    <div className="space-y-5">
      {/* ─── Summary strip ─── */}
      <Fade delay={40}>
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Ring + stats */}
            <div className="flex items-center gap-4 px-6 py-5 flex-1">
              <div className="relative">
                <MiniProgressRing value={pct} size={56} stroke={5} color={submitted === total ? DT.success : DT.blue} />
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 800, color: submitted === total ? DT.success : DT.blue }}>
                  {submitted}/{total}
                </span>
              </div>
              <div>
                <div style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>
                  {submitted === total ? "All files submitted!" : `${total - submitted} file${total - submitted > 1 ? "s" : ""} remaining`}
                </div>
                <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>
                  {submitted === total
                    ? "Your group is ready for defense scheduling."
                    : "Complete all submissions to proceed to defense scheduling."}
                </p>
              </div>
            </div>

            {/* Mini file status icons */}
            <div className="flex items-center gap-2 px-6 py-4 sm:border-l" style={{ borderColor: DT.borderHair }}>
              {PRE_DEFENSE_DEFS.map(def => {
                const done = !!getSavedFile(def.fileId);
                return (
                  <div key={def.fileId} className="flex flex-col items-center gap-1 px-2" title={def.label}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center transition" style={{
                      background: done ? withAlpha(DT.success, 0.1) : "rgba(255,255,255,0.04)",
                      border: `1px solid ${done ? withAlpha(DT.success, 0.15) : DT.borderDef}`,
                      color: done ? DT.success : DT.textDis,
                    }}>
                      {done ? <CheckCircle2 size={16} /> : def.icon}
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: done ? DT.success : DT.textDis }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Fade>

      {/* ─── File cards ─── */}
      {PRE_DEFENSE_DEFS.map((def, i) => {
        const saved = getSavedFile(def.fileId);
        const status: FileStatus = saved ? (saved.status || "submitted") : "missing";
        const s = STATUS_MAP[status];
        const accentBar = saved ? (status === "submitted" ? DT.success : DT.warning) : DT.textDis;
        const isPdfUpload = saved?.uploadType === "pdf";

        return (
          <Fade key={def.fileId} delay={100 + i * 60}>
            <div className="rounded-2xl overflow-hidden group" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
              {/* Accent top bar */}
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accentBar}, transparent)` }} />

              <div className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
                    background: saved ? withAlpha(DT.success, 0.08) : withAlpha(DT.blue, 0.08),
                    border: `1px solid ${saved ? withAlpha(DT.success, 0.12) : withAlpha(DT.blue, 0.12)}`,
                    color: saved ? DT.success : DT.blue,
                  }}>
                    {def.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{def.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: DT.textTer, lineHeight: 1.5 }}>{def.description}</p>
                  </div>
                  {/* Status badge aligned right */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0" style={{
                    fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}`,
                  }}>
                    {s.icon} {s.label}
                  </span>
                </div>

                {/* Submitted state */}
                {saved ? (
                  <div className="rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${DT.borderHair}` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: DT.successDim }}>
                      <CheckCircle2 size={18} style={{ color: DT.success }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 600, color: DT.textPri }}>{saved.fileName}</div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {saved.fileSize && <span style={{ fontSize: 11, color: DT.textTer, fontFamily: FT.m }}>{saved.fileSize}</span>}
                        {saved.uploadDate && <span style={{ fontSize: 11, color: DT.textTer, fontFamily: FT.m }}>Uploaded {timeAgo(saved.uploadDate)}</span>}
                        {saved.reviewStatus && <DBadge label={saved.reviewStatus} variant="warning" />}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                          fontSize: 10, fontWeight: 600, color: DT.purple, background: DT.purpleDim,
                          border: `1px solid ${withAlpha(DT.purple, 0.15)}`,
                        }}>
                          <Upload size={9} /> PDF
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleDownload(def.fileId)}
                        className="p-2 rounded-lg transition hover:bg-white/[0.05] cursor-pointer" title="Download PDF" style={{ color: DT.blue }}>
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PDF upload only */
                  <div
                    className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer hover:opacity-80 transition"
                    style={{
                      borderColor: saving === def.fileId ? DT.blue : DT.borderDef,
                      background: saving === def.fileId ? DT.blueDim : "rgba(255,255,255,0.02)",
                    }}
                    onClick={() => !saving && fileRefs.current[def.fileId]?.click()}
                  >
                    <input
                      ref={(el) => { fileRefs.current[def.fileId] = el; }}
                      type="file" accept=".pdf" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(def.fileId, file);
                        e.target.value = "";
                      }}
                    />
                    {saving === def.fileId ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" style={{ color: DT.blue }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: DT.blue }}>{uploadProgress[def.fileId] || "Uploading..."}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto mb-2" style={{ color: DT.textTer }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>Click to upload PDF</p>
                        <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2 }}>Max 25 MB &middot; PDF format only</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Fade>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — Project Output
   ═══════════════════════════════════════════════════════════════ */
function ProjectOutputTab({ groupNumber, submission, groupType, onRefresh }: { groupNumber: number; submission: any; groupType: string; onRefresh: () => void }) {
  const [link, setLink] = useState(submission?.projectOutput?.link || "");
  const [title, setTitle] = useState(submission?.projectOutput?.title || "");
  const [saving, setSaving] = useState(false);
  const existing = submission?.projectOutput;

  /* Google Drive URL validation */
  const isDriveUrl = link.trim() === "" || link.trim().startsWith("https://drive.google.com/");
  const showDriveWarning = link.trim().length > 0 && !isDriveUrl;

  const handleSave = async () => {
    if (!link.trim()) { toast.error("Please provide a link."); return; }
    if (!isDriveUrl) { toast.error("Only Google Drive links are accepted. Your link must start with https://drive.google.com/"); return; }
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/submissions/project-output", {
        method: "PUT",
        body: JSON.stringify({ groupNumber, type: groupType, link: link.trim(), title: title.trim(), metadata: {} }),
      }, session?.access_token!);
      toast.success("Project output saved!");
      onRefresh();
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Instructions banner */}
      <Fade delay={40}>
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
            <Package size={15} style={{ color: DT.yellow }} />
            <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>
              Group {groupNumber} &middot; {groupType || "Project"}
            </span>
          </div>
          <div className="px-5 py-4 flex items-start gap-3" style={{ background: withAlpha(DT.yellow, 0.03) }}>
            <Info size={15} className="shrink-0 mt-0.5" style={{ color: DT.yellow }} />
            <p style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.5 }}>
              Paste your <strong style={{ color: DT.textPri }}>Google Drive folder link</strong> to your final project output. Make sure the link is set to <strong style={{ color: DT.textPri }}>"Anyone with the link can view"</strong> before submitting.
            </p>
          </div>
        </div>
      </Fade>

      {/* Main content */}
      <Fade delay={100}>
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
          {/* Accent bar */}
          <div className="h-[3px]" style={{ background: existing ? `linear-gradient(90deg, ${DT.success}, transparent)` : `linear-gradient(90deg, ${DT.blue}, transparent)` }} />

          <div className="p-6">
            {existing ? (
              <div className="space-y-4">
                {/* Submitted state */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
                    background: withAlpha(DT.success, 0.08), border: `1px solid ${withAlpha(DT.success, 0.12)}`,
                  }}>
                    <CheckCircle2 size={22} style={{ color: DT.success }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DBadge label="Submitted" variant="success" />
                      <span style={{ fontSize: 12, color: DT.textTer }}>
                        {existing.submittedAt && `${timeAgo(existing.submittedAt)}`}
                        {existing.submittedBy && ` by ${existing.submittedBy}`}
                      </span>
                    </div>
                    {existing.title && (
                      <p className="mt-1" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{existing.title}</p>
                    )}
                  </div>
                </div>

                {/* Link preview */}
                <a href={existing.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition hover:bg-white/[0.03]"
                  style={{ border: `1px solid ${DT.borderHair}`, textDecoration: "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.blue, 0.08) }}>
                    <ArrowUpRight size={16} style={{ color: DT.blue }} />
                  </div>
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: DT.blue, fontFamily: FT.m }}>{existing.link}</span>
                  <ExternalLink size={14} style={{ color: DT.textTer }} />
                </a>

                <button onClick={() => { setLink(existing.link); setTitle(existing.title || ""); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 500 }}>
                  <Pencil size={13} /> Update Submission
                </button>
              </div>
            ) : (
              /* Form */
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{
                    background: withAlpha(DT.blue, 0.08), border: `1px solid ${withAlpha(DT.blue, 0.12)}`,
                  }}>
                    <Package size={20} style={{ color: DT.blue }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Submit Project Output</h3>
                    <p style={{ fontSize: 12, color: DT.textTer }}>Link your final multimedia deliverable</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Project Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Voices of San Fernando: A Documentary"
                      className="px-4 py-2.5 rounded-xl transition" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Output Link</label>
                    <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..."
                      className="px-4 py-2.5 rounded-xl transition"
                      style={{ ...inputStyle, ...(showDriveWarning ? { borderColor: DT.warning, boxShadow: `0 0 0 2px ${withAlpha(DT.warning, 0.15)}` } : {}) }}
                      onFocus={focusIn} onBlur={focusOut} />
                    {showDriveWarning && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: withAlpha(DT.warning, 0.08), border: `1px solid ${withAlpha(DT.warning, 0.2)}` }}>
                        <AlertTriangle size={13} className="shrink-0" style={{ color: DT.warning }} />
                        <span style={{ fontSize: 12, color: DT.warning, lineHeight: 1.4 }}>
                          This doesn't look like a Google Drive link. It must start with <strong>https://drive.google.com/</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={handleSave} disabled={saving || !link.trim() || showDriveWarning}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl cursor-pointer transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 600 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Submit Output
                </button>
              </div>
            )}
          </div>
        </div>
      </Fade>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Export — Manuscripts & Submissions
   ═══════════════════════════════════════════════════════════════ */
export function ManuscriptSubmissionPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const ctx = await apiFetch<any>("/me/context");
      setGroup(ctx.myGroup || null);
      if (ctx.myGroup) {
        const gn = ctx.myGroup.number || ctx.myGroup.id;
        const subRes = await apiFetch<any>(`/submissions/group/${gn}`);
        setSubmission(subRes.submission || null);
      }
    } catch (err) { console.error("Failed to fetch submission data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const groupNumber = group?.number || group?.id || 0;
  const groupType = group?.type || "Project";

  const tabs = [
    { icon: <FileText size={15} />, label: "Pre-Defense Files", accent: DT.blue },
    { icon: <Package size={15} />, label: "Project Output", accent: DT.yellow },
  ];

  if (loading) {
    return <PageSpinner label="Loading submissions..." />;
  }

  if (!group) {
    return (
      <div className="max-w-[900px] mx-auto py-16 text-center" style={{ fontFamily: FT.b }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: DT.raised, border: `1px solid ${DT.borderSub}` }}>
          <FileText size={28} style={{ color: DT.textDis }} />
        </div>
        <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No Group Assigned</h2>
        <p style={{ fontSize: 14, color: DT.textTer, marginTop: 6 }}>You need to be assigned to a group before you can submit manuscripts.</p>
      </div>
    );
  }

  /* Precompute sidebar stats */
  const savedFiles = submission?.preDefenseFiles || [];
  const preDefDone = PRE_DEFENSE_DEFS.filter(d => savedFiles.find((f: any) => f.fileId === d.fileId)).length;
  const hasOutput = !!submission?.projectOutput;
  const totalItems = PRE_DEFENSE_DEFS.length + 1;
  const doneItems = preDefDone + (hasOutput ? 1 : 0);
  const overallPct = totalItems > 0 ? doneItems / totalItems : 0;

  return (
    <PageShell className="max-w-[1280px] mx-auto">
      <Fade delay={0}>
        <div className="rounded-2xl overflow-hidden mb-6" style={{
          background: `linear-gradient(135deg, ${DT.raised} 0%, ${DT.elevated} 50%, ${DT.raised} 100%)`,
          border: `1px solid ${DT.borderSub}`,
          boxShadow: DT.shadowSm,
        }}>
          <div className="flex flex-col sm:flex-row">
            {/* Left — Title + tip */}
            <div className="flex-1 px-6 py-6 sm:py-7">
              <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
                Manuscripts & Submissions
              </h1>
              <p className="mt-1.5" style={{ fontSize: 14, color: DT.textSec, lineHeight: 1.5 }}>
                Manage your pre-defense file submissions and project output — all in one place.
              </p>

              {/* Inline group chip */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
                background: withAlpha(DT.blue, 0.06), border: `1px solid ${withAlpha(DT.blue, 0.12)}`,
              }}>
                <Shield size={12} style={{ color: DT.blue }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: DT.blue, fontFamily: FT.h }}>
                  Group {groupNumber}
                </span>
                <span style={{ fontSize: 11, color: DT.textTer }}>&middot; {groupType}</span>
              </div>
            </div>

            {/* Right — Overall progress ring */}
            <div className="flex items-center justify-center px-6 py-5 sm:border-l" style={{ borderColor: DT.borderHair }}>
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <MiniProgressRing value={overallPct} size={64} stroke={5} color={doneItems === totalItems ? DT.success : DT.blue} />
                  <span className="absolute inset-0 flex items-center justify-center" style={{
                    fontFamily: FT.h, fontSize: 16, fontWeight: 800,
                    color: doneItems === totalItems ? DT.success : DT.blue,
                  }}>
                    {Math.round(overallPct * 100)}%
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: DT.textTer, fontFamily: FT.h }}>
                  {doneItems === totalItems ? "Complete" : `${doneItems}/${totalItems} done`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Fade>

      {/* ═══ Contextual tip ═══ */}
      <Fade delay={30}>
        <div className="mb-5">
          <ContextualTip {...TIPS.formatting} accent={DT.purple} accentDim={DT.purpleDim} />
        </div>
      </Fade>

      {/* ═══ Segmented tab bar ═══ */}
      <Fade delay={50}>
        <div className="rounded-xl p-1 mb-6 inline-flex gap-1" style={{ background: DT.raised, border: `1px solid ${DT.borderDef}` }}>
          {tabs.map((t, i) => {
            const active = tab === i;
            return (
              <button key={t.label} onClick={() => setTab(i)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all cursor-pointer"
                style={{
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  fontFamily: active ? FT.h : FT.b,
                  background: active ? withAlpha(t.accent, 0.12) : "transparent",
                  color: active ? t.accent : DT.textTer,
                  border: active ? `1px solid ${withAlpha(t.accent, 0.18)}` : "1px solid transparent",
                  boxShadow: active ? `0 0 12px ${withAlpha(t.accent, 0.06)}` : "none",
                }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </Fade>

      {/* ═══ Tab content ═══ */}
      {tab === 0 && <PreDefenseFilesTab groupNumber={groupNumber} submission={submission} onRefresh={fetchData} />}
      {tab === 1 && <ProjectOutputTab groupNumber={groupNumber} submission={submission} groupType={groupType} onRefresh={fetchData} />}

      {/* Bottom spacer */}
      <div className="h-16 sm:h-4" />
    </PageShell>
  );
}