import { ContextualTip, TIPS } from "./ContextualTip";
import { useAutoSave } from "./useAutoSave";
import { useState, useEffect, useCallback } from "react";
import { Star, Send, Users, AlertCircle, CheckCircle2, Loader2, Inbox, Lock, ShieldCheck } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";

interface GroupMember { name: string; initials: string; avatarUrl?: string; }
interface EvalEntry { cooperation: number; quality: number; timeliness: number; communication: number; comment: string; }

const CRITERIA = [
  { key: "cooperation", label: "Cooperation & Teamwork", desc: "Willingness to help and collaborate" },
  { key: "quality", label: "Quality of Work", desc: "Accuracy and completeness of contributions" },
  { key: "timeliness", label: "Timeliness", desc: "Meeting deadlines and being punctual" },
  { key: "communication", label: "Communication", desc: "Keeping the team informed and responsive" },
];

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => !disabled && onChange(n)} disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)} onMouseLeave={() => setHover(0)}
          className="cursor-pointer transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50">
          <Star size={20} fill={(hover || value) >= n ? DT.yellow : "transparent"}
            stroke={(hover || value) >= n ? DT.yellow : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

export function PeerEvaluationForm() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myName, setMyName] = useState("");
  const [groupNumber, setGroupNumber] = useState<number>(0);
  const [groupId, setGroupId] = useState<number>(0);
  const [evals, setEvals] = useState<Record<string, EvalEntry>>({});
  const [active, setActive] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [defensePassed, setDefensePassed] = useState<boolean | null>(null);
  const [defenseVerdict, setDefenseVerdict] = useState<string>("");

  /* Auto-save draft evaluations */
  const autoSaveKey = groupId ? `peer-eval-${groupId}` : "peer-eval-draft";
  const { restore, clear: clearDraft } = useAutoSave<Record<string, EvalEntry>>({
    key: autoSaveKey,
    data: evals,
    enabled: !alreadySubmitted && !submitted && Object.keys(evals).length > 0,
  });

  const fetchData = useCallback(async () => {
    try {
      // 1. Get group context + defense info
      const ctx = await apiFetch<any>("/me/context");
      const group = ctx.myGroup;
      if (!group) { setLoading(false); return; }

      setGroupNumber(group.number || group.id);
      setGroupId(group.id);
      setMyName(ctx.myProfile?.name || "");

      // 2. Check defense verdict — must be "passed" to unlock peer eval
      const groupNum = group.number || group.id;
      let passed = false;
      let verdict = "";
      try {
        const gradesRes = await apiFetch<any>(`/grades/group/${groupNum}`);
        const grades = gradesRes.grades || [];
        if (grades.length > 0) {
          const verdictCounts: Record<string, number> = {};
          grades.forEach((g: any) => { verdictCounts[g.verdict] = (verdictCounts[g.verdict] || 0) + 1; });
          const topVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
          const verdictMap: Record<string, string> = { "pass": "passed", "minor": "revisions", "major": "revisions", "passed": "passed", "revisions": "revisions", "failed": "failed" };
          verdict = verdictMap[topVerdict] || topVerdict;
          passed = verdict === "passed";
        }
      } catch { /* no grades yet */ }

      setDefensePassed(passed);
      setDefenseVerdict(verdict);

      // If defense not passed, stop here — don't load eval data
      if (!passed) { setLoading(false); return; }

      // 3. Check if already submitted
      const evalRes = await apiFetch<any>("/peer-evaluations/my");
      if (evalRes.submitted) {
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }

      // 4. Filter out self from members
      const groupMembers: GroupMember[] = (group.members || [])
        .filter((m: any) => m.name !== ctx.myProfile?.name)
        .map((m: any) => ({
          name: m.name,
          initials: m.initials || m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          avatarUrl: m.avatarUrl || null,
        }));

      setMembers(groupMembers);
      if (groupMembers.length > 0) setActive(groupMembers[0].name);

      // Initialize evals
      const init: Record<string, EvalEntry> = {};
      for (const m of groupMembers) {
        init[m.name] = { cooperation: 0, quality: 0, timeliness: 0, communication: 0, comment: "" };
      }
      setEvals(init);

      // Restore from auto-save
      const saved = restore();
      if (saved?.data && Object.keys(saved.data).length > 0) {
        // Merge saved data with initialized evals (in case members changed)
        const merged = { ...init };
        for (const [name, entry] of Object.entries(saved.data)) {
          if (merged[name]) merged[name] = entry;
        }
        setEvals(merged);
        toast.info("Draft evaluation restored from auto-save");
      }
    } catch (err) { console.error("Failed to fetch peer eval data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upd = (name: string, field: string, val: number | string) =>
    setEvals((p) => ({ ...p, [name]: { ...p[name], [field]: val } }));

  const isComplete = members.length > 0 && members.every(m => {
    const e = evals[m.name];
    return e && e.cooperation > 0 && e.quality > 0 && e.timeliness > 0 && e.communication > 0;
  });

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/peer-evaluations", {
        method: "POST",
        body: JSON.stringify({ groupNumber, groupId, evaluations: evals }),
      }, session?.access_token!);
      toast.success("Peer evaluation submitted!");
      setSubmitted(true);
      clearDraft();
    } catch (err: any) {
      console.error("Peer eval submit error:", err);
      toast.error(err.message || "Failed to submit evaluation");
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14, fontFamily: FT.b }}>Loading...</span>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="max-w-[800px] mx-auto" style={{ fontFamily: FT.b }}>
        <div className="rounded-[24px] p-12 text-center" style={{
          background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: DT.successDim }}>
            <CheckCircle2 size={32} style={{ color: DT.success }} />
          </div>
          <h2 style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 700, color: DT.textPri }}>Done! ✅</h2>
          <p className="mt-3 max-w-md mx-auto" style={{ fontSize: 14, color: DT.textSec }}>
            Your evaluation has been recorded.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: DT.yellowDim, color: DT.yellow, fontSize: 13, fontWeight: 600 }}>
            +80 XP Earned 🔥
          </div>
        </div>
      </div>
    );
  }

  // ── Defense gate: show locked state if defense not passed ──
  if (defensePassed === false) {
    const gateMessages: Record<string, { title: string; desc: string; icon: React.ReactNode; accent: string; accentDim: string }> = {
      "": { title: "Defense First", desc: "Peer eval unlocks after you pass defense.", icon: <ShieldCheck size={40} />, accent: DT.blue, accentDim: DT.blueDim },
      revisions: { title: "Revisions Needed", desc: "Fix your panel revisions to unlock.", icon: <AlertCircle size={40} />, accent: DT.warning, accentDim: DT.warningDim },
      failed: { title: "Defense Not Passed", desc: "Talk to your coordinator about next steps.", icon: <AlertCircle size={40} />, accent: DT.red, accentDim: DT.redDim },
    };
    const msg = gateMessages[defenseVerdict] || gateMessages[""];

    return (
      <div className="max-w-[800px] mx-auto" style={{ fontFamily: FT.b }}>
        <div className="rounded-[24px] p-10 sm:p-14 text-center relative overflow-hidden" style={{
          background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
        }}>
          {/* Decorative lock backdrop */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Lock size={240} strokeWidth={1} />
          </div>
          <div className="relative z-[1]">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: msg.accentDim }}>
              <div style={{ color: msg.accent }}>{msg.icon}</div>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DT.borderDef}` }}>
              <Lock size={13} style={{ color: DT.textTer }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: DT.textTer, textTransform: "uppercase", letterSpacing: "0.06em" }}>Locked</span>
            </div>
            <h2 style={{ fontFamily: FT.h, fontSize: 26, fontWeight: 700, color: DT.textPri }}>{msg.title}</h2>
            <p className="mt-3 max-w-lg mx-auto" style={{ fontSize: 15, color: DT.textSec, lineHeight: 1.6 }}>
              {msg.desc}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex items-center gap-6">
                {["Defense Scheduled", "Defense Graded", "Verdict: Passed", "Peer Eval Unlocked"].map((step, i) => {
                  const done = defenseVerdict === "" ? i < 0 : defenseVerdict === "revisions" || defenseVerdict === "failed" ? i < 2 : i < 3;
                  const current = defenseVerdict === "" ? i === 0 : defenseVerdict === "revisions" || defenseVerdict === "failed" ? i === 2 : i === 3;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      {i > 0 && <div className="w-6 h-px" style={{ background: done ? DT.success : DT.borderDef }} />}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{
                            background: done ? DT.successDim : current ? withAlpha(msg.accent, 0.08) : "rgba(255,255,255,0.04)",
                            color: done ? DT.success : current ? msg.accent : DT.textDis,
                            border: `1px solid ${done ? withAlpha(DT.success, 0.18) : current ? withAlpha(msg.accent, 0.18) : DT.borderDef}`,
                          }}>
                          {done ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        <span className="hidden sm:block text-center max-w-[80px]" style={{ fontSize: 10, color: done ? DT.textSec : DT.textTer, fontWeight: done ? 600 : 400 }}>
                          {step}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="max-w-[800px] mx-auto text-center py-16" style={{ fontFamily: FT.b }}>
        <Inbox size={48} style={{ color: DT.textDis, margin: "0 auto 16px" }} />
        <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No groupmates found</h2>
        <p style={{ fontSize: 13, color: DT.textTer, marginTop: 4 }}>Ask your coordinator to assign you to a group.</p>
      </div>
    );
  }

  const ev = evals[active];
  const member = members.find((m) => m.name === active);

  return (
    <div className="max-w-[900px] mx-auto space-y-6" style={{ fontFamily: FT.b }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim }}>
          <Users size={20} style={{ color: DT.blue }} />
        </div>
        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: 24, fontWeight: 700, color: DT.textPri }}>Peer Evaluation</h1>
          <p style={{ fontSize: 13, color: DT.textTer }}>Rate your groupmates — honest & confidential</p>
        </div>
      </div>

      <ContextualTip {...TIPS.groupWork} accent={DT.success} accentDim={DT.successDim} />

      {/* Info banner */}
      <div className="rounded-[16px] p-3 flex items-center gap-3" style={{ background: DT.yellowDim, border: `1px solid rgba(255,209,0,0.20)` }}>
        <AlertCircle size={16} style={{ color: DT.yellow }} className="shrink-0" />
        <span style={{ fontSize: 12, color: DT.textTer }}>Confidential — only your adviser & coordinator see this</span>
      </div>

      {/* Member tabs */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {members.map((m) => {
          const e = evals[m.name];
          const filled = e ? [e.cooperation, e.quality, e.timeliness, e.communication].filter((v) => v > 0).length : 0;
          const isAct = active === m.name;
          return (
            <button key={m.name} onClick={() => setActive(m.name)}
              className="flex items-center gap-3 px-4 py-3 rounded-[16px] transition-all cursor-pointer shrink-0"
              style={{
                background: isAct ? DT.blueDim : DT.raised,
                border: `1px solid ${isAct ? "rgba(77,143,255,0.30)" : DT.borderSub}`,
              }}>
              {m.avatarUrl ? (
                <img src={m.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: isAct ? DT.blue : DT.elevated }}>
                  <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.textPri }}>{m.initials}</span>
                </div>
              )}
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{m.name}</div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full" style={{
                    fontSize: 10, fontWeight: 600,
                    color: filled === 4 ? DT.success : DT.yellow,
                    background: filled === 4 ? DT.successDim : DT.yellowDim,
                  }}>{filled}/4</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rating card */}
      {member && ev && (
        <div className="rounded-[24px] overflow-hidden" style={{
          background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowMd,
        }}>
          <div className="p-6" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
            <div className="flex items-center gap-3">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: DT.blue }}>
                  <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: "#07090F" }}>{member.initials}</span>
                </div>
              )}
              <div>
                <div style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>{member.name}</div>
                <div style={{ fontSize: 13, color: DT.textTer }}>Group {groupNumber} Member</div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-1">
            {CRITERIA.map((cr) => (
              <div key={cr.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3.5"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{cr.label}</div>
                  <div style={{ fontSize: 12, color: DT.textTer }}>{cr.desc}</div>
                </div>
                <StarRating value={(ev as any)[cr.key]} onChange={(v) => upd(active, cr.key, v)} />
              </div>
            ))}
            <div className="pt-3">
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: DT.textPri }}>
                Comments (Optional)
              </label>
              <textarea value={ev.comment} onChange={(e) => upd(active, "comment", e.target.value)}
                placeholder="What they did well, what could improve..."
                rows={3}
                className="w-full rounded-[12px] px-4 py-3 resize-none transition"
                style={{
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${DT.borderDef}`,
                  color: DT.textPri, fontSize: 13, fontFamily: FT.b, outline: "none",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = DT.blue}
                onBlur={(e) => e.currentTarget.style.borderColor = DT.borderDef}
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, color: DT.textTer }}>
          {members.filter(m => {
            const e = evals[m.name];
            return e && e.cooperation > 0 && e.quality > 0 && e.timeliness > 0 && e.communication > 0;
          }).length} of {members.length} evaluated
        </span>
        <button onClick={handleSubmit} disabled={!isComplete || submitting}
          className="flex items-center gap-2 px-6 py-3 rounded-[12px] transition cursor-pointer disabled:cursor-not-allowed"
          style={{
            background: isComplete ? DT.blue : "rgba(255,255,255,0.05)",
            color: isComplete ? "#07090F" : DT.textDis,
            fontSize: 14, fontWeight: 700, fontFamily: FT.h,
            opacity: isComplete ? 1 : 0.5,
            boxShadow: isComplete ? `0 0 20px rgba(77,143,255,0.15)` : "none",
          }}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit Evaluation
        </button>
      </div>
    </div>
  );
}