import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Loader2, Inbox, AlertTriangle, XCircle, Send, Users, Shield } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { Badge } from "./Badge";
import { CelebrationParticles } from "./CelebrationParticles";
import { supabase, apiFetch } from "../lib/supabase";

/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.round(start * 10) / 10);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

/* ─── Progress Ring (dark) ─── */
function ProgressRingDark({ pct, size }: { pct: number; size: number }) {
  const sw = size * 0.07; const r = (size - sw) / 2; const circ = 2 * Math.PI * r;
  const [off, setOff] = useState(circ);
  useEffect(() => { const t = setTimeout(() => setOff(circ - (pct / 100) * circ), 200); return () => clearTimeout(t); }, [pct, circ]);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DT.blue} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${DT.blueGlow})` }} />
    </svg>
  );
}

/* ─── Helper: compute letter grade ─── */
function letterGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  return "D";
}

/* ─── Criteria labels ─── */
const criteriaLabels: Record<string, string> = {
  manuscript: "Capstone Project Manuscript",
  research: "Research Content",
  oral: "Oral Presentation",
  qa: "Q&A Performance",
  output: "Final Multimedia Output",
  presentation: "Oral Defense Presentation",
};

/* ─── Verdict Hero ─── */
function VerdictHero({ overallScore, finalVerdict, revisionDeadline }: { overallScore: number; finalVerdict: string; revisionDeadline?: string }) {
  const animated = useCountUp(overallScore);
  const grade = letterGrade(overallScore);
  const isPassed = finalVerdict === "passed";
  const isRevisions = finalVerdict === "revisions";
  const isRedemo = finalVerdict === "redemonstration";
  const isFailed = finalVerdict === "failed";

  const verdictLabel = isPassed ? "PASS" : isRevisions ? "PASS WITH MINOR REVISION" : isRedemo ? "RE-DEMONSTRATION" : "FAIL";
  const verdictColor = isPassed ? DT.success : isRevisions ? DT.blue : isRedemo ? DT.warning : DT.error;
  const VerdictIcon = isPassed ? CheckCircle : isRevisions ? AlertTriangle : XCircle;

  return (
    <div className="rounded-3xl overflow-hidden flex flex-col lg:flex-row" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
    }}>
      <div className="flex-1 lg:w-[60%] p-10">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: withAlpha(verdictColor, 0.08), border: `2px solid ${withAlpha(verdictColor, 0.18)}` }}>
          <VerdictIcon size={32} style={{ color: verdictColor }} />
        </div>
        <h2 className="mt-3" style={{ fontFamily: FT.h, fontSize: 36, fontWeight: 700, color: verdictColor, lineHeight: 1.1 }}>
          {verdictLabel}
        </h2>
        {isRevisions && revisionDeadline && (
          <p className="mt-3" style={{ fontSize: 16, color: DT.textTer }}>
            Complete all panel revisions by <span style={{ fontWeight: 600, color: DT.textPri }}>{revisionDeadline}</span>
          </p>
        )}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <span className="px-4 py-2 rounded-xl" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)`, fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.blue }}>
            {overallScore.toFixed(1)} / 100 Overall Score
          </span>
          <span className="px-4 py-2 rounded-xl" style={{ background: DT.yellowDim, border: `1px solid rgba(255,209,0,0.15)`, fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.yellow }}>
            Grade: {grade}
          </span>
        </div>
      </div>
      <div className="lg:w-[40%] relative min-h-[200px] flex items-center justify-center overflow-hidden" style={{ background: withAlpha(verdictColor, 0.03) }}>
        {(isPassed || isRevisions) && <CelebrationParticles />}
        <div className="relative z-[1] text-center">
          <div style={{ fontFamily: FT.h, fontSize: 64, fontWeight: 800, color: verdictColor, lineHeight: 1 }}>
            {isPassed ? "🎉" : isRevisions ? "📝" : "😞"}
          </div>
          <p className="mt-2" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: verdictColor }}>
            {isPassed ? "Congratulations!" : isRevisions ? "Almost there!" : "Don't give up!"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Score Breakdown ─── */
function ScoreBreakdown({ averageScores, overallScore }: { averageScores: Record<string, number>; overallScore: number }) {
  const animated = useCountUp(overallScore);
  const grade = letterGrade(overallScore);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t); }, []);

  return (
    <div className="rounded-[20px] p-7 h-full" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm,
    }}>
      <h3 className="mb-5" style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Score Breakdown</h3>
      <div className="flex justify-center mb-6">
        <div className="relative">
          <ProgressRingDark pct={overallScore} size={120} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 700, color: DT.blue }}>
              {animated.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: DT.textTer, fontWeight: 600 }}>{grade}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3.5">
        {Object.entries(averageScores).map(([key, score], i) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 13, color: DT.textSec }}>{criteriaLabels[key] || key}</span>
              <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>{Math.round(score)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: visible ? `${score}%` : "0%",
                  background: score >= 90 ? DT.success : score >= 85 ? DT.blue : DT.yellow,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Panel Decision ─── */
function PanelDecision({ grades }: { grades: any[] }) {
  const colors = ["#DC2626", "#003087", "#7C3AED", "#059669", "#D97706"];
  return (
    <div className="rounded-[20px] p-7 h-full" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm,
    }}>
      <h3 className="mb-5" style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Panel Voting</h3>
      <div>
        {grades.map((g, i) => {
          const vMap: Record<string, string> = { passed: "Passed", pass: "Passed", revisions: "Passed with Revisions", minor: "Pass with Minor Revisions", major: "Pass with Major Revisions", failed: "Failed" };
          const cMap: Record<string, string> = { passed: DT.success, pass: DT.success, revisions: DT.warning, minor: DT.blue, major: DT.warning, failed: DT.error };
          const verdictLabel = vMap[g.verdict] || g.verdict;
          const verdictColor = cMap[g.verdict] || DT.textTer;
          return (
            <div key={g.id} className="flex items-center gap-3 py-4" style={{ borderBottom: i < grades.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: colors[i % colors.length] }}>
                <span className="text-white" style={{ fontSize: 11, fontWeight: 700 }}>{g.panelistAvatar || "??"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{g.panelistName}</span>
                  <Badge label={i === 0 ? "Lead Panelist" : "Panel Member"} variant={i === 0 ? "coordinator" : "panelist"} />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: verdictColor, background: withAlpha(verdictColor, 0.08) }}>{verdictLabel}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 700, color: DT.blue, background: DT.blueDim }}>
                    {g.weightedTotal?.toFixed(1)}/100
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
        <p className="italic" style={{ fontSize: 12, color: DT.textTer }}>Final Verdict: Majority Decision</p>
      </div>
    </div>
  );
}

/* ─── Panelist Feedback Cards ─── */
function FeedbackCards({ grades }: { grades: any[] }) {
  const colors = ["#DC2626", "#003087", "#7C3AED", "#059669", "#D97706"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {grades.map((g, i) => (
        <div key={g.id} className="rounded-[20px] p-6" style={{
          background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm,
        }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: colors[i % colors.length] }}>
              <span className="text-white" style={{ fontSize: 10, fontWeight: 700 }}>{g.panelistAvatar || "??"}</span>
            </div>
            <div>
              <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{g.panelistName}</span>
              <div><Badge label={i === 0 ? "Lead Panelist" : "Panel Member"} variant="panelist" /></div>
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-1" style={{ fontSize: 11, fontWeight: 600, color: DT.blue, textTransform: "uppercase" }}>Feedback</div>
            <p style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.6 }}>{g.feedback || "No written feedback provided."}</p>
          </div>
          {g.revisions && g.revisions.length > 0 && (
            <div>
              <div className="mb-1" style={{ fontSize: 11, fontWeight: 600, color: DT.warning, textTransform: "uppercase" }}>Required Revisions</div>
              <ul className="space-y-1">
                {g.revisions.map((rev: any, ri: number) => (
                  <li key={ri} className="flex items-start gap-2" style={{ fontSize: 13, color: DT.textSec }}>
                    <span style={{ color: DT.textTer }}>{ri + 1}.</span>
                    <span>{rev.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Revision Checklist ─── */
function RevisionChecklist({ grades, group }: { grades: any[]; group: any }) {
  // Collect all revisions from all panelists
  const allRevisions = grades.flatMap(g =>
    (g.revisions || []).map((rev: any) => ({ ...rev, panelist: g.panelistName }))
  );
  const [items, setItems] = useState(allRevisions.map(r => ({ ...r, checked: false })));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(group?.revisionStatus === "Submitted");

  useEffect(() => {
    if (group?.revisionStatus === "Submitted") {
      setSubmitted(true);
      setItems(allRevisions.map(r => ({ ...r, checked: true })));
    } else {
      setItems(allRevisions.map(r => ({ ...r, checked: false })));
    }
  }, [grades, group]);

  if (items.length === 0) return null;

  const doneCount = items.filter(i => i.checked).length;
  const allDone = doneCount === items.length;
  const priorityColors: Record<string, string> = { High: DT.error, Medium: DT.warning, Low: DT.blue };

  const handleSubmit = async () => {
    if (!group?.id) return;
    setSubmitting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;
      await apiFetch(`/groups/${group.id}/submit-revisions`, {
        method: "PUT",
        body: JSON.stringify({
          checklist: items.map(i => ({ text: i.text, panelist: i.panelist, priority: i.priority, checked: true })),
        }),
      }, token);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit revisions:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[20px] p-7" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`, borderTop: `3px solid ${DT.yellow}`,
      boxShadow: DT.shadowSm,
    }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>Required Revisions</h3>
        <div className="flex items-center gap-2">
          {submitted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)` }}>
              <CheckCircle size={12} style={{ color: DT.success }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: DT.success }}>Submitted to Adviser</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full" style={{ background: DT.warningDim, color: DT.warning, fontFamily: FT.h, fontSize: 12, fontWeight: 700 }}>
            {items.length} items
          </span>
        </div>
      </div>
      <p className="mb-5" style={{ fontSize: 14, color: DT.textTer }}>
        {submitted
          ? "You have submitted your completed revisions to your adviser for review."
          : "Complete all items and submit to your adviser."}
      </p>

      <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(doneCount / items.length) * 100}%`, background: DT.success }} />
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition hover:bg-white/[0.02]">
            <button
              className="mt-0.5 shrink-0 cursor-pointer"
              disabled={submitted}
              onClick={() => !submitted && setItems(prev => prev.map((c, j) => (j === i ? { ...c, checked: !c.checked } : c)))}
            >
              {item.checked ? (
                <CheckCircle size={20} style={{ color: DT.success }} />
              ) : (
                <div className="w-5 h-5 rounded-full" style={{ border: `2px solid ${DT.borderDef}` }} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <span className={item.checked ? "line-through" : ""} style={{ fontSize: 14, color: item.checked ? DT.textTer : DT.textPri }}>
                {item.text}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span style={{ fontSize: 11, color: DT.textTer }}>Panelist: {item.panelist}</span>
                {item.priority && (
                  <span className="px-2 py-0.5 rounded-full" style={{
                    fontSize: 10, fontWeight: 600,
                    color: priorityColors[item.priority] || DT.textTer,
                    background: withAlpha(priorityColors[item.priority] || DT.textTer, 0.08),
                  }}>
                    {item.priority}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          disabled={!allDone || submitting}
          onClick={handleSubmit}
          className="mt-6 w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          style={{
            background: allDone ? DT.blue : "rgba(255,255,255,0.04)",
            color: allDone ? "#fff" : DT.textDis,
            fontFamily: FT.h, fontSize: 15, fontWeight: 700,
            cursor: allDone ? "pointer" : "not-allowed",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? "Submitting..." : "Submit to Adviser"}
        </button>
      ) : (
        <div className="mt-6 w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{
          background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)`,
        }}>
          <CheckCircle size={16} style={{ color: DT.success }} />
          <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.success }}>
            Revisions Submitted
            {group?.revisionSubmittedAt && (
              <span style={{ fontWeight: 400, fontSize: 12, color: DT.textTer, marginLeft: 8 }}>
                {new Date(group.revisionSubmittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══ Main Export ═══ */
export function DefenseResultsPage() {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [defense, setDefense] = useState<any>(null);
  const [defenseVerdict, setDefenseVerdict] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const ctxRes = await apiFetch<any>("/me/context");
      setGroup(ctxRes.myGroup || null);
      setDefense(ctxRes.myDefense || null);

      if (ctxRes.myGroup) {
        const groupNum = ctxRes.myGroup.number || ctxRes.myGroup.id;
        const [gradesRes, verdictRes] = await Promise.all([
          apiFetch<any>(`/grades/group/${groupNum}`),
          apiFetch<any>(`/defense-verdict/${groupNum}`).catch(() => ({ verdict: null, complete: false })),
        ]);
        setGrades(gradesRes.grades || []);
        setDefenseVerdict(verdictRes.verdict || null);
      }
    } catch (err) {
      console.error("Failed to fetch defense results:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14 }}>Loading defense results...</span>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6" style={{ fontFamily: FT.b }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 style={{ fontFamily: FT.h, fontSize: 32, fontWeight: 700, color: DT.textPri }}>Defense Results</h1>
        </div>

        {/* Show waiting state with panelist progress tracker when no grades yet */}
        {group ? (
          <div className="flex flex-col items-center justify-center py-12 gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: DT.yellowDim, border: `2px solid rgba(255,209,0,0.2)` }}>
              <Users size={36} style={{ color: DT.yellow }} />
            </div>
            <h2 style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 700, color: DT.textPri }}>Waiting for Panelists</h2>
            <p style={{ fontSize: 14, color: DT.textTer, textAlign: "center", maxWidth: 440 }}>
              Your defense panel hasn't submitted their grades yet. You'll get a notification the moment they do!
            </p>
            {/* 3-step progress */}
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                    background: "rgba(255,255,255,0.04)", border: `2px solid ${DT.borderDef}`,
                  }}>
                    <span style={{ fontFamily: FT.h, fontWeight: 700, fontSize: 14, color: DT.textDis }}>{n}</span>
                  </div>
                  {n < 3 && <div className="w-8 h-0.5 rounded-full" style={{ background: DT.borderDef }} />}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: DT.textDis }}>0 of 3 panelists have graded</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Inbox size={48} style={{ color: DT.textDis }} />
            <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No Results Yet</h2>
            <p style={{ fontSize: 13, color: DT.textTer, textAlign: "center", maxWidth: 440 }}>
              You're not assigned to a group yet.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Compute aggregated scores
  const overallScore = grades.reduce((sum, g) => sum + (g.weightedTotal || 0), 0) / grades.length;
  const scoreKeys = Object.keys(grades[0]?.scores || {});
  const averageScores: Record<string, number> = {};
  for (const key of scoreKeys) {
    averageScores[key] = grades.reduce((sum, g) => sum + (g.scores?.[key] || 0), 0) / grades.length;
  }

  // Determine majority verdict
  const verdictCounts: Record<string, number> = {};
  grades.forEach(g => { verdictCounts[g.verdict] = (verdictCounts[g.verdict] || 0) + 1; });
  const finalVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "pending";

  // Map new verdict format too
  const verdictMap: Record<string, string> = { "pass": "passed", "minor": "revisions", "major": "revisions", "passed": "passed", "revisions": "revisions", "failed": "failed" };
  const normalizedVerdict = verdictMap[finalVerdict] || finalVerdict;

  const defenseDate = defense?.date || group?.defenseDate || "";
  const statusLabel = normalizedVerdict === "passed" ? "Passed! 🎉" : normalizedVerdict === "revisions" ? "Revisions Needed" : normalizedVerdict === "failed" ? "Not Passed" : "Results In";
  const allPanelistsDone = grades.length >= 3;

  return (
    <div className="max-w-[1280px] mx-auto space-y-6" style={{ fontFamily: FT.b }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 style={{ fontFamily: FT.h, fontSize: 32, fontWeight: 700, color: DT.textPri }}>Defense Results</h1>
          <Badge label={statusLabel} variant="post-defense" />
        </div>
        {defenseDate && <span style={{ fontSize: 14, color: DT.textTer }}>Defended {defenseDate}</span>}
      </div>

      {/* Panelist Progress Tracker */}
      <div className="rounded-2xl p-5" style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${allPanelistsDone ? "rgba(74,222,128,0.15)" : DT.borderSub}`,
        boxShadow: DT.shadowSm,
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} style={{ color: allPanelistsDone ? DT.success : DT.blue }} />
          <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>
            {allPanelistsDone ? "All Panelists Have Graded — Official Verdict" : `Grading In Progress — ${grades.length}/3 Panelists`}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {[0, 1, 2].map(i => {
            const g = grades[i];
            const done = !!g;
            const vMap: Record<string, string> = { passed: "Pass", pass: "Pass", revisions: "Revisions", minor: "Minor Rev", major: "Major Rev", failed: "Failed" };
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
                  background: done ? withAlpha(DT.success, 0.03) : "rgba(255,255,255,0.03)",
                  border: `1px solid ${done ? "rgba(74,222,128,0.15)" : DT.borderHair}`,
                }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{
                    background: done ? DT.success : "rgba(255,255,255,0.06)",
                  }}>
                    {done ? <CheckCircle size={16} style={{ color: "white" }} /> :
                      <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.textDis }}>{i + 1}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: done ? DT.textPri : DT.textDis }}>
                      {done ? g.panelistName : "Waiting..."}
                    </div>
                    {done && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ fontSize: 10, fontWeight: 700, color: DT.blue }}>{g.weightedTotal?.toFixed(1)}/100</span>
                        <span className="px-1.5 py-0.5 rounded-full" style={{
                          fontSize: 9, fontWeight: 700,
                          color: g.verdict === "passed" || g.verdict === "pass" ? DT.success : g.verdict === "failed" ? DT.error : DT.warning,
                          background: withAlpha(g.verdict === "passed" || g.verdict === "pass" ? DT.success : g.verdict === "failed" ? DT.error : DT.warning, 0.08),
                        }}>
                          {vMap[g.verdict] || g.verdict}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {i < 2 && <div className="w-4 h-0.5 rounded-full hidden sm:block" style={{ background: grades.length > i + 1 ? DT.success : DT.borderDef }} />}
              </div>
            );
          })}
        </div>
        {/* Official aggregate line */}
        {allPanelistsDone && (
          <div className="flex items-center gap-4 mt-4 pt-3 flex-wrap" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: DT.textTer }}>Aggregate:</span>
            <span style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: DT.blue }}>
              {overallScore.toFixed(1)}<span style={{ fontSize: 12, color: DT.textDis }}>/100</span>
            </span>
            <span className="px-3 py-1 rounded-full" style={{
              fontSize: 11, fontWeight: 700, fontFamily: FT.h,
              color: normalizedVerdict === "passed" ? DT.success : normalizedVerdict === "revisions" ? DT.warning : DT.error,
              background: withAlpha(normalizedVerdict === "passed" ? DT.success : normalizedVerdict === "revisions" ? DT.warning : DT.error, 0.08),
            }}>
              {normalizedVerdict === "passed" ? "PASSED" : normalizedVerdict === "revisions" ? "REVISIONS REQUIRED" : "NOT PASSED"} — Majority Decision ({grades.length} panelists)
            </span>
            {defenseVerdict?.completedAt && (
              <span style={{ fontSize: 11, color: DT.textTer }}>
                Finalized {new Date(defenseVerdict.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}
      </div>

      <VerdictHero overallScore={overallScore} finalVerdict={normalizedVerdict} />

      {/* Score + Panel — 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScoreBreakdown averageScores={averageScores} overallScore={overallScore} />
        <PanelDecision grades={grades} />
      </div>

      <FeedbackCards grades={grades} />
      <RevisionChecklist grades={grades} group={group} />

      {/* Final Grade Composite (60/30/10) */}
      <FinalGradeComposite groupNumber={group?.number || group?.id} />
    </div>
  );
}

/* ─── Final Grade Composite Section (fetches 60/30/10 data) ─── */
function FinalGradeComposite({ groupNumber }: { groupNumber?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupNumber) { setLoading(false); return; }
    (async () => {
      try {
        const res = await apiFetch<any>(`/final-grades/group/${groupNumber}`);
        setData(res);
      } catch (err) { console.error("Failed to fetch final grades:", err); }
      finally { setLoading(false); }
    })();
  }, [groupNumber]);

  if (loading) return null;
  if (!data || !data.members || data.members.length === 0) return null;

  const anyHasAdviser = Object.values(data.memberFinalGrades || {}).some((m: any) => m.hasAdviserGrade);
  const anyHasCoord = Object.values(data.memberFinalGrades || {}).some((m: any) => m.hasCoordGrade);
  if (!anyHasAdviser && !anyHasCoord && data.panelistGradesCount === 0) return null;

  return (
    <div className="rounded-[20px] overflow-hidden" style={{
      background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
      border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
    }}>
      <div className="p-7">
        <h3 className="flex items-center gap-2 mb-1" style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
          Final Grade Breakdown
        </h3>
        <p style={{ fontSize: 13, color: DT.textTer }}>
          Defense (60%) + Adviser (30%) + Coordinator (10%) = Final Term Grade
        </p>

        <div className="overflow-x-auto mt-5">
          <table className="w-full" style={{ fontSize: 13, color: DT.textSec }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${DT.borderDef}` }}>
                <th className="text-left py-2 pr-4" style={{ color: DT.textTer, fontWeight: 600 }}>Student</th>
                <th className="text-center py-2 px-3" style={{ color: DT.blue, fontWeight: 700 }}>Defense<br /><span style={{ fontWeight: 400, fontSize: 10 }}>60%</span></th>
                <th className="text-center py-2 px-3" style={{ color: DT.success, fontWeight: 700 }}>Adviser<br /><span style={{ fontWeight: 400, fontSize: 10 }}>30%</span></th>
                <th className="text-center py-2 px-3" style={{ color: "#F87171", fontWeight: 700 }}>Coord<br /><span style={{ fontWeight: 400, fontSize: 10 }}>10%</span></th>
                <th className="text-center py-2 px-3" style={{ color: DT.yellow, fontWeight: 800 }}>Final %</th>
                <th className="text-center py-2 px-3" style={{ color: DT.textPri, fontWeight: 800 }}>Grade</th>
                <th className="text-left py-2 pl-3" style={{ color: DT.textPri, fontWeight: 700 }}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((name: string) => {
                const mg = data.memberFinalGrades?.[name];
                if (!mg) return null;
                const vColor = mg.verdict === "Pass" ? DT.success :
                  mg.verdict?.includes("Minor") ? DT.blue :
                  mg.verdict?.includes("Major") ? DT.warning : DT.error;
                return (
                  <tr key={name} style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                    <td className="py-3 pr-4" style={{ fontWeight: 600, color: DT.textPri }}>{name}</td>
                    <td className="text-center py-3 px-3" style={{ fontFamily: FT.m }}>{mg.defenseScore.toFixed(1)}%</td>
                    <td className="text-center py-3 px-3" style={{ fontFamily: FT.m, color: mg.hasAdviserGrade ? DT.textSec : DT.textDis }}>
                      {mg.hasAdviserGrade ? `${mg.adviserScore.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-center py-3 px-3" style={{ fontFamily: FT.m, color: mg.hasCoordGrade ? DT.textSec : DT.textDis }}>
                      {mg.hasCoordGrade ? `${mg.coordScore.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-center py-3 px-3" style={{ fontFamily: FT.h, fontSize: 17, fontWeight: 800, color: DT.yellow }}>
                      {mg.finalRaw.toFixed(1)}%
                    </td>
                    <td className="text-center py-3 px-3" style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: vColor }}>
                      {mg.numericalGrade}
                    </td>
                    <td className="py-3 pl-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                        fontSize: 10, fontWeight: 700, color: vColor, background: withAlpha(vColor, 0.07), border: `1px solid ${withAlpha(vColor, 0.12)}`,
                      }}>
                        {mg.verdict}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(!data.hasAdviserGrade || !data.hasCoordGrade || data.panelistGradesCount < 3) && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: DT.warningDim, border: `1px solid rgba(251,191,36,0.15)` }}>
            <span style={{ fontSize: 12, color: DT.warning }}>
              ⚠️ Grade is partial — {data.panelistGradesCount < 3 ? `${data.panelistGradesCount}/3 panelist grades submitted. ` : ""}
              {!data.hasAdviserGrade ? "Adviser grade pending. " : ""}
              {!data.hasCoordGrade ? "Coordinator grade pending. " : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}