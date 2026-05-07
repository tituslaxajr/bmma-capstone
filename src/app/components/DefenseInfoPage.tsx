import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Calendar, Clock, MapPin, Users, Monitor, Loader2, Inbox,
  ShieldCheck, Presentation, Timer, Package, Shirt, Printer,
  ChevronRight, Video, BookOpen, AlertCircle, CheckCircle,
  User, Zap, MessageSquare, Eye,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { MorphingMesh } from "./MorphingMesh";
import { apiFetch } from "../lib/supabase";
import { useInView, Fade } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { KF_STANDARD } from "./animations";

/* ─── Helpers ─── */
const KF_LOCAL = `@keyframes diCountdown{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}`;

function daysUntil(d: string): number | null {
  if (!d) return null;
  try {
    const diff = Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000);
    return diff;
  } catch { return null; }
}

function formatDefenseDate(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch { return d; }
}

function formatTime(t: string): string {
  if (!t || t === "TBD") return "TBD";
  try {
    // Handle "HH:mm" format
    if (t.includes(":") && !t.includes(" ")) {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const hr = h % 12 || 12;
      return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
    }
    return t;
  } catch { return t; }
}

const cardBase: CSSProperties = {
  background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
  border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm,
};

/* ═══════════════════════════════════════════════════
   COUNTDOWN HERO — The big defense info card
   ═══════════════════════════════════════════════════ */
function CountdownHero({ defense }: { defense: any }) {
  const dateStr = defense?.date || "TBD";
  const timeStr = defense?.time || "TBD";
  const roomStr = defense?.room || "TBD";
  const mode = defense?.mode || "In-Person";
  const days = daysUntil(dateStr);
  const isToday = days === 0;
  const isPast = days !== null && days < 0;
  const isClose = days !== null && days >= 0 && days <= 7;

  const formattedDate = dateStr !== "TBD" ? formatDefenseDate(dateStr) : "To Be Determined";
  const formattedTime = formatTime(timeStr);

  const modeIcon = mode === "Online" ? <Video size={14} /> : mode === "Hybrid" ? <Monitor size={14} /> : <MapPin size={14} />;
  const modeColor = mode === "Online" ? DT.purple : mode === "Hybrid" ? DT.success : DT.textSec;

  return (
    <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: DT.shadowLg }}>
      <MorphingMesh />
      <div className="relative z-[1]">
        {/* Top accent line */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${DT.yellow}, ${DT.blue}, ${DT.purple})` }} />

        <div className="p-8 lg:p-10">
          {/* Status chip */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
              background: isToday ? withAlpha(DT.yellow, 0.12) : isPast ? withAlpha(DT.success, 0.12) : withAlpha(DT.blue, 0.12),
              border: `1px solid ${isToday ? withAlpha(DT.yellow, 0.2) : isPast ? withAlpha(DT.success, 0.2) : withAlpha(DT.blue, 0.2)}`,
              color: isToday ? DT.yellow : isPast ? DT.success : DT.blue,
              fontSize: 12, fontWeight: 700, fontFamily: FT.h,
            }}>
              <ShieldCheck size={13} />
              {isToday ? "Defense Today" : isPast ? "Defense Completed" : "Defense Scheduled"}
            </span>
            {mode !== "In-Person" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
                background: withAlpha(modeColor, 0.1), border: `1px solid ${withAlpha(modeColor, 0.15)}`,
                color: modeColor, fontSize: 11, fontWeight: 600,
              }}>
                {modeIcon} {mode}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
            {/* Left: date/time/room info */}
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, color: DT.textPri, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                Oral Defense Presentation
              </h2>
              <p className="mt-2" style={{ fontSize: 16, color: DT.textSec, lineHeight: 1.5 }}>
                {formattedDate}
              </p>

              <div className="flex flex-wrap items-center gap-5 mt-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.yellow, 0.1), border: `1px solid ${withAlpha(DT.yellow, 0.15)}` }}>
                    <Clock size={18} style={{ color: DT.yellow }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: DT.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</p>
                    <p style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{formattedTime}</p>
                  </div>
                </div>
                <div className="w-px h-8" style={{ background: DT.borderDef }} />
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.1), border: `1px solid ${withAlpha(DT.blue, 0.15)}` }}>
                    <MapPin size={18} style={{ color: DT.blue }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: DT.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Venue</p>
                    <p style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{roomStr}</p>
                  </div>
                </div>
                <div className="w-px h-8 hidden sm:block" style={{ background: DT.borderDef }} />
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(DT.purple, 0.1), border: `1px solid ${withAlpha(DT.purple, 0.15)}` }}>
                    <Shirt size={18} style={{ color: DT.purple }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: DT.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Attire</p>
                    <p style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Corporate / Business</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: countdown box */}
            {days !== null && days >= 0 && (
              <div className="rounded-2xl p-6 text-center min-w-[160px]" style={{
                background: isToday
                  ? `linear-gradient(135deg, ${withAlpha(DT.yellow, 0.12)}, ${withAlpha(DT.yellow, 0.04)})`
                  : `linear-gradient(135deg, ${withAlpha(DT.blue, 0.08)}, ${withAlpha(DT.blue, 0.02)})`,
                border: `1px solid ${isToday ? withAlpha(DT.yellow, 0.2) : withAlpha(DT.blue, 0.15)}`,
                animation: isClose ? "diCountdown 3s ease-in-out infinite" : "none",
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: isToday ? DT.yellow : DT.textTer, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {isToday ? "Today!" : "Days Left"}
                </p>
                <p style={{
                  fontFamily: FT.h, fontSize: isToday ? 48 : 56, fontWeight: 800, lineHeight: 1.1,
                  color: isToday ? DT.yellow : isClose ? DT.warning : DT.blue,
                  textShadow: `0 0 30px ${withAlpha(isToday ? DT.yellow : DT.blue, 0.3)}`,
                }}>
                  {isToday ? "🎯" : days}
                </p>
                {!isToday && (
                  <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>
                    day{days !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ASSIGNED PANEL — Panelists list
   ═══════════════════════════════════════════════════ */
function AssignedPanelCard({ panelists }: { panelists: any[] }) {
  const colors = [DT.red, DT.stiBlue, DT.purple, DT.success, DT.warning];
  return (
    <div className="rounded-2xl overflow-hidden h-full" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <Users size={16} style={{ color: DT.purple }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Defense Panel</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DT.purpleDim, color: DT.purple }}>
          {panelists.length} member{panelists.length !== 1 ? "s" : ""}
        </span>
      </div>
      {panelists.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Users size={28} style={{ color: DT.textDis }} className="mx-auto mb-2" />
          <p style={{ fontSize: 13, color: DT.textTer }}>No panelists assigned yet</p>
          <p style={{ fontSize: 11, color: DT.textDis, marginTop: 4 }}>Your coordinator will assign panel members</p>
        </div>
      ) : (
        <div className="px-6 py-4 space-y-1">
          {panelists.map((p: any, i: number) => {
            const name = typeof p === "string" ? p : p.name || "Unknown";
            const dept = typeof p === "string" ? "" : (p.department || "");
            const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            const isLead = i === 0;
            const accentColor = colors[i % colors.length];
            return (
              <div key={name + i} className="flex items-center gap-3 py-3 rounded-xl px-2 transition hover:bg-white/[0.02]"
                style={{ borderBottom: i < panelists.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${withAlpha(accentColor, 0.7)})`,
                  boxShadow: `0 0 12px ${withAlpha(accentColor, 0.15)}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{name}</span>
                    {isLead && (
                      <span className="px-2 py-0.5 rounded-full" style={{
                        fontSize: 9, fontWeight: 700, background: withAlpha(DT.yellow, 0.12),
                        color: DT.yellow, border: `1px solid ${withAlpha(DT.yellow, 0.2)}`,
                      }}>Lead Panelist</span>
                    )}
                  </div>
                  {dept && <p style={{ fontSize: 11, color: DT.textTer, marginTop: 1 }}>{dept}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DEFENSE SCHEDULE — Timeline based on BMMA spec
   30 min presentation + 1 hour Q&A
   ═══════════════════════════════════════════════════ */
function DefenseScheduleCard() {
  const segments = [
    { label: "Report to Venue", time: "Before start", duration: "", icon: <MapPin size={14} />, color: DT.textSec, desc: "Arrive early, set up equipment" },
    { label: "Ch. I–II Brief + Ch. III & IV", time: "+0 min", duration: "15 min", icon: <Presentation size={14} />, color: DT.blue, desc: "Present manuscript highlights and findings" },
    { label: "Project Output / Demo", time: "+15 min", duration: "15 min", icon: <Package size={14} />, color: DT.purple, desc: "Showcase your multimedia output" },
    { label: "Panel Q&A Session", time: "+30 min", duration: "60 min", icon: <MessageSquare size={14} />, color: DT.yellow, desc: "Answer panel questions thoroughly" },
    { label: "Deliberation (Closed)", time: "+90 min", duration: "~15 min", icon: <Eye size={14} />, color: DT.warning, desc: "Panel deliberates privately" },
    { label: "Verdict Announcement", time: "After deliberation", duration: "", icon: <ShieldCheck size={14} />, color: DT.success, desc: "Receive your defense verdict" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden h-full" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <Timer size={16} style={{ color: DT.blue }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Defense Flow</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DT.blueDim, color: DT.blue }}>
          ~1h 45m total
        </span>
      </div>
      <div className="px-6 py-4">
        {segments.map((s, i) => (
          <div key={s.label} className="flex items-start gap-3 relative">
            {/* Vertical line */}
            {i < segments.length - 1 && (
              <div className="absolute left-[13px] top-[28px] bottom-0 w-px" style={{ background: DT.borderDef }} />
            )}
            {/* Dot */}
            <div className="w-[28px] h-[28px] rounded-lg flex items-center justify-center shrink-0 mt-0.5 relative z-[1]" style={{
              background: withAlpha(s.color, 0.1), border: `1px solid ${withAlpha(s.color, 0.2)}`, color: s.color,
            }}>
              {s.icon}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>{s.label}</span>
                {s.duration && (
                  <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 10, fontWeight: 600, color: s.color, background: withAlpha(s.color, 0.08), fontFamily: FT.m }}>
                    {s.duration}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</p>
              {s.time !== "Before start" && s.time !== "After deliberation" && (
                <span style={{ fontSize: 10, color: DT.textDis, fontFamily: FT.m }}>{s.time}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   POSSIBLE VERDICTS — Updated per grading spec
   92–100=Pass, 82–91=Pass with Minor Revision,
   60–81=Re-demonstration, <60=Fail
   ═══════════════════════════════════════════════════ */
function VerdictsCard() {
  const verdicts = [
    {
      label: "PASS", range: "92 – 100", color: DT.success,
      desc: "Proceed to final manuscript submission and archive.",
      icon: <CheckCircle size={18} />,
    },
    {
      label: "PASS WITH MINOR REVISION", range: "82 – 91", color: DT.blue,
      desc: "Address panel-listed minor revisions within the given timeline.",
      icon: <Zap size={18} />,
    },
    {
      label: "RE-DEMONSTRATION", range: "60 – 81", color: DT.warning,
      desc: "Significant revisions needed. Must re-present to the panel.",
      icon: <AlertCircle size={18} />,
    },
    {
      label: "FAIL", range: "Below 60", color: DT.red,
      desc: "Consult your adviser for next steps and remediation.",
      icon: <AlertCircle size={18} />,
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <ShieldCheck size={16} style={{ color: DT.yellow }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Possible Verdicts</h3>
      </div>
      <div className="px-6 py-4 space-y-3">
        {verdicts.map(v => (
          <div key={v.label} className="flex items-start gap-3 p-3.5 rounded-xl transition hover:bg-white/[0.02]" style={{
            borderLeft: `3px solid ${v.color}`,
            background: withAlpha(v.color, 0.02),
          }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
              background: withAlpha(v.color, 0.1), color: v.color,
            }}>
              {v.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: v.color }}>{v.label}</span>
                <span className="px-2 py-0.5 rounded" style={{
                  fontSize: 10, fontWeight: 700, fontFamily: FT.m,
                  color: v.color, background: withAlpha(v.color, 0.08),
                }}>{v.range}</span>
              </div>
              <p style={{ fontSize: 12, color: DT.textTer, marginTop: 3, lineHeight: 1.5 }}>{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Scoring note */}
      <div className="px-6 pb-4">
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: withAlpha(DT.blue, 0.04), border: `1px solid ${withAlpha(DT.blue, 0.08)}` }}>
          <AlertCircle size={13} style={{ color: DT.blue, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>
            Overall defense grade = <span style={{ color: DT.blue, fontWeight: 600 }}>60% Group Score</span> + <span style={{ color: DT.purple, fontWeight: 600 }}>40% Individual Score</span>.
            Verdict is based on the group score. All 3 panelists' scores are averaged.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCORING BREAKDOWN — How the defense is graded
   ═══════════════════════════════════════════════════ */
function ScoringBreakdown() {
  const groupCriteria = [
    { label: "Chapter III — Results & Findings", pts: 25, color: DT.blue },
    { label: "Chapter IV — Discussion & Analysis", pts: 20, color: DT.purple },
    { label: "Project Prototype / Multimedia Output", pts: 25, color: DT.yellow },
    { label: "Oral Defense Presentation", pts: 15, color: DT.success },
    { label: "Response to Panel Questions", pts: 15, color: DT.warning },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <BookOpen size={16} style={{ color: DT.success }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Scoring Criteria</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DT.successDim, color: DT.success }}>
          Section A — 100 pts
        </span>
      </div>
      <div className="px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span style={{ fontSize: 11, fontWeight: 600, color: DT.textTer, textTransform: "uppercase", letterSpacing: "0.05em" }}>Group Evaluation Criteria</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: DT.textTer }}>Max Points</span>
        </div>
        <div className="space-y-2">
          {groupCriteria.map((c, i) => (
            <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl" style={{
              background: withAlpha(c.color, 0.02), border: `1px solid ${withAlpha(c.color, 0.06)}`,
            }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{
                background: withAlpha(c.color, 0.1), color: c.color,
              }}>
                <span style={{ fontFamily: FT.h, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              </div>
              <span className="flex-1" style={{ fontSize: 13, color: DT.textSec }}>{c.label}</span>
              <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: c.color }}>{c.pts}</span>
            </div>
          ))}
        </div>
        {/* Total */}
        <div className="flex items-center justify-between mt-3 pt-3 px-1" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>Total Group Score</span>
          <span style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: DT.blue }}>100</span>
        </div>

        {/* Individual evaluation note */}
        <div className="mt-4 p-3 rounded-xl flex items-start gap-2.5" style={{
          background: withAlpha(DT.purple, 0.04), border: `1px solid ${withAlpha(DT.purple, 0.1)}`,
        }}>
          <User size={14} style={{ color: DT.purple, marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: DT.purple }}>Section B — Individual Evaluation</p>
            <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2, lineHeight: 1.5 }}>
              Each member is rated individually on a 1–5 scale by each panelist.
              This accounts for 40% of your overall defense grade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PREPARATION GUIDE — Updated tiles
   ═══════════════════════════════════════════════════ */
function PrepGuide() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const tiles = [
    { icon: <Printer size={20} />, label: "3 Printed Copies", desc: "One manuscript for each panelist", color: DT.stiBlue },
    { icon: <Presentation size={20} />, label: "Slide Deck Ready", desc: "Cover Ch. I–IV in 15 minutes", color: DT.purple },
    { icon: <Package size={20} />, label: "Output Ready", desc: "Demo or prototype prepared (15 min)", color: DT.blue },
    { icon: <Users size={20} />, label: "Dry Run Done", desc: "Practice the full flow with your adviser", color: DT.success },
    { icon: <Shirt size={20} />, label: "Dress Code", desc: "Corporate / business attire mandatory", color: DT.warning },
    { icon: <Timer size={20} />, label: "Time Management", desc: "Stay within the 30-minute presentation", color: DT.red },
  ];

  return (
    <div ref={ref} className="rounded-2xl overflow-hidden" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <Zap size={16} style={{ color: DT.warning }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>How to Prepare</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className="rounded-xl p-4 transition-all duration-300 hover:-translate-y-[1px]"
            style={{
              background: withAlpha(tile.color, 0.03),
              border: `1px solid ${withAlpha(tile.color, 0.08)}`,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transitionDelay: `${i * 70}ms`,
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: withAlpha(tile.color, 0.1), color: tile.color }}>
              {tile.icon}
            </div>
            <div style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>{tile.label}</div>
            <div className="mt-1" style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.45 }}>{tile.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GROUP INFO CARD — Show your group context
   ═══════════════════════════════════════════════════ */
function GroupInfoCard({ group }: { group: any }) {
  if (!group) return null;
  const members = group.members || [];
  const title = group.title || group.capstoneTitle || "";
  const adviser = group.adviser || "";
  const colors = [DT.blue, DT.purple, DT.success, DT.warning, DT.red];

  return (
    <div className="rounded-2xl overflow-hidden h-full" style={cardBase}>
      <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <Users size={16} style={{ color: DT.blue }} />
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Your Group</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DT.blueDim, color: DT.blue }}>
          Group {group.number}
        </span>
      </div>
      <div className="px-6 py-4">
        {title && (
          <p className="mb-3" style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri, lineHeight: 1.4 }}>
            {title}
          </p>
        )}
        {adviser && (
          <div className="flex items-center gap-2 mb-4 px-2.5 py-2 rounded-lg" style={{ background: withAlpha(DT.success, 0.04), border: `1px solid ${withAlpha(DT.success, 0.08)}` }}>
            <User size={12} style={{ color: DT.success }} />
            <span style={{ fontSize: 11, color: DT.textTer }}>Adviser:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: DT.success }}>{adviser}</span>
          </div>
        )}
        <p style={{ fontSize: 11, color: DT.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Members</p>
        <div className="space-y-1.5">
          {members.map((m: any, i: number) => {
            const name = m.name || m.email?.split("@")[0] || "?";
            const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            const c = colors[i % colors.length];
            return (
              <div key={m.email || i} className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{
                  background: m.avatarUrl ? "transparent" : `linear-gradient(135deg, ${c}, ${withAlpha(c, 0.6)})`,
                  overflow: "hidden",
                }}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{initials}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: DT.textSec }}>{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════ */
function DefenseSkeleton() {
  const shimmer: CSSProperties = {
    background: `linear-gradient(90deg, ${DT.raised} 25%, ${DT.elevated} 50%, ${DT.raised} 75%)`,
    backgroundSize: "200% 100%", animation: "cpShimmer 1.5s ease-in-out infinite", borderRadius: 16,
  };
  return (
    <div className="max-w-[960px] mx-auto space-y-5" style={{ fontFamily: FT.b }}>
      <style>{KF_STANDARD}</style>
      <div style={{ ...shimmer, height: 240 }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div style={{ ...shimmer, height: 300 }} />
        <div style={{ ...shimmer, height: 300 }} />
      </div>
      <div style={{ ...shimmer, height: 200 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE — No defense scheduled
   ═══════════════════════════════════════════════════ */
function NoDefenseState() {
  return (
    <PageShell className="max-w-[960px] mx-auto">
      <Fade delay={0}>
        <h1 className="mb-2" style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
          Defense Day
        </h1>
        <p style={{ fontSize: 14, color: DT.textSec }}>Your capstone oral defense schedule and preparation guide</p>
      </Fade>

      <Fade delay={80}>
        <div className="mt-8 rounded-2xl p-12 text-center" style={cardBase}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{
            background: withAlpha(DT.yellow, 0.08), border: `1px solid ${withAlpha(DT.yellow, 0.15)}`,
          }}>
            <Calendar size={36} style={{ color: DT.yellow }} />
          </div>
          <h2 style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 700, color: DT.textPri }}>No Defense Scheduled Yet</h2>
          <p className="mt-3 mx-auto" style={{ fontSize: 14, color: DT.textTer, maxWidth: 440, lineHeight: 1.6 }}>
            Your group doesn't have a defense slot assigned yet.
            Your coordinator will schedule your defense from the Defense Overview page — you'll be notified once it's set.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
              background: withAlpha(DT.blue, 0.06), border: `1px solid ${withAlpha(DT.blue, 0.1)}`,
            }}>
              <ShieldCheck size={14} style={{ color: DT.blue }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>Awaiting Schedule</span>
            </div>
          </div>
        </div>
      </Fade>

      {/* Still show the prep guide and verdicts even without a schedule */}
      <div className="mt-6 space-y-5">
        <Fade delay={160}><VerdictsCard /></Fade>
        <Fade delay={220}><ScoringBreakdown /></Fade>
        <Fade delay={280}><PrepGuide /></Fade>
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */
export function DefenseInfoPage() {
  const [loading, setLoading] = useState(true);
  const [defense, setDefense] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const ctxRes = await apiFetch<any>("/me/context");
      setGroup(ctxRes.myGroup || null);
      setDefense(ctxRes.myDefense || null);
    } catch (err) {
      console.error("Failed to fetch defense info:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <DefenseSkeleton />;

  // Build panelist list from defense.panelists or group.panelists
  const panelists = defense?.panelists || group?.panelists || [];

  // No defense scheduled
  if (!defense && !group) return <NoDefenseState />;
  if (!defense) return <NoDefenseState />;

  return (
    <PageShell className="max-w-[960px] mx-auto space-y-5">
      <style>{KF_LOCAL}</style>

      {/* Header */}
      <Fade delay={0}>
        <h1 className="mb-0.5" style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
          Defense Day
        </h1>
        <p style={{ fontSize: 14, color: DT.textSec }}>Your capstone oral defense schedule and preparation guide</p>
      </Fade>

      {/* HERO: Countdown + defense details */}
      <Fade delay={60}>
        <CountdownHero defense={defense} />
      </Fade>

      {/* 2-col: Panel + Group OR 3-col when group is available */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Fade delay={120}><AssignedPanelCard panelists={panelists} /></Fade>
        <Fade delay={160}>{group ? <GroupInfoCard group={group} /> : <DefenseScheduleCard />}</Fade>
      </div>

      {/* Schedule (if group info was shown above) */}
      {group && (
        <Fade delay={200}><DefenseScheduleCard /></Fade>
      )}

      {/* Verdicts */}
      <Fade delay={240}><VerdictsCard /></Fade>

      {/* Scoring criteria */}
      <Fade delay={280}><ScoringBreakdown /></Fade>

      {/* Preparation guide */}
      <Fade delay={320}><PrepGuide /></Fade>
    </PageShell>
  );
}