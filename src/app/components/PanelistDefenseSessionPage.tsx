import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, CheckCircle2, Loader2, Inbox, Send, Users, User,
  Star, Plus, Trash2, AlertTriangle, Monitor, Clock, MapPin, Video,
  ChevronDown, ChevronUp, Save, Mic, MicOff, MessageSquare,
  Timer, Play, Pause, RotateCcw, Sparkles, Award, Zap, FileText,
  HelpCircle, Info, Undo2, Keyboard, ChevronRight, Shield, X,
  BarChart3, Eye, ArrowRight, BookOpen, Target, Hash, GraduationCap, Printer,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { cardBg, focusIn, focusOut } from "./ui/shared-ui";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

/* ═══════════════════════════════════════════
   Types & Config — STI Capstone Rubric
   ═══════════════════════════════════════════ */
type Verdict = "pass" | "minor" | "redemonstration" | "failed" | null;
type Priority = "High" | "Medium" | "Low";
interface RevisionItem { id: number; text: string; priority: Priority; }

/* GU-CRD-032-04 — Section A: Group Evaluation (out of 100 pts, determines verdict) */
const GROUP_CRITERIA = [
  { key: "results", label: "Chapter III — Results", desc: "Completeness and accuracy of findings, data presentation", icon: <FileText size={15} />, maxPts: 25 },
  { key: "discussion", label: "Chapter IV — Discussion", desc: "Analysis, interpretation, and relation to existing literature", icon: <FileText size={15} />, maxPts: 20 },
  { key: "output", label: "Project Prototype / Multimedia Output", desc: "Quality of the actual product (film, exhibit, app, etc.)", icon: <Monitor size={15} />, maxPts: 25 },
  { key: "presentation", label: "Oral Defense Presentation", desc: "Logical flow, visual aids, and overall delivery", icon: <Mic size={15} />, maxPts: 15 },
  { key: "qa", label: "Response to Panel Questions (Q&A)", desc: "Ability to answer panel queries clearly and accurately", icon: <MessageSquare size={15} />, maxPts: 15 },
];
const GROUP_MAX_TOTAL = GROUP_CRITERIA.reduce((s, c) => s + c.maxPts, 0); // 100

/* GU-CRD-032-04 — Section B: Individual Evaluation (per student, rated 1–5) */
const INDIVIDUAL_CRITERIA = [
  { key: "communication", label: "Communication Skills", desc: "Clarity & confidence in answering questions", icon: <Mic size={15} /> },
  { key: "organization", label: "Work Organization", desc: "Preparedness & logical flow", icon: <FileText size={15} /> },
  { key: "effectiveness", label: "Effectiveness", desc: "Defending their specific contribution", icon: <Zap size={15} /> },
];
const INDIV_MAX_PER = 5;
const INDIV_MAX_TOTAL = INDIVIDUAL_CRITERIA.length * INDIV_MAX_PER; // 15

/* Rating labels for 1–5 individual scale (GU-CRD-032-04) */
const RATING_LABELS: Record<number, { label: string; short: string; color: string; emoji: string }> = {
  1: { label: "Needs Improvement", short: "NI", color: DT.error, emoji: "1" },
  2: { label: "Fair", short: "FR", color: DT.warning, emoji: "2" },
  3: { label: "Satisfactory", short: "SAT", color: DT.yellow, emoji: "3" },
  4: { label: "Very Satisfactory", short: "VS", color: DT.blue, emoji: "4" },
  5: { label: "Outstanding", short: "OUT", color: DT.success, emoji: "5" },
};

/* Verdict color palette from GU-CRD-032-04 */
const VERDICT_COLORS = {
  pass: "#1A7A4A",
  minor: "#B45309",
  redemonstration: "#C55A11",
  failed: "#C00000",
};

/* GU-CRD-032-04 — Verdict based on GROUP score (Section A, out of 100) */
function computeVerdict(groupScore: number): { verdict: Verdict; label: string; numericalGrade: string; color: string } {
  if (groupScore >= 92) return { verdict: "pass", label: "PASS", numericalGrade: "1.00", color: VERDICT_COLORS.pass };
  if (groupScore >= 82) return { verdict: "minor", label: "PASS WITH MINOR REVISION", numericalGrade: "2.00", color: VERDICT_COLORS.minor };
  if (groupScore >= 60) return { verdict: "redemonstration", label: "PASS WITH MAJOR REVISION / RE-DEMONSTRATION", numericalGrade: "3.00", color: VERDICT_COLORS.redemonstration };
  return { verdict: "failed", label: "FAIL", numericalGrade: "5.00", color: VERDICT_COLORS.failed };
}

/* Defense flow phases (GU-CRD-032-04) */
const DEFENSE_PHASES = [
  { label: "Presentation", sublabel: "(incl. project)", duration: 30, icon: <Mic size={14} /> },
  { label: "Q&A", duration: 60, icon: <MessageSquare size={14} /> },
  { label: "Deliberation", duration: 20, icon: <Users size={14} /> },
  { label: "Announcement", duration: 10, icon: <Award size={14} /> },
];

/* Grade composition breakdown */
const GRADE_COMPOSITION = [
  { label: "Defense Activity", pct: 60, color: "#1F3864", sub: [
    { label: "Group Grade", pct: 60 },
    { label: "Individual Grade", pct: 40 },
  ]},
  { label: "Adviser's Grade", pct: 30, color: "#2E75B6", sub: [
    { label: "Attendance to weekly submission", pct: 15 },
    { label: "Participation in discussion", pct: 25 },
    { label: "Project involvement", pct: 60 },
  ]},
  { label: "Coordinator's Grade", pct: 10, color: "#D6E4F0", sub: [
    { label: "Performance of assigned tasks", pct: 20 },
    { label: "Submission of requirements", pct: 80 },
  ]},
];

/* ─── Shared styles ─── */
const cardStyle: React.CSSProperties = {
  background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, borderRadius: 16,
};
const inputBase: React.CSSProperties = {
  background: DT.raised, border: `1px solid ${DT.borderDef}`, color: DT.textPri,
  fontFamily: FT.b, outline: "none", transition: "border-color 200ms",
};


const KF = `
@keyframes dsvFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes dsvPulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes dsvGlow{0%,100%{box-shadow:0 0 12px rgba(77,143,255,0.15)}50%{box-shadow:0 0 28px rgba(77,143,255,0.3)}}
@keyframes dsvSlideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
@keyframes dsvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes dsvScorePop{0%{transform:scale(1)}30%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes dsvUndoSlide{from{opacity:0;transform:translateY(8px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes dsvModalIn{from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
`;

/* ═══════════════════════════════════════════
   Elapsed Timer Widget
   ═══════════════════════════════════════════ */
function ElapsedTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    setElapsed(Date.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => { startRef.current = Date.now() - elapsed; setRunning(true); };
  const pause = () => { setRunning(false); cancelAnimationFrame(rafRef.current); };
  const reset = () => { setRunning(false); cancelAnimationFrame(rafRef.current); setElapsed(0); };

  useEffect(() => {
    if (running) { rafRef.current = requestAnimationFrame(tick); }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isLong = mins >= 30;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
        style={{ background: running ? (isLong ? DT.redDim : "rgba(77,143,255,0.08)") : "rgba(255,255,255,0.03)", border: `1px solid ${running ? (isLong ? "rgba(248,113,113,0.2)" : "rgba(77,143,255,0.15)") : DT.borderHair}` }}>
        <Timer size={12} style={{ color: running ? (isLong ? DT.red : DT.blue) : DT.textDis }} />
        <span style={{ fontFamily: FT.m, fontSize: 14, fontWeight: 700, color: running ? (isLong ? DT.red : DT.textPri) : DT.textTer, letterSpacing: "0.05em" }}>
          {formatted}
        </span>
        {running && <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLong ? DT.red : DT.blue, animation: "dsvPulse 1.2s ease-in-out infinite" }} />}
      </div>
      {!running ? (
        <button onClick={start} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.04]"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.success }} title="Start timer">
          <Play size={12} />
        </button>
      ) : (
        <button onClick={pause} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.04]"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.warning }} title="Pause timer">
          <Pause size={12} />
        </button>
      )}
      {elapsed > 0 && (
        <button onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.04]"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }} title="Reset timer">
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Score Button — Enhanced with hover label
   ═══════════════════════════════════════════ */
function ScoreButton({ value, selected, onChange }: { value: number; selected: boolean; onChange: () => void }) {
  const [hovered, setHovered] = useState(false);
  const r = RATING_LABELS[value];
  return (
    <div className="relative">
      <button onClick={onChange}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        className="w-12 h-12 rounded-xl transition-all cursor-pointer flex items-center justify-center"
        style={{
          border: `2px solid ${selected ? r.color : DT.borderDef}`,
          background: selected ? withAlpha(r.color, 0.08) : hovered ? withAlpha(r.color, 0.03) : "transparent",
          boxShadow: selected ? `0 0 16px ${withAlpha(r.color, 0.15)}` : "none",
          transform: selected ? "scale(1.05)" : hovered ? "scale(1.02)" : "scale(1)",
        }}>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: FT.h, color: selected ? r.color : hovered ? withAlpha(r.color, 0.56) : DT.textDis }}>{value}</span>
      </button>
      {hovered && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg pointer-events-none z-20"
          style={{ background: "#1A1F2E", border: `1px solid ${DT.borderDef}`, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: r.color }}>{r.label}</span>
        </div>
      )}
    </div>
  );
}

/* ═══ Score Row — Enhanced ═══ */
function ScoreRow({ label, desc, icon, value, onChange }: {
  label: string; desc: string; icon?: React.ReactNode; value: number; onChange: (v: number) => void;
}) {
  const r = value >= 1 ? RATING_LABELS[value] : null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.04)", color: DT.textTer }}>{icon}</div>}
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{label}</span>
            {r && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, color: r.color, background: withAlpha(r.color, 0.07) }}>{r.short}</span>}
          </div>
          <div style={{ fontSize: 12, color: DT.textTer, marginTop: 1 }}>{desc}</div>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {[1, 2, 3, 4, 5].map(n => (
          <ScoreButton key={n} value={n} selected={value === n} onChange={() => onChange(n)} />
        ))}
      </div>
    </div>
  );
}

/* ═══ Rating Legend Tooltip (E) ═══ */
function RatingLegendTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
        style={{ border: `1px solid ${open ? DT.blue : DT.borderDef}`, color: open ? DT.blue : DT.textTer }}
        title="Scoring Guide (0–4)">
        <HelpCircle size={15} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 p-3 rounded-xl w-56"
          style={{ background: DT.elevated, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg, animation: "dsvFade 150ms ease-out" }}>
          <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em" }}>SCORING GUIDE (1–5)</div>
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map(n => {
              const r = RATING_LABELS[n];
              return (
                <div key={n} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: withAlpha(r.color, 0.04) }}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: withAlpha(r.color, 0.1), fontFamily: FT.h, fontSize: 13, fontWeight: 800, color: r.color }}>{n}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: r.color }}>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Grading Guidelines Panel — Full-screen overlay
   ═══════════════════════════════════════════ */
function GradingGuidelinesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}>{icon}</div>
      <div>
        <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>{title}</h3>
        <p style={{ fontSize: 12, color: DT.textTer }}>{subtitle}</p>
      </div>
    </div>
  );

  const tipCard = (emoji: string, title: string, desc: string) => (
    <div className="flex gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
      <span className="text-lg shrink-0 mt-0.5">{emoji}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: DT.textPri }}>{title}</div>
        <div style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 mt-[5vh] rounded-2xl" style={{ background: DT.base, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl, animation: "dsvModalIn 300ms ease-out" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center gap-3 rounded-t-2xl" style={{ background: DT.elevated, borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DT.yellow}, ${DT.blue})` }}>
            <BookOpen size={20} style={{ color: "white" }} />
          </div>
          <div className="flex-1">
            <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>Panelist Grading Guidelines</h2>
            <p style={{ fontSize: 12, color: DT.textTer }}>Reference: GU-CRD-032-04 — STI BMMA Capstone Project 2</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}><X size={16} /></button>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* Quick Overview Banner */}
          <div className="p-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${withAlpha(DT.blue, 0.06)}, ${withAlpha(DT.purple, 0.04)})`, border: `1px solid ${withAlpha(DT.blue, 0.12)}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} style={{ color: DT.blue }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: DT.blue }}>How Grading Works</span>
            </div>
            <p style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.7 }}>
              As a panelist, you evaluate each defense group across <strong style={{ color: DT.textPri }}>two sections</strong>:
              a group evaluation (Section A) worth <strong style={{ color: DT.blue }}>100 points</strong> that determines the defense verdict,
              and an individual evaluation (Section B) per student using a <strong style={{ color: DT.yellow }}>1–5 rating scale</strong>.
              The final defense grade is computed as <strong style={{ color: DT.textPri }}>60% Group + 40% Individual</strong>.
            </p>
          </div>

          {/* ─── SECTION A: GROUP EVALUATION ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<Users size={20} />, "Section A — Group Evaluation", "Point-based scoring out of 100 pts • Determines the defense verdict")}
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Criteria table */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderHair}` }}>
                <div className="grid grid-cols-[1fr_auto] gap-0">
                  <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${DT.borderHair}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em" }}>CRITERION</span>
                  </div>
                  <div className="px-4 py-2 text-center" style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${DT.borderHair}`, minWidth: 70 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em" }}>MAX PTS</span>
                  </div>
                  {GROUP_CRITERIA.map((c, i) => (
                    <div key={c.key} style={{ display: "contents" }}>
                      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: i < GROUP_CRITERIA.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.blue, 0.06), color: DT.blue }}>{c.icon}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{c.label}</div>
                          <div style={{ fontSize: 10, color: DT.textTer }}>{c.desc}</div>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-center" style={{ borderBottom: i < GROUP_CRITERIA.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
                        <span className="px-2.5 py-1 rounded-lg" style={{ background: withAlpha(DT.blue, 0.06), fontFamily: FT.h, fontSize: 15, fontWeight: 800, color: DT.blue }}>{c.maxPts}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex justify-between items-center" style={{ background: withAlpha(DT.blue, 0.04), borderTop: `1px solid ${DT.borderHair}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DT.textSec }}>Total</span>
                  <span style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 800, color: DT.blue }}>{GROUP_MAX_TOTAL} pts</span>
                </div>
              </div>

              {/* Scoring instructions */}
              <div className="p-3 rounded-xl" style={{ background: withAlpha(DT.yellow, 0.03), border: `1px solid ${withAlpha(DT.yellow, 0.1)}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={12} style={{ color: DT.yellow }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: DT.yellow }}>Scoring Instructions</span>
                </div>
                <ul className="space-y-1" style={{ fontSize: 11, color: DT.textSec, lineHeight: 1.6, paddingLeft: 20, listStyleType: "disc" }}>
                  <li>Assign whole-number points from <strong style={{ color: DT.textPri }}>0 up to the maximum</strong> for each criterion.</li>
                  <li>Consider the <strong style={{ color: DT.textPri }}>quality, completeness, and depth</strong> of each element.</li>
                  <li>All five criteria must be scored before the verdict is determined.</li>
                  <li>Use the point-slider or type directly in each criterion's input field.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ─── VERDICT THRESHOLDS ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<GraduationCap size={20} />, "Defense Verdict Thresholds", "Verdict is auto-determined solely by Section A group score")}
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { verdict: "PASS", range: "92 – 100", grade: "1.00", color: VERDICT_COLORS.pass, desc: "Group demonstrates exemplary work across all criteria. Project is ready for final submission." },
                  { verdict: "Pass with Minor Revision", range: "82 – 91", grade: "2.00", color: VERDICT_COLORS.minor, desc: "Group shows strong work with small issues. Must submit corrections within the revision window." },
                  { verdict: "Pass with Major Revision / Re-demonstration", range: "60 – 81", grade: "3.00", color: VERDICT_COLORS.redemonstration, desc: "Major revisions found. Re-demonstration may be required after substantial improvements." },
                  { verdict: "FAIL", range: "Below 60", grade: "5.00", color: VERDICT_COLORS.failed, desc: "Major deficiencies across multiple criteria. Group must repeat the capstone defense cycle." },
                ] as const).map(v => (
                  <div key={v.verdict} className="p-4 rounded-xl" style={{ background: withAlpha(v.color, 0.04), border: `1.5px solid ${withAlpha(v.color, 0.15)}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                      <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: v.color }}>{v.verdict}</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: withAlpha(v.color, 0.08), color: v.color }}>{v.range}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Hash size={10} style={{ color: DT.textDis }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: DT.textSec }}>Numerical Grade: {v.grade}</span>
                    </div>
                    <p style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>{v.desc}</p>
                  </div>
                ))}
              </div>
              {/* Visual range bar */}
              <div className="mt-4">
                <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em", marginBottom: 6 }}>VISUAL RANGE</div>
                <div className="flex h-7 rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderHair}` }}>
                  <div className="flex items-center justify-center" style={{ width: "59%", background: withAlpha(VERDICT_COLORS.failed, 0.15) }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: VERDICT_COLORS.failed }}>FAIL (0–59)</span>
                  </div>
                  <div className="flex items-center justify-center" style={{ width: "22%", background: withAlpha(VERDICT_COLORS.redemonstration, 0.15) }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: VERDICT_COLORS.redemonstration }}>MAJOR/RE-DEMO (60–81)</span>
                  </div>
                  <div className="flex items-center justify-center" style={{ width: "10%", background: withAlpha(VERDICT_COLORS.minor, 0.15) }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: VERDICT_COLORS.minor }}>MINOR (82–91)</span>
                  </div>
                  <div className="flex items-center justify-center" style={{ width: "9%", background: withAlpha(VERDICT_COLORS.pass, 0.15) }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: VERDICT_COLORS.pass }}>PASS (92+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION B: INDIVIDUAL EVALUATION ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<User size={20} />, "Section B — Individual Evaluation", "Per-student rating on a 1–5 scale across 3 criteria")}
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Criteria */}
              <div className="space-y-2">
                {INDIVIDUAL_CRITERIA.map(c => (
                  <div key={c.key} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.yellow, 0.06), color: DT.yellow }}>{c.icon}</div>
                    <div className="flex-1">
                      <div style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: DT.textTer }}>{c.desc}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 10, fontWeight: 700, background: withAlpha(DT.yellow, 0.06), color: DT.yellow }}>1–5</span>
                  </div>
                ))}
              </div>

              {/* Rating scale breakdown */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em", marginBottom: 8 }}>RATING SCALE DESCRIPTORS</div>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 4, 3, 2, 1].map(n => {
                    const r = RATING_LABELS[n];
                    const descs: Record<number, string> = {
                      5: "Exceptional mastery; articulates complex ideas with confidence and precision.",
                      4: "Demonstrates strong competence with only minor areas for growth.",
                      3: "Meets baseline expectations; shows adequate understanding.",
                      2: "Below expectations; noticeable gaps in understanding or delivery.",
                      1: "Significant deficiencies; unable to clearly communicate or defend work.",
                    };
                    return (
                      <div key={n} className="p-3 rounded-xl text-center" style={{ background: withAlpha(r.color, 0.04), border: `1px solid ${withAlpha(r.color, 0.1)}` }}>
                        <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1.5" style={{ background: withAlpha(r.color, 0.1) }}>
                          <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: r.color }}>{n}</span>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.label}</div>
                        <div style={{ fontSize: 9, color: DT.textTer, lineHeight: 1.4 }}>{descs[n]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual total */}
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: withAlpha(DT.yellow, 0.03), border: `1px solid ${withAlpha(DT.yellow, 0.1)}` }}>
                <Info size={12} style={{ color: DT.yellow }} />
                <span style={{ fontSize: 11, color: DT.textSec }}>
                  Max individual score per student: <strong style={{ color: DT.yellow }}>{INDIV_MAX_TOTAL} points</strong> ({INDIVIDUAL_CRITERIA.length} criteria × {INDIV_MAX_PER} max).
                  Each student is evaluated independently based on their personal defense performance.
                </span>
              </div>
            </div>
          </div>

          {/* ─── FINAL GRADE COMPUTATION ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<BarChart3 size={20} />, "Final Grade Computation", "How the overall capstone defense grade is calculated")}
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Weight formula */}
              <div className="flex items-center gap-3 justify-center p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                <div className="text-center">
                  <div style={{ fontFamily: FT.h, fontSize: 24, fontWeight: 800, color: DT.blue }}>60%</div>
                  <div style={{ fontSize: 10, color: DT.textTer, marginTop: 2 }}>Group Score</div>
                </div>
                <span style={{ fontSize: 20, color: DT.textDis }}>+</span>
                <div className="text-center">
                  <div style={{ fontFamily: FT.h, fontSize: 24, fontWeight: 800, color: DT.yellow }}>40%</div>
                  <div style={{ fontSize: 10, color: DT.textTer, marginTop: 2 }}>Individual Avg</div>
                </div>
                <span style={{ fontSize: 20, color: DT.textDis }}>=</span>
                <div className="text-center">
                  <div style={{ fontFamily: FT.h, fontSize: 24, fontWeight: 800, color: DT.purple }}>100%</div>
                  <div style={{ fontSize: 10, color: DT.textTer, marginTop: 2 }}>Defense Grade</div>
                </div>
              </div>

              {/* Composition */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em", marginBottom: 6 }}>OVERALL CAPSTONE GRADE (ALL EVALUATORS)</div>
                <div className="flex h-8 rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderHair}` }}>
                  {GRADE_COMPOSITION.map(gc => (
                    <div key={gc.label} className="flex items-center justify-center" style={{ width: `${gc.pct}%`, background: gc.color }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: gc.color === "#D6E4F0" ? "#1F3864" : "#FFFFFF" }}>{gc.label} ({gc.pct}%)</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                  <p style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.6 }}>
                    <strong style={{ color: DT.textSec }}>Your role as panelist</strong> covers only the Defense Activity portion (60%).
                    The Adviser's Grade (30%) and Coordinator's Grade (10%) are entered separately by those respective roles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── BEST PRACTICES ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<Sparkles size={20} />, "Best Practices & Reminders", "Tips for fair and consistent evaluation")}
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tipCard("🎯", "Be Objective", "Score based on observable evidence presented during the defense, not on personal rapport or group reputation.")}
                {tipCard("⚖️", "Apply Consistently", "Use the same standard across all groups. If you gave Group A's Chapter III a 20/25, apply the same rigor to Group B.")}
                {tipCard("📝", "Provide Feedback", "Written comments help students understand their scores. Use the Feedback tab for constructive general notes and specific revision items.")}
                {tipCard("🔒", "Score Independently", "Complete your scoring before discussing with fellow panelists during deliberation to avoid bias.")}
                {tipCard("⏱️", "Observe the Timeline", "Allow the group their full presentation time (60 min) and Q&A time (30 min) before assigning final scores.")}
                {tipCard("👤", "Evaluate Individually", "Section B is per student — some members may demonstrate stronger communication or organization skills than others.")}
              </div>
            </div>
          </div>

          {/* ─── DEFENSE FLOW REMINDER ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<Clock size={20} />, "Defense Format Timeline", "Standard defense structure per GU-CRD-032-04")}
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center gap-0">
                {DEFENSE_PHASES.map((phase, i) => {
                  const phaseDescs: Record<string, string> = {
                    "Presentation": "Group presents their capstone project, prototype/multimedia output, methodology, results, and conclusions.",
                    "Q&A": "Panel asks clarifying questions; individual students may be directed to respond. This is the longest phase.",
                    "Deliberation": "Panel privately discusses scores and arrives at the final group verdict.",
                    "Announcement": "Panel communicates the verdict and any revision requirements to the group.",
                  };
                  return (
                    <div key={phase.label} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}>{phase.icon}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: DT.textPri, textAlign: "center" as const }}>{phase.label}</span>
                        {phase.sublabel && <span style={{ fontSize: 9, color: DT.textTer, marginTop: -4 }}>{phase.sublabel}</span>}
                        <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: withAlpha(DT.blue, 0.06), color: DT.blue }}>{phase.duration} min</span>
                        <span className="text-center px-1 hidden sm:block" style={{ fontSize: 9, color: DT.textTer, lineHeight: 1.3 }}>{phaseDescs[phase.label]}</span>
                      </div>
                      {i < DEFENSE_PHASES.length - 1 && (
                        <ArrowRight size={16} className="shrink-0 mx-1" style={{ color: DT.textDis }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── KEYBOARD SHORTCUTS ─── */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              {sectionHeader(<Keyboard size={20} />, "Keyboard Shortcuts", "Speed up your grading workflow")}
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["1 – 5", "Rate current individual criterion"],
                  ["← →", "Switch between group members"],
                  ["Ctrl + Enter", "Open submission confirmation"],
                ] as const).map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    <kbd className="px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DT.borderDef}`, fontFamily: FT.m, fontSize: 11, fontWeight: 700, color: DT.textSec }}>{key}</kbd>
                    <span style={{ fontSize: 11, color: DT.textTer }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 flex justify-end rounded-b-2xl" style={{ background: DT.elevated, borderTop: `1px solid ${DT.borderHair}` }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl cursor-pointer transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${DT.blue}, #3B7AE8)`, color: "white", fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            Got it, start grading
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Group Selector (before session starts) ═══ */
function GroupSelector({ groups, onSelect, onShowGuidelines }: { groups: any[]; onSelect: (g: any) => void; onShowGuidelines: () => void }) {
  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
            <Monitor size={28} className="inline mr-2" style={{ color: DT.yellow }} />
            Defense Session
          </h1>
          <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Select a group to open the live defense grading cockpit.</p>
        </div>
        <button onClick={onShowGuidelines}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition hover:opacity-90 shrink-0 self-start"
          style={{ background: withAlpha(DT.blue, 0.06), border: `1px solid ${withAlpha(DT.blue, 0.15)}`, color: DT.blue, fontSize: 13, fontWeight: 600 }}>
          <BookOpen size={15} />
          Grading Guidelines
        </button>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Inbox size={48} style={{ color: DT.textDis }} />
          <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No Groups to Grade</h2>
          <p style={{ fontSize: 14, color: DT.textTer, textAlign: "center", maxWidth: 400 }}>
            All assigned groups have been graded, or you haven't been assigned to any defense panels yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const members = g.members || [];
            return (
              <button key={g.id || g.number} onClick={() => onSelect(g)}
                className="text-left rounded-2xl transition-all cursor-pointer hover:border-blue-500/30 group overflow-hidden"
                style={cardStyle}>
                {/* Group Photo Banner */}
                {g.photoUrl ? (
                  <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <img src={g.photoUrl} alt={`Group ${g.number || g.id}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: "center top" }} />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(12,15,26,0.95) 100%)" }} />
                  </div>
                ) : (
                  <div className="relative h-20 overflow-hidden" style={{ background: `linear-gradient(135deg, ${withAlpha(DT.blue, 0.08)}, ${withAlpha(DT.purple, 0.12)})` }}>
                    <div className="absolute inset-0 flex items-center justify-center" style={{ color: withAlpha(DT.blue, 0.08) }}>
                      <Monitor size={48} />
                    </div>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(12,15,26,0.95) 100%)" }} />
                  </div>
                )}
                <div className={`px-5 pb-5 ${g.photoUrl ? "pt-0 -mt-8 relative z-10" : "pt-0 -mt-4 relative z-10"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${DT.blue}, ${DT.purple})`, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                      <span style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: "white" }}>{g.number || g.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{g.name || `Group ${g.number || g.id}`}</span>
                        {g.isLeadPanelist && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0" style={{ background: withAlpha(DT.yellow, 0.1), border: `1px solid ${withAlpha(DT.yellow, 0.2)}` }}>
                            <Shield size={10} style={{ color: DT.yellow }} />
                            <span style={{ fontSize: 9, fontWeight: 800, color: DT.yellow, letterSpacing: "0.04em" }}>LEAD</span>
                          </span>
                        )}
                      </div>
                      {g.title && <div className="line-clamp-1" style={{ fontSize: 12, color: DT.textTer, maxWidth: 200 }}>{g.title}</div>}
                    </div>
                  </div>
                  {/* Grading progress indicator */}
                  {(g.gradingProgress ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg" style={{ background: withAlpha(DT.blue, 0.04), border: `1px solid ${withAlpha(DT.blue, 0.08)}` }}>
                      <Users size={12} style={{ color: DT.textTer }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: DT.textTer }}>{g.gradingProgress}/{g.totalPanelists || 3} panelists graded</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: DT.borderHair, minWidth: 32 }}>
                        <div className="h-full rounded-full" style={{ width: `${((g.gradingProgress || 0) / (g.totalPanelists || 3)) * 100}%`, background: DT.blue }} />
                      </div>
                    </div>
                  )}
                  {/* Member photos */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {members.slice(0, 5).map((m: any, i: number) => {
                      const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={m.name || i} className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                          style={{ background: m.avatarUrl ? "transparent" : DT.blue, border: `2px solid #0C0F1A`, marginLeft: i > 0 ? -6 : 0 }}>
                          {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 9, fontWeight: 700, color: "white" }}>{init}</span>}
                        </div>
                      );
                    })}
                    <span style={{ fontSize: 11, color: DT.textTer, marginLeft: 4 }}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 group-hover:gap-2.5 transition-all" style={{ fontSize: 13, fontWeight: 700, color: DT.yellow }}>
                    <Monitor size={16} /> Start Defense Session
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT — Defense Session Page
   ═══════════════════════════════════════════ */
export function PanelistDefenseSessionPage() {
  const [loading, setLoading] = useState(true);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [alreadyGraded, setAlreadyGraded] = useState<Set<number>>(new Set());
  const [defenses, setDefenses] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  /* Active tab: 0=Individual, 1=Group, 2=Feedback */
  const [activeTab, setActiveTab] = useState(0);

  /* (A) Defense info collapsed */
  const [defenseInfoOpen, setDefenseInfoOpen] = useState(false);

  /* Group scores (0 to maxPts each, -1 = not set) */
  const [groupScores, setGroupScores] = useState<Record<string, number>>({ results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 });

  /* Individual scores: { memberName: { communication: 1-5, organization: 1-5, effectiveness: 1-5 } } — 0 = not set */
  const [individualScores, setIndividualScores] = useState<Record<string, Record<string, number>>>({});
  const [activeMember, setActiveMember] = useState<string>("");

  /* Per-member notes */
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});

  /* Feedback */
  const [feedback, setFeedback] = useState("");
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);

  /* Submit state */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* (NEW) Confirmation modal */
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /* (NEW) Reset scores confirmation */
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /* (NEW) Auto-advance toggle */
  const [autoAdvance, setAutoAdvance] = useState(true);

  /* (NEW) Undo stack */
  const [lastAction, setLastAction] = useState<{ type: "group" | "individual"; key: string; member?: string; prev: number; ts: number } | null>(null);

  /* (NEW) Draft restore flag */
  const [draftRestored, setDraftRestored] = useState(false);

  /* (NEW) Session start time for duration tracking */
  const [sessionStartTime, setSessionStartTime] = useState(0);

  /* (NEW) Score pop animation key */
  const [scorePop, setScorePop] = useState<string>("");

  /* (NEW) Show keyboard shortcuts */
  const [showShortcuts, setShowShortcuts] = useState(false);

  /* (NEW) Grading guidelines panel */
  const [showGuidelines, setShowGuidelines] = useState(false);

  /* (NEW) Lead panelist + aggregated verdict state */
  const [isLeadPanelist, setIsLeadPanelist] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [totalPanelists, setTotalPanelists] = useState(3);
  const [defenseVerdict, setDefenseVerdict] = useState<any>(null);
  const [loadingVerdict, setLoadingVerdict] = useState(false);

  const members: any[] = selectedGroup?.members || [];
  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token!;

  /* (NEW) Panel sign-off */
  const [panelSignOff, setPanelSignOff] = useState<{ leadName: string; leadInitials: string; member1Name: string; member1Role: string; member2Name: string; member2Role: string }>({
    leadName: "", leadInitials: "", member1Name: "", member1Role: "Faculty", member2Name: "", member2Role: "Faculty",
  });

  /* Computed — Group score is out of 100 pts (GU-CRD-032-04) */
  const groupTotal = useMemo(() => {
    const vals = Object.values(groupScores).filter(v => v >= 0);
    return vals.reduce((s, v) => s + v, 0);
  }, [groupScores]);
  const groupMaxPossible = GROUP_MAX_TOTAL; // 100
  const groupComplete = useMemo(() => Object.values(groupScores).every(v => v >= 0), [groupScores]);
  const groupPct = groupComplete ? groupTotal : 0; // score IS the percentage (out of 100)

  const individualsComplete = members.length > 0 && members.every(m => {
    const scores = individualScores[m.name];
    if (!scores) return false;
    return INDIVIDUAL_CRITERIA.every(c => (scores[c.key] ?? 0) >= 1);
  });

  const membersGradedCount = members.filter(m => {
    const s = individualScores[m.name] || {};
    return INDIVIDUAL_CRITERIA.every(c => (s[c.key] ?? 0) >= 1);
  }).length;

  const allFilled = groupComplete && individualsComplete;

  /* Overall defense weighted % — group 60%, individual avg 40% (GU-CRD-032-04) */
  const overallPct = useMemo(() => {
    if (!allFilled) return 0;
    const gPct = groupTotal; // already out of 100
    const indivAvg = members.reduce((sum, m) => {
      const scores = individualScores[m.name] || {};
      const total = INDIVIDUAL_CRITERIA.reduce((s, c) => s + Math.max(0, scores[c.key] ?? 0), 0);
      return sum + (total / INDIV_MAX_TOTAL * 100);
    }, 0) / members.length;
    return gPct * 0.6 + indivAvg * 0.4;
  }, [allFilled, groupTotal, members, individualScores]);

  /* Verdict is based on GROUP score only (GU-CRD-032-04) */
  const verdictInfo = groupComplete ? computeVerdict(groupTotal) : null;

  /* Defense info for selected group */
  const defenseForGroup = useMemo(() => {
    if (!selectedGroup) return null;
    return defenses.find(d =>
      d.group === `Group ${selectedGroup.number}` || d.group === selectedGroup.name
    ) || null;
  }, [selectedGroup, defenses]);

  /* Active member scores */
  const activeScores = individualScores[activeMember] || {};
  const activeMemberTotal = INDIVIDUAL_CRITERIA.reduce((s, c) => s + Math.max(0, activeScores[c.key] ?? 0), 0);
  const activeMemberFilled = INDIVIDUAL_CRITERIA.every(c => (activeScores[c.key] ?? 0) >= 1);
  const activeMemberAvg = activeMemberFilled ? (activeMemberTotal / INDIVIDUAL_CRITERIA.length).toFixed(1) : null;

  /* ─── Fetch ─── */
  const fetchData = useCallback(async () => {
    try {
      const [gradeRes, defenseRes] = await Promise.all([
        apiFetch<any>("/grades/my"),
        apiFetch<any>("/defenses"),
      ]);
      setAssignedGroups(gradeRes.assignedGroups || []);
      const gradedIds = new Set<number>((gradeRes.grades || []).map((g: any) => g.groupId));
      setAlreadyGraded(gradedIds);
      setDefenses(defenseRes.defenses || []);
    } catch (err) { console.error("Failed to fetch defense session data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Initialize individual scores when group is selected */
  useEffect(() => {
    if (selectedGroup?.members) {
      const init: Record<string, Record<string, number>> = {};
      const notes: Record<string, string> = {};
      for (const m of selectedGroup.members) {
        init[m.name] = { communication: 0, organization: 0, effectiveness: 0 };
        notes[m.name] = "";
      }
      setIndividualScores(init);
      setMemberNotes(notes);
      setActiveMember(selectedGroup.members[0]?.name || "");
    }
  }, [selectedGroup]);

  /* (NEW) Record session start time + lead panelist check when group is selected */
  useEffect(() => {
    if (selectedGroup) {
      setSessionStartTime(Date.now());
      setIsLeadPanelist(selectedGroup.isLeadPanelist ?? false);
      setGradingProgress(selectedGroup.gradingProgress ?? 0);
      setTotalPanelists(selectedGroup.totalPanelists ?? 3);
    }
  }, [selectedGroup]);

  /* (NEW) Draft Auto-Save — every 5 seconds to localStorage */
  const draftKey = selectedGroup ? `defense-draft-${selectedGroup.id}` : "";
  useEffect(() => {
    if (!selectedGroup || submitted) return;
    const hasAnyScore = Object.values(groupScores).some(v => v >= 0) ||
      Object.values(individualScores).some(s => Object.values(s).some(v => v >= 0));
    if (!hasAnyScore) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          groupScores, individualScores, memberNotes, feedback, revisions, activeTab, activeMember, ts: Date.now(),
        }));
      } catch {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [groupScores, individualScores, memberNotes, feedback, revisions, activeTab, activeMember, selectedGroup, submitted, draftKey]);

  /* (NEW) Draft Restore — on group selection, check localStorage */
  useEffect(() => {
    if (!selectedGroup || draftRestored) return;
    try {
      const raw = localStorage.getItem(`defense-draft-${selectedGroup.id}`);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const ageMin = (Date.now() - (draft.ts || 0)) / 60000;
      if (ageMin > 120) { localStorage.removeItem(`defense-draft-${selectedGroup.id}`); return; }
      setGroupScores(draft.groupScores || { results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 });
      setIndividualScores(draft.individualScores || {});
      setMemberNotes(draft.memberNotes || {});
      setFeedback(draft.feedback || "");
      setRevisions(draft.revisions || []);
      if (draft.activeTab != null) setActiveTab(draft.activeTab);
      if (draft.activeMember) setActiveMember(draft.activeMember);
      setDraftRestored(true);
      toast.success(`Draft restored from ${Math.round(ageMin)} minute${Math.round(ageMin) !== 1 ? "s" : ""} ago`, {
        action: {
          label: "Discard Draft",
          onClick: () => {
            localStorage.removeItem(`defense-draft-${selectedGroup.id}`);
            setGroupScores({ results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 });
            const init: Record<string, Record<string, number>> = {};
            const notes: Record<string, string> = {};
            for (const m of selectedGroup.members || []) { init[m.name] = { communication: 0, organization: 0, effectiveness: 0 }; notes[m.name] = ""; }
            setIndividualScores(init);
            setMemberNotes(notes);
            setFeedback(""); setRevisions([]);
            setActiveTab(0); setActiveMember(selectedGroup.members?.[0]?.name || "");
            toast.info("Draft discarded — starting fresh.");
          },
        },
      });
    } catch {}
  }, [selectedGroup]);

  /* (NEW) Unsaved Changes Guard — beforeunload */
  const hasUnsavedWork = useMemo(() => {
    return Object.values(groupScores).some(v => v >= 0) ||
      Object.values(individualScores).some(s => Object.values(s).some(v => v >= 0)) ||
      feedback.trim().length > 0;
  }, [groupScores, individualScores, feedback]);

  useEffect(() => {
    if (!hasUnsavedWork || submitted) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedWork, submitted]);

  /* (NEW) Auto-advance: when a member's 3 criteria are all filled, advance to next ungraded */
  const prevIndivScoresRef = useRef(individualScores);
  useEffect(() => {
    if (!autoAdvance || !activeMember || !selectedGroup) return;
    const prev = prevIndivScoresRef.current;
    const curr = individualScores;
    prevIndivScoresRef.current = curr;
    // Check if current member just became fully graded
    const currScores = curr[activeMember] || {};
    const prevScores = prev[activeMember] || {};
    const nowFilled = INDIVIDUAL_CRITERIA.every(c => (currScores[c.key] ?? 0) >= 1);
    const wasFilled = INDIVIDUAL_CRITERIA.every(c => (prevScores[c.key] ?? 0) >= 1);
    if (nowFilled && !wasFilled) {
      const nextUngraded = members.find(mm => {
        if (mm.name === activeMember) return false;
        const s = curr[mm.name] || {};
        return !INDIVIDUAL_CRITERIA.every(c => (s[c.key] ?? 0) >= 1);
      });
      if (nextUngraded) {
        const name = nextUngraded.name;
        setTimeout(() => {
          setActiveMember(name);
          toast.success(`✓ ${activeMember.split(" ")[0]} graded — moving to ${name.split(" ")[0]}`, { duration: 2000 });
        }, 600);
      }
    }
  }, [individualScores, activeMember, autoAdvance, members, selectedGroup]);

  /* (NEW) Keyboard shortcuts */
  useEffect(() => {
    if (!selectedGroup || submitted) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // 0-4: set score for focused criterion (active tab)
      if (activeTab === 0 && activeMember && /^[1-5]$/.test(e.key)) {
        const n = parseInt(e.key);
        // Find first unfilled criterion for active member
        const scores = individualScores[activeMember] || {};
        const unfilledC = INDIVIDUAL_CRITERIA.find(c => (scores[c.key] ?? 0) < 1);
        if (unfilledC) {
          const prev = scores[unfilledC.key] ?? 0;
          setLastAction({ type: "individual", key: unfilledC.key, member: activeMember, prev, ts: Date.now() });
          setIndividualScores(p => ({ ...p, [activeMember]: { ...p[activeMember], [unfilledC.key]: n } }));
          setScorePop(`indiv-${activeMember}-${unfilledC.key}`);
          e.preventDefault();
        }
      }
      /* Group tab uses point-based number inputs — no keyboard shortcuts */
      // Arrow left/right to switch members (in individual tab)
      if (activeTab === 0 && members.length > 1) {
        const idx = members.findIndex(m => m.name === activeMember);
        if (e.key === "ArrowRight" && idx < members.length - 1) { setActiveMember(members[idx + 1].name); e.preventDefault(); }
        if (e.key === "ArrowLeft" && idx > 0) { setActiveMember(members[idx - 1].name); e.preventDefault(); }
      }
      // Ctrl+Enter to open submit modal
      if (e.ctrlKey && e.key === "Enter" && allFilled) { setShowConfirmModal(true); e.preventDefault(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedGroup, submitted, activeTab, activeMember, individualScores, groupScores, members, allFilled]);

  /* (NEW) Undo handler */
  const handleUndo = useCallback(() => {
    if (!lastAction) return;
    if (lastAction.type === "group") {
      setGroupScores(p => ({ ...p, [lastAction.key]: lastAction.prev }));
    } else if (lastAction.type === "individual" && lastAction.member) {
      setIndividualScores(p => ({ ...p, [lastAction.member!]: { ...p[lastAction.member!], [lastAction.key]: lastAction.prev } }));
    }
    setLastAction(null);
    toast.info("Score reverted.");
  }, [lastAction]);

  /* (NEW) Clear undo after 5 seconds */
  useEffect(() => {
    if (!lastAction) return;
    const timer = setTimeout(() => setLastAction(null), 5000);
    return () => clearTimeout(timer);
  }, [lastAction]);

  /* (NEW) Projected verdict — compute even when only partial scores exist */
  const projectedVerdict = useMemo(() => {
    const hasGroup = Object.values(groupScores).some(v => v >= 0);
    const hasIndiv = Object.values(individualScores).some(s => Object.values(s).some(v => v >= 1));
    if (!hasGroup && !hasIndiv) return null;
    if (allFilled) return null; // Use actual verdict instead
    // Project group score based on filled criteria (scale to 100)
    let projGroupScore = 50; // default midpoint
    const filledCriteria = GROUP_CRITERIA.filter(c => (groupScores[c.key] ?? -1) >= 0);
    if (filledCriteria.length > 0) {
      const filledTotal = filledCriteria.reduce((s, c) => s + groupScores[c.key], 0);
      const filledMax = filledCriteria.reduce((s, c) => s + c.maxPts, 0);
      projGroupScore = (filledTotal / filledMax) * 100;
    }
    const v = computeVerdict(projGroupScore);
    return { ...v, pct: projGroupScore, isPartial: true };
  }, [groupScores, individualScores, members, allFilled]);

  /* ─── Reset all scores (keeps group selected) ─── */
  const handleResetScores = useCallback(() => {
    setGroupScores({ results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 });
    setIndividualScores({});
    setMemberNotes({});
    setFeedback("");
    setRevisions([]);
    setActiveTab(0);
    setLastAction(null);
    setShowResetConfirm(false);
    if (draftKey) localStorage.removeItem(draftKey);
    toast.success("All scores have been reset.");
  }, [draftKey]);

  /* ─── Submit ─── */
  const handleSubmit = useCallback(async () => {
    if (!allFilled) { toast.error("Please complete all scores before submitting."); return; }
    setSubmitting(true);
    try {
      const token = await getToken();
      const vi = computeVerdict(groupTotal);
      const res = await apiFetch<any>("/grades", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroup.id,
          groupNumber: selectedGroup.number || selectedGroup.id,
          groupTitle: selectedGroup.title || selectedGroup.name,
          scores: groupScores,
          groupScores,
          groupTotal,
          individualScores,
          memberNotes,
          weightedTotal: overallPct,
          verdict: vi.verdict,
          feedback,
          revisions,
          panelSignOff,
        }),
      }, token);
      // Capture lead panelist + aggregated verdict from response
      setIsLeadPanelist(res.isLeadPanelist ?? (selectedGroup.isLeadPanelist ?? false));
      setGradingProgress(res.gradingProgress ?? 0);
      setTotalPanelists(res.totalPanelists ?? 3);
      if (res.defenseVerdict) setDefenseVerdict(res.defenseVerdict);
      toast.success("Defense grade submitted successfully!");
      setSubmitted(true);
      setShowConfirmModal(false);
      // Clear draft from localStorage
      try { localStorage.removeItem(`defense-draft-${selectedGroup.id}`); } catch {}
    } catch (err: any) {
      console.error("Grade submission error:", err);
      toast.error(err.message || "Failed to submit grade.");
    } finally { setSubmitting(false); }
  }, [allFilled, overallPct, selectedGroup, groupScores, individualScores, memberNotes, feedback, revisions]);

  /* ─── Refresh verdict (lead panelist polls for other panelists) ─── */
  const refreshVerdict = useCallback(async () => {
    if (!selectedGroup) return;
    setLoadingVerdict(true);
    try {
      const gn = selectedGroup.number || selectedGroup.id;
      const res = await apiFetch<any>(`/defense-verdict/${gn}`);
      if (res.complete && res.verdict) {
        setDefenseVerdict(res.verdict);
        setGradingProgress(res.verdict.panelistCount || 3);
        toast.success("All panelists have graded! Final score is ready.");
      } else {
        // Check progress
        const gradesRes = await apiFetch<any>(`/grades/group/${gn}`);
        setGradingProgress(gradesRes.grades?.length || gradingProgress);
        toast.info(`${gradesRes.grades?.length || gradingProgress}/${totalPanelists} panelists have submitted.`);
      }
    } catch (err) { console.error("Verdict refresh error:", err); }
    finally { setLoadingVerdict(false); }
  }, [selectedGroup, gradingProgress, totalPanelists]);

  /* ─── Print / Export Final Score Sheet ─── */
  const handlePrintScoreSheet = useCallback(() => {
    const dv = defenseVerdict;
    if (!dv || !selectedGroup) return;
    const dvV = computeVerdict(dv.averageScore ?? 0);
    const groupLabel = selectedGroup.name || `Group ${selectedGroup.number || selectedGroup.id}`;
    const groupTitle = selectedGroup.title || dv.groupTitle || "";
    const now = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });

    const criteriaRows = GROUP_CRITERIA.map(c => {
      const avg = dv.averageCriteria?.[c.key];
      return `<tr><td style="padding:6px 12px;border:1px solid #ddd">${c.label}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${avg != null ? avg.toFixed(1) : "—"}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${c.maxPts}</td></tr>`;
    }).join("");

    const panelistRows = (dv.panelists || []).map((p: any, i: number) => {
      const pv = computeVerdict(p.score ?? 0);
      return `<tr><td style="padding:6px 12px;border:1px solid #ddd">${p.name}${i === 0 ? " (Lead)" : ""}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${(p.score ?? 0).toFixed(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${pv.label}</td></tr>`;
    }).join("");

    const memberRows = Object.entries(dv.memberIndividualAverages || {}).map(([name, scores]: [string, any]) => {
      const vals = Object.values(scores).filter((v: any) => v > 0) as number[];
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const cells = INDIVIDUAL_CRITERIA.map(c => `<td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${(scores[c.key] ?? 0).toFixed(1)}</td>`).join("");
      return `<tr><td style="padding:6px 12px;border:1px solid #ddd">${name}</td>${cells}<td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-weight:700">${avg.toFixed(2)}</td></tr>`;
    }).join("");

    const indivHeaders = INDIVIDUAL_CRITERIA.map(c => `<th style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5">${c.label}</th>`).join("");

    const signatureRow = `
      <div style="display:flex;gap:40px;margin-top:48px">
        <div style="flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:12px">Lead Panelist Signature</div>
        <div style="flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:12px">Panel Member 1</div>
        <div style="flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:12px">Panel Member 2</div>
      </div>
    `;

    const html = `<!DOCTYPE html><html><head><title>Defense Score Sheet — ${groupLabel}</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 0.75in; } }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 22px; margin-bottom: 4px; } h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; }
        th { padding: 6px 12px; border: 1px solid #ddd; background: #f5f5f5; text-align: left; font-weight: 700; }
        .verdict-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 16px 24px; text-align: center; margin: 16px 0; }
        .verdict-label { font-size: 24px; font-weight: 800; color: #166534; } .verdict-score { font-size: 18px; color: #333; }
        .meta { font-size: 12px; color: #666; }
      </style></head><body>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div><h1>CAPSTONE DEFENSE — FINAL SCORE SHEET</h1><p class="meta">STI College San Fernando &bull; Hue We Are</p></div>
        <div style="text-align:right"><p class="meta">Generated: ${now}</p></div>
      </div>
      <hr style="margin:12px 0 16px;border:none;border-top:2px solid #333" />

      <div style="display:flex;gap:24px;margin-bottom:12px">
        <div><strong>Group:</strong> ${groupLabel}</div>
        ${groupTitle ? `<div><strong>Title:</strong> ${groupTitle}</div>` : ""}
        <div><strong>Panelists:</strong> ${dv.panelistCount || totalPanelists}</div>
      </div>

      <div class="verdict-box">
        <div class="verdict-label">${dvV.label}</div>
        <div class="verdict-score">Averaged Score: ${(dv.averageScore ?? 0).toFixed(1)} / ${GROUP_MAX_TOTAL} &bull; Numerical Grade: ${dvV.numericalGrade}</div>
      </div>

      <h2>Section A — Group Evaluation (Averaged)</h2>
      <table><thead><tr><th>Criterion</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Max</th></tr></thead><tbody>${criteriaRows}
        <tr style="font-weight:700;background:#f9fafb"><td style="padding:6px 12px;border:1px solid #ddd">TOTAL</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${(dv.averageScore ?? 0).toFixed(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${GROUP_MAX_TOTAL}</td></tr>
      </tbody></table>

      <h2>Per-Panelist Scores</h2>
      <table><thead><tr><th>Panelist</th><th style="text-align:center">Weighted Total</th><th style="text-align:center">Verdict</th></tr></thead><tbody>${panelistRows}</tbody></table>

      ${memberRows ? `<h2>Section B — Individual Evaluation (Averaged)</h2>
      <table><thead><tr><th>Member</th>${indivHeaders}<th style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5">Avg</th></tr></thead><tbody>${memberRows}</tbody></table>` : ""}

      ${signatureRow}
      <p class="meta" style="margin-top:32px;text-align:center">This score sheet was auto-generated by Hue We Are Defense Grading System. Panelists should verify and sign above.</p>
    </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 400);
    } else {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
    }
  }, [defenseVerdict, selectedGroup, totalPanelists]);

  /* ─── Reset for another group ─── */
  const handleReset = useCallback(() => {
    setSubmitted(false);
    setSelectedGroup(null);
    setGroupScores({ results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 });
    setIndividualScores({});
    setMemberNotes({});
    setFeedback("");
    setRevisions([]);
    setActiveTab(0);
    setDraftRestored(false);
    setLastAction(null);
    setShowConfirmModal(false);
    setPanelSignOff({ leadName: "", leadInitials: "", member1Name: "", member1Role: "Faculty", member2Name: "", member2Role: "Faculty" });
    setDefenseVerdict(null); setGradingProgress(0); setIsLeadPanelist(false);
    fetchData();
  }, [fetchData]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3" style={{ fontFamily: FT.b }}>
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14 }}>Loading defense data...</span>
      </div>
    );
  }

  /* ─── Submitted Success ─── */
  if (submitted) {
    const allPanelistsDone = gradingProgress >= totalPanelists;
    const dv = defenseVerdict;
    const dvVerdict = dv ? computeVerdict(dv.averageScore ?? 0) : null;
    return (
      <div className="max-w-[680px] mx-auto py-16 space-y-5" style={{ fontFamily: FT.b, animation: "dsvFade 400ms ease-out" }}>
        <style>{KF}</style>

        {/* ── Your Submission Card ── */}
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: DT.successDim }}>
            <Award size={36} style={{ color: DT.success }} />
          </div>
          <h2 style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 700, color: DT.textPri }}>Grade Submitted!</h2>
          <p className="mt-2" style={{ fontSize: 14, color: DT.textSec, maxWidth: 400, margin: "8px auto 0" }}>
            Your defense grade for <strong style={{ color: DT.textPri }}>Group {selectedGroup?.number || selectedGroup?.id}</strong> has been recorded.
          </p>
          {sessionStartTime > 0 && (() => {
            const durMin = Math.floor((Date.now() - sessionStartTime) / 60000);
            const durSec = Math.floor(((Date.now() - sessionStartTime) % 60000) / 1000);
            return (
              <div className="mt-2 flex items-center justify-center gap-1.5" style={{ fontSize: 12, color: DT.textTer }}>
                <Timer size={13} /> Session lasted {durMin > 0 ? `${durMin}m ` : ""}{durSec}s
              </div>
            );
          })()}
          {verdictInfo && (
            <div className="mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: withAlpha(verdictInfo.color, 0.05), border: `1px solid ${withAlpha(verdictInfo.color, 0.13)}` }}>
              <span style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: verdictInfo.color }}>{verdictInfo.label}</span>
              <span style={{ fontSize: 14, color: DT.textTer }}>({verdictInfo.numericalGrade})</span>
              <span style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: verdictInfo.color }}>{groupTotal}/{GROUP_MAX_TOTAL}</span>
            </div>
          )}

          {/* Panelist grading progress bar */}
          <div className="mt-5 px-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users size={14} style={{ color: DT.textTer }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: DT.textTer }}>{gradingProgress}/{totalPanelists} Panelists Graded</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mx-auto max-w-[200px]" style={{ background: DT.borderHair }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${(gradingProgress / totalPanelists) * 100}%`,
                background: allPanelistsDone ? DT.success : `linear-gradient(90deg, ${DT.blue}, ${DT.purple})`,
              }} />
            </div>
            {allPanelistsDone && (
              <div className="mt-2 flex items-center justify-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: DT.success }}>
                <CheckCircle2 size={13} /> All panelists have submitted
              </div>
            )}
          </div>
        </div>

        {/* ── Lead Panelist: Final Aggregated Score Card ── */}
        {isLeadPanelist && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}`, background: withAlpha(DT.yellow, 0.03) }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.yellow, 0.1), color: DT.yellow }}><Shield size={18} /></div>
              <div className="flex-1">
                <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Lead Panelist — Final Score</h3>
                <p style={{ fontSize: 12, color: DT.textTer }}>Only you can view and announce the averaged final score to the group</p>
              </div>
              {!allPanelistsDone && (
                <button onClick={refreshVerdict} disabled={loadingVerdict}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:opacity-90 disabled:opacity-50"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
                  {loadingVerdict ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Refresh
                </button>
              )}
            </div>

            {allPanelistsDone && dv ? (
              <div className="px-6 py-6">
                {/* Aggregated verdict banner */}
                <div className="text-center mb-6">
                  <div className="text-center mb-2">
                    <span className="px-3 py-1 rounded-full" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: dvVerdict?.color || DT.textPri, background: withAlpha(dvVerdict?.color || DT.blue, 0.08), border: `1px solid ${withAlpha(dvVerdict?.color || DT.blue, 0.15)}` }}>
                      OFFICIAL DEFENSE VERDICT
                    </span>
                  </div>
                  <div style={{ fontFamily: FT.h, fontSize: 36, fontWeight: 800, color: dvVerdict?.color || DT.textPri }}>
                    {dvVerdict?.label || dv.majorityVerdict?.toUpperCase() || "—"}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <div>
                      <span style={{ fontSize: 11, color: DT.textDis }}>AVG SCORE</span>
                      <div style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 800, color: DT.textPri }}>{(dv.averageScore ?? 0).toFixed(1)}<span style={{ fontSize: 16, color: DT.textTer }}>/{GROUP_MAX_TOTAL}</span></div>
                    </div>
                    <div className="w-px h-10" style={{ background: DT.borderDef }} />
                    <div>
                      <span style={{ fontSize: 11, color: DT.textDis }}>PANELISTS</span>
                      <div style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 800, color: DT.textPri }}>{dv.panelistCount || totalPanelists}<span style={{ fontSize: 16, color: DT.textTer }}>/{totalPanelists}</span></div>
                    </div>
                  </div>
                </div>

                {/* Per-panelist breakdown */}
                <div className="space-y-2 mb-5">
                  <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em" }}>PANELIST SCORES</div>
                  {(dv.panelists || []).map((p: any, i: number) => {
                    const pv = computeVerdict(p.score ?? 0);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: withAlpha(i === 0 ? DT.yellow : DT.blue, 0.1), color: i === 0 ? DT.yellow : DT.blue }}>
                          {i === 0 ? <Shield size={14} /> : <User size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{p.name}</span>
                            {i === 0 && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 8, fontWeight: 700, color: DT.yellow, background: withAlpha(DT.yellow, 0.1) }}>LEAD</span>}
                          </div>
                          <span style={{ fontSize: 11, color: DT.textTer }}>{pv.label}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: pv.color }}>{(p.score ?? 0).toFixed(1)}</span>
                          <span style={{ fontSize: 11, color: DT.textDis }}>/{GROUP_MAX_TOTAL}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-criteria averages */}
                {dv.averageCriteria && Object.keys(dv.averageCriteria).length > 0 && (
                  <div className="mb-5">
                    <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em", marginBottom: 8 }}>AVERAGED CRITERIA SCORES</div>
                    <div className="space-y-2">
                      {GROUP_CRITERIA.map(c => {
                        const avg = dv.averageCriteria[c.key];
                        if (avg == null) return null;
                        const pct = Math.round((avg / c.maxPts) * 100);
                        const barColor = pct >= 92 ? VERDICT_COLORS.pass : pct >= 82 ? VERDICT_COLORS.minor : pct >= 60 ? VERDICT_COLORS.redemonstration : VERDICT_COLORS.failed;
                        return (
                          <div key={c.key} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ color: DT.textTer }}>{c.icon}</div>
                            <span className="flex-1 truncate" style={{ fontSize: 12, color: DT.textSec }}>{c.label}</span>
                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: DT.borderHair }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri, width: 52, textAlign: "right" }}>{avg.toFixed(1)}/{c.maxPts}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member individual averages */}
                {dv.memberIndividualAverages && Object.keys(dv.memberIndividualAverages).length > 0 && (
                  <div className="mb-5">
                    <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em", marginBottom: 8 }}>INDIVIDUAL AVERAGES (PER MEMBER)</div>
                    <div className="space-y-2">
                      {Object.entries(dv.memberIndividualAverages).map(([name, scores]: [string, any]) => {
                        const vals = Object.values(scores).filter((v: any) => v > 0) as number[];
                        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                        return (
                          <div key={name} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.yellow, 0.08), color: DT.yellow }}>
                              <span style={{ fontSize: 10, fontWeight: 700 }}>{name.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                            </div>
                            <span className="flex-1 truncate" style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>{name}</span>
                            {INDIVIDUAL_CRITERIA.map(c => (
                              <div key={c.key} className="text-center" style={{ minWidth: 40 }}>
                                <div style={{ fontSize: 9, color: DT.textDis }}>{c.label.split(" ")[0].slice(0, 4)}</div>
                                <div style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: (scores[c.key] ?? 0) > 0 ? DT.yellow : DT.textDis }}>{(scores[c.key] ?? 0).toFixed(1)}</div>
                              </div>
                            ))}
                            <div className="text-center pl-2" style={{ borderLeft: `1px solid ${DT.borderHair}`, minWidth: 40 }}>
                              <div style={{ fontSize: 9, color: DT.textDis }}>AVG</div>
                              <div style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: DT.yellow }}>{avg.toFixed(1)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Announcement reminder + Print */}
                <div className="p-4 rounded-xl text-center" style={{ background: withAlpha(DT.yellow, 0.04), border: `1px solid ${withAlpha(DT.yellow, 0.12)}` }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Mic size={14} style={{ color: DT.yellow }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: DT.yellow }}>Ready to Announce</span>
                  </div>
                  <p style={{ fontSize: 12, color: DT.textTer, marginBottom: 12 }}>
                    As Lead Panelist, you may now announce the official defense verdict and averaged score to the group.
                  </p>
                  <button onClick={handlePrintScoreSheet}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: `1px solid ${withAlpha(DT.yellow, 0.25)}`, color: DT.yellow, fontSize: 13, fontWeight: 700, boxShadow: `0 2px 12px ${withAlpha(DT.yellow, 0.1)}` }}>
                    <Printer size={15} /> Print / Export Score Sheet
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: withAlpha(DT.blue, 0.06) }}>
                  <Clock size={28} style={{ color: DT.blue }} />
                </div>
                <h4 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Waiting for Other Panelists</h4>
                <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>
                  {gradingProgress}/{totalPanelists} panelists have submitted their grades.
                  The final aggregated score will appear here once all panelists have graded.
                </p>
                <button onClick={refreshVerdict} disabled={loadingVerdict}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50 mx-auto"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                  {loadingVerdict ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Check Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Non-lead panelists: info message ── */}
        {!isLeadPanelist && (
          <div className="rounded-2xl p-6 text-center" style={cardStyle}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Info size={16} style={{ color: DT.blue }} />
              <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>Final Score Announcement</span>
            </div>
            <p style={{ fontSize: 13, color: DT.textTer, lineHeight: 1.6 }}>
              The <strong style={{ color: DT.yellow }}>Lead Panelist</strong> will review and announce the final averaged defense score once all {totalPanelists} panelists have submitted their grades.
            </p>
          </div>
        )}

        {/* Grade Another Group button */}
        <div className="text-center">
          <button onClick={handleReset}
            className="px-6 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700 }}>
            Grade Another Group
          </button>
        </div>
      </div>
    );
  }

  /* ─── Group Selection ─── */
  const ungradedGroups = assignedGroups.filter(g => !alreadyGraded.has(g.id));

  if (!selectedGroup) {
    return (
      <div style={{ animation: "dsvFade 400ms ease-out" }}>
        <style>{KF}</style>
        <GroupSelector groups={ungradedGroups} onSelect={setSelectedGroup} onShowGuidelines={() => setShowGuidelines(true)} />
        {alreadyGraded.size > 0 && (
          <div className="mt-6 px-4 py-3 rounded-xl" style={{ background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: DT.success }}>
              <CheckCircle2 size={14} className="inline mr-1.5" />
              You have graded {alreadyGraded.size} group{alreadyGraded.size !== 1 ? "s" : ""} already.
            </span>
          </div>
        )}
        <GradingGuidelinesPanel open={showGuidelines} onClose={() => setShowGuidelines(false)} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     LIVE DEFENSE GRADING VIEW
     ═══════════════════════════════════════════ */
  const TABS = [
    { label: "Individual", icon: <User size={14} />, color: DT.yellow, done: individualsComplete, badge: `${membersGradedCount}/${members.length}` },
    { label: "Group", icon: <Users size={14} />, color: DT.blue, done: groupComplete, badge: groupComplete ? `${groupTotal}/${groupMaxPossible}` : null },
    { label: "Feedback", icon: <MessageSquare size={14} />, color: DT.purple, done: feedback.trim().length > 0, badge: revisions.length > 0 ? `${revisions.length}` : null },
  ];

  /* Progress for floating pill (D) */
  const progressSteps = [
    { done: individualsComplete, color: DT.yellow, label: "Individual" },
    { done: groupComplete, color: DT.blue, label: "Group" },
    { done: feedback.trim().length > 0, color: DT.purple, label: "Feedback" },
  ];

  /* ─── Active member data for individual tab ─── */
  const activeM = members.find(mm => mm.name === activeMember);
  const activeInit = activeM ? (activeM.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "";
  const memberScoresPct = activeMemberFilled ? (activeMemberTotal / INDIV_MAX_TOTAL * 100).toFixed(0) : null;

  return (
    <div className="flex flex-col" style={{ fontFamily: FT.b, animation: "dsvFade 400ms ease-out", minHeight: "calc(100vh - 140px)", paddingBottom: 80 }}>
      <style>{KF}</style>

      {/* ═══ (A) COMPACT HEADER RIBBON — 56px single bar ═══ */}
      <div className="flex items-center gap-3 mb-4 px-1 py-2 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}`, minHeight: 56 }}>
        {/* Back — with unsaved guard */}
        <button onClick={() => {
          if (hasUnsavedWork) {
            if (!window.confirm("You have unsaved grades. Discard and go back?")) return;
            try { localStorage.removeItem(`defense-draft-${selectedGroup.id}`); } catch {}
          }
          setSelectedGroup(null); setGroupScores({ results: -1, discussion: -1, output: -1, presentation: -1, qa: -1 }); setIndividualScores({}); setMemberNotes({}); setFeedback(""); setRevisions([]); setActiveTab(0); setDraftRestored(false);
        }}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06] shrink-0 ml-1"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}>
          <ChevronLeft size={18} />
        </button>

        {/* Group badge + name */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${DT.blue}, ${DT.purple})` }}>
          <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 800, color: "white" }}>{selectedGroup.number || selectedGroup.id}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
            {selectedGroup.name || `Group ${selectedGroup.number || selectedGroup.id}`}
          </div>
          {selectedGroup.title && <div className="truncate" style={{ fontSize: 11, color: DT.textTer }}>{selectedGroup.title}</div>}
        </div>

        {/* Defense info toggle (A) */}
        {defenseForGroup && (
          <div className="relative">
            <button onClick={() => setDefenseInfoOpen(!defenseInfoOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
              style={{ border: `1px solid ${defenseInfoOpen ? DT.blue : DT.borderDef}`, color: defenseInfoOpen ? DT.blue : DT.textTer }}
              title="Defense details">
              <Info size={14} />
            </button>
            {defenseInfoOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 p-3 rounded-xl w-60"
                style={{ background: DT.elevated, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg, animation: "dsvFade 150ms ease-out" }}>
                <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em" }}>DEFENSE DETAILS</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2" style={{ fontSize: 12, color: DT.textSec }}>
                    <Clock size={13} style={{ color: DT.blue }} /> {defenseForGroup.date} at {defenseForGroup.time}
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: 12, color: DT.textSec }}>
                    <MapPin size={13} style={{ color: DT.yellow }} /> {defenseForGroup.room}
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: 12, color: DT.textSec }}>
                    <Video size={13} style={{ color: DT.purple }} /> {defenseForGroup.mode}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-8 shrink-0" style={{ background: DT.borderDef }} />

        {/* Timer */}
        <ElapsedTimer />

        {/* Divider */}
        <div className="w-px h-8 shrink-0 hidden sm:block" style={{ background: DT.borderDef }} />

        {/* Rating legend tooltip (E) */}
        <div className="hidden sm:block">
          <RatingLegendTooltip />
        </div>

        {/* Grading Guidelines button */}
        <button onClick={() => setShowGuidelines(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06] shrink-0"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}
          title="Grading Guidelines">
          <BookOpen size={14} />
        </button>

        {/* Live / Projected verdict badge */}
        {(() => {
          const vd = allFilled && verdictInfo ? { color: verdictInfo.color, label: verdictInfo.label, pct: `${groupTotal}/${GROUP_MAX_TOTAL}`, partial: false }
            : projectedVerdict ? { color: projectedVerdict.color, label: projectedVerdict.label, pct: projectedVerdict.pct.toFixed(1), partial: true } : null;
          if (!vd) return null;
          return (
            <>
              <div className="w-px h-8 shrink-0 hidden lg:block" style={{ background: DT.borderDef }} />
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl mr-1" style={{ background: withAlpha(vd.color, 0.05), border: `1px solid ${withAlpha(vd.color, 0.13)}` }}>
                {vd.partial && <Eye size={11} style={{ color: DT.textDis }} />}
                <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 800, color: vd.color, opacity: vd.partial ? 0.7 : 1 }}>{vd.partial ? "~" : ""}{vd.label}</span>
                <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: vd.color, opacity: vd.partial ? 0.7 : 1 }}>{vd.pct}%</span>
              </div>
            </>
          );
        })()}

        {/* Keyboard shortcuts button */}
        <div className="relative hidden sm:block">
          <button onClick={() => setShowShortcuts(!showShortcuts)}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
            style={{ border: `1px solid ${showShortcuts ? DT.blue : DT.borderDef}`, color: showShortcuts ? DT.blue : DT.textTer }}
            title="Keyboard shortcuts">
            <Keyboard size={14} />
          </button>
          {showShortcuts && (
            <div className="absolute top-full right-0 mt-2 z-50 p-3 rounded-xl w-56"
              style={{ background: DT.elevated, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg, animation: "dsvFade 150ms ease-out" }}>
              <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em" }}>KEYBOARD SHORTCUTS</div>
              <div className="space-y-1.5">
                {[
                  ["1–5", "Set next unfilled score (Individual)"],
                  ["← →", "Switch members"],
                  ["Ctrl+Enter", "Open submit"],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DT.borderDef}`, fontSize: 10, fontWeight: 700, color: DT.textSec, fontFamily: FT.m }}>{key}</kbd>
                    <span style={{ fontSize: 11, color: DT.textTer }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TAB STEPPER — Connected progress line (Improvement 7) ═══ */}
      <div className="flex items-center mb-4 gap-0">
        {TABS.map((t, i) => {
          const isActive = activeTab === i;
          const isPast = t.done;
          return (
            <div key={t.label} className="flex items-center flex-1" style={{ minWidth: 0 }}>
              <button onClick={() => setActiveTab(i)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 relative"
                style={{
                  background: isActive ? withAlpha(t.color, 0.06) : "transparent",
                  border: `1.5px solid ${isActive ? withAlpha(t.color, 0.19) : isPast ? withAlpha(DT.success, 0.15) : DT.borderHair}`,
                  color: isActive ? t.color : isPast ? DT.success : DT.textTer,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                }}>
                {/* Step number circle */}
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{
                  background: isPast ? DT.success : isActive ? t.color : DT.borderDef,
                  fontSize: 10, fontWeight: 800, color: "white",
                }}>
                  {isPast ? <CheckCircle2 size={12} /> : i + 1}
                </span>
                {t.icon}
                <span>{t.label}</span>
                {t.badge && (
                  <span className="px-1.5 py-0 rounded-full" style={{
                    fontSize: 10, fontWeight: 700,
                    background: isActive ? withAlpha(t.color, 0.08) : "rgba(255,255,255,0.06)",
                    color: isActive ? t.color : DT.textDis,
                  }}>{t.badge}</span>
                )}
              </button>
              {/* Connector line */}
              {i < TABS.length - 1 && (
                <div className="flex-1 mx-1.5 h-[2px] rounded-full overflow-hidden hidden sm:block" style={{ background: DT.borderHair }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: t.done ? "100%" : "0%",
                    background: `linear-gradient(90deg, ${t.color}, ${TABS[i + 1].color})`,
                  }} />
                </div>
              )}
            </div>
          );
        })}
        {/* Mobile-only rating legend (E) */}
        <div className="sm:hidden ml-auto shrink-0">
          <RatingLegendTooltip />
        </div>
        {/* Auto-advance toggle */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 shrink-0">
          <button onClick={() => setAutoAdvance(!autoAdvance)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            style={{
              border: `1px solid ${autoAdvance ? withAlpha(DT.success, 0.2) : DT.borderHair}`,
              background: autoAdvance ? withAlpha(DT.success, 0.04) : "transparent",
              fontSize: 11, fontWeight: 600, color: autoAdvance ? DT.success : DT.textDis,
            }}
            title="Auto-advance to next ungraded member after completing current one">
            <Zap size={12} /> Auto
          </button>
        </div>
      </div>

      {/* ═══ TAB CONTENT — visibility-based, no unmount (F) ═══ */}
      <div className="flex-1">

        {/* ─── TAB 1: GROUP GRADE — Section A (GU-CRD-032-04, out of 100 pts) ─── */}
        <div style={{ display: activeTab === 1 ? "block" : "none" }}>
          <div className="space-y-4">

            {/* Defense Timeline Banner */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <Clock size={14} style={{ color: DT.blue }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: DT.textPri }}>Defense Flow</span>
                <span className="ml-auto" style={{ fontSize: 11, color: DT.textTer }}>Total: 2 hours max</span>
              </div>
              <div className="px-5 py-3">
                <div className="flex items-center gap-0">
                  {DEFENSE_PHASES.map((phase, i) => (
                    <div key={phase.label} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}>{phase.icon}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: DT.textPri, textAlign: "center" as const }}>{phase.label}</span>
                        {phase.sublabel && <span style={{ fontSize: 8, color: DT.textTer, marginTop: -2 }}>{phase.sublabel}</span>}
                        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: withAlpha(DT.blue, 0.06), color: DT.blue }}>{phase.duration} min</span>
                      </div>
                      {i < DEFENSE_PHASES.length - 1 && (
                        <ArrowRight size={14} className="shrink-0 mx-1" style={{ color: DT.textDis }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section A: Group Evaluation */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}><Users size={20} /></div>
                <div className="flex-1">
                  <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Section A — Group Evaluation</h3>
                  <p style={{ fontSize: 12, color: DT.textTer }}>Out of {GROUP_MAX_TOTAL} points — determines the defense verdict</p>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: FT.h, fontSize: 26, fontWeight: 800, color: groupComplete ? (verdictInfo?.color || DT.blue) : DT.textDis }}>
                    {groupTotal}<span style={{ fontSize: 16, color: DT.textTer }}>/{GROUP_MAX_TOTAL}</span>
                  </div>
                  {groupComplete && verdictInfo && (
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: verdictInfo.color, background: withAlpha(verdictInfo.color, 0.08) }}>{verdictInfo.label}</span>
                  )}
                </div>
              </div>
              <div className="px-6 pb-5">
                {GROUP_CRITERIA.map(c => {
                  const val = groupScores[c.key];
                  const pct = val >= 0 ? Math.round((val / c.maxPts) * 100) : 0;
                  const barColor = pct >= 92 ? VERDICT_COLORS.pass : pct >= 82 ? VERDICT_COLORS.minor : pct >= 60 ? VERDICT_COLORS.redemonstration : pct > 0 ? VERDICT_COLORS.failed : DT.borderDef;
                  return (
                    <div key={c.key} className="py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: DT.textTer }}>{c.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{c.label}</span>
                            <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, color: DT.textTer, background: "rgba(255,255,255,0.06)" }}>Max: {c.maxPts}</span>
                          </div>
                          <div style={{ fontSize: 12, color: DT.textTer, marginTop: 1 }}>{c.desc}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={c.maxPts}
                            value={val >= 0 ? val : ""}
                            placeholder="—"
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") { setGroupScores(p => ({ ...p, [c.key]: -1 })); return; }
                              const n = Math.min(c.maxPts, Math.max(0, parseInt(raw) || 0));
                              setLastAction({ type: "group", key: c.key, prev: groupScores[c.key], ts: Date.now() });
                              setGroupScores(p => ({ ...p, [c.key]: n }));
                            }}
                            className="w-16 h-10 rounded-xl text-center transition"
                            style={{ ...inputBase, fontSize: 18, fontWeight: 800, fontFamily: FT.h }}
                            onFocus={focusIn as any}
                            onBlur={focusOut as any}
                          />
                          <span style={{ fontSize: 12, color: DT.textDis, fontWeight: 600 }}>/ {c.maxPts}</span>
                          {val >= 0 && (
                            <button onClick={() => { setLastAction({ type: "group", key: c.key, prev: val, ts: Date.now() }); setGroupScores(p => ({ ...p, [c.key]: -1 })); }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
                              style={{ color: DT.textDis }} title={`Reset ${c.label}`}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="h-1.5 rounded-full overflow-hidden ml-11" style={{ background: DT.borderHair }}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })}

                {/* Running total + verdict badge */}
                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${DT.borderDef}` }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Running Total:</span>
                    <span style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: groupComplete ? (verdictInfo?.color || DT.blue) : DT.textPri }}>{groupTotal}</span>
                    <span style={{ fontSize: 13, color: DT.textTer }}>/ {GROUP_MAX_TOTAL}</span>
                    {groupComplete && verdictInfo && (
                      <span className="px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 700, color: verdictInfo.color, background: withAlpha(verdictInfo.color, 0.08), border: `1px solid ${withAlpha(verdictInfo.color, 0.15)}` }}>
                        {verdictInfo.label}
                      </span>
                    )}
                  </div>
                  {groupComplete && (
                    <button onClick={() => setActiveTab(2)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
                      style={{ background: DT.purple, color: "white", fontSize: 13, fontWeight: 700 }}>
                      Next: Feedback <MessageSquare size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Verdict Table (GU-CRD-032-04) */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <Award size={15} style={{ color: DT.blue }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: DT.textPri }}>Defense Verdict Table</span>
                <span className="ml-auto" style={{ fontSize: 10, color: DT.textTer }}>GU-CRD-032-04</span>
              </div>
              <div className="px-6 py-3 space-y-1.5">
                {([
                  { range: "92–100", label: "PASS", color: VERDICT_COLORS.pass, verdict: "pass" as Verdict },
                  { range: "82–91", label: "Pass with Minor Revision", color: VERDICT_COLORS.minor, verdict: "minor" as Verdict },
                  { range: "60–81", label: "Pass with Major Revision / Re-demonstration", color: VERDICT_COLORS.redemonstration, verdict: "redemonstration" as Verdict },
                  { range: "Below 60", label: "FAIL", color: VERDICT_COLORS.failed, verdict: "failed" as Verdict },
                ] as const).map(row => {
                  const isActive = groupComplete && verdictInfo?.verdict === row.verdict;
                  return (
                    <div key={row.range} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all" style={{
                      background: isActive ? withAlpha(row.color, 0.06) : "transparent",
                      border: `1px solid ${isActive ? withAlpha(row.color, 0.2) : DT.borderHair}`,
                    }}>
                      <span className="w-16 shrink-0" style={{ fontSize: 12, fontWeight: 700, fontFamily: FT.m, color: DT.textSec }}>{row.range}</span>
                      <ArrowRight size={12} style={{ color: DT.textDis }} />
                      <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 700, color: row.color, background: withAlpha(row.color, 0.08) }}>{row.label}</span>
                      {isActive && <CheckCircle2 size={14} className="ml-auto" style={{ color: row.color }} />}
                    </div>
                  );
                })}
                <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>
                  <Info size={11} className="inline mr-1" /> After re-defense: Grade is either Passed (3.00) or Failed (5.00). Failure in the defense means failure in the course.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB 0: INDIVIDUAL GRADES ─── */}
        <div style={{ display: activeTab === 0 ? "block" : "none" }}>
          <div className="space-y-4">
            {/* (B) Member strip — single source of truth, shown only here */}
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const scores = individualScores[m.name] || {};
                const filled = INDIVIDUAL_CRITERIA.every(c => (scores[c.key] ?? 0) >= 1);
                const isActive = activeMember === m.name;
                const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                const total = INDIVIDUAL_CRITERIA.reduce((s, c) => s + Math.max(0, scores[c.key] ?? 0), 0);

                return (
                  <button key={m.name} onClick={() => setActiveMember(m.name)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer"
                    style={{
                      background: isActive ? DT.blueDim : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${isActive ? "rgba(77,143,255,0.25)" : filled ? withAlpha(DT.success, 0.19) : DT.borderHair}`,
                      fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? DT.blue : DT.textTer,
                    }}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DT.blue, animation: "dsvPulse 1.2s ease-in-out infinite" }} />}
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" style={{ border: `2px solid ${isActive ? DT.blue : "transparent"}` }} />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isActive ? DT.blue : DT.borderDef, fontSize: 8, fontWeight: 700, color: "white" }}>{init}</div>
                    )}
                    <span>{m.name?.split(" ")[0]}</span>
                    {filled ? (
                      <span className="flex items-center gap-0.5" style={{ color: DT.success, fontSize: 11, fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {total}/{INDIV_MAX_TOTAL}
                      </span>
                    ) : (
                      <span style={{ color: DT.textDis, fontSize: 11 }}>
                        {Object.values(scores).filter(v => v >= 1).length}/{INDIVIDUAL_CRITERIA.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* (C) Rebalanced Two-column: 4/8 split */}
            {activeM && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* ═══ LEFT COLUMN — Portrait (4 cols) ═══ */}
                <div className="lg:col-span-4">
                  <div className="lg:sticky lg:top-4 rounded-2xl overflow-hidden" style={cardStyle}>
                    {/* Portrait area — 2:3 aspect ratio */}
                    <div className="relative" style={{ aspectRatio: activeM.avatarUrl ? "2/3" : "3/4" }}>
                      {activeM.avatarUrl ? (
                        <>
                          <img src={activeM.avatarUrl} alt={activeM.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ objectPosition: "center top" }} />
                          {/* Cinematic gradient overlays */}
                          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.05) 0%, rgba(7,9,15,0.15) 40%, rgba(7,9,15,0.85) 80%, rgba(7,9,15,0.98) 100%)" }} />
                          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${withAlpha(DT.blue, 0.08)} 0%, transparent 50%)` }} />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${withAlpha(DT.blue, 0.15)}, ${withAlpha(DT.purple, 0.12)})` }}>
                          <span style={{ fontSize: 64, fontWeight: 800, color: withAlpha(DT.blue, 0.3), fontFamily: FT.h, letterSpacing: "-0.04em" }}>{activeInit}</span>
                          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(7,9,15,0.9) 100%)" }} />
                        </div>
                      )}

                      {/* Floating NOW PRESENTING badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{ fontSize: 9, fontWeight: 700, color: DT.blue, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", letterSpacing: "0.08em", border: `1px solid ${withAlpha(DT.blue, 0.25)}` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: DT.blue, animation: "dsvPulse 1.2s ease-in-out infinite" }} />
                          PRESENTING
                        </span>
                      </div>

                      {/* Score pill */}
                      <div className="absolute top-3 right-3 z-10">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: `1px solid ${withAlpha(activeMemberFilled ? DT.yellow : DT.textDis, 0.25)}` }}>
                          <Star size={11} style={{ color: activeMemberFilled ? DT.yellow : DT.textDis }} />
                          <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 800, color: activeMemberFilled ? DT.yellow : DT.textDis }}>
                            {activeMemberFilled ? `${activeMemberAvg} avg` : "—"}/{INDIV_MAX_PER}
                          </span>
                        </div>
                      </div>

                      {/* Bottom — name */}
                      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
                        <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{activeM.name}</h3>
                        {activeM.email && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{activeM.email}</p>}
                        {memberScoresPct && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg"
                            style={{ background: withAlpha(DT.yellow, 0.12), border: `1px solid ${withAlpha(DT.yellow, 0.2)}` }}>
                            <Sparkles size={11} style={{ color: DT.yellow }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: DT.yellow }}>{memberScoresPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick note below portrait */}
                    <div className="px-4 py-4">
                      <label className="block mb-1.5" style={{ fontSize: 10, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em" }}>QUICK NOTE</label>
                      <textarea
                        value={memberNotes[activeM.name] || ""}
                        onChange={(e) => setMemberNotes(prev => ({ ...prev, [activeM.name]: e.target.value }))}
                        placeholder="e.g. confident speaker, needs work on methodology..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl transition"
                        style={{ ...inputBase, fontSize: 12, resize: "vertical" as const, background: "rgba(255,255,255,0.03)" }}
                        onFocus={focusIn as any} onBlur={focusOut as any}
                      />
                    </div>
                  </div>
                </div>

                {/* ═══ RIGHT COLUMN — Grading (8 cols) ═══ */}
                <div className="lg:col-span-8 space-y-4">
                  {/* (C) Criteria mini-summary bar — moved from left column */}
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    {INDIVIDUAL_CRITERIA.map(c => {
                      const val = activeScores[c.key] ?? 0;
                      const r = val >= 1 ? RATING_LABELS[val] : null;
                      return (
                        <div key={c.key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1 justify-center"
                          style={{ background: r ? withAlpha(r.color, 0.04) : "transparent", border: `1px solid ${r ? withAlpha(r.color, 0.1) : DT.borderHair}` }}>
                          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ color: r ? r.color : DT.textDis }}>{c.icon}</div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: r ? r.color : DT.textDis }}>{c.label.split(" ")[0]}</span>
                          {r ? (
                            <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 800, color: r.color }}>{val}</span>
                          ) : (
                            <span style={{ fontSize: 11, color: DT.textDis }}>—</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Score progress mini */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${(activeMemberFilled ? activeMemberTotal / INDIV_MAX_TOTAL : 0) * 100}%`,
                          background: activeMemberFilled ? `linear-gradient(90deg, ${DT.yellow}, ${DT.blue})` : DT.textDis,
                        }} />
                      </div>
                    </div>
                    {/* Reset individual scores for this member */}
                    {Object.values(activeScores).some(v => (v ?? 0) >= 1) && (
                      <button onClick={() => {
                        setIndividualScores(prev => ({
                          ...prev, [activeMember]: { communication: 0, organization: 0, effectiveness: 0 },
                        }));
                        setMemberNotes(prev => ({ ...prev, [activeMember]: "" }));
                        toast.success(`Scores reset for ${activeMember.split(" ")[0]}`);
                      }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06] shrink-0"
                        style={{ border: `1px solid ${DT.borderDef}`, color: DT.textDis }} title={`Reset scores for ${activeMember}`}>
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>

                  {/* Scoring Guide Chip Row */}
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    <span style={{ fontSize: 10, fontWeight: 700, color: DT.textDis, letterSpacing: "0.06em" }}>SCALE:</span>
                    {[1, 2, 3, 4, 5].map(n => {
                      const rl = RATING_LABELS[n];
                      return (
                        <span key={n} className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, color: rl.color, background: withAlpha(rl.color, 0.06), border: `1px solid ${withAlpha(rl.color, 0.12)}` }}>
                          {n}={rl.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Criteria cards */}
                  {INDIVIDUAL_CRITERIA.map(c => {
                    const val = activeScores[c.key] ?? 0;
                    const r = val >= 1 ? RATING_LABELS[val] : null;
                    return (
                      <div key={c.key} className="rounded-2xl overflow-hidden" style={cardStyle}>
                        <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.yellow, 0.08), color: DT.yellow }}>{c.icon}</div>
                          <div className="flex-1">
                            <h4 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{c.label}</h4>
                            <p style={{ fontSize: 12, color: DT.textTer }}>{c.desc}</p>
                          </div>
                          {r && (
                            <span className="px-2.5 py-1 rounded-full shrink-0" style={{ fontSize: 11, fontWeight: 700, color: r.color, background: withAlpha(r.color, 0.07), border: `1px solid ${withAlpha(r.color, 0.13)}` }}>
                              {val} — {r.label}
                            </span>
                          )}
                          {val >= 1 && (
                            <button onClick={() => { setLastAction({ type: "individual", key: c.key, member: activeMember, prev: val, ts: Date.now() }); setIndividualScores(prev => ({ ...prev, [activeMember]: { ...prev[activeMember], [c.key]: 0 } })); }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06] shrink-0"
                              style={{ color: DT.textDis }} title={`Reset ${c.label}`}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="px-5 py-4 flex justify-center gap-3"
                          style={{ animation: scorePop === `indiv-${activeMember}-${c.key}` ? "dsvScorePop 300ms ease-out" : "none" }}
                          onAnimationEnd={() => { if (scorePop === `indiv-${activeMember}-${c.key}`) setScorePop(""); }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <ScoreButton key={n} value={n} selected={val === n}
                              onChange={() => {
                                setLastAction({ type: "individual", key: c.key, member: activeMember, prev: val, ts: Date.now() });
                                setIndividualScores(prev => ({
                                  ...prev, [activeMember]: { ...prev[activeMember], [c.key]: n },
                                }));
                                setScorePop(`indiv-${activeMember}-${c.key}`);
                              }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Total + next CTA */}
                  {activeMemberFilled && (
                    <div className="rounded-2xl p-5 flex items-center justify-between" style={{ ...cardStyle, background: `linear-gradient(135deg, ${DT.raised}, rgba(255,215,0,0.04))` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: DT.textTer }}>Total Score for {activeM.name?.split(" ")[0]}</div>
                        <div style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 800, color: DT.yellow }}>
                          {activeMemberTotal}<span style={{ fontSize: 16, color: DT.textTer }}>/{INDIV_MAX_TOTAL}</span>
                          <span className="ml-3" style={{ fontSize: 16, color: DT.textTer }}>Avg: {activeMemberAvg || "—"}/{INDIV_MAX_PER}</span>
                        </div>
                      </div>
                      {(() => {
                        const nextUngraded = members.find(mm => {
                          if (mm.name === activeMember) return false;
                          const s = individualScores[mm.name] || {};
                          return !INDIVIDUAL_CRITERIA.every(c => (s[c.key] ?? 0) >= 1);
                        });
                        if (nextUngraded) {
                          return (
                            <button onClick={() => setActiveMember(nextUngraded.name)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
                              style={{ background: DT.yellow, color: DT.base, fontSize: 13, fontWeight: 700 }}>
                              Next: {nextUngraded.name?.split(" ")[0]} <User size={14} />
                            </button>
                          );
                        }
                        if (individualsComplete) {
                          return (
                            <button onClick={() => setActiveTab(1)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
                              style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 700 }}>
                              Next: Group Grade <Users size={14} />
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* (8) Radar Chart — Score Comparison when all members graded */}
            {individualsComplete && members.length > 1 && (
              <div className="mt-4 rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple }}><BarChart3 size={20} /></div>
                  <div>
                    <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Score Comparison</h3>
                    <p style={{ fontSize: 12, color: DT.textTer }}>Radar overlay of all members' individual scores</p>
                  </div>
                </div>
                <div className="px-4 py-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={INDIVIDUAL_CRITERIA.map(c => ({
                      criterion: c.label.split(" ")[0],
                      ...Object.fromEntries(members.map(m => [m.name?.split(" ")[0] || "?", (individualScores[m.name]?.[c.key] ?? 0)])),
                    }))}>
                      <PolarGrid stroke={DT.borderDef} />
                      <PolarAngleAxis dataKey="criterion" tick={{ fill: DT.textTer, fontSize: 11, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: DT.textDis, fontSize: 9 }} tickCount={6} />
                      {members.map((m, i) => {
                        const colors = [DT.yellow, DT.blue, DT.purple, DT.success, DT.red];
                        return <Radar key={m.name} name={m.name?.split(" ")[0]} dataKey={m.name?.split(" ")[0] || "?"} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.08} strokeWidth={2} />;
                      })}
                      <RechartsTooltip contentStyle={{ background: DT.elevated, border: `1px solid ${DT.borderSub}`, borderRadius: 12, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    {members.map((m, i) => {
                      const colors = [DT.yellow, DT.blue, DT.purple, DT.success, DT.red];
                      return (
                        <div key={m.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: DT.textSec }}>{m.name?.split(" ")[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── TAB 2: FEEDBACK & REVISIONS ─── */}
        <div style={{ display: activeTab === 2 ? "block" : "none" }}>
          <div className="space-y-5">
            {/* General feedback */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple }}><MessageSquare size={20} /></div>
                <div>
                  <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>General Feedback</h3>
                  <p style={{ fontSize: 12, color: DT.textTer }}>Overall observations, strengths, and areas for improvement</p>
                </div>
              </div>
              <div className="px-6 py-5">
                <textarea
                  value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  placeholder="Write your overall comments for the group here. Consider strengths, weaknesses, and suggestions for improvement..."
                  className="w-full rounded-xl px-4 py-3 transition"
                  style={{ ...inputBase, fontSize: 14, resize: "vertical" as const }}
                  onFocus={focusIn as any}
                  onBlur={focusOut as any}
                />
              </div>
            </div>

            {/* Per-member notes summary */}
            {members.some(m => memberNotes[m.name]?.trim()) && (
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="px-6 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                  <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
                    <User size={15} className="inline mr-2" style={{ color: DT.yellow }} />
                    Per-Member Notes
                  </h3>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {members.filter(m => memberNotes[m.name]?.trim()).map(m => {
                    const init = (m.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div key={m.name} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: DT.blue, fontSize: 9, fontWeight: 700, color: "white" }}>{init}</div>
                        )}
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: DT.textPri }}>{m.name}</span>
                          <p style={{ fontSize: 12, color: DT.textSec, marginTop: 2 }}>{memberNotes[m.name]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Required revisions */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.warning, 0.08), color: DT.warning }}><AlertTriangle size={20} /></div>
                  <div>
                    <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Required Revisions</h3>
                    <p style={{ fontSize: 12, color: DT.textTer }}>Specific items the group must address before approval</p>
                  </div>
                </div>
                <button onClick={() => setRevisions(prev => [...prev, { id: Date.now(), text: "", priority: "Medium" }])}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.blue, fontSize: 12, fontWeight: 600 }}>
                  <Plus size={14} /> Add Revision
                </button>
              </div>
              <div className="px-6 py-5">
                {revisions.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={24} style={{ color: DT.textDis, margin: "0 auto 8px" }} />
                    <p style={{ fontSize: 13, color: DT.textTer }}>No revisions required — add items if needed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revisions.map((rev, i) => (
                      <div key={rev.id} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "rgba(255,255,255,0.04)", fontSize: 10, fontWeight: 700, color: DT.textDis }}>
                          {i + 1}
                        </span>
                        <input
                          value={rev.text}
                          onChange={(e) => setRevisions(prev => prev.map((r, j) => j === i ? { ...r, text: e.target.value } : r))}
                          placeholder="Describe the required revision..."
                          className="flex-1 px-3 py-2 rounded-lg transition"
                          style={{ ...inputBase, fontSize: 13 }}
                          onFocus={focusIn}
                          onBlur={focusOut}
                        />
                        <select value={rev.priority}
                          onChange={(e) => setRevisions(prev => prev.map((r, j) => j === i ? { ...r, priority: e.target.value as Priority } : r))}
                          className="px-2 py-2 rounded-lg cursor-pointer"
                          style={{ ...inputBase, fontSize: 12, width: 85 }}>
                          <option value="High">High</option>
                          <option value="Medium">Med</option>
                          <option value="Low">Low</option>
                        </select>
                        <button onClick={() => setRevisions(prev => prev.filter((_, j) => j !== i))}
                          className="p-2 rounded-lg transition cursor-pointer hover:bg-white/[0.04]" style={{ color: DT.textDis }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grade Composition Breakdown Card (GU-CRD-032-04) */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}><BarChart3 size={20} /></div>
                <div>
                  <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Grade Composition Breakdown</h3>
                  <p style={{ fontSize: 12, color: DT.textTer }}>Per GU-CRD-032-04 — Capstone Project 2</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Stacked bar */}
                <div>
                  <div className="flex h-8 rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderHair}` }}>
                    {GRADE_COMPOSITION.map(gc => (
                      <div key={gc.label} className="flex items-center justify-center transition-all" style={{ width: `${gc.pct}%`, background: gc.color }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: gc.color === "#D6E4F0" ? "#1F3864" : "#FFFFFF" }}>{gc.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex mt-2 gap-3 justify-center">
                    {GRADE_COMPOSITION.map(gc => (
                      <div key={gc.label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: gc.color }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: DT.textSec }}>{gc.label} ({gc.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Sub-breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  {GRADE_COMPOSITION.map(gc => (
                    <div key={gc.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-sm" style={{ background: gc.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: DT.textPri }}>{gc.label}</span>
                      </div>
                      {gc.sub.map(s => (
                        <div key={s.label} className="flex justify-between items-center py-0.5">
                          <span style={{ fontSize: 10, color: DT.textTer }}>{s.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: DT.textSec }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", fontSize: 10, color: DT.textDis }}>
                  <Info size={10} className="inline mr-1" /> Only the Defense Activity Grade (60%) is scored here by the panel. Adviser and Coordinator grades are entered separately.
                </div>
              </div>
            </div>

            {/* Verdict Selection & Panel Sign-Off (GU-CRD-032-04) */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple }}><Shield size={20} /></div>
                <div>
                  <h3 style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 700, color: DT.textPri }}>Verdict & Panel Sign-Off</h3>
                  <p style={{ fontSize: 12, color: DT.textTer }}>Final defense verdict auto-highlights based on Section A score</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Verdict radio buttons */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em", marginBottom: 8 }}>VERDICT (auto-determined by group score)</div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "pass", label: "PASS", color: VERDICT_COLORS.pass, range: "92–100" },
                      { key: "minor", label: "Pass with Minor Revision", color: VERDICT_COLORS.minor, range: "82–91" },
                      { key: "redemonstration", label: "Pass with Major Revision / Re-demonstration", color: VERDICT_COLORS.redemonstration, range: "60–81" },
                      { key: "failed", label: "FAIL", color: VERDICT_COLORS.failed, range: "< 60" },
                    ] as const).map(opt => {
                      const isActive = groupComplete && verdictInfo?.verdict === opt.key;
                      return (
                        <div key={opt.key}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-default"
                          style={{
                            background: isActive ? withAlpha(opt.color, 0.06) : "transparent",
                            border: isActive ? `2px solid ${opt.color}` : opt.key === "failed" ? `2px solid ${withAlpha(opt.color, 0.3)}` : `1px solid ${DT.borderHair}`,
                            boxShadow: isActive ? `0 0 24px ${withAlpha(opt.color, 0.12)}` : "none",
                          }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{
                            border: `2px solid ${isActive ? opt.color : DT.borderDef}`,
                            background: isActive ? opt.color : "transparent",
                          }}>
                            {isActive && <CheckCircle2 size={12} style={{ color: "white" }} />}
                          </div>
                          <div className="flex-1">
                            <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? opt.color : DT.textSec }}>{opt.label}</span>
                            <span className="ml-2" style={{ fontSize: 10, color: DT.textDis }}>({opt.range})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Panel Sign-Off */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DT.textTer, letterSpacing: "0.06em", marginBottom: 8 }}>PANEL SIGN-OFF</div>
                  <div className="space-y-3">
                    {/* Lead Panelist */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.yellow, 0.08), color: DT.yellow }}><Award size={14} /></div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>LEAD PANELIST</label>
                          <input value={panelSignOff.leadName} onChange={(e) => setPanelSignOff(p => ({ ...p, leadName: e.target.value }))}
                            placeholder="Full Name" className="w-full px-2.5 py-1.5 rounded-lg mt-0.5"
                            style={{ ...inputBase, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>INITIALS / SIGNATURE</label>
                          <input value={panelSignOff.leadInitials} onChange={(e) => setPanelSignOff(p => ({ ...p, leadInitials: e.target.value }))}
                            placeholder="Initials" className="w-full px-2.5 py-1.5 rounded-lg mt-0.5"
                            style={{ ...inputBase, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>DATE</label>
                          <div className="px-2.5 py-1.5 rounded-lg mt-0.5" style={{ ...inputBase, fontSize: 12, color: DT.textSec }}>
                            {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Panel Members 1 & 2 */}
                    {([
                      { idx: 1, nameKey: "member1Name" as const, roleKey: "member1Role" as const },
                      { idx: 2, nameKey: "member2Name" as const, roleKey: "member2Role" as const },
                    ]).map(pm => (
                      <div key={pm.idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: DT.textTer }}><User size={14} /></div>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>PANEL MEMBER {pm.idx}</label>
                            <input value={panelSignOff[pm.nameKey]} onChange={(e) => setPanelSignOff(p => ({ ...p, [pm.nameKey]: e.target.value }))}
                              placeholder="Full Name" className="w-full px-2.5 py-1.5 rounded-lg mt-0.5"
                              style={{ ...inputBase, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut} />
                          </div>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>ROLE</label>
                            <select value={panelSignOff[pm.roleKey]} onChange={(e) => setPanelSignOff(p => ({ ...p, [pm.roleKey]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 rounded-lg mt-0.5 cursor-pointer"
                              style={{ ...inputBase, fontSize: 12 }}>
                              <option value="Faculty">Faculty</option>
                              <option value="Industry">Industry</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: DT.textDis }}>DATE</label>
                            <div className="px-2.5 py-1.5 rounded-lg mt-0.5" style={{ ...inputBase, fontSize: 12, color: DT.textSec }}>
                              {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ (NEW) UNDO PILL — floating, auto-dismisses ═══ */}
      {lastAction && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ animation: "dsvUndoSlide 250ms ease-out" }}>
          <button onClick={handleUndo}
            className="flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition hover:opacity-90"
            style={{ background: "rgba(22,27,46,0.9)", backdropFilter: "blur(16px)", border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowMd }}>
            <Undo2 size={13} style={{ color: DT.yellow }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Undo score change</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: DT.yellow, animation: "dsvPulse 1.2s ease-in-out infinite" }} />
          </button>
        </div>
      )}

      {/* ═══ (D) FLOATING PILL SUBMIT BAR ═══ */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50" style={{ animation: "dsvFloat 4s ease-in-out infinite" }}>
        <div className="flex items-center gap-3 px-5 py-3 rounded-full"
          style={{
            background: "rgba(22,27,46,0.85)",
            backdropFilter: "blur(24px)",
            border: `1px solid ${allFilled ? withAlpha(DT.blue, 0.25) : DT.borderSub}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), ${allFilled ? `0 0 20px ${withAlpha(DT.blue, 0.1)}` : "none"}`,
          }}>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {progressSteps.map((s, i) => (
              <div key={i} className="relative group/dot">
                <div className="w-3 h-3 rounded-full transition-all duration-300" style={{
                  background: s.done ? s.color : DT.borderDef,
                  boxShadow: s.done ? `0 0 8px ${withAlpha(s.color, 0.3)}` : "none",
                }} />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: DT.elevated, border: `1px solid ${DT.borderDef}`, fontSize: 10, fontWeight: 600, color: s.done ? s.color : DT.textDis }}>
                  {s.label} {s.done ? "✓" : ""}
                </div>
              </div>
            ))}
          </div>

          <div className="w-px h-5" style={{ background: DT.borderDef }} />

          {/* Verdict, projected verdict, or warning */}
          {allFilled && verdictInfo ? (
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 800, color: verdictInfo.color }}>{verdictInfo.label}</span>
              <span style={{ fontFamily: FT.m, fontSize: 13, fontWeight: 700, color: verdictInfo.color }}>{groupTotal}/{GROUP_MAX_TOTAL}</span>
            </div>
          ) : projectedVerdict ? (
            <div className="flex items-center gap-2">
              <Eye size={11} style={{ color: DT.textDis }} />
              <span style={{ fontFamily: FT.h, fontSize: 11, fontWeight: 700, color: projectedVerdict.color, opacity: 0.7 }}>~{projectedVerdict.label}</span>
              <span style={{ fontFamily: FT.m, fontSize: 12, fontWeight: 600, color: projectedVerdict.color, opacity: 0.7 }}>{projectedVerdict.pct.toFixed(0)}%</span>
            </div>
          ) : (
            <span className="flex items-center gap-1" style={{ fontSize: 11, color: DT.textTer }}>
              <AlertTriangle size={11} /> Complete all scores
            </span>
          )}

          <div className="w-px h-5" style={{ background: DT.borderDef }} />

          {/* Reset scores */}
          <button onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition cursor-pointer hover:bg-white/[0.06]"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 12, fontWeight: 600 }}
            title="Reset all scores">
            <RotateCcw size={13} /> Reset
          </button>

          {/* Submit → opens confirmation modal */}
          <button onClick={() => setShowConfirmModal(true)} disabled={!allFilled || submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-full transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              background: allFilled ? `linear-gradient(135deg, ${DT.blue}, #3B7AE8)` : DT.borderDef,
              color: "white", fontSize: 13, fontWeight: 700, fontFamily: FT.h,
              boxShadow: allFilled ? `0 2px 12px rgba(77,143,255,0.25)` : "none",
            }}>
            <Shield size={14} /> Review & Submit
          </button>
        </div>
      </div>

      {/* ═══ GRADING GUIDELINES PANEL ═══ */}
      <GradingGuidelinesPanel open={showGuidelines} onClose={() => setShowGuidelines(false)} />

      {/* ═══ (1) CONFIRMATION MODAL ═══ */}
      {showConfirmModal && verdictInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg, animation: "dsvModalIn 300ms ease-out" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}><Shield size={20} /></div>
                <div>
                  <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Confirm Submission</h3>
                  <p style={{ fontSize: 12, color: DT.textTer }}>Review your grades before finalizing</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
                style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}><X size={16} /></button>
            </div>

            {/* Verdict hero */}
            <div className="px-6 py-5 text-center" style={{ background: withAlpha(verdictInfo.color, 0.03) }}>
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: withAlpha(verdictInfo.color, 0.06), border: `1px solid ${withAlpha(verdictInfo.color, 0.15)}` }}>
                <Award size={24} style={{ color: verdictInfo.color }} />
                <span style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: verdictInfo.color }}>{verdictInfo.label}</span>
                <span style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 800, color: verdictInfo.color }}>{groupTotal}/{GROUP_MAX_TOTAL}</span>
                <span style={{ fontSize: 14, color: DT.textTer }}>({verdictInfo.numericalGrade})</span>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Group scores */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} style={{ color: DT.blue }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DT.blue, letterSpacing: "0.04em" }}>GROUP SCORES (60%)</span>
                  <span className="ml-auto" style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: DT.blue }}>{groupTotal}/{groupMaxPossible}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {GROUP_CRITERIA.map(c => {
                    const v = groupScores[c.key];
                    const pct = v >= 0 ? Math.round((v / c.maxPts) * 100) : 0;
                    const barColor = pct >= 92 ? VERDICT_COLORS.pass : pct >= 82 ? VERDICT_COLORS.minor : pct >= 60 ? VERDICT_COLORS.redemonstration : VERDICT_COLORS.failed;
                    return (
                      <div key={c.key} className="p-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <div style={{ fontSize: 9, color: DT.textTer, marginBottom: 2, lineHeight: 1.2 }}>{c.label.length > 20 ? c.label.split(" ").slice(-1)[0] : c.label}</div>
                        <div style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: v >= 0 ? barColor : DT.textDis }}>{v >= 0 ? v : "—"}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: DT.textTer }}>/ {c.maxPts}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual scores grid */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} style={{ color: DT.yellow }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DT.yellow, letterSpacing: "0.04em" }}>INDIVIDUAL SCORES (40%)</span>
                </div>
                <div className="space-y-1.5">
                  {members.map(m => {
                    const s = individualScores[m.name] || {};
                    const total = INDIVIDUAL_CRITERIA.reduce((sum, c) => sum + Math.max(0, s[c.key] ?? 0), 0);
                    return (
                      <div key={m.name} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <span className="flex-1 truncate" style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>{m.name}</span>
                        {INDIVIDUAL_CRITERIA.map(c => {
                          const v = s[c.key] ?? 0;
                          const r = v >= 1 ? RATING_LABELS[v] : null;
                          return <span key={c.key} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: r ? withAlpha(r.color, 0.08) : "rgba(255,255,255,0.04)", fontFamily: FT.h, fontSize: 12, fontWeight: 800, color: r?.color || DT.textDis }}>{v || "—"}</span>;
                        })}
                        <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 800, color: DT.yellow, minWidth: 32, textAlign: "right" as const }}>{total}/{INDIV_MAX_TOTAL}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedback preview */}
              {feedback.trim() && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={14} style={{ color: DT.purple }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: DT.purple, letterSpacing: "0.04em" }}>FEEDBACK</span>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}`, fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>
                    {feedback.length > 200 ? feedback.slice(0, 200) + "..." : feedback}
                  </div>
                </div>
              )}
              {revisions.length > 0 && (
                <div className="flex items-center gap-2" style={{ fontSize: 12, color: DT.warning }}>
                  <AlertTriangle size={13} /> {revisions.length} revision{revisions.length !== 1 ? "s" : ""} required
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
              <button onClick={() => setShowConfirmModal(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                <ChevronLeft size={14} /> Go Back & Edit
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${DT.blue}, #3B7AE8)`, color: "white", fontSize: 14, fontWeight: 700, fontFamily: FT.h, boxShadow: "0 2px 12px rgba(77,143,255,0.25)" }}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting...</> : <><Send size={15} /> Confirm & Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESET SCORES CONFIRMATION MODAL ═══ */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden" style={{ background: DT.bgCard, border: `1px solid ${DT.borderDef}`, boxShadow: `0 24px 64px rgba(0,0,0,0.5)` }}>
            <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.red, 0.1) }}>
                <AlertTriangle size={20} style={{ color: DT.red }} />
              </div>
              <div>
                <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Reset All Scores?</h3>
                <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>This action cannot be undone</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.6 }}>
                This will clear <strong style={{ color: DT.textPri }}>all group scores</strong>, <strong style={{ color: DT.textPri }}>individual evaluations</strong>, <strong style={{ color: DT.textPri }}>feedback</strong>, and <strong style={{ color: DT.textPri }}>revision notes</strong> for the current group. Your saved draft will also be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
              <button onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleResetScores}
                className="flex items-center gap-2 px-5 py-2 rounded-xl transition cursor-pointer hover:opacity-90"
                style={{ background: DT.red, color: "white", fontSize: 13, fontWeight: 700, fontFamily: FT.h }}>
                <RotateCcw size={14} /> Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

