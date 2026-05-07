import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { FocusEvent, CSSProperties } from "react";
import {
  Calendar, Clock, MapPin, CheckCircle2, AlertTriangle,
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  Video, X, Loader2, BarChart3,
  ShieldCheck, User, Zap, RefreshCw, Filter,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { useInView, Fade, cardBg, inputStyle } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { KF_STANDARD } from "./animations";

/* ═══ Helpers ═══ */

function formatDateNice(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    if (isNaN(date.getTime())) return d;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const formatted = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (diff === 0) return `Today — ${formatted}`;
    if (diff === 1) return `Tomorrow — ${formatted}`;
    if (diff === -1) return `Yesterday — ${formatted}`;
    if (diff > 0 && diff <= 7) return `${weekday} — ${formatted}`;
    return `${weekday}, ${formatted}`;
  } catch { return d; }
}

function formatTime(t: string): string {
  if (!t || t === "TBD") return "TBD";
  try {
    if (t.includes(":") && !t.includes(" ")) {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const hr = h % 12 || 12;
      return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
    }
    return t;
  } catch { return t; }
}

function daysUntil(d: string): number | null {
  if (!d || d === "TBD") return null;
  try { return Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000); }
  catch { return null; }
}

/* ═══ Types ═══ */
type DefenseStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "Pending";

interface DefenseSlot {
  id: number; group: string; title: string; date: string; time: string; room: string;
  mode: "In-Person" | "Online" | "Hybrid"; panelists: string[]; status: DefenseStatus;
  score?: number; verdict?: string;
}

interface GroupOption { number: number; name: string; title: string; members: any[]; adviser?: string; adviserInitials?: string; panelists?: any[] }
interface EnrichedSlot extends DefenseSlot {
  groupData?: GroupOption; memberCount: number; submissionCount: number;
  daysLeft: number | null; panelistNames: string[];
}

/* ═══ Empty form state ═══ */
const emptyForm = {
  group: "", title: "", date: "", time: "", room: "", mode: "In-Person" as string,
  status: "Scheduled" as string,
};

/* ═══ Verdicts map (new 4-tier) ═══ */
const verdictMap: Record<string, { label: string; color: string }> = {
  passed: { label: "Pass", color: DT.success },
  pass: { label: "Pass", color: DT.success },
  revisions: { label: "Minor Revision", color: DT.blue },
  minor: { label: "Minor Revision", color: DT.blue },
  redemonstration: { label: "Major Rev/Re-demo", color: DT.warning },
  major: { label: "Major Rev/Re-demo", color: DT.warning },
  failed: { label: "Fail", color: DT.red },
  fail: { label: "Fail", color: DT.red },
};
function getVerdict(v?: string) { return verdictMap[v || ""] || { label: v || "Pending", color: DT.textTer }; }

/* ═══ Badges ═══ */
function DefenseStatusBadge({ status }: { status: DefenseStatus }) {
  const m: Record<DefenseStatus, { c: string; bg: string; b: string }> = {
    Scheduled: { c: DT.blue, bg: DT.blueDim, b: withAlpha(DT.blue, 0.15) },
    "In Progress": { c: DT.warning, bg: DT.warningDim, b: withAlpha(DT.warning, 0.15) },
    Completed: { c: DT.success, bg: DT.successDim, b: withAlpha(DT.success, 0.15) },
    Cancelled: { c: DT.red, bg: DT.redDim, b: withAlpha(DT.red, 0.15) },
    Pending: { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
  };
  const s = m[status];
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{status}</span>;
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "Online") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.purple, background: DT.purpleDim, border: `1px solid ${withAlpha(DT.purple, 0.15)}` }}><Video size={10} /> Online</span>;
  if (mode === "Hybrid") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.success, background: DT.successDim, border: `1px solid ${withAlpha(DT.success, 0.15)}` }}>Hybrid</span>;
  return null; // In-Person is default, don't show badge
}

/* ═══ Member Avatars Row ═══ */
function MemberAvatars({ members, max = 4 }: { members: any[]; max?: number }) {
  if (!members || members.length === 0) return null;
  const colors = [DT.blue, DT.purple, DT.success, DT.warning, DT.red];
  const shown = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex items-center">
      {shown.map((m: any, i: number) => {
        const name = m.name || m.email?.split("@")[0] || "?";
        const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        const c = colors[i % colors.length];
        return (
          <div key={m.email || i} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: m.avatarUrl ? "transparent" : `linear-gradient(135deg, ${c}, ${withAlpha(c, 0.6)})`,
              border: `2px solid ${DT.raised}`, marginLeft: i > 0 ? -5 : 0, zIndex: 10 - i,
            }}
            title={name}
          >
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: 7, fontWeight: 700, color: "#fff" }}>{initials}</span>
            )}
          </div>
        );
      })}
      {extra > 0 && (
        <span className="ml-1" style={{ fontSize: 9, fontWeight: 600, color: DT.textDis }}>+{extra}</span>
      )}
    </div>
  );
}

/* ═══ Grade Mini Row ═══ */
function GradeMiniRow({ grade }: { grade: any }) {
  const v = getVerdict(grade.verdict);
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: DT.blueDim }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: DT.blue }}>{grade.panelistAvatar || "??"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{grade.panelistName}</span>
      </div>
      <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: v.color, background: withAlpha(v.color, 0.08) }}>
        {v.label}
      </span>
      <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.blue }}>
        {grade.weightedTotal?.toFixed(1)}
      </span>
    </div>
  );
}

/* ═══ Grades Expander ═══ */
function GradesExpander({ grades }: { grades: any[] }) {
  const [open, setOpen] = useState(false);
  const verdictCounts: Record<string, number> = {};
  grades.forEach(g => { verdictCounts[g.verdict] = (verdictCounts[g.verdict] || 0) + 1; });
  const majority = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "pending";
  const mv = getVerdict(majority);
  const avgScore = grades.reduce((s, g) => s + (g.weightedTotal || 0), 0) / grades.length;

  // Updated criteria labels
  const criteriaLabels: Record<string, string> = {
    results: "Results", discussion: "Discussion", output: "Output",
    presentation: "Presentation", qa: "Q&A",
    manuscript: "Manuscript", research: "Research", oral: "Oral",
  };

  return (
    <div className="mx-4 mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition hover:bg-white/[0.02]"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
        <BarChart3 size={14} style={{ color: DT.blue }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>
          {grades.length} grade{grades.length > 1 ? "s" : ""} submitted
        </span>
        <span className="px-2 py-0.5 rounded-full ml-1" style={{ fontSize: 10, fontWeight: 700, color: mv.color, background: withAlpha(mv.color, 0.08) }}>
          {mv.label.toUpperCase()}
        </span>
        <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.blue, marginLeft: "auto" }}>
          Avg: {avgScore.toFixed(1)}
        </span>
        {open ? <ChevronUp size={14} style={{ color: DT.textTer }} /> : <ChevronDown size={14} style={{ color: DT.textTer }} />}
      </button>
      {open && (
        <div className="mt-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${DT.borderHair}` }}>
          {grades.map(g => <GradeMiniRow key={g.id} grade={g} />)}
          <div className="mt-3 pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            {Object.entries(grades[0]?.scores || {}).map(([key]) => {
              const avg = grades.reduce((s, g) => s + (g.scores?.[key] || 0), 0) / grades.length;
              return (
                <div key={key} className="px-2 py-1.5 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 10, color: DT.textTer }}>{criteriaLabels[key] || key}</div>
                  <div style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.blue }}>{avg.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Defense Slot Card (enriched) ═══ */
function DefenseSlotCard({ slot, gradeMap, onEdit, onDelete, isLast }: {
  slot: EnrichedSlot; gradeMap: Record<string, any[]>;
  onEdit: (s: DefenseSlot) => void; onDelete: (id: number) => void;
  isLast: boolean;
}) {
  const defGrades = gradeMap[String(slot.id)] || [];
  const avgScore = defGrades.length > 0
    ? defGrades.reduce((sum: number, g: any) => sum + (g.weightedTotal || 0), 0) / defGrades.length
    : null;
  const panelistCount = slot.panelistNames.length;
  const gradedCount = defGrades.length;
  const members = slot.groupData?.members || [];
  const adviser = slot.groupData?.adviser;
  const isToday = slot.daysLeft === 0;
  const isSoon = slot.daysLeft !== null && slot.daysLeft > 0 && slot.daysLeft <= 3;

  return (
    <div style={{ borderBottom: !isLast ? `1px solid ${DT.borderHair}` : "none" }}>
      <div className="flex flex-col lg:flex-row gap-4 p-5">
        {/* Time column */}
        <div className="lg:w-[110px] shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock size={13} style={{ color: DT.blue }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: DT.blue, fontFamily: FT.m }}>{formatTime(slot.time)}</span>
          </div>
          {slot.daysLeft !== null && slot.daysLeft >= 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded" style={{
                fontSize: 9, fontWeight: 700, fontFamily: FT.m,
                color: isToday ? DT.yellow : isSoon ? DT.warning : DT.textTer,
                background: isToday ? withAlpha(DT.yellow, 0.1) : isSoon ? withAlpha(DT.warning, 0.08) : "rgba(255,255,255,0.04)",
              }}>
                {isToday ? "TODAY" : `${slot.daysLeft}d`}
              </span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Group + badges */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
              {slot.group}
            </span>
            <DefenseStatusBadge status={slot.status} />
            <ModeBadge mode={slot.mode} />
            {slot.mode === "In-Person" && (
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: DT.textTer }}>
                <MapPin size={11} /> {slot.room || "TBD"}
              </span>
            )}
          </div>

          {/* Row 2: Title */}
          {slot.title && (
            <p className="truncate mb-2" style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.4 }}>{slot.title}</p>
          )}

          {/* Row 3: Members + Adviser + Panelists */}
          <div className="flex flex-wrap items-center gap-4 mt-1">
            {/* Members */}
            {members.length > 0 && (
              <div className="flex items-center gap-2">
                <MemberAvatars members={members} />
                <span style={{ fontSize: 11, color: DT.textTer }}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Adviser */}
            {adviser && adviser !== "—" && (
              <div className="flex items-center gap-1.5">
                <User size={11} style={{ color: DT.success }} />
                <span style={{ fontSize: 11, color: DT.textTer }}>Adv: <span style={{ color: DT.success, fontWeight: 600 }}>{adviser}</span></span>
              </div>
            )}

            {/* Panelists */}
            {slot.panelistNames.length > 0 && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={11} style={{ color: DT.purple }} />
                <span className="truncate" style={{ fontSize: 11, color: DT.textTer, maxWidth: 220 }}>
                  {slot.panelistNames.join(", ")}
                </span>
              </div>
            )}
            {slot.panelistNames.length === 0 && (
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: DT.textDis }}>
                <ShieldCheck size={11} /> No panelists assigned
              </span>
            )}
          </div>
        </div>

        {/* Right: Grade summary + Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Grading progress */}
          {panelistCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
              background: gradedCount >= panelistCount
                ? withAlpha(DT.success, 0.04) : gradedCount > 0 ? withAlpha(DT.blue, 0.04) : "rgba(255,255,255,0.02)",
              border: `1px solid ${gradedCount >= panelistCount
                ? withAlpha(DT.success, 0.12) : gradedCount > 0 ? withAlpha(DT.blue, 0.1) : DT.borderHair}`,
            }}>
              <BarChart3 size={14} style={{ color: gradedCount >= panelistCount ? DT.success : gradedCount > 0 ? DT.blue : DT.textDis }} />
              {avgScore !== null && (
                <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.blue }}>{avgScore.toFixed(1)}</span>
              )}
              <span className="px-1.5 py-0.5 rounded" style={{
                fontSize: 9, fontWeight: 700, fontFamily: FT.m,
                color: gradedCount >= panelistCount ? DT.success : gradedCount > 0 ? DT.blue : DT.textDis,
                background: gradedCount >= panelistCount ? withAlpha(DT.success, 0.08) : "rgba(255,255,255,0.04)",
              }}>
                {gradedCount}/{panelistCount}
              </span>
            </div>
          )}
          {panelistCount === 0 && (
            <span className="px-2 py-1 rounded-lg" style={{ fontSize: 10, fontWeight: 600, color: DT.textDis, background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
              No panel
            </span>
          )}

          {/* Action buttons */}
          <button onClick={() => onEdit(slot)} className="p-2 rounded-lg transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }} title="Edit defense">
            <Edit3 size={14} />
          </button>
          <button onClick={() => onDelete(slot.id)} className="p-2 rounded-lg transition cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textDis }} title="Delete defense">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expandable grades */}
      {defGrades.length > 0 && <GradesExpander grades={defGrades} />}
    </div>
  );
}

/* ═══ Day Group ═══ */
function DayGroup({ date, slots, gradeMap, onEdit, onDelete }: {
  date: string; slots: EnrichedSlot[]; gradeMap: Record<string, any[]>;
  onEdit: (s: DefenseSlot) => void; onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const isToday = daysUntil(date) === 0;
  const isTomorrow = daysUntil(date) === 1;
  const isPast = (daysUntil(date) ?? 1) < 0;
  const totalGraded = slots.reduce((sum, s) => sum + (gradeMap[String(s.id)]?.length || 0), 0);

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: cardBg,
      border: `1px solid ${isToday ? withAlpha(DT.yellow, 0.2) : DT.borderSub}`,
      boxShadow: isToday ? `${DT.shadowSm}, 0 0 20px ${withAlpha(DT.yellow, 0.05)}` : DT.shadowSm,
    }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 cursor-pointer transition text-left hover:bg-white/[0.02]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
          background: isToday ? withAlpha(DT.yellow, 0.1) : isTomorrow ? withAlpha(DT.blue, 0.08) : isPast ? "rgba(255,255,255,0.03)" : withAlpha(DT.blue, 0.06),
          color: isToday ? DT.yellow : isTomorrow ? DT.blue : isPast ? DT.textDis : DT.blue,
        }}>
          <Calendar size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? DT.yellow : DT.textPri, fontFamily: FT.h }}>
            {formatDateNice(date)}
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            <span style={{ fontSize: 11, color: DT.textTer }}>{slots.length} defense{slots.length > 1 ? "s" : ""}</span>
            {totalGraded > 0 && <span style={{ fontSize: 11, color: DT.blue }}>{totalGraded} grade{totalGraded > 1 ? "s" : ""}</span>}
          </div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: DT.textTer }} /> : <ChevronDown size={16} style={{ color: DT.textTer }} />}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          {slots.map((s, i) => (
            <DefenseSlotCard key={s.id} slot={s} gradeMap={gradeMap}
              onEdit={onEdit} onDelete={onDelete} isLast={i === slots.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ Schedule / Edit Defense Modal ═══ */
function DefenseModal({ show, editSlot, groups, onClose, onSaved }: {
  show: boolean; editSlot: DefenseSlot | null;
  groups: GroupOption[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = !!editSlot;

  useEffect(() => {
    if (editSlot) {
      setForm({
        group: editSlot.group, title: editSlot.title,
        date: editSlot.date, time: editSlot.time || "",
        room: editSlot.room, mode: editSlot.mode,
        status: editSlot.status,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editSlot, show]);

  if (!show) return null;

  const setField = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  // Find group's assigned panelists (read-only display)
  const selectedGroup = groups.find(g => `Group ${g.number}` === form.group);
  const groupPanelists = (selectedGroup?.panelists || []).map((p: any) =>
    typeof p === "string" ? p : p.name || ""
  ).filter(Boolean);

  const handleGroupChange = (val: string) => {
    setField("group", val);
    const g = groups.find(g => `Group ${g.number}` === val);
    if (g?.title) setField("title", g.title);
  };

  const handleSave = async () => {
    if (!form.group) { toast.error("Please select a group"); return; }
    if (!form.date) { toast.error("Please set a date"); return; }
    setSaving(true);
    try {
      const payload = {
        group: form.group, title: form.title, date: form.date,
        time: form.time, room: form.room, mode: form.mode,
        status: form.status || "Scheduled",
      };
      if (isEdit && editSlot) {
        await apiFetch(`/defenses/${editSlot.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Defense updated successfully");
      } else {
        await apiFetch("/defenses", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Defense scheduled successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Defense save error:", err);
      toast.error(err?.message || "Failed to save defense");
    } finally { setSaving(false); }
  };

  const fH = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = DT.blue; };
  const bH = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = DT.borderDef; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl }}>

        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
            {isEdit ? "Edit Defense" : "Schedule New Defense"}
          </h2>
          <button onClick={onClose} className="cursor-pointer p-1 rounded-lg hover:bg-white/[0.04] transition" style={{ color: DT.textTer }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Group</label>
            <select value={form.group} onChange={e => handleGroupChange(e.target.value)}
              style={inputStyle} className="cursor-pointer" onFocus={fH as any} onBlur={bH as any}>
              <option value="">Select a group...</option>
              {groups.map(g => (
                <option key={g.number} value={`Group ${g.number}`}>
                  Group {g.number}{g.title ? ` — ${g.title}` : ""}{g.name ? ` (${g.name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Capstone Title <span style={{ color: DT.textDis, fontWeight: 400 }}>(optional)</span></label>
            <input value={form.title} onChange={e => setField("title", e.target.value)}
              placeholder="Auto-filled from group" style={inputStyle} onFocus={fH} onBlur={bH} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Date</label>
              <input type="date" value={form.date} onChange={e => setField("date", e.target.value)}
                style={inputStyle} onFocus={fH} onBlur={bH} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Time</label>
              <input type="time" value={form.time} onChange={e => setField("time", e.target.value)}
                style={inputStyle} onFocus={fH} onBlur={bH} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Room / Venue</label>
              <input value={form.room} onChange={e => setField("room", e.target.value)}
                placeholder="e.g. Room 401" style={inputStyle} onFocus={fH} onBlur={bH} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Mode</label>
              <select value={form.mode} onChange={e => setField("mode", e.target.value)}
                style={inputStyle} className="cursor-pointer" onFocus={fH as any} onBlur={bH as any}>
                <option>In-Person</option><option>Online</option><option>Hybrid</option>
              </select>
            </div>
          </div>
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Status</label>
              <select value={form.status} onChange={e => setField("status", e.target.value)}
                style={inputStyle} className="cursor-pointer" onFocus={fH as any} onBlur={bH as any}>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}
          {/* Read-only panelist info from group record */}
          {form.group && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>
                Assigned Panelists
                {groupPanelists.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: withAlpha(DT.purple, 0.1), color: DT.purple }}>
                    {groupPanelists.length} assigned
                  </span>
                )}
              </label>
              {groupPanelists.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                  {groupPanelists.map((name: string, i: number) => (
                    <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{
                      fontSize: 12, fontWeight: 600, color: DT.purple,
                      background: withAlpha(DT.purple, 0.08), border: `1px solid ${withAlpha(DT.purple, 0.12)}`,
                    }}>
                      <ShieldCheck size={11} />
                      {name}
                      {i === 0 && <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: withAlpha(DT.purple, 0.15), color: DT.purple }}>LEAD</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${DT.borderDef}` }}>
                  <p style={{ fontSize: 12, color: DT.textDis, lineHeight: 1.5 }}>
                    No panelists assigned to this group yet.
                  </p>
                  <p style={{ fontSize: 11, color: DT.textTer, marginTop: 4 }}>
                    Assign panelists in <span style={{ color: DT.purple, fontWeight: 600 }}>Panel Assignments</span> page.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 flex items-center gap-2"
            style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Schedule Defense"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Delete Confirmation ═══ */
function DeleteConfirmModal({ show, onClose, onConfirm, deleting }: {
  show: boolean; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} />
      <div className="relative w-full max-w-sm mx-4 rounded-2xl p-6" onClick={e => e.stopPropagation()}
        style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.redDim, color: DT.red }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Delete Defense</h3>
            <p style={{ fontSize: 12, color: DT.textTer }}>This action cannot be undone.</p>
          </div>
        </div>
        <p className="mb-5" style={{ fontSize: 13, color: DT.textSec, lineHeight: 1.6 }}>
          Are you sure you want to delete this defense slot? All associated schedule data will be removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="px-4 py-2 rounded-xl transition cursor-pointer hover:opacity-90 flex items-center gap-2"
            style={{ background: DT.red, color: "#fff", fontFamily: FT.h, fontSize: 13, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}>
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Skeleton ═══ */
function DefenseSkeleton() {
  const s: CSSProperties = {
    background: `linear-gradient(90deg, ${DT.raised} 25%, ${DT.elevated} 50%, ${DT.raised} 75%)`,
    backgroundSize: "200% 100%", animation: "cpShimmer 1.5s ease-in-out infinite", borderRadius: 16,
  };
  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      <style>{KF_STANDARD}</style>
      <div className="flex justify-between items-start">
        <div><div style={{ ...s, width: 240, height: 32, marginBottom: 8 }} /><div style={{ ...s, width: 360, height: 16 }} /></div>
        <div style={{ ...s, width: 160, height: 44 }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} style={{ ...s, height: 80 }} />)}
      </div>
      <div style={{ ...s, height: 56 }} />
      {[...Array(2)].map((_, i) => <div key={i} style={{ ...s, height: 180 }} />)}
    </div>
  );
}

/* ═══ Main Export ═══ */
export function CoordinatorDefenseOverviewPage() {
  const [slots, setSlots] = useState<DefenseSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeMap, setGradeMap] = useState<Record<string, any[]>>({});
  const [totalGrades, setTotalGrades] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Enrichment data
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState<DefenseSlot | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [defRes, gradeRes, groupsRes] = await Promise.all([
        apiFetch<{ defenses: DefenseSlot[] }>("/defenses"),
        apiFetch<any>("/grades/overview"),
        apiFetch<{ groups: any[] }>("/groups"),
      ]);
      setSlots(defRes.defenses || []);
      setGradeMap(gradeRes.defenseGrades || {});
      setTotalGrades(gradeRes.totalGrades || 0);

      const g = (groupsRes.groups || []).map((g: any) => ({
        number: g.number || g.id,
        name: g.name || "",
        title: g.title || g.capstoneTitle || "",
        members: g.members || [],
        adviser: g.adviser,
        adviserInitials: g.adviserInitials,
        panelists: g.panelists || [],
      })).sort((a: GroupOption, b: GroupOption) => a.number - b.number);
      setAllGroups(g);
    } catch (err) { console.error("Failed to fetch defense data:", err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Enrich slots with group data
  const enrichedSlots: EnrichedSlot[] = useMemo(() => {
    return slots.map(s => {
      // Match group
      const groupData = allGroups.find(g =>
        `Group ${g.number}` === s.group || g.name === s.group || g.title === s.group
      );
      // Pull panelists from group record (single source of truth), fall back to defense record for legacy data
      const groupPanelists = groupData?.panelists || [];
      const panelistNames = groupPanelists.length > 0
        ? groupPanelists.map((p: any) => typeof p === "string" ? p : p.name || "").filter(Boolean)
        : (s.panelists || []).map((p: any) => typeof p === "string" ? p : p.name || "").filter(Boolean);
      return {
        ...s,
        groupData: groupData || undefined,
        memberCount: groupData?.members?.length || 0,
        submissionCount: 0,
        daysLeft: daysUntil(s.date),
        panelistNames,
      };
    });
  }, [slots, allGroups]);

  const openAddModal = useCallback(() => {
    setEditSlot(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((slot: DefenseSlot) => {
    setEditSlot(slot);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await apiFetch(`/defenses/${deleteId}`, { method: "DELETE" });
      toast.success("Defense deleted");
      setDeleteId(null);
      fetchData(true);
    } catch (err: any) {
      console.error("Delete defense error:", err);
      toast.error(err?.message || "Failed to delete defense");
    } finally { setDeleting(false); }
  }, [deleteId, fetchData]);

  // Filter
  let filtered = [...enrichedSlots];
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.group.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) ||
      s.panelistNames.some(p => p.toLowerCase().includes(q)) ||
      (s.groupData?.adviser || "").toLowerCase().includes(q)
    );
  }
  if (statusFilter) filtered = filtered.filter(s => s.status === statusFilter);

  // Sort: upcoming first, then by date
  filtered.sort((a, b) => {
    if (a.date === b.date) return (a.time || "").localeCompare(b.time || "");
    return a.date.localeCompare(b.date);
  });

  // Group by date
  const dateGroups: Record<string, EnrichedSlot[]> = {};
  filtered.forEach(s => { if (!dateGroups[s.date]) dateGroups[s.date] = []; dateGroups[s.date].push(s); });

  // Stats
  const scheduled = slots.filter(s => s.status === "Scheduled").length;
  const pending = slots.filter(s => s.status === "Pending").length;
  const completed = slots.filter(s => s.status === "Completed").length;
  const inProgress = slots.filter(s => s.status === "In Progress").length;

  // Next upcoming defense
  const upcomingSlots = enrichedSlots
    .filter(s => s.daysLeft !== null && s.daysLeft >= 0 && s.status !== "Cancelled" && s.status !== "Completed")
    .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const nextDefense = upcomingSlots[0] || null;

  if (loading) return <DefenseSkeleton />;

  return (
    <PageShell>
      {/* Header */}
      <Fade delay={0}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Defense Overview</h1>
            <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Schedule, manage, and monitor all capstone defense sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className="p-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
              style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}
              title="Refresh">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
              <Plus size={16} /> Schedule Defense
            </button>
          </div>
        </div>
      </Fade>

      {/* Next Defense Banner */}
      {nextDefense && (
        <Fade delay={40}>
          <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{
            background: nextDefense.daysLeft === 0
              ? `linear-gradient(135deg, ${withAlpha(DT.yellow, 0.1)}, ${withAlpha(DT.yellow, 0.03)})`
              : `linear-gradient(135deg, ${withAlpha(DT.blue, 0.06)}, ${withAlpha(DT.blue, 0.02)})`,
            border: `1px solid ${nextDefense.daysLeft === 0 ? withAlpha(DT.yellow, 0.2) : withAlpha(DT.blue, 0.12)}`,
          }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
              background: nextDefense.daysLeft === 0 ? withAlpha(DT.yellow, 0.12) : withAlpha(DT.blue, 0.1),
              color: nextDefense.daysLeft === 0 ? DT.yellow : DT.blue,
            }}>
              <Zap size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: nextDefense.daysLeft === 0 ? DT.yellow : DT.textPri }}>
                  {nextDefense.daysLeft === 0 ? "Defense Happening Today!" : `Next Defense in ${nextDefense.daysLeft} day${nextDefense.daysLeft !== 1 ? "s" : ""}`}
                </span>
                <DefenseStatusBadge status={nextDefense.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3" style={{ fontSize: 13, color: DT.textSec }}>
                <span className="font-semibold">{nextDefense.group}{nextDefense.title ? ` — ${nextDefense.title}` : ""}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(nextDefense.time)}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {nextDefense.room || "TBD"}</span>
                {nextDefense.panelistNames.length > 0 && (
                  <span className="flex items-center gap-1"><ShieldCheck size={12} /> {nextDefense.panelistNames.length} panelists</span>
                )}
              </div>
            </div>
            {nextDefense.groupData?.members && nextDefense.groupData.members.length > 0 && (
              <MemberAvatars members={nextDefense.groupData.members} max={5} />
            )}
          </div>
        </Fade>
      )}

      {/* Summary */}
      <Fade delay={60}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: <Calendar size={18} />, value: slots.length, label: "Total", accent: DT.textSec },
            { icon: <Clock size={18} />, value: scheduled, label: "Scheduled", accent: DT.blue },
            { icon: <Zap size={18} />, value: inProgress + pending, label: "Pending", accent: DT.warning },
            { icon: <CheckCircle2 size={18} />, value: completed, label: "Completed", accent: DT.success },
            { icon: <BarChart3 size={18} />, value: totalGrades, label: "Grades", accent: DT.purple },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: withAlpha(c.accent, 0.08), color: c.accent }}>
                {c.icon}
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: FT.h, color: DT.textPri }}>{c.value}</p>
                <p style={{ fontSize: 11, color: DT.textTer }}>{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Fade>

      {/* Filter */}
      <Fade delay={100}>
        <div className="rounded-xl p-3.5 flex flex-wrap items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DT.textTer }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search groups, panelists, advisers..."
              className="w-full pl-9 pr-4 py-2 rounded-lg transition" style={{ ...inputStyle, padding: "8px 12px 8px 36px" }}
              onFocus={e => { e.currentTarget.style.borderColor = DT.blue; }}
              onBlur={e => { e.currentTarget.style.borderColor = DT.borderDef; }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} style={{ color: DT.textTer }} />
            {["", "Scheduled", "Pending", "In Progress", "Completed", "Cancelled"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-2.5 py-1.5 rounded-lg transition cursor-pointer text-nowrap"
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: statusFilter === s ? DT.blue : DT.textTer,
                  background: statusFilter === s ? withAlpha(DT.blue, 0.08) : "transparent",
                  border: `1px solid ${statusFilter === s ? withAlpha(DT.blue, 0.15) : "transparent"}`,
                }}>
                {s || "All"}
              </button>
            ))}
          </div>
        </div>
      </Fade>

      {/* Day Groups */}
      {Object.entries(dateGroups).map(([date, daySlots], i) => (
        <Fade key={date} delay={140 + i * 50}>
          <DayGroup date={date} slots={daySlots} gradeMap={gradeMap}
            onEdit={openEditModal} onDelete={id => setDeleteId(id)} />
        </Fade>
      ))}

      {Object.keys(dateGroups).length === 0 && (
        <Fade delay={140}>
          <div className="rounded-2xl p-12 text-center" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{
              background: withAlpha(DT.yellow, 0.08), border: `1px solid ${withAlpha(DT.yellow, 0.15)}`,
            }}>
              <Calendar size={28} style={{ color: DT.yellow }} />
            </div>
            <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri, marginBottom: 4 }}>
              {statusFilter || search ? "No defenses match your filters" : "No Defense Sessions Yet"}
            </h3>
            <p style={{ fontSize: 13, color: DT.textTer, maxWidth: 400, margin: "0 auto" }}>
              {statusFilter || search
                ? "Try adjusting your search or filter criteria."
                : "Schedule your first defense to get started. Groups and panelists will be notified automatically."}
            </p>
            {!statusFilter && !search && (
              <button onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
                style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 13, fontWeight: 700 }}>
                <Plus size={14} /> Schedule Your First Defense
              </button>
            )}
          </div>
        </Fade>
      )}

      {/* Modals */}
      <DefenseModal
        show={showModal} editSlot={editSlot}
        groups={allGroups} onClose={() => { setShowModal(false); setEditSlot(null); }}
        onSaved={() => fetchData(true)}
      />
      <DeleteConfirmModal
        show={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </PageShell>
  );
}
