import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, Clock, Loader2, Send, Users } from "lucide-react";
import { apiFetch } from "../lib/supabase";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { PageShell } from "./PageShell";
import { toast } from "sonner";

const CRITERIA = [
  { key: "attendance", label: "Attendance to weekly submission", weight: 15, desc: "Attendance and consistency in weekly submissions." },
  { key: "participation", label: "Participation in discussion", weight: 25, desc: "Active participation during adviser consultations and discussions." },
  { key: "involvement", label: "Project involvement", weight: 60, desc: "Depth of contribution to the capstone project." },
] as const;

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Does Not Meet", color: DT.error },
  1: { label: "Meets Sometimes", color: DT.warning },
  2: { label: "Meets Minimum", color: DT.yellow },
  3: { label: "Exceeds Expectations", color: DT.blue },
  4: { label: "Excellent", color: DT.success },
};

const cardStyle = {
  background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
  border: `1px solid ${DT.borderSub}`,
  boxShadow: DT.shadowSm,
  borderRadius: 16,
};

function ScoreButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4].map((n) => {
        const selected = value === n;
        const rating = RATING_LABELS[n];
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={`${n} - ${rating.label}`}
            className="w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            style={{ border: `2px solid ${selected ? rating.color : DT.borderDef}`, background: selected ? withAlpha(rating.color, 0.08) : "transparent" }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FT.h, color: selected ? rating.color : DT.textDis }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function computeAdviserScore(scores: Record<string, number>) {
  return CRITERIA.reduce((sum, c) => sum + (((scores[c.key] ?? 0) / 4) * 100 * (c.weight / 100)), 0);
}

export function AdviserGradingPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [memberScores, setMemberScores] = useState<Record<string, Record<string, number>>>({});
  const [gradedGroups, setGradedGroups] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const context = await apiFetch<any>("/me/context");
      const advised = context?.advisedGroups || [];
      setGroups(advised);

      const existing = new Set<number>();
      await Promise.all(advised.map(async (group: any) => {
        const groupNumber = group.number || group.id;
        const res = await apiFetch<{ grade: any }>(`/adviser-grades/group/${groupNumber}`).catch(() => null);
        if (res?.grade) existing.add(groupNumber);
      }));
      setGradedGroups(existing);
    } catch (err) {
      console.error("Failed to load adviser grading data:", err);
      toast.error("Failed to load adviser grading data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    if (!selectedGroup) return;
    let cancelled = false;
    (async () => {
      const groupNumber = selectedGroup.number || selectedGroup.id;
      const res = await apiFetch<{ grade: any }>(`/adviser-grades/group/${groupNumber}`).catch(() => null);
      if (cancelled) return;
      if (res?.grade?.memberScores) {
        setMemberScores(res.grade.memberScores);
        return;
      }
      const initial: Record<string, Record<string, number>> = {};
      for (const member of selectedGroup.members || []) {
        initial[member.name] = { attendance: -1, participation: -1, involvement: -1 };
      }
      setMemberScores(initial);
    })();
    return () => { cancelled = true; };
  }, [selectedGroup]);

  const allFilled = useMemo(() => {
    if (!selectedGroup) return false;
    return (selectedGroup.members || []).every((member: any) =>
      CRITERIA.every((criterion) => (memberScores[member.name]?.[criterion.key] ?? -1) >= 0)
    );
  }, [memberScores, selectedGroup]);

  const saveGrade = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const groupNumber = selectedGroup.number || selectedGroup.id;
      await apiFetch("/adviser-grades", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroup.id,
          groupNumber,
          groupTitle: selectedGroup.title || selectedGroup.name,
          memberScores,
        }),
      });
      toast.success("Adviser grade saved. It will count as 30% of the final aggregate.");
      setGradedGroups((prev) => new Set(prev).add(groupNumber));
      setSelectedGroup(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save adviser grade.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.success }} />
        <span style={{ color: DT.textSec, fontSize: 14 }}>Loading adviser grading...</span>
      </div>
    );
  }

  if (selectedGroup) {
    return (
      <PageShell className="max-w-[1180px] mx-auto space-y-5">
        <button onClick={() => setSelectedGroup(null)} className="cursor-pointer" style={{ color: DT.textTer, fontSize: 13 }}>
          Back to advised groups
        </button>

        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri }}>
            Adviser Grading
          </h1>
          <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
            {selectedGroup.name || `Group ${selectedGroup.number}`} - post-defense adviser grade component.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CRITERIA.map((criterion) => (
            <div key={criterion.key} className="p-4 rounded-xl" style={cardStyle}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 13, fontWeight: 700, color: DT.textPri }}>{criterion.label}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 800, color: DT.success, background: DT.successDim }}>
                  {criterion.weight}%
                </span>
              </div>
              <p className="mt-2" style={{ fontSize: 12, color: DT.textTer, lineHeight: 1.5 }}>{criterion.desc}</p>
            </div>
          ))}
        </div>

        {(selectedGroup.members || []).map((member: any) => {
          const scores = memberScores[member.name] || {};
          const adviserScore = computeAdviserScore(scores);
          return (
            <div key={member.name} className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: DT.successDim, color: DT.success, fontFamily: FT.h, fontWeight: 800, fontSize: 11 }}>
                    {member.initials || member.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                  </div>
                  <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{member.name}</span>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 800, color: allFilled ? DT.success : DT.textDis }}>{adviserScore.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: DT.textTer }}>Adviser score</div>
                </div>
              </div>

              {CRITERIA.map((criterion) => (
                <div key={criterion.key} className="py-3 last:border-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 13, fontWeight: 700, color: DT.textPri }}>{criterion.label}</span>
                        <span style={{ fontSize: 11, color: DT.textTer }}>{criterion.weight}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: DT.textTer }}>{criterion.desc}</div>
                    </div>
                    <ScoreButtons
                      value={scores[criterion.key] ?? -1}
                      onChange={(value) => setMemberScores((prev) => ({
                        ...prev,
                        [member.name]: { ...prev[member.name], [criterion.key]: value },
                      }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div className="flex justify-end">
          <button
            onClick={saveGrade}
            disabled={saving || !allFilled}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 hover:opacity-90"
            style={{ background: DT.success, color: DT.base, fontFamily: FT.h, fontWeight: 800, fontSize: 14 }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Save Adviser Grade
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-[1180px] mx-auto space-y-6">
      <div>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri }}>
          Adviser Grading
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
          Post-defense adviser grades are computed as 30% of the final grade.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: DT.successDim, border: "1px solid rgba(74,222,128,0.15)" }}>
        <BookOpen size={18} style={{ color: DT.success }} />
        <div style={{ fontSize: 13, color: DT.textSec }}>
          <strong style={{ color: DT.textPri }}>Criteria:</strong> Attendance to weekly submission 15%, Participation in discussion 25%, Project involvement 60%.
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Users size={40} style={{ color: DT.textDis }} />
          <p style={{ fontSize: 14, color: DT.textTer }}>No advised groups found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => {
            const groupNumber = group.number || group.id;
            const hasGrade = gradedGroups.has(groupNumber);
            return (
              <button key={group.id} onClick={() => setSelectedGroup(group)} className="text-left p-4 rounded-xl transition cursor-pointer hover:border-green-500/20" style={cardStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 800, color: DT.textPri }}>{group.name || `Group ${groupNumber}`}</div>
                    <div className="mt-1 line-clamp-2" style={{ fontSize: 12, color: DT.textTer }}>{group.title || "Untitled Project"}</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: DT.successDim, color: DT.success, fontFamily: FT.h, fontWeight: 800 }}>
                    {groupNumber}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  {hasGrade ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: DT.success, background: DT.successDim }}>
                      <CheckCircle2 size={10} /> Graded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: DT.warning, background: DT.warningDim }}>
                      <Clock size={10} /> Pending
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: DT.success }}>
                    {hasGrade ? "Update" : "Grade"} <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
