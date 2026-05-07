import { useState } from "react";
import {
  Brain, Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Loader2, Sparkles, Eye, BookOpen, Lightbulb, Zap, FileWarning,
  PenTool, Quote, Info, Bot,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { toast } from "sonner";

/* ═══════════════════════════════════════════
   AI ANALYSIS PANEL — Shared component
   Used by both Coordinator and Student plagiarism pages
   ═══════════════════════════════════════════ */

interface AIFlag {
  type: string;
  severity: string;
  description: string;
  excerpt: string;
  recommendation: string;
}

interface AISection {
  title: string;
  aiLikelihood: string;
  styleNote: string;
  flaggedExcerpt: string | null;
  concern: string | null;
}

interface WritingProfile {
  vocabularyLevel: string;
  sentenceComplexity: string;
  toneFormality: string;
  citationStyle: string;
}

interface AIAnalysis {
  aiGeneratedScore: number;
  styleConsistencyScore: number;
  academicIntegrityScore: number;
  overallVerdict: string;
  verdictSummary: string;
  sections: AISection[];
  flags: AIFlag[];
  writingProfile: WritingProfile;
  recommendations: string[];
}

interface AIReport {
  id: number;
  groupNumber: number | null;
  wordCount: number;
  analysis: AIAnalysis;
  analyzedAt: string;
  model: string;
}

/* ─── Score ring (reused for 3 metrics) ─── */
function ScoreRing({ value, label, size = 80, invert = false }: {
  value: number; label: string; size?: number; invert?: boolean;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  // invert = true means higher = worse (for AI-generated score)
  const score = invert ? value : value;
  const color = invert
    ? (score > 60 ? DT.red : score > 30 ? DT.warning : DT.success)
    : (score >= 70 ? DT.success : score >= 40 ? DT.warning : DT.red);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={DT.borderSub} strokeWidth={4} />
          <circle
            cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={4}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: FT.m, fontSize: size * 0.26, fontWeight: 800, color }}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: DT.textTer, maxWidth: size + 10 }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Verdict badge ─── */
function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    CLEAN: { color: DT.success, bg: DT.successDim, icon: CheckCircle2, label: "Clean" },
    LOW_RISK: { color: DT.yellow, bg: DT.yellowDim, icon: Shield, label: "Low Risk" },
    MODERATE_RISK: { color: DT.warning, bg: DT.warningDim, icon: AlertTriangle, label: "Moderate Risk" },
    HIGH_RISK: { color: DT.red, bg: DT.redDim, icon: FileWarning, label: "High Risk" },
  };
  const c = config[verdict] || config.LOW_RISK;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: c.bg, color: c.color }}
    >
      <Icon size={13} /> {c.label}
    </span>
  );
}

/* ─── Flag type icon + color ─── */
function getFlagConfig(type: string) {
  const map: Record<string, { icon: any; color: string; label: string }> = {
    AI_GENERATED: { icon: Bot, color: DT.red, label: "AI-Generated" },
    STYLE_SHIFT: { icon: PenTool, color: DT.warning, label: "Style Shift" },
    PARAPHRASE_PATTERN: { icon: Quote, color: DT.purple, label: "Paraphrase" },
    CITATION_ISSUE: { icon: BookOpen, color: DT.blue, label: "Citation" },
    VOCABULARY_ANOMALY: { icon: Zap, color: DT.yellow, label: "Vocabulary" },
  };
  return map[type] || { icon: AlertTriangle, color: DT.textSec, label: type };
}

/* ─── Severity dot ─── */
function SeverityDot({ severity }: { severity: string }) {
  const color = severity === "HIGH" ? DT.red : severity === "MEDIUM" ? DT.warning : DT.yellow;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
      style={{ background: withAlpha(color, 0.09), color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {severity}
    </span>
  );
}

/* ─── Flag card ─── */
function FlagCard({ flag, index }: { flag: AIFlag; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getFlagConfig(flag.type);
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: DT.raised, border: `1px solid ${flag.severity === "HIGH" ? "rgba(248,113,113,0.15)" : DT.borderSub}` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: withAlpha(cfg.color, 0.08), color: cfg.color }}
          >
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
              <SeverityDot severity={flag.severity} />
            </div>
            <p className="text-xs font-medium mt-0.5 line-clamp-1" style={{ color: DT.textPri }}>
              {flag.description}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3">
          {expanded ? <ChevronUp size={14} style={{ color: DT.textTer }} /> : <ChevronDown size={14} style={{ color: DT.textTer }} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2.5">
          {flag.excerpt && (
            <div className="rounded-lg p-3" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DT.textTer }}>
                Flagged Excerpt
              </span>
              <p className="text-xs leading-relaxed italic" style={{ color: DT.textSec, fontFamily: FT.b }}>
                "{flag.excerpt}"
              </p>
            </div>
          )}
          <div className="rounded-lg p-3" style={{ background: DT.blueDim, border: `1px solid ${DT.blueGlow}` }}>
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DT.blue }}>
              Recommendation
            </span>
            <p className="text-xs leading-relaxed" style={{ color: DT.textSec }}>
              {flag.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section analysis card ─── */
function SectionCard({ section }: { section: AISection }) {
  const [expanded, setExpanded] = useState(false);
  const aiColor = section.aiLikelihood === "HIGH" ? DT.red : section.aiLikelihood === "MEDIUM" ? DT.warning : DT.success;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: DT.raised, border: `1px solid ${DT.borderHair}` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Eye size={14} style={{ color: DT.textTer }} />
          <span className="text-xs font-semibold" style={{ color: DT.textPri }}>{section.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: withAlpha(aiColor, 0.08), color: aiColor }}>
            AI: {section.aiLikelihood}
          </span>
          {expanded ? <ChevronUp size={13} style={{ color: DT.textTer }} /> : <ChevronDown size={13} style={{ color: DT.textTer }} />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-[11px] leading-relaxed" style={{ color: DT.textSec }}>{section.styleNote}</p>
          {section.concern && (
            <div className="rounded-lg p-2.5" style={{ background: DT.warningDim, border: "1px solid rgba(251,191,36,0.10)" }}>
              <p className="text-[11px]" style={{ color: DT.warning }}>
                <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />
                {section.concern}
              </p>
            </div>
          )}
          {section.flaggedExcerpt && (
            <div className="rounded-lg p-2.5" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
              <p className="text-[10px] italic leading-relaxed" style={{ color: DT.textTer }}>
                "{section.flaggedExcerpt}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Writing profile grid ─── */
function WritingProfileGrid({ profile }: { profile: WritingProfile }) {
  const items = [
    { label: "Vocabulary", value: profile.vocabularyLevel, icon: BookOpen },
    { label: "Sentence Complexity", value: profile.sentenceComplexity, icon: PenTool },
    { label: "Tone & Formality", value: profile.toneFormality, icon: Eye },
    { label: "Citation Style", value: profile.citationStyle, icon: Quote },
  ];

  const getColor = (val: string) => {
    if (["INCONSISTENT", "MISSING", "MIXED"].includes(val)) return DT.warning;
    if (["BASIC", "SIMPLE", "INFORMAL"].includes(val)) return DT.yellow;
    return DT.success;
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const color = getColor(item.value);
        return (
          <div key={item.label} className="p-3 rounded-xl" style={{ background: DT.raised, border: `1px solid ${DT.borderHair}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon size={12} style={{ color: DT.textTer }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: DT.textTer }}>{item.label}</span>
            </div>
            <span className="text-xs font-bold" style={{ color, fontFamily: FT.m }}>
              {item.value.replace(/_/g, " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORTED COMPONENTS
   ═══════════════════════════════════════════ */

/* Full AI report display */
export function AIReportDisplay({ report }: { report: AIReport }) {
  const a = report.analysis;
  if (!a) return null;

  return (
    <div className="space-y-5">
      {/* Header with scores */}
      <div className="rounded-xl overflow-hidden" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
        <div
          className="p-5 flex flex-col sm:flex-row items-center gap-5"
          style={{ borderBottom: `1px solid ${DT.borderSub}` }}
        >
          <div className="flex gap-4 sm:gap-6">
            <ScoreRing value={a.aiGeneratedScore} label="AI-Generated Likelihood" invert />
            <ScoreRing value={a.styleConsistencyScore} label="Style Consistency" />
            <ScoreRing value={a.academicIntegrityScore} label="Academic Integrity" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Brain size={16} style={{ color: DT.purple }} />
              <h3 className="text-base font-bold" style={{ fontFamily: FT.h, color: DT.textPri }}>
                AI Deep Analysis
              </h3>
            </div>
            {report.groupNumber && (
              <p className="text-xs" style={{ color: DT.textSec }}>
                Group {report.groupNumber} · {report.wordCount.toLocaleString()} words
              </p>
            )}
            <p className="text-[10px] mt-0.5" style={{ color: DT.textTer }}>
              {new Date(report.analyzedAt).toLocaleString()} · {report.model}
            </p>
            <div className="mt-2">
              <VerdictBadge verdict={a.overallVerdict} />
            </div>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: DT.textSec }}>
              {a.verdictSummary}
            </p>
          </div>
        </div>

        {/* Writing profile */}
        <div className="p-5" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: DT.textTer }}>
            <PenTool size={11} className="inline mr-1 -mt-0.5" />
            Writing Profile
          </h4>
          <WritingProfileGrid profile={a.writingProfile} />
        </div>

        {/* Section analysis */}
        {a.sections?.length > 0 && (
          <div className="p-5" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: DT.textTer }}>
              <Eye size={11} className="inline mr-1 -mt-0.5" />
              Section-by-Section Analysis ({a.sections.length})
            </h4>
            <div className="space-y-2">
              {a.sections.map((s, i) => <SectionCard key={i} section={s} />)}
            </div>
          </div>
        )}

        {/* Flags */}
        {a.flags?.length > 0 && (
          <div className="p-5" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} style={{ color: DT.warning }} />
              <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.textTer }}>
                Flagged Concerns ({a.flags.length})
              </h4>
            </div>
            <div className="space-y-2">
              {a.flags.map((f, i) => <FlagCard key={i} flag={f} index={i} />)}
            </div>
          </div>
        )}

        {a.flags?.length === 0 && (
          <div className="p-6 text-center" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: DT.success }} />
            <p className="text-sm font-semibold" style={{ color: DT.success }}>No significant concerns flagged</p>
            <p className="text-xs mt-1" style={{ color: DT.textTer }}>
              The AI analysis did not detect major integrity issues.
            </p>
          </div>
        )}

        {/* Recommendations */}
        {a.recommendations?.length > 0 && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={13} style={{ color: DT.yellow }} />
              <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.textTer }}>
                Recommendations
              </h4>
            </div>
            <div className="space-y-1.5">
              {a.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: DT.raised }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: DT.yellowDim, color: DT.yellow }}>
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: DT.textSec }}>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Button + trigger to run AI analysis for a group */
export function AIAnalyzeButton({ groupNumber, onResult, disabled, compact = false }: {
  groupNumber: number;
  onResult: (report: AIReport) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const run = async () => {
    setAnalyzing(true);
    try {
      const result = await apiFetch<AIReport>("/plagiarism/ai-analyze", {
        method: "POST",
        body: JSON.stringify({ groupNumber }),
      });
      onResult(result);
      toast.success(`AI analysis complete: ${result.analysis?.overallVerdict?.replace(/_/g, " ") || "Done"}`);
    } catch (err: any) {
      console.error("AI analysis error:", err);
      if (err.message?.includes("Rate limit") || err.message?.includes("daily limit")) {
        toast.error(err.message, { duration: 6000 });
      } else {
        toast.error(err.message || "AI analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={run}
        disabled={analyzing || disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${DT.purple}, ${DT.blue})`, color: "#fff" }}
      >
        {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
        {analyzing ? "Analyzing..." : "AI Scan"}
      </button>
    );
  }

  return (
    <button
      onClick={run}
      disabled={analyzing || disabled}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition disabled:opacity-40"
      style={{ background: `linear-gradient(135deg, ${DT.purple}, ${DT.blue})`, color: "#fff" }}
    >
      {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
      {analyzing ? "Running AI Analysis..." : "Run AI Deep Analysis"}
    </button>
  );
}

/* Inline AI analysis for student (upload text → analyze) */
export function AIAnalyzeFromText({ text, wordCount, onResult, disabled }: {
  text: string;
  wordCount: number;
  onResult: (report: AIReport) => void;
  disabled?: boolean;
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const run = async () => {
    if (!text || text.length < 200) {
      toast.error("Need at least ~200 characters of text for AI analysis");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await apiFetch<AIReport>("/plagiarism/ai-analyze", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      onResult(result);
      toast.success(`AI analysis complete: ${result.analysis?.overallVerdict?.replace(/_/g, " ") || "Done"}`);
    } catch (err: any) {
      console.error("AI analysis error:", err);
      if (err.message?.includes("Rate limit") || err.message?.includes("daily limit")) {
        toast.error(err.message, { duration: 6000 });
      } else {
        toast.error(err.message || "AI analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${DT.purple}, ${DT.blue})` }}
        >
          <Brain size={18} color="#fff" />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ fontFamily: FT.h, color: DT.textPri }}>
            AI Deep Analysis
          </h3>
          <p className="text-[10px]" style={{ color: DT.textTer }}>
            Powered by GPT-4o-mini · Checks for AI-generated content, style shifts & more
          </p>
        </div>
      </div>

      <div className="rounded-lg p-3 mb-4" style={{ background: DT.purpleDim, border: "1px solid rgba(167,139,250,0.12)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: DT.textSec }}>
          <Sparkles size={11} className="inline mr-1 -mt-0.5" style={{ color: DT.purple }} />
          This goes beyond cross-submission matching. The AI analyzes your writing for:
        </p>
        <ul className="text-[11px] mt-1.5 space-y-0.5 list-disc pl-4" style={{ color: DT.textSec }}>
          <li><strong style={{ color: DT.textPri }}>AI-Generated Content</strong> — detects ChatGPT/AI patterns</li>
          <li><strong style={{ color: DT.textPri }}>Writing Style Consistency</strong> — flags sudden shifts in sophistication</li>
          <li><strong style={{ color: DT.textPri }}>Paraphrase Patterns</strong> — identifies close synonym-swap rewording</li>
          <li><strong style={{ color: DT.textPri }}>Citation Quality</strong> — checks academic citation practices</li>
        </ul>
      </div>

      <button
        onClick={run}
        disabled={analyzing || disabled || !text || text.length < 200}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${DT.purple}, ${DT.blue})`, color: "#fff" }}
      >
        {analyzing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Running AI Analysis...
          </>
        ) : (
          <>
            <Brain size={16} />
            Run AI Deep Analysis
            {wordCount > 0 && (
              <span className="text-[10px] opacity-70 ml-1">({wordCount.toLocaleString()} words)</span>
            )}
          </>
        )}
      </button>

      {!text && (
        <p className="text-[10px] text-center mt-2" style={{ color: DT.textTer }}>
          <Info size={10} className="inline mr-1 -mt-0.5" />
          Upload a manuscript PDF first to enable AI analysis
        </p>
      )}
    </div>
  );
}