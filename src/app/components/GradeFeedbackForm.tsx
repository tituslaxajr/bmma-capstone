import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Send, MinusCircle, Plus, Trash2, Info, Inbox,
  Users, User, MessageSquare, Award, ArrowRight, Star, BarChart3,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { sanitizeInput } from "../lib/sanitize";
import { useAutoSave } from "./useAutoSave";

/* ═══════════════════════════════════════════
   Types & Config — STI Capstone Rubric
   ═══════════════════════════════════════════ */
type Verdict = "pass" | "minor" | "major" | "failed" | null;
type Priority = "High" | "Medium" | "Low";
interface RevisionItem { id: number; text: string; priority: Priority; }

/* Group Criteria (60% of Defense Grade) — each scored 0-4 */
const GROUP_CRITERIA = [
  { key: "manuscript", label: "Capstone Project Manuscript", desc: "Quality of research paper, formatting, and content completeness" },
  { key: "output", label: "Final Multimedia Output", desc: "Quality of the actual product (film, exhibit, app, etc.) and its relevance" },
  { key: "presentation", label: "Oral Defense Presentation", desc: "Logical flow, effective use of visual aids, and overall delivery" },
];

/* Individual Criteria (40% of Defense Grade) — per student, each scored 0-4 */
const INDIVIDUAL_CRITERIA = [
  { key: "communication", label: "Communication Skills", desc: "Clarity and confidence in answering panel questions" },
  { key: "organization", label: "Work Organization", desc: "Preparedness and logical flow of the individual's portion" },
  { key: "effectiveness", label: "Effectiveness", desc: "How well the student defends their specific contribution" },
];

/* Performance Rating Scale */
const RATING_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  0: { label: "Does Not Meet", desc: "Significant deficiencies", color: DT.error },
  1: { label: "Meets Sometimes", desc: "Inconsistent quality", color: DT.warning },
  2: { label: "Meets Minimum", desc: "Satisfactory basic standards", color: DT.yellow },
  3: { label: "Exceeds Expectations", desc: "Strong above minimum", color: DT.blue },
  4: { label: "Excellent", desc: "Consistently high quality", color: DT.success },
};

/* Verdict table */
function computeVerdict(rawPct: number): { verdict: Verdict; label: string; numericalGrade: string; color: string } {
  if (rawPct >= 92) return { verdict: "pass", label: "PASS", numericalGrade: "1.00", color: DT.success };
  if (rawPct >= 82) return { verdict: "minor", label: "PASS WITH MINOR REVISION", numericalGrade: "2.00", color: DT.blue };
  if (rawPct >= 60) return { verdict: "major", label: "PASS WITH MAJOR REVISION / RE-DEMONSTRATION", numericalGrade: "3.00", color: DT.warning };
  return { verdict: "failed", label: "FAILED", numericalGrade: "5.00", color: DT.error };
}

/* ─── Shared styles ─── */
const cardStyle: React.CSSProperties = {
  background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
  border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, borderRadius: 16,
};
const inputBase: React.CSSProperties = {
  background: DT.raised, border: `1px solid ${DT.borderDef}`, color: DT.textPri,
  fontFamily: FT.b, outline: "none", transition: "border-color 200ms",
};

/* ═══ Score Rating Buttons (0-4 scale) ═══ */
function ScoreRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4].map((n) => {
        const sel = value === n;
        const r = RATING_LABELS[n];
        return (
          <button key={n} onClick={() => onChange(n)} title={`${n} — ${r.label}`}
            className="relative w-11 h-11 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            style={{
              border: `2px solid ${sel ? r.color : DT.borderDef}`,
              background: sel ? withAlpha(r.color, 0.08) : "transparent",
              boxShadow: sel ? `0 0 12px ${withAlpha(r.color, 0.12)}` : "none",
            }}>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: FT.h, color: sel ? r.color : DT.textDis }}>
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══ Criteria Score Row ═══ */
function CriteriaRow({ label, desc, value, onChange }: {
  label: string; desc: string; value: number; onChange: (v: number) => void;
}) {
  const r = RATING_LABELS[value];
  return (
    <div className="py-4 last:border-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{label}</div>
          <div style={{ fontSize: 12, color: DT.textTer }}>{desc}</div>
          {value >= 0 && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: r.color, background: withAlpha(r.color, 0.07), border: `1px solid ${withAlpha(r.color, 0.12)}` }}>
              {r.label}
            </div>
          )}
        </div>
        <ScoreRating value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/* ═══ Group Selector ═══ */
function GroupSelector({ groups, selectedId, onSelect }: {
  groups: any[]; selectedId: number | null; onSelect: (g: any) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Defense Grading</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Select a group to grade using the STI Capstone rubric (0–4 scale)</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <button key={g.id} onClick={() => onSelect(g)}
            className="text-left p-5 rounded-xl transition-all cursor-pointer hover:border-blue-500/30"
            style={cardStyle}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)` }}>
                <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: DT.blue }}>{g.number || g.id}</span>
              </div>
              <div>
                <div style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{g.name || `Group ${g.number || g.id}`}</div>
                <div style={{ fontSize: 11, color: DT.textTer }}>{(g.members || []).length} members</div>
              </div>
            </div>
            {g.title && <p className="mt-1 line-clamp-2" style={{ fontSize: 12, color: DT.textSec }}>{g.title}</p>}
            <div className="flex items-center gap-1.5 mt-3" style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>
              Grade this group <ChevronRight size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══ Confirmation Modal ═══ */
function ConfirmModal({ groupScores, individualScores, members, groupAvgPct, submitting, onCancel, onConfirm }: {
  groupScores: Record<string, number>; individualScores: Record<string, Record<string, number>>;
  members: any[]; groupAvgPct: number; submitting: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`,
        border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl,
      }}>
        <div className="p-6" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <h2 style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 700, color: DT.textPri }}>Confirm Grade Submission</h2>
          <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>This action cannot be undone.</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Group scores */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: DT.blue }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: DT.blue }}>GROUP SCORES (60%)</span>
            </div>
            {GROUP_CRITERIA.map(c => (
              <div key={c.key} className="flex justify-between py-1" style={{ fontSize: 13, color: DT.textSec }}>
                <span>{c.label}</span>
                <span style={{ fontWeight: 700, color: RATING_LABELS[groupScores[c.key]].color }}>{groupScores[c.key]}/4</span>
              </div>
            ))}
          </div>
          {/* Individual scores */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User size={14} style={{ color: DT.yellow }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: DT.yellow }}>INDIVIDUAL SCORES (40%)</span>
            </div>
            {members.map(m => {
              const scores = individualScores[m.name] || {};
              const total = Object.values(scores).reduce((s, v) => s + v, 0);
              return (
                <div key={m.name} className="flex justify-between py-1" style={{ fontSize: 13, color: DT.textSec }}>
                  <span>{m.name}</span>
                  <span style={{ fontWeight: 700, color: DT.textPri }}>{total}/12</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl transition cursor-pointer" style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"
            style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700 }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><Send size={16} /> Submit Grade</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════ */
export function GradeFeedbackForm() {
  const [loading, setLoading] = useState(true);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [alreadyGraded, setAlreadyGraded] = useState<Set<number>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  /* Step tracking: 0=group scores, 1=individual scores, 2=feedback */
  const [step, setStep] = useState(0);

  /* Group scores (0-4 each) */
  const [groupScores, setGroupScores] = useState<Record<string, number>>({ manuscript: -1, output: -1, presentation: -1 });

  /* Individual scores: { memberName: { communication: 0-4, organization: 0-4, effectiveness: 0-4 } } */
  const [individualScores, setIndividualScores] = useState<Record<string, Record<string, number>>>({});
  const [activeMember, setActiveMember] = useState<string>("");

  /* Feedback */
  const [feedback, setFeedback] = useState("");
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);

  /* Submit state */
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitLockRef = useRef(false);

  const members: any[] = selectedGroup?.members || [];

  /* ─── Auto-save draft ─── */
  const autoSaveKey = selectedGroup ? `grade_${selectedGroup.id}` : "grade_none";
  const { restore, clear: clearDraft, hasSaved } = useAutoSave({
    key: autoSaveKey,
    data: { groupScores, individualScores, feedback, revisions, step },
    enabled: !!selectedGroup && !submitted,
  });

  // Offer to restore draft on group select
  useEffect(() => {
    if (selectedGroup && hasSaved) {
      const saved = restore();
      if (saved) {
        const { groupScores: gs, individualScores: is, feedback: fb, revisions: rv, step: st } = saved.data as any;
        if (gs) setGroupScores(gs);
        if (is) setIndividualScores(is);
        if (fb) setFeedback(fb);
        if (rv) setRevisions(rv);
        if (typeof st === "number") setStep(st);
        const mins = Math.round((Date.now() - saved.timestamp) / 60000);
        toast.info(`Draft restored from ${mins < 1 ? "just now" : `${mins}m ago`}`);
      }
    }
  }, [selectedGroup?.id]);

  /* Computed scores */
  const groupTotal = useMemo(() => {
    const vals = Object.values(groupScores).filter(v => v >= 0);
    return vals.reduce((s, v) => s + v, 0);
  }, [groupScores]);
  const groupMaxPossible = GROUP_CRITERIA.length * 4; // 12
  const groupPct = (groupTotal / groupMaxPossible) * 100;

  /* Check if all group scores are filled */
  const groupComplete = Object.values(groupScores).every(v => v >= 0);

  /* Check if all individual scores are filled */
  const individualsComplete = members.length > 0 && members.every(m => {
    const scores = individualScores[m.name];
    if (!scores) return false;
    return INDIVIDUAL_CRITERIA.every(c => (scores[c.key] ?? -1) >= 0);
  });

  const allFilled = groupComplete && individualsComplete;

  /* ─── Fetch assigned groups ─── */
  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/grades/my");
      setAssignedGroups(res.assignedGroups || []);
      const gradedIds = new Set<number>((res.grades || []).map((g: any) => g.groupId));
      setAlreadyGraded(gradedIds);
    } catch (err) { console.error("Failed to fetch grading data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Initialize individual scores when group is selected */
  useEffect(() => {
    if (selectedGroup?.members) {
      const init: Record<string, Record<string, number>> = {};
      for (const m of selectedGroup.members) {
        init[m.name] = { communication: -1, organization: -1, effectiveness: -1 };
      }
      setIndividualScores(init);
      setActiveMember(selectedGroup.members[0]?.name || "");
    }
  }, [selectedGroup]);

  /* ─── Submit grade ─── */
  const handleSubmit = async () => {
    // Double-submit guard — prevent concurrent or repeat submissions
    if (submitLockRef.current || submitted) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;

      // Map verdict from group average
      const overallGroupPct = groupPct;
      const verdictInfo = computeVerdict(overallGroupPct);

      await apiFetch("/grades", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroup.id,
          groupNumber: selectedGroup.number || selectedGroup.id,
          groupTitle: selectedGroup.title || selectedGroup.name,
          scores: groupScores, // legacy compatibility
          groupScores,
          individualScores,
          weightedTotal: groupPct,
          verdict: verdictInfo.verdict,
          feedback: sanitizeInput(feedback),
          revisions: revisions.map(r => ({ ...r, text: sanitizeInput(r.text) })),
        }),
      }, token);

      toast.success("Grade submitted successfully!");
      setSubmitted(true);
      setShowConfirm(false);
      clearDraft();
    } catch (err: any) {
      console.error("Grade submission error:", err);
      toast.error(err.message || "Failed to submit grade.");
    } finally { setSubmitting(false); submitLockRef.current = false; }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14, fontFamily: FT.b }}>Loading grading data...</span>
      </div>
    );
  }

  /* ─── Submitted success ─── */
  if (submitted) {
    return (
      <div className="max-w-[600px] mx-auto py-16" style={{ fontFamily: FT.b }}>
        <div className="rounded-2xl p-12 text-center" style={cardStyle}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: DT.successDim }}>
            <CheckCircle2 size={32} style={{ color: DT.success }} />
          </div>
          <h2 style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 700, color: DT.textPri }}>Grade Submitted!</h2>
          <p className="mt-2" style={{ fontSize: 14, color: DT.textSec, maxWidth: 400, margin: "8px auto 0" }}>
            Your defense grade for <strong>Group {selectedGroup?.number || selectedGroup?.id}</strong> has been recorded.
          </p>
          <button onClick={() => {
            setSubmitted(false); setSelectedGroup(null); setStep(0);
            setGroupScores({ manuscript: -1, output: -1, presentation: -1 });
            setIndividualScores({}); setFeedback(""); setRevisions([]);
            fetchData();
          }}
            className="mt-6 px-6 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700 }}>
            Grade Another Group
          </button>
        </div>
      </div>
    );
  }

  /* ─── Group selection ─── */
  const ungradedGroups = assignedGroups.filter(g => !alreadyGraded.has(g.id));

  if (!selectedGroup) {
    return (
      <div style={{ fontFamily: FT.b }}>
        <GroupSelector groups={ungradedGroups} selectedId={null} onSelect={setSelectedGroup} />
        {alreadyGraded.size > 0 && (
          <div className="mt-6 px-4 py-3 rounded-xl" style={{ background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: DT.success }}>
              <CheckCircle2 size={14} className="inline mr-1.5" /> You have graded {alreadyGraded.size} group{alreadyGraded.size !== 1 ? "s" : ""} already.
            </span>
          </div>
        )}
        {ungradedGroups.length === 0 && assignedGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Inbox size={48} style={{ color: DT.textDis }} />
            <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No Assigned Groups</h2>
            <p style={{ fontSize: 14, color: DT.textTer }}>You haven't been assigned to any defense panels yet.</p>
          </div>
        )}
      </div>
    );
  }

  /* ─── Grading Form ─── */
  return (
    <div className="max-w-[900px] mx-auto space-y-5" style={{ fontFamily: FT.b }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => { setSelectedGroup(null); setStep(0); }} className="flex items-center gap-1 mb-2 cursor-pointer transition hover:opacity-80" style={{ fontSize: 13, color: DT.textTer }}>
            <ChevronLeft size={16} /> Back to groups
          </button>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
            Grading: {selectedGroup.name || `Group ${selectedGroup.number || selectedGroup.id}`}
          </h1>
          <p className="mt-0.5" style={{ fontSize: 13, color: DT.textTer }}>{selectedGroup.title}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {["Group Grade (60%)", "Individual Grade (40%)", "Feedback & Revisions"].map((label, i) => (
          <button key={label} onClick={() => { if (i <= step || (i === 1 && groupComplete) || (i === 2 && individualsComplete)) setStep(i); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer"
            style={{
              fontSize: 12, fontWeight: step === i ? 700 : 500,
              background: step === i ? DT.blueDim : "transparent",
              color: step === i ? DT.blue : i < step ? DT.success : DT.textDis,
              border: `1px solid ${step === i ? "rgba(77,143,255,0.2)" : i < step ? "rgba(74,222,128,0.15)" : DT.borderHair}`,
            }}>
            {i < step ? <CheckCircle2 size={14} /> : <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ fontSize: 10, fontWeight: 700, background: step === i ? DT.blue : "rgba(255,255,255,0.06)", color: step === i ? "white" : DT.textDis }}>{i + 1}</span>}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Rating Scale Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {[0, 1, 2, 3, 4].map(n => {
          const r = RATING_LABELS[n];
          return (
            <span key={n} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ fontSize: 10, color: r.color, background: withAlpha(r.color, 0.03), border: `1px solid ${withAlpha(r.color, 0.08)}` }}>
              <span style={{ fontWeight: 800 }}>{n}</span> {r.label}
            </span>
          );
        })}
      </div>

      {/* ═══ STEP 0: Group Scores ═══ */}
      {step === 0 && (
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim }}>
              <Users size={20} style={{ color: DT.blue }} />
            </div>
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Group Grade</h2>
              <p style={{ fontSize: 12, color: DT.textTer }}>60% of the Defense Activity Grade · Evaluate the group as a whole</p>
            </div>
            <div className="ml-auto text-right">
              <div style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 800, color: groupComplete ? DT.blue : DT.textDis }}>{groupTotal}<span style={{ fontSize: 16, color: DT.textTer }}>/{groupMaxPossible}</span></div>
              {groupComplete && <div style={{ fontSize: 11, color: DT.textTer }}>{groupPct.toFixed(0)}%</div>}
            </div>
          </div>
          {GROUP_CRITERIA.map(c => (
            <CriteriaRow key={c.key} label={c.label} desc={c.desc} value={groupScores[c.key]}
              onChange={(v) => setGroupScores(prev => ({ ...prev, [c.key]: v }))} />
          ))}
          <div className="flex justify-end mt-5">
            <button onClick={() => setStep(1)} disabled={!groupComplete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700, fontFamily: FT.h }}>
              Next: Individual Grades <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 1: Individual Scores ═══ */}
      {step === 1 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-3 p-6" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.yellowDim }}>
              <User size={20} style={{ color: DT.yellow }} />
            </div>
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Individual Grade</h2>
              <p style={{ fontSize: 12, color: DT.textTer }}>40% of the Defense Activity Grade · Evaluate each member separately</p>
            </div>
          </div>

          {/* Member tabs */}
          <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
            {members.map(m => {
              const scores = individualScores[m.name] || {};
              const filled = INDIVIDUAL_CRITERIA.every(c => (scores[c.key] ?? -1) >= 0);
              const isActive = activeMember === m.name;
              return (
                <button key={m.name} onClick={() => setActiveMember(m.name)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition cursor-pointer shrink-0"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    border: `1px solid ${isActive ? DT.borderDef : "transparent"}`,
                    borderBottom: isActive ? `2px solid ${DT.yellow}` : "1px solid transparent",
                  }}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: DT.blue, fontSize: 9, fontWeight: 700, color: "white" }}>
                      {m.initials || m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? DT.textPri : DT.textTer }}>{m.name}</span>
                  {filled && <CheckCircle2 size={14} style={{ color: DT.success }} />}
                </button>
              );
            })}
          </div>

          {/* Active member criteria */}
          <div className="p-6">
            {(() => {
              const scores = individualScores[activeMember] || {};
              const total = INDIVIDUAL_CRITERIA.reduce((s, c) => s + Math.max(0, scores[c.key] ?? 0), 0);
              const filled = INDIVIDUAL_CRITERIA.every(c => (scores[c.key] ?? -1) >= 0);
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: 14, fontWeight: 700, color: DT.textPri, fontFamily: FT.h }}>{activeMember}</span>
                    <span style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: filled ? DT.yellow : DT.textDis }}>
                      {total}<span style={{ fontSize: 14, color: DT.textTer }}>/12</span>
                    </span>
                  </div>
                  {INDIVIDUAL_CRITERIA.map(c => (
                    <CriteriaRow key={c.key} label={c.label} desc={c.desc} value={scores[c.key] ?? -1}
                      onChange={(v) => setIndividualScores(prev => ({
                        ...prev, [activeMember]: { ...prev[activeMember], [c.key]: v },
                      }))} />
                  ))}
                </>
              );
            })()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 pb-6">
            <button onClick={() => setStep(0)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer" style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
              <ChevronLeft size={14} /> Group Grade
            </button>
            <button onClick={() => setStep(2)} disabled={!individualsComplete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700, fontFamily: FT.h }}>
              Next: Feedback <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Feedback & Revisions ═══ */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Score Summary */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="mb-4" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Score Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} style={{ color: DT.blue }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DT.blue }}>GROUP (60%)</span>
                </div>
                {GROUP_CRITERIA.map(c => (
                  <div key={c.key} className="flex justify-between py-0.5" style={{ fontSize: 12, color: DT.textSec }}>
                    <span>{c.label}</span>
                    <span style={{ fontWeight: 700, color: RATING_LABELS[groupScores[c.key]]?.color }}>{groupScores[c.key]}/4</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 flex justify-between" style={{ borderTop: `1px solid ${DT.borderHair}`, fontSize: 13, fontWeight: 700, color: DT.textPri }}>
                  <span>Total</span><span>{groupTotal}/{groupMaxPossible} ({groupPct.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} style={{ color: DT.yellow }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DT.yellow }}>INDIVIDUAL (40%)</span>
                </div>
                {members.map(m => {
                  const scores = individualScores[m.name] || {};
                  const total = Object.values(scores).reduce((s, v) => s + Math.max(0, v), 0);
                  const pct = (total / 12 * 100).toFixed(0);
                  return (
                    <div key={m.name} className="flex justify-between py-0.5" style={{ fontSize: 12, color: DT.textSec }}>
                      <span>{m.name}</span>
                      <span style={{ fontWeight: 700, color: DT.textPri }}>{total}/12 ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback textarea */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="mb-3" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>General Feedback</h3>
            <textarea
              value={feedback} onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Overall observations, strengths, and areas for improvement..."
              className="w-full rounded-xl px-4 py-3 transition"
              style={{ ...inputBase, fontSize: 14, resize: "none" as const }}
              onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = DT.borderDef; }}
            />
          </div>

          {/* Revision Items */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Required Revisions</h3>
              <button onClick={() => setRevisions(prev => [...prev, { id: Date.now(), text: "", priority: "Medium" }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                style={{ border: `1px solid ${DT.borderDef}`, color: DT.blue, fontSize: 12, fontWeight: 600 }}>
                <Plus size={14} /> Add Revision
              </button>
            </div>
            {revisions.length === 0 ? (
              <p style={{ fontSize: 13, color: DT.textTer }}>No revisions required — add items if needed.</p>
            ) : (
              <div className="space-y-2">
                {revisions.map((rev, i) => (
                  <div key={rev.id} className="flex items-start gap-2">
                    <input
                      value={rev.text} onChange={(e) => setRevisions(prev => prev.map((r, j) => j === i ? { ...r, text: e.target.value } : r))}
                      placeholder="Describe the required revision..."
                      className="flex-1 px-3 py-2 rounded-lg transition"
                      style={{ ...inputBase, fontSize: 13 }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = DT.borderDef; }}
                    />
                    <select value={rev.priority} onChange={(e) => setRevisions(prev => prev.map((r, j) => j === i ? { ...r, priority: e.target.value as Priority } : r))}
                      className="px-2 py-2 rounded-lg cursor-pointer"
                      style={{ ...inputBase, fontSize: 12, width: 90 }}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
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

          {/* Submit */}
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition cursor-pointer" style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setShowConfirm(true)} disabled={!allFilled}
              className="flex items-center gap-2 px-8 py-3 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${DT.blue}, #3B7AE8)`, color: "white", fontSize: 15, fontWeight: 700, fontFamily: FT.h, boxShadow: `0 4px 20px rgba(77,143,255,0.25)` }}>
              <Send size={18} /> Submit Grade
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          groupScores={groupScores}
          individualScores={individualScores}
          members={members}
          groupAvgPct={groupPct}
          submitting={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
        />
      )}
    </div>
  );
}
