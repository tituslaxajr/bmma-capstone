import { supabase, apiFetch } from "../lib/supabase";
import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Loader2, Inbox, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Users, User, Send, BookOpen, ClipboardList, Award, XCircle,
  ChevronRight, BarChart3,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { toast } from "sonner";
import { GradePDFExporter } from "./GradePDFExporter";
import { GradeDistributionChart } from "./GradeDistributionChart";

/* ─── Rating UI ─── */
const RATING_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Does Not Meet", color: DT.error },
  1: { label: "Meets Sometimes", color: DT.warning },
  2: { label: "Meets Minimum", color: DT.yellow },
  3: { label: "Exceeds Expectations", color: DT.blue },
  4: { label: "Excellent", color: DT.success },
};

function ScoreButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4].map(n => {
        const sel = value === n;
        const r = RATING_LABELS[n];
        return (
          <button key={n} onClick={() => onChange(n)} title={`${n} — ${r.label}`}
            className="w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            style={{ border: `2px solid ${sel ? r.color : DT.borderDef}`, background: sel ? withAlpha(r.color, 0.08) : "transparent" }}>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FT.h, color: sel ? r.color : DT.textDis }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
  border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, borderRadius: 16,
};

/* ═══════════════════════════════════════════
   ADVISER GRADING TAB (30%)
   Sub-criteria: Attendance (15%), Participation (25%), Involvement (60%)
   ═══════════════════════════════════════════ */
const ADVISER_CRITERIA = [
  { key: "attendance", label: "Attendance to Submissions", desc: "Regular attendance and timely submission of requirements", weight: "15%" },
  { key: "participation", label: "Participation", desc: "Active engagement during consultations and group activities", weight: "25%" },
  { key: "involvement", label: "Project Involvement", desc: "Depth of involvement in research, production, and documentation", weight: "60%" },
];

function AdviserGradingTab() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [memberScores, setMemberScores] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [existingGrades, setExistingGrades] = useState<Set<number>>(new Set());

  const fetchGroups = useCallback(async () => {
    try {
      const [groupsRes, advGrades] = await Promise.all([
        apiFetch<{ groups: any[] }>("/groups"),
        apiFetch<{ grades: any[] }>("/adviser-grades"),
      ]);
      setGroups(groupsRes.groups || []);
      setExistingGrades(new Set((advGrades.grades || []).map((g: any) => g.groupNumber || g.groupId)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroup) {
      // Try to load existing scores
      (async () => {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const gn = selectedGroup.number || selectedGroup.id;
          const res = await apiFetch<{ grade: any }>(`/adviser-grades/group/${gn}`, {}, session?.access_token!);
          if (res.grade?.memberScores) {
            setMemberScores(res.grade.memberScores);
            return;
          }
        } catch {}
        // Initialize fresh
        const init: Record<string, Record<string, number>> = {};
        for (const m of selectedGroup.members || []) {
          init[m.name] = { attendance: -1, participation: -1, involvement: -1 };
        }
        setMemberScores(init);
      })();
    }
  }, [selectedGroup]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/adviser-grades", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroup.id,
          groupNumber: selectedGroup.number || selectedGroup.id,
          groupTitle: selectedGroup.title || selectedGroup.name,
          memberScores,
        }),
      }, session?.access_token!);
      toast.success("Adviser grade saved!");
      setSelectedGroup(null);
      fetchGroups();
    } catch (err: any) { toast.error(err.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const allFilled = selectedGroup && (selectedGroup.members || []).every((m: any) => {
    const scores = memberScores[m.name];
    if (!scores) return false;
    return ADVISER_CRITERIA.every(c => (scores[c.key] ?? -1) >= 0);
  });

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} /></div>;

  if (!selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)` }}>
          <BookOpen size={18} style={{ color: DT.blue }} />
          <div style={{ fontSize: 13, color: DT.textSec }}>
            <strong style={{ color: DT.textPri }}>Adviser Grade (30% of Final)</strong> — Rate each student on Attendance (15%), Participation (25%), and Project Involvement (60%).
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const gn = g.number || g.id;
            const hasGrade = existingGrades.has(gn);
            return (
              <button key={g.id} onClick={() => setSelectedGroup(g)}
                className="text-left p-4 rounded-xl transition cursor-pointer hover:border-blue-500/20" style={cardStyle}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: DT.blueDim }}>
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: DT.blue }}>{gn}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{g.name || `Group ${gn}`}</div>
                    <div style={{ fontSize: 11, color: DT.textTer }}>{(g.members || []).length} members · {g.adviser || "No adviser"}</div>
                  </div>
                </div>
                {hasGrade ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.success, background: DT.successDim }}>
                    <CheckCircle2 size={10} /> Graded — Click to update
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>Grade this group <ChevronRight size={14} className="inline" /></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 mb-1 cursor-pointer" style={{ fontSize: 13, color: DT.textTer }}>
        ← Back to groups
      </button>
      <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
        Adviser Grade — {selectedGroup.name || `Group ${selectedGroup.number}`}
      </h3>

      {(selectedGroup.members || []).map((m: any) => {
        const scores = memberScores[m.name] || {};
        return (
          <div key={m.name} className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2.5 mb-4">
              {m.avatarUrl ? <img src={m.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" /> : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: DT.blue, fontSize: 10, fontWeight: 700, color: "white" }}>
                  {m.initials || m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
              )}
              <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{m.name}</span>
            </div>
            {ADVISER_CRITERIA.map(c => (
              <div key={c.key} className="py-3 last:border-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{c.label}</span>
                      <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, color: DT.blue, background: DT.blueDim }}>{c.weight}</span>
                    </div>
                    <div style={{ fontSize: 11, color: DT.textTer }}>{c.desc}</div>
                  </div>
                  <ScoreButtons value={scores[c.key] ?? -1} onChange={(v) => setMemberScores(prev => ({
                    ...prev, [m.name]: { ...prev[m.name], [c.key]: v },
                  }))} />
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || !allFilled}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 hover:opacity-90"
          style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700, fontFamily: FT.h }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Save Adviser Grade
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COORDINATOR GRADING TAB (10%)
   Sub-criteria: Task Performance (20%), Submission of Requirements (80%)
   ═══════════════════════════════════════════ */
const COORD_CRITERIA = [
  { key: "taskPerformance", label: "Task Performance", desc: "Quality and consistency in completing assigned coordinator tasks", weight: "20%" },
  { key: "submissionOfRequirements", label: "Submission of Requirements", desc: "Completeness and timeliness of all required submissions", weight: "80%" },
];

function CoordinatorGradingTab() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [memberScores, setMemberScores] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [existingGrades, setExistingGrades] = useState<Set<number>>(new Set());

  const fetchGroups = useCallback(async () => {
    try {
      const [groupsRes, coordGrades] = await Promise.all([
        apiFetch<{ groups: any[] }>("/groups"),
        apiFetch<{ grades: any[] }>("/coordinator-grades"),
      ]);
      setGroups(groupsRes.groups || []);
      setExistingGrades(new Set((coordGrades.grades || []).map((g: any) => g.groupNumber || g.groupId)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroup) {
      (async () => {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const gn = selectedGroup.number || selectedGroup.id;
          const res = await apiFetch<{ grade: any }>(`/coordinator-grades/group/${gn}`, {}, session?.access_token!);
          if (res.grade?.memberScores) {
            setMemberScores(res.grade.memberScores);
            return;
          }
        } catch {}
        const init: Record<string, Record<string, number>> = {};
        for (const m of selectedGroup.members || []) {
          init[m.name] = { taskPerformance: -1, submissionOfRequirements: -1 };
        }
        setMemberScores(init);
      })();
    }
  }, [selectedGroup]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/coordinator-grades", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroup.id,
          groupNumber: selectedGroup.number || selectedGroup.id,
          groupTitle: selectedGroup.title || selectedGroup.name,
          memberScores,
        }),
      }, session?.access_token!);
      toast.success("Coordinator grade saved!");
      setSelectedGroup(null);
      fetchGroups();
    } catch (err: any) { toast.error(err.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const allFilled = selectedGroup && (selectedGroup.members || []).every((m: any) => {
    const scores = memberScores[m.name];
    if (!scores) return false;
    return COORD_CRITERIA.every(c => (scores[c.key] ?? -1) >= 0);
  });

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} /></div>;

  if (!selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: DT.redDim, border: `1px solid rgba(248,113,113,0.15)` }}>
          <ClipboardList size={18} style={{ color: DT.red }} />
          <div style={{ fontSize: 13, color: DT.textSec }}>
            <strong style={{ color: DT.textPri }}>Coordinator Grade (10% of Final)</strong> — Rate each student on Task Performance (20%) and Submission of Requirements (80%).
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const gn = g.number || g.id;
            const hasGrade = existingGrades.has(gn);
            return (
              <button key={g.id} onClick={() => setSelectedGroup(g)}
                className="text-left p-4 rounded-xl transition cursor-pointer hover:border-red-500/20" style={cardStyle}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: DT.redDim }}>
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: DT.red }}>{gn}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{g.name || `Group ${gn}`}</div>
                    <div style={{ fontSize: 11, color: DT.textTer }}>{(g.members || []).length} members</div>
                  </div>
                </div>
                {hasGrade ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.success, background: DT.successDim }}>
                    <CheckCircle2 size={10} /> Graded — Click to update
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: DT.red }}>Grade this group <ChevronRight size={14} className="inline" /></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 mb-1 cursor-pointer" style={{ fontSize: 13, color: DT.textTer }}>
        ← Back to groups
      </button>
      <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
        Coordinator Grade — {selectedGroup.name || `Group ${selectedGroup.number}`}
      </h3>

      {(selectedGroup.members || []).map((m: any) => {
        const scores = memberScores[m.name] || {};
        return (
          <div key={m.name} className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2.5 mb-4">
              {m.avatarUrl ? <img src={m.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" /> : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: DT.red, fontSize: 10, fontWeight: 700, color: "white" }}>
                  {m.initials || m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
              )}
              <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>{m.name}</span>
            </div>
            {COORD_CRITERIA.map(c => (
              <div key={c.key} className="py-3 last:border-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{c.label}</span>
                      <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, color: DT.red, background: DT.redDim }}>{c.weight}</span>
                    </div>
                    <div style={{ fontSize: 11, color: DT.textTer }}>{c.desc}</div>
                  </div>
                  <ScoreButtons value={scores[c.key] ?? -1} onChange={(v) => setMemberScores(prev => ({
                    ...prev, [m.name]: { ...prev[m.name], [c.key]: v },
                  }))} />
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || !allFilled}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 hover:opacity-90"
          style={{ background: DT.red, color: "white", fontSize: 14, fontWeight: 700, fontFamily: FT.h }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Save Coordinator Grade
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FINAL GRADES OVERVIEW TAB (composite 60/30/10)
   with Aggregate & Release controls
   ═══════════════════════════════════════════ */
function FinalGradesTab() {
  const [overview, setOverview] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [memberGrades, setMemberGrades] = useState<Record<number, any>>({});
  const [aggregating, setAggregating] = useState<number | "all" | null>(null);
  const [releasing, setReleasing] = useState<number | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const [overviewRes, aggRes] = await Promise.all([
        apiFetch<{ groups: any[] }>("/final-grades/overview"),
        apiFetch<{ aggregates: any[] }>("/final-grades/aggregated"),
      ]);
      setOverview(overviewRes.groups || []);
      const aggMap: Record<number, any> = {};
      for (const a of (aggRes.aggregates || [])) aggMap[a.groupNumber] = a;
      setAggregates(aggMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const fetchGroupGrades = async (groupNumber: number) => {
    if (memberGrades[groupNumber]) return;
    try {
      const res = await apiFetch<any>(`/final-grades/group/${groupNumber}`);
      setMemberGrades(prev => ({ ...prev, [groupNumber]: res }));
    } catch (err) { console.error(err); }
  };

  const toggleExpand = (gn: number) => {
    if (expanded === gn) { setExpanded(null); return; }
    setExpanded(gn);
    fetchGroupGrades(gn);
  };

  const handleAggregate = async (gn: number) => {
    setAggregating(gn);
    try {
      const res = await apiFetch<{ aggregate: any }>(`/final-grades/aggregate/${gn}`, { method: "POST" });
      setAggregates(prev => ({ ...prev, [gn]: res.aggregate }));
      toast.success(`Grades aggregated for Group ${gn}`);
    } catch (err: any) { toast.error(err.message || "Failed to aggregate"); }
    finally { setAggregating(null); }
  };

  const handleAggregateAll = async () => {
    setAggregating("all");
    try {
      const res = await apiFetch<{ aggregated: number }>("/final-grades/aggregate-all", { method: "POST" });
      toast.success(`Aggregated grades for ${res.aggregated} groups`);
      await fetchOverview();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setAggregating(null); }
  };

  const handleRelease = async (gn: number) => {
    setReleasing(gn);
    try {
      const agg = aggregates[gn];
      if (!agg) { toast.error("Aggregate grades first"); setReleasing(null); return; }
      if (agg.released) {
        // Unrelease
        const res = await apiFetch<{ aggregate: any }>(`/final-grades/unrelease/${gn}`, { method: "PUT" });
        setAggregates(prev => ({ ...prev, [gn]: res.aggregate }));
        toast.success(`Grades unreleased for Group ${gn}`);
      } else {
        // Release
        const res = await apiFetch<{ aggregate: any }>(`/final-grades/release/${gn}`, { method: "PUT" });
        setAggregates(prev => ({ ...prev, [gn]: res.aggregate }));
        toast.success(`Grades released for Group ${gn}! Students and panelists notified.`);
      }
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setReleasing(null); }
  };

  const releasedCount = Object.values(aggregates).filter(a => a?.released).length;
  const aggregatedCount = Object.keys(aggregates).length;

  // Build PDF export data from aggregates
  const pdfGrades = overview.filter(g => aggregates[g.groupNumber]).map(g => {
    const agg = aggregates[g.groupNumber];
    return {
      groupNumber: g.groupNumber,
      groupTitle: g.groupName || `Group ${g.groupNumber}`,
      members: agg?.members || [],
      groupScore: agg?.groupScore ?? 0,
      groupPct: agg?.groupPct ?? 0,
      individualAvg: agg?.individualAvg ?? 0,
      overallGrade: agg?.overallGrade ?? 0,
      verdict: agg?.verdict || "—",
      panelists: agg?.panelists || [],
      feedback: agg?.feedback,
    };
  });

  // Scores for distribution chart
  const allScores = pdfGrades.map(g => g.overallGrade).filter(s => s > 0);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: DT.yellowDim, border: `1px solid rgba(255,209,0,0.15)` }}>
        <Award size={18} style={{ color: DT.yellow }} />
        <div style={{ fontSize: 13, color: DT.textSec }}>
          <strong style={{ color: DT.textPri }}>Final Grade = Defense (60%) + Adviser (30%) + Coordinator (10%)</strong> — Aggregate to compute final grades, then release to make them visible to panelists and students.
        </div>
      </div>

      {/* Aggregator controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleAggregateAll} disabled={aggregating === "all"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
          style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 700, fontFamily: FT.h }}>
          {aggregating === "all" ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
          Aggregate All Groups
        </button>
        <GradePDFExporter grades={pdfGrades} />
        <div className="flex items-center gap-4 ml-auto" style={{ fontSize: 12, color: DT.textTer }}>
          <span><strong style={{ color: DT.textPri }}>{aggregatedCount}</strong> aggregated</span>
          <span><strong style={{ color: DT.success }}>{releasedCount}</strong> released</span>
          <span><strong style={{ color: DT.yellow }}>{aggregatedCount - releasedCount}</strong> pending</span>
        </div>
      </div>

      {/* Rating scale legend */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: DT.textTer }}>
        <span><span style={{ fontWeight: 700, color: DT.success }}>98–100%</span> Pass (1.00)</span>
        <span><span style={{ fontWeight: 700, color: DT.blue }}>89–97%</span> Minor Rev (1.25–1.75)</span>
        <span><span style={{ fontWeight: 700, color: DT.warning }}>75–88%</span> Major Rev (2.00–3.00)</span>
        <span><span style={{ fontWeight: 700, color: DT.error }}>&lt;75%</span> Failed (5.00)</span>
      </div>

      {/* Grade Distribution Chart */}
      {allScores.length > 0 && (
        <GradeDistributionChart scores={allScores} title="Defense Grade Distribution" />
      )}

      {overview.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Inbox size={40} style={{ color: DT.textDis }} />
          <p style={{ fontSize: 14, color: DT.textTer }}>No groups found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {overview.map(g => {
            const gn = g.groupNumber;
            const isExp = expanded === gn;
            const data = memberGrades[gn];
            const agg = aggregates[gn];
            const complete = g.panelistGradesCount >= 3 && g.hasAdviserGrade && g.hasCoordGrade;
            const partial = g.panelistGradesCount > 0 || g.hasAdviserGrade || g.hasCoordGrade;

            return (
              <div key={gn} className="rounded-xl overflow-hidden" style={cardStyle}>
                <button onClick={() => toggleExpand(gn)} className="w-full flex items-center gap-3 p-4 cursor-pointer transition hover:bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                    background: complete ? DT.successDim : partial ? DT.yellowDim : "rgba(255,255,255,0.04)",
                    border: `1px solid ${complete ? "rgba(74,222,128,0.15)" : partial ? "rgba(255,209,0,0.15)" : DT.borderHair}`,
                  }}>
                    <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: complete ? DT.success : partial ? DT.yellow : DT.textDis }}>{gn}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{g.groupName || `Group ${gn}`}</span>
                      {/* Release status badge */}
                      {agg?.released ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, color: DT.success, background: DT.successDim, border: "1px solid rgba(74,222,128,0.20)" }}>
                          <CheckCircle2 size={9} /> RELEASED
                        </span>
                      ) : agg ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, color: DT.yellow, background: DT.yellowDim, border: "1px solid rgba(255,209,0,0.20)" }}>
                          AGGREGATED
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: g.panelistGradesCount >= 3 ? DT.success : g.panelistGradesCount > 0 ? DT.yellow : DT.textDis }}>
                        <BarChart3 size={11} /> Defense: {g.panelistGradesCount}/3
                      </span>
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: g.hasAdviserGrade ? DT.success : DT.textDis }}>
                        <BookOpen size={11} /> Adviser: {g.hasAdviserGrade ? "\u2713" : "\u2014"}
                      </span>
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: g.hasCoordGrade ? DT.success : DT.textDis }}>
                        <ClipboardList size={11} /> Coord: {g.hasCoordGrade ? "\u2713" : "\u2014"}
                      </span>
                    </div>
                  </div>
                  {isExp ? <ChevronUp size={18} style={{ color: DT.textTer }} /> : <ChevronDown size={18} style={{ color: DT.textTer }} />}
                </button>

                {isExp && (
                  <div className="px-4 pb-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 mb-3">
                      <button onClick={(e) => { e.stopPropagation(); handleAggregate(gn); }}
                        disabled={aggregating === gn}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 hover:opacity-90"
                        style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.20)`, fontSize: 12, fontWeight: 600, color: DT.blue }}>
                        {aggregating === gn ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                        {agg ? "Re-aggregate" : "Aggregate"}
                      </button>
                      {agg && (
                        <button onClick={(e) => { e.stopPropagation(); handleRelease(gn); }}
                          disabled={releasing === gn}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 hover:opacity-90"
                          style={{
                            background: agg.released ? DT.warningDim : DT.successDim,
                            border: `1px solid ${agg.released ? "rgba(251,191,36,0.20)" : "rgba(74,222,128,0.20)"}`,
                            fontSize: 12, fontWeight: 600, color: agg.released ? DT.warning : DT.success,
                          }}>
                          {releasing === gn ? <Loader2 size={12} className="animate-spin" /> :
                           agg.released ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {agg.released ? "Unrelease" : "Release to Students"}
                        </button>
                      )}
                      {agg?.releasedAt && (
                        <span style={{ fontSize: 11, color: DT.textTer }}>
                          Released {new Date(agg.releasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {agg.releasedBy ? ` by ${agg.releasedBy}` : ""}
                        </span>
                      )}
                    </div>

                    {!data ? (
                      <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: DT.blue }} /></div>
                    ) : (
                      <div className="overflow-x-auto mt-1">
                        <table className="w-full" style={{ fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                              <th className="text-left py-2 pr-4" style={{ color: DT.textTer, fontWeight: 600 }}>Student</th>
                              <th className="text-center py-2 px-2" style={{ color: DT.blue, fontWeight: 700, fontSize: 11 }}>Defense<br /><span style={{ fontWeight: 400 }}>60%</span></th>
                              <th className="text-center py-2 px-2" style={{ color: DT.success, fontWeight: 700, fontSize: 11 }}>Adviser<br /><span style={{ fontWeight: 400 }}>30%</span></th>
                              <th className="text-center py-2 px-2" style={{ color: DT.red, fontWeight: 700, fontSize: 11 }}>Coord<br /><span style={{ fontWeight: 400 }}>10%</span></th>
                              <th className="text-center py-2 px-2" style={{ color: DT.yellow, fontWeight: 700, fontSize: 11 }}>Final<br /><span style={{ fontWeight: 400 }}>Raw %</span></th>
                              <th className="text-center py-2 px-2" style={{ color: DT.textPri, fontWeight: 700, fontSize: 11 }}>Grade</th>
                              <th className="text-left py-2 pl-2" style={{ color: DT.textPri, fontWeight: 700, fontSize: 11 }}>Verdict</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.members || []).map((name: string) => {
                              const mg = data.memberFinalGrades?.[name];
                              if (!mg) return null;
                              const vc = mg.verdict === "Pass" ? DT.success :
                                mg.verdict?.includes("Minor") ? DT.blue :
                                mg.verdict?.includes("Major") ? DT.warning : DT.error;
                              return (
                                <tr key={name} style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                                  <td className="py-2.5 pr-4" style={{ fontWeight: 600, color: DT.textPri }}>{name}</td>
                                  <td className="text-center py-2.5 px-2" style={{ color: DT.textSec }}>
                                    {mg.defenseScore.toFixed(1)}%
                                    {mg.panelistCount < 3 && <span style={{ fontSize: 9, color: DT.warning }}> ({mg.panelistCount}/3)</span>}
                                  </td>
                                  <td className="text-center py-2.5 px-2" style={{ color: mg.hasAdviserGrade ? DT.textSec : DT.textDis }}>
                                    {mg.hasAdviserGrade ? `${mg.adviserScore.toFixed(1)}%` : "\u2014"}
                                  </td>
                                  <td className="text-center py-2.5 px-2" style={{ color: mg.hasCoordGrade ? DT.textSec : DT.textDis }}>
                                    {mg.hasCoordGrade ? `${mg.coordScore.toFixed(1)}%` : "\u2014"}
                                  </td>
                                  <td className="text-center py-2.5 px-2" style={{ fontFamily: FT.h, fontWeight: 800, color: DT.yellow }}>
                                    {mg.finalRaw.toFixed(1)}%
                                  </td>
                                  <td className="text-center py-2.5 px-2" style={{ fontFamily: FT.h, fontWeight: 800, fontSize: 16, color: vc }}>
                                    {mg.numericalGrade}
                                  </td>
                                  <td className="py-2.5 pl-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                                      fontSize: 10, fontWeight: 700, color: vc, background: withAlpha(vc, 0.07), border: `1px solid ${withAlpha(vc, 0.12)}`,
                                    }}>
                                      {mg.verdict === "Pass" ? <CheckCircle2 size={10} /> :
                                       mg.verdict?.includes("Minor") ? <AlertTriangle size={10} /> :
                                       mg.verdict?.includes("Major") ? <AlertTriangle size={10} /> : <XCircle size={10} />}
                                      {mg.verdict}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {(!data.hasAdviserGrade || !data.hasCoordGrade || data.panelistGradesCount < 3) && (
                          <div className="mt-3 p-3 rounded-lg" style={{ background: DT.warningDim, border: `1px solid rgba(251,191,36,0.15)` }}>
                            <span style={{ fontSize: 12, color: DT.warning }}>
                              <AlertTriangle size={12} className="inline mr-1" />
                              Incomplete: {data.panelistGradesCount < 3 ? `Only ${data.panelistGradesCount}/3 panelist grades. ` : ""}
                              {!data.hasAdviserGrade ? "Missing adviser grade. " : ""}
                              {!data.hasCoordGrade ? "Missing coordinator grade. " : ""}
                              Final grades are partial.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT — Tabbed Page
   ═══════════════════════════════════════════ */
export function CoordinatorGradingPage() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "Adviser Grade", sub: "30%", icon: <BookOpen size={16} />, color: DT.blue },
    { label: "Coordinator Grade", sub: "10%", icon: <ClipboardList size={16} />, color: DT.red },
    { label: "Final Grades", sub: "60/30/10", icon: <Award size={16} />, color: DT.yellow },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      <div>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
          Grading
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
          Manage adviser & coordinator grades, and view composite final grades (Defense 60% + Adviser 30% + Coordinator 10%)
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer"
            style={{
              fontSize: 13, fontWeight: tab === i ? 700 : 500,
              fontFamily: tab === i ? FT.h : FT.b,
              background: tab === i ? withAlpha(t.color, 0.07) : "transparent",
              border: `2px solid ${tab === i ? withAlpha(t.color, 0.18) : DT.borderDef}`,
              color: tab === i ? t.color : DT.textTer,
            }}>
            {t.icon}
            {t.label}
            <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: tab === i ? withAlpha(t.color, 0.12) : "rgba(255,255,255,0.04)", color: tab === i ? t.color : DT.textDis }}>{t.sub}</span>
          </button>
        ))}
      </div>

      {tab === 0 && <AdviserGradingTab />}
      {tab === 1 && <CoordinatorGradingTab />}
      {tab === 2 && <FinalGradesTab />}
    </div>
  );
}