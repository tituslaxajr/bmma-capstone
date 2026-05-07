import {
  MANUSCRIPT_CHAPTERS, FORMATTING_SPECS, SUBMISSION_CHECKLIST,
  DEFENSE_PREP_STEPS, VERDICT_CHIPS, APPENDICES, BEST_PRACTICES,
} from "./manuscript-guide-data";
import type { ManuscriptChapter } from "./manuscript-guide-data";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronUp, FileText, Paperclip,
  Lightbulb, CheckSquare, Info, Star, Shield, Download,
  Edit3, Monitor, Presentation, HelpCircle, Briefcase,
  CheckCircle, Circle, AlertTriangle, Clock,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { useInView, Fade, cardBg } from "./ui/shared-ui";

/* ═══ Keyframes ═══ */
const KF = `
@keyframes mgPageIn{from{opacity:0}to{opacity:1}}
@keyframes mgFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes mgShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes mgPulse{0%,100%{opacity:0.7}50%{opacity:1}}
`;

/* ═══ Card shell — reusable wrapper ═══ */
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{
      background: cardBg,
      border: `1px solid ${DT.borderSub}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, badge, accent, right }: {
  icon: React.ReactNode; title: string; badge?: string; accent?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
      <div className="flex items-center gap-2.5">
        {icon}
        <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 rounded-full" style={{
            fontSize: 10, fontWeight: 600,
            background: accent ? withAlpha(accent, 0.1) : "rgba(255,255,255,0.04)",
            color: accent || DT.textTer,
            border: `1px solid ${accent ? withAlpha(accent, 0.15) : DT.borderDef}`,
          }}>{badge}</span>
        )}
      </div>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. PAGE HEADER + Progress Tracker
   ═══════════════════════════════════════════ */
const STAGES = [
  { key: "ch1", label: "Ch. I", short: "I" },
  { key: "ch2", label: "Ch. II", short: "II" },
  { key: "ch3", label: "Ch. III", short: "III" },
  { key: "ch4", label: "Ch. IV", short: "IV" },
  { key: "endorse", label: "Endorsement", short: "End." },
  { key: "defense", label: "Defense", short: "Def." },
];

function ProgressTracker({ activeStage }: { activeStage: number }) {
  return (
    <div className="flex items-center w-full mt-5 px-1">
      {STAGES.map((s, i) => {
        const isComplete = i < activeStage;
        const isActive = i === activeStage;
        const isLast = i === STAGES.length - 1;
        const color = isComplete ? DT.success : isActive ? DT.blue : DT.textDis;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0" style={{ flexGrow: isLast ? 0 : 1 }}>
            {/* Node */}
            <div className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all" style={{
                background: isComplete ? DT.success : isActive ? DT.blue : DT.elevated,
                border: `2px solid ${color}`,
                boxShadow: isActive ? `0 0 12px ${withAlpha(DT.blue, 0.3)}` : isComplete ? `0 0 8px ${withAlpha(DT.success, 0.2)}` : "none",
              }}>
                {isComplete ? (
                  <CheckCircle size={14} style={{ color: DT.base }} />
                ) : (
                  <span style={{ fontFamily: FT.h, fontSize: 9, fontWeight: 700, color: isActive ? DT.base : DT.textDis }}>{s.short}</span>
                )}
              </div>
              <span className="mt-1.5 text-center truncate w-full" style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500, fontFamily: FT.h,
                color: isComplete ? DT.success : isActive ? DT.blue : DT.textDis,
              }}>{s.label}</span>
            </div>
            {/* Connector */}
            {!isLast && (
              <div className="flex-1 h-0.5 mx-1 rounded-full" style={{
                background: isComplete ? DT.success : DT.borderDef,
                boxShadow: isComplete ? `0 0 4px ${withAlpha(DT.success, 0.15)}` : "none",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. CHAPTER ACCORDION CARD
   ═══════════════════════════════════════════ */
function ChapterCard({ chapter, completedSections, onToggleSection }: {
  chapter: ManuscriptChapter;
  completedSections: Set<string>;
  onToggleSection: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const doneCount = chapter.sections.filter(s => completedSections.has(s.id)).length;
  const allDone = doneCount === chapter.sections.length;
  const pct = chapter.sections.length > 0 ? Math.round((doneCount / chapter.sections.length) * 100) : 0;
  const color = chapter.color;

  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 cursor-pointer hover:bg-white/[0.02] transition text-left">
        {/* Chapter number badge */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{
          background: chapter.colorDim, border: `1px solid ${withAlpha(color, 0.15)}`,
        }}>
          <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color }}>{chapter.number}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
              Chapter {chapter.number}: {chapter.title}
            </h3>
            {chapter.defenseEmphasis && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                fontSize: 9, fontWeight: 700, background: withAlpha(DT.yellow, 0.12), color: DT.yellow,
                border: `1px solid ${withAlpha(DT.yellow, 0.2)}`,
              }}>
                <Star size={8} /> Final Defense
              </span>
            )}
          </div>
          <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>{chapter.summary}</p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5">
          {/* Completion badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
            background: allDone ? withAlpha(DT.success, 0.08) : "rgba(255,255,255,0.04)",
            border: `1px solid ${allDone ? withAlpha(DT.success, 0.15) : DT.borderDef}`,
          }}>
            {allDone ? <CheckCircle size={10} style={{ color: DT.success }} /> : null}
            <span style={{ fontSize: 10, fontWeight: 600, color: allDone ? DT.success : DT.textTer, fontFamily: FT.m }}>
              {doneCount}/{chapter.sections.length}
            </span>
          </div>
          {open ? <ChevronUp size={16} style={{ color: DT.textDis }} /> : <ChevronDown size={16} style={{ color: DT.textDis }} />}
        </div>
      </button>

      {/* Defense emphasis banner */}
      {open && chapter.defenseEmphasis && (
        <div className="mx-5 mb-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{
          background: withAlpha(DT.yellow, 0.06), border: `1px solid ${withAlpha(DT.yellow, 0.12)}`,
        }}>
          <Star size={13} style={{ color: DT.yellow, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: DT.yellow }}>
            Emphasized during the Final Defense Presentation
          </span>
        </div>
      )}

      {/* Section progress bar */}
      {open && (
        <div className="mx-5 mb-3">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: DT.borderDef }}>
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${pct}%`, background: color,
              boxShadow: `0 0 8px ${withAlpha(color, 0.3)}`,
            }} />
          </div>
        </div>
      )}

      {/* Sections */}
      {open && (
        <div className="px-5 pb-5 space-y-1" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          {chapter.sections.map(sec => {
            const done = completedSections.has(sec.id);
            return (
              <button
                key={sec.id}
                onClick={(e) => { e.stopPropagation(); onToggleSection(sec.id); }}
                className="w-full flex gap-3 py-3.5 pl-3 text-left rounded-lg transition cursor-pointer hover:bg-white/[0.02]"
                style={{ borderLeft: `2px solid ${withAlpha(color, done ? 0.4 : 0.12)}` }}
              >
                {/* Toggle */}
                <span className="shrink-0 mt-0.5 transition-colors">
                  {done
                    ? <CheckCircle size={16} style={{ color: DT.success }} />
                    : <Circle size={16} style={{ color: DT.textDis }} />
                  }
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{
                      background: chapter.colorDim, fontFamily: FT.h, fontSize: 10, fontWeight: 700, color,
                    }}>
                      {sec.letter}
                    </span>
                    <p style={{
                      fontFamily: FT.h, fontSize: 13, fontWeight: 700,
                      color: done ? DT.textSec : DT.textPri,
                      textDecoration: done ? "line-through" : "none",
                    }}>{sec.title}</p>
                  </div>
                  <p className="mt-1 ml-8" style={{ fontSize: 12, color: DT.textTer, lineHeight: 1.5 }}>{sec.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   3. FORMATTING STANDARDS CARD
   ═══════════════════════════════════════════ */
function FormattingStandardsCard() {
  return (
    <Card>
      <CardHeader
        icon={<FileText size={15} style={{ color: DT.textTer }} />}
        title="Formatting Standards"
        badge="GU-CRD-032-04"
        accent={DT.purple}
      />
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {FORMATTING_SPECS.map(spec => (
            <div key={spec.label} className="flex items-start gap-3 py-1.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              <span className="shrink-0" style={{ fontSize: 11, fontWeight: 700, color: DT.textTer, fontFamily: FT.h, minWidth: 100 }}>
                {spec.label}
              </span>
              <span style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{spec.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/docs/FT-CRD-161-00_Capstone_Project_Manuscript_Template.docx"
            download="FT-CRD-161-00_Capstone_Project_Manuscript_Template.docx"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.03]"
            style={{
              background: DT.blueDim, border: `1px solid ${withAlpha(DT.blue, 0.15)}`, color: DT.blue,
            }}>
            <Download size={14} />
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FT.h }}>Download Manuscript Template</span>
          </a>
          <a
            href="/docs/GU-CRD-032-03_BMMA_Capstone_Project_Guideline.pdf"
            download="GU-CRD-032-03_BMMA_Capstone_Project_Guideline.pdf"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.03]"
            style={{
              background: DT.yellowDim, border: `1px solid ${withAlpha(DT.yellow, 0.18)}`, color: DT.yellow,
            }}>
            <Download size={14} />
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FT.h }}>Download Capstone Project Guideline</span>
          </a>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   4. SUBMISSION CHECKLIST CARD
   ═══════════════════════════════════════════ */
function SubmissionChecklistCard({ checked, onToggle }: { checked: Set<string>; onToggle: (id: string) => void }) {
  const total = SUBMISSION_CHECKLIST.length;
  const doneCount = SUBMISSION_CHECKLIST.filter(c => checked.has(c.id)).length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  return (
    <Card>
      <CardHeader
        icon={<CheckSquare size={15} style={{ color: DT.textTer }} />}
        title="Submission Checklist"
        right={
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full" style={{
              background: allDone ? withAlpha(DT.success, 0.1) : withAlpha(DT.blue, 0.08),
              border: `1px solid ${allDone ? withAlpha(DT.success, 0.15) : withAlpha(DT.blue, 0.12)}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? DT.success : DT.blue, fontFamily: FT.m }}>
                {doneCount} of {total} &mdash; {pct}%
              </span>
            </div>
          </div>
        }
      />

      {/* Progress bar */}
      <div className="mx-5 mt-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DT.borderDef }}>
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${pct}%`,
            background: allDone ? DT.success : DT.blue,
            boxShadow: `0 0 8px ${withAlpha(allDone ? DT.success : DT.blue, 0.3)}`,
          }} />
        </div>
      </div>

      <div className="px-5 py-3 space-y-0.5">
        {SUBMISSION_CHECKLIST.map(item => {
          const done = checked.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className="w-full flex items-center gap-3 py-3 px-2 rounded-lg text-left transition cursor-pointer hover:bg-white/[0.02] active:scale-[0.99]"
            >
              <span className="shrink-0 transition-transform">
                {done
                  ? <CheckCircle size={18} style={{ color: DT.success }} />
                  : <Circle size={18} style={{ color: DT.textDis }} />
                }
              </span>
              <span style={{
                fontSize: 13, fontWeight: done ? 500 : 400, color: done ? DT.textTer : DT.textPri,
                textDecoration: done ? "line-through" : "none", lineHeight: 1.4,
              }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Warning */}
      <div className="mx-5 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{
        background: withAlpha(DT.red, 0.05), border: `1px solid ${withAlpha(DT.red, 0.12)}`,
      }}>
        <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: DT.red }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: DT.red, lineHeight: 1.5 }}>
            Unendorsed groups will be graded as FAILED.
          </p>
          <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2 }}>
            Submit all requirements at least 1 week before the defense date.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   5. FINAL DEFENSE PREPARATION GUIDE
   ═══════════════════════════════════════════ */
const STEP_ICONS: Record<string, React.ReactNode> = {
  edit: <Edit3 size={18} />,
  monitor: <Monitor size={18} />,
  presentation: <Presentation size={18} />,
  help: <HelpCircle size={18} />,
  briefcase: <Briefcase size={18} />,
};

const STEP_COLORS = [DT.success, DT.blue, DT.purple, "#FBBF24", DT.red];

function DefensePrepCard() {
  return (
    <Card>
      <CardHeader
        icon={<Shield size={15} style={{ color: DT.textTer }} />}
        title="Final Defense Preparation"
        badge="5 Steps"
        accent={DT.purple}
      />
      <div className="px-5 py-4 space-y-3">
        {DEFENSE_PREP_STEPS.map((s, i) => {
          const color = STEP_COLORS[i % STEP_COLORS.length];
          return (
            <div key={s.step} className="relative">
              {/* Connector */}
              {i < DEFENSE_PREP_STEPS.length - 1 && (
                <div className="absolute left-[19px] top-[44px] bottom-[-8px] w-px" style={{ background: DT.borderDef }} />
              )}

              <div className="flex items-start gap-4">
                {/* Step node */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: withAlpha(color, 0.08), color, border: `1px solid ${withAlpha(color, 0.15)}`,
                }}>
                  {STEP_ICONS[s.icon] || <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800 }}>{s.step}</span>}
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: withAlpha(color, 0.1), color, fontFamily: FT.m }}>
                      Step {s.step}
                    </span>
                    <h4 style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{s.title}</h4>
                  </div>
                  <p className="mt-1" style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{s.description}</p>

                  {/* Presentation timeline bar */}
                  {s.timeline && (
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderHair}` }}>
                      <div className="flex h-7">
                        {s.timeline.map((seg, si) => {
                          const segColors = [DT.blue, DT.success, DT.purple, DT.textTer];
                          const sc = segColors[si % segColors.length];
                          return (
                            <div key={seg.label} className="flex items-center justify-center relative" style={{
                              width: `${seg.pct}%`, background: withAlpha(sc, 0.12),
                              borderRight: si < s.timeline!.length - 1 ? `1px solid ${DT.borderDef}` : "none",
                            }}>
                              <span className="hidden sm:block truncate px-1" style={{ fontSize: 8, fontWeight: 700, color: sc, fontFamily: FT.h }}>
                                {seg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex">
                        {s.timeline.map((seg, si) => (
                          <div key={seg.label} className="text-center py-1" style={{
                            width: `${seg.pct}%`,
                            borderRight: si < s.timeline!.length - 1 ? `1px solid ${DT.borderHair}` : "none",
                            background: DT.raised,
                          }}>
                            <span style={{ fontSize: 8, color: DT.textTer, fontFamily: FT.m }}>{seg.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   6. VERDICT REFERENCE CHIP ROW
   ═══════════════════════════════════════════ */
function VerdictChipRow() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`,
    }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <Shield size={13} style={{ color: DT.textTer }} />
        <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>Verdict Reference</span>
        <span className="ml-auto" style={{ fontSize: 9, color: DT.textDis, fontFamily: FT.m }}>Based on Group Defense Score</span>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-4">
        {VERDICT_CHIPS.map((v, i) => (
          <div
            key={v.label}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-default"
            style={{
              background: v.colorDim,
              border: `1px solid ${withAlpha(v.color, 0.18)}`,
              boxShadow: hoveredIdx === i ? `0 0 12px ${withAlpha(v.color, 0.15)}` : "none",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span style={{ fontFamily: FT.m, fontSize: 12, fontWeight: 700, color: v.color }}>{v.range}</span>
            <div className="w-px h-3.5" style={{ background: withAlpha(v.color, 0.2) }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: v.color }}>{v.label}</span>

            {/* Tooltip */}
            {hoveredIdx === i && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2.5 rounded-xl z-50 pointer-events-none" style={{
                background: DT.dark, border: `1px solid ${DT.borderDef}`,
                boxShadow: DT.shadowMd,
              }}>
                <p style={{ fontSize: 10, color: DT.textSec, lineHeight: 1.5 }}>
                  Based on Group Defense Score. Individual grade (Communication, Work Organization, Effectiveness) is evaluated separately (40% of defense grade).
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1" style={{ background: DT.dark, borderRight: `1px solid ${DT.borderDef}`, borderBottom: `1px solid ${DT.borderDef}` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APPENDICES (kept from prior version, restyled)
   ═══════════════════════════════════════════ */
function AppendicesCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 cursor-pointer hover:bg-white/[0.02] transition text-left">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: DT.yellowDim, border: `1px solid ${withAlpha(DT.yellow, 0.12)}` }}>
          <Paperclip size={20} style={{ color: DT.yellow }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Appendices</h3>
          <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>Supporting documents and technical details</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full hidden sm:block" style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.04)", color: DT.textTer, border: `1px solid ${DT.borderDef}` }}>
            {APPENDICES.length} items
          </span>
          {open ? <ChevronUp size={16} style={{ color: DT.textDis }} /> : <ChevronDown size={16} style={{ color: DT.textDis }} />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
            {APPENDICES.map((a, i) => (
              <div key={a.id} className="flex gap-2.5 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                <span className="shrink-0 w-6 h-6 rounded flex items-center justify-center" style={{ background: DT.yellowDim, fontFamily: FT.m, fontSize: 9, fontWeight: 700, color: DT.yellow }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>{a.title}</p>
                  <p className="mt-0.5" style={{ fontSize: 10, color: DT.textTer, lineHeight: 1.4 }}>{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   BEST PRACTICES (kept, restyled)
   ═══════════════════════════════════════════ */
function BestPracticesCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 cursor-pointer hover:bg-white/[0.02] transition text-left">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: DT.successDim, border: `1px solid ${withAlpha(DT.success, 0.12)}` }}>
          <Lightbulb size={20} style={{ color: DT.success }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>Best Practices</h3>
          <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>Guidelines from the STI Capstone Project Manual</p>
        </div>
        {open ? <ChevronUp size={16} style={{ color: DT.textDis }} /> : <ChevronDown size={16} style={{ color: DT.textDis }} />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          {BEST_PRACTICES.map(bp => (
            <div key={bp.category} className="pt-3">
              <h4 className="flex items-center gap-2 mb-2" style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.purple }}>
                <CheckSquare size={14} /> {bp.category}
              </h4>
              <ul className="space-y-1.5 pl-5">
                {bp.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: DT.purple }} />
                    <span style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════ */
export function ManuscriptGuidePage() {
  // Local state for checklist toggles (client-only, could persist to backend later)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((id: string) => {
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleCheckItem = useCallback((id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Compute active stage based on chapter completion
  const totalSections = MANUSCRIPT_CHAPTERS.reduce((sum, ch) => sum + ch.sections.length, 0);
  const doneSections = completedSections.size;
  const chaptersDone = MANUSCRIPT_CHAPTERS.filter(ch =>
    ch.sections.every(s => completedSections.has(s.id))
  ).length;
  // Simple heuristic: stage = number of completed chapters (0-indexed), capped at endorsement/defense
  const allChaptersDone = chaptersDone === MANUSCRIPT_CHAPTERS.length;
  const allChecked = checkedItems.size === SUBMISSION_CHECKLIST.length;
  const activeStage = allChecked ? 5 : allChaptersDone ? 4 : chaptersDone;

  return (
    <div className="max-w-[900px] mx-auto" style={{ fontFamily: FT.b, animation: "mgPageIn 400ms ease-out" }}>
      <style>{KF}</style>

      {/* ═══ 1. Page Header ═══ */}
      <Fade delay={0}>
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
                Capstone Project 2 &mdash; Manuscript Guide
              </h1>
              <p className="mt-1 flex items-center gap-2 flex-wrap" style={{ fontSize: 13, color: DT.textTer }}>
                <span>Bachelor of Multimedia Arts (BMMA)</span>
                <span style={{ color: DT.borderDef }}>|</span>
                <span style={{ fontWeight: 500, color: DT.textSec }}>AY 2025&ndash;2026</span>
              </p>
            </div>
            <span className="px-3 py-1 rounded-full shrink-0" style={{
              fontSize: 10, fontWeight: 700, fontFamily: FT.m,
              background: withAlpha(DT.blue, 0.08), color: DT.blue,
              border: `1px solid ${withAlpha(DT.blue, 0.15)}`,
            }}>
              GU-CRD-032-04
            </span>
          </div>

          {/* Progress tracker */}
          <ProgressTracker activeStage={activeStage} />
        </div>
      </Fade>

      {/* ═══ Formatting Reminder Banner ═══ */}
      <Fade delay={60}>
        <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{
          background: withAlpha(DT.purple, 0.05), border: `1px solid ${withAlpha(DT.purple, 0.12)}`,
        }}>
          <Info size={16} className="shrink-0 mt-0.5" style={{ color: DT.purple }} />
          <div>
            <p style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.purple }}>Formatting Reminder</p>
            <p className="mt-1" style={{ fontSize: 11, color: DT.textSec, lineHeight: 1.5 }}>
              Times New Roman, 12pt, 1.5 line spacing. Margins: 1.5&quot; left, 1&quot; top/right/bottom. APA 7th edition for all citations.
            </p>
          </div>
        </div>
      </Fade>

      <div className="space-y-4">
        {/* ═══ 2. Chapter Accordions ═══ */}
        {MANUSCRIPT_CHAPTERS.map((ch, i) => (
          <Fade key={ch.number} delay={100 + i * 50}>
            <ChapterCard chapter={ch} completedSections={completedSections} onToggleSection={toggleSection} />
          </Fade>
        ))}

        {/* Appendices */}
        <Fade delay={320}>
          <AppendicesCard />
        </Fade>

        {/* ═══ 3. Formatting Standards ═══ */}
        <Fade delay={360}>
          <FormattingStandardsCard />
        </Fade>

        {/* ═══ 4. Submission Checklist ═══ */}
        <Fade delay={400}>
          <SubmissionChecklistCard checked={checkedItems} onToggle={toggleCheckItem} />
        </Fade>

        {/* ═══ 5. Defense Preparation ═══ */}
        <Fade delay={440}>
          <DefensePrepCard />
        </Fade>

        {/* Best Practices */}
        <Fade delay={480}>
          <BestPracticesCard />
        </Fade>

        {/* Mandatory ongoing requirements */}
        <Fade delay={520}>
          <div className="rounded-2xl p-5" style={{
            background: `linear-gradient(145deg, ${DT.warningDim}, ${withAlpha(DT.warning, 0.03)})`,
            border: `1px solid ${withAlpha(DT.warning, 0.12)}`,
          }}>
            <h3 className="flex items-center gap-2 mb-2" style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.warning }}>
              <Clock size={16} /> Mandatory Ongoing Requirements
            </h3>
            <ul className="space-y-2">
              {[
                "Weekly 1-hour consultation with your Capstone Project Adviser",
                "Capstone Project Consultation Form signed every meeting",
                "Peer Evaluation Form submitted as part of final grade",
                "Output must remain aligned with approved Project & Content Development Brief",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: DT.warning }} />
                  <span style={{ fontSize: 12, color: DT.textSec, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Fade>

        {/* ═══ 6. Verdict Reference ═══ */}
        <Fade delay={560}>
          <VerdictChipRow />
        </Fade>
      </div>

      {/* Bottom spacer for mobile nav */}
      <div className="h-20 sm:h-4" />
    </div>
  );
}
