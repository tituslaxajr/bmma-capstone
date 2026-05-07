import { apiFetch } from "../lib/supabase";
import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Save,
  Loader2, Users, Search, Inbox, UserPlus, ChevronDown, RefreshCw,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { toast } from "sonner";
import { AvatarCircle } from "./AvatarCircle";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut, PageSpinner } from "./ui/shared-ui";
import { PageShell } from "./PageShell";

/* ─── Types ─── */
interface PanelSlot { role: string; name: string; initials: string; }
interface GroupAssignment {
  id: number; number: number; name: string; title: string; type: string;
  slots: PanelSlot[]; required: number;
}
interface PanelistUser { name: string; initials: string; avatarUrl?: string; }

function userHasRole(user: any, role: "panelist" | "adviser") {
  const roles = [user.role, ...(user.secondaryRoles || [])].map((r: string) => r?.toLowerCase());
  return roles.includes(role);
}

/* ─── Helpers ─── */

function getAssigned(g: GroupAssignment) { return g.slots.filter((s) => s.name).length; }
function getMissing(g: GroupAssignment) { return g.required - getAssigned(g); }

type StatusKey = "complete" | "partial" | "unassigned";
function statusKey(g: GroupAssignment): StatusKey {
  const m = getMissing(g);
  if (m === 0) return "complete";
  if (m === g.required) return "unassigned";
  return "partial";
}

const STATUS_CONFIG: Record<StatusKey, { text: string; color: string; bg: string; border: string; icon: ReactNode }> = {
  complete: { text: "Complete", color: DT.success, bg: DT.successDim, border: "rgba(74,222,128,0.20)", icon: <CheckCircle2 size={12} /> },
  partial: { text: "Partial", color: DT.warning, bg: DT.warningDim, border: "rgba(251,191,36,0.20)", icon: <AlertTriangle size={12} /> },
  unassigned: { text: "Unassigned", color: DT.red, bg: DT.redDim, border: "rgba(248,113,113,0.20)", icon: <XCircle size={12} /> },
};

const SLOT_ROLES = ["Lead Panelist", "Panel Member 1", "Panel Member 2"];
const SLOT_LABELS = ["Lead", "Member 1", "Member 2"];

/* ─── Filter Tabs ─── */
type FilterTab = "all" | "unassigned" | "partial" | "complete";
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "partial", label: "Partial" },
  { key: "complete", label: "Complete" },
];

/* ─── Main Export ─── */
export function PanelistAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [panelists, setPanelists] = useState<PanelistUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  /* Compute panelist loads dynamically */
  const panelistLoads: Record<string, number> = {};
  for (const g of assignments) {
    for (const s of g.slots) {
      if (s.name) panelistLoads[s.name] = (panelistLoads[s.name] || 0) + 1;
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        apiFetch<{ groups: any[] }>("/groups"),
        apiFetch<{ users: any[] }>("/users"),
      ]);

      const groups = (groupsRes.groups || []).map((g: any) => {
        const existingPanel = g.panelists || [];
        const slots: PanelSlot[] = SLOT_ROLES.map((role, i) => ({
          role,
          name: existingPanel[i]?.name || "",
          initials: existingPanel[i]?.initials || "",
        }));
        return {
          id: g.id, number: g.number ?? g.id,
          name: g.name || `Group ${g.number ?? g.id}`,
          title: g.title || "Untitled Project",
          type: g.type || "", slots, required: 3,
        } as GroupAssignment;
      }).sort((a: GroupAssignment, b: GroupAssignment) => a.number - b.number);

      setAssignments(groups);
      if (groups.length > 0 && !selected) {
        const incomplete = groups.find((g: GroupAssignment) => getMissing(g) > 0);
        setSelected(incomplete?.id ?? groups[0].id);
      }

      const panelistUsers: PanelistUser[] = (usersRes.users || [])
        .filter((u: any) => userHasRole(u, "panelist") || userHasRole(u, "adviser"))
        .map((u: any) => ({
          name: u.name,
          initials: u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          avatarUrl: u.avatarUrl || null,
        }));
      setPanelists(panelistUsers);
    } catch (err) { console.error("Failed to fetch assignment data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateSlot = (groupId: number, slotIdx: number, name: string) => {
    const panelist = panelists.find(p => p.name === name);
    setAssignments((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, slots: g.slots.map((s, i) => i === slotIdx ? { ...s, name, initials: panelist?.initials || name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() } : s) }
        : g
    ));
  };

  const handleSave = async (groupId: number) => {
    const group = assignments.find(g => g.id === groupId);
    if (!group) return;
    setSaving(groupId);
    try {
      const panelistsPayload = group.slots
        .filter(s => s.name)
        .map((s) => ({ name: s.name, initials: s.initials, role: s.role }));
      console.log(`[PanelistAssignment] Saving group ${groupId} panelists:`, panelistsPayload);
      const res = await apiFetch<{ group: any }>(`/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ panelists: panelistsPayload }),
      });
      console.log(`[PanelistAssignment] Save response:`, res);
      toast.success(`Panel saved for Group ${group.number}`);
      // Refresh data to confirm persistence
      await fetchData();
    } catch (err: any) {
      console.error("[PanelistAssignment] Save failed:", err);
      toast.error(err.message || "Failed to save assignments");
    } finally { setSaving(null); }
  };

  /* Filter + search */
  const filtered = assignments
    .filter(g => {
      if (filter === "all") return true;
      return statusKey(g) === filter;
    })
    .filter(g => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q) || `group ${g.number}`.includes(q);
    })
    .sort((a, b) => getMissing(b) - getMissing(a));

  const activeGroup = assignments.find((g) => g.id === selected) || null;

  /* Stats */
  const totalGroups = assignments.length;
  const completeGroups = assignments.filter(g => statusKey(g) === "complete").length;
  const partialGroups = assignments.filter(g => statusKey(g) === "partial").length;
  const unassignedGroups = assignments.filter(g => statusKey(g) === "unassigned").length;

  /* Stats with filter */
  const stats = [
    { key: "all" as FilterTab, label: "Total", value: totalGroups, color: DT.blue, bg: DT.blueDim },
    { key: "complete" as FilterTab, label: "Complete", value: completeGroups, color: DT.success, bg: DT.successDim },
    { key: "partial" as FilterTab, label: "Partial", value: partialGroups, color: DT.warning, bg: DT.warningDim },
    { key: "unassigned" as FilterTab, label: "Unassigned", value: unassignedGroups, color: DT.red, bg: DT.redDim },
  ];

  if (loading) {
    return <PageSpinner label="Loading assignments..." />;
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto text-center py-20" style={{ fontFamily: FT.b }}>
        <Inbox size={48} style={{ color: DT.textDis, margin: "0 auto 16px" }} />
        <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>No Groups Yet</h2>
        <p style={{ fontSize: 14, color: DT.textTer, marginTop: 4 }}>Create groups in the Groups & Teams page before assigning panelists.</p>
      </div>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
            Panel Assignments
          </h1>
          <p className="mt-1" style={{ fontSize: 13, color: DT.textSec }}>
            Assign defense panelists to capstone groups
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04] self-start"
          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats — clickable to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const isActive = filter === s.key;
          return (
            <button key={s.key} onClick={() => setFilter(f => f === s.key ? "all" : s.key)}
              className="rounded-xl p-3.5 flex items-center gap-3 text-left transition cursor-pointer"
              style={{
                background: isActive ? s.bg : `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
                border: `1px solid ${isActive ? withAlpha(s.color, 0.2) : DT.borderSub}`,
                boxShadow: isActive ? `0 0 16px ${withAlpha(s.color, 0.07)}` : DT.shadowSm,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.bg, color: s.color }}>
                <Users size={16} />
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: FT.h, color: DT.textPri, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: isActive ? s.color : DT.textTer, fontWeight: isActive ? 600 : 400, marginTop: 2 }}>{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main content — two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

        {/* LEFT — Group list */}
        <div className="space-y-3">
          {/* Search + filter row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: DT.textTer }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..."
                className="w-full pl-9 pr-3 py-2 rounded-xl transition"
                style={{ ...inputStyle, border: `1px solid ${DT.borderDef}`, fontSize: 12 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${DT.blueDim}`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = DT.borderDef; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <span style={{ fontSize: 12, color: DT.textTer }}>{filtered.length} group{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Group rows */}
          <div className="space-y-2">
            {filtered.map((g) => {
              const sk = statusKey(g);
              const sc = STATUS_CONFIG[sk];
              const assigned = getAssigned(g);
              const isActive = selected === g.id;

              return (
                <button key={g.id} onClick={() => setSelected(g.id)}
                  className="w-full text-left rounded-xl p-4 transition cursor-pointer group"
                  style={{
                    background: isActive
                      ? `linear-gradient(145deg, ${DT.elevated}, ${DT.surface})`
                      : `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
                    border: `1.5px solid ${isActive ? withAlpha(DT.yellow, 0.27) : DT.borderSub}`,
                    boxShadow: isActive ? `0 0 20px rgba(255,209,0,0.06)` : DT.shadowSm,
                  }}>
                  <div className="flex items-center gap-3">
                    {/* Group number badge */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isActive ? DT.yellow : DT.yellowDim,
                        color: isActive ? DT.base : DT.yellow,
                        fontFamily: FT.h, fontSize: 13, fontWeight: 800,
                      }}>
                      {g.number}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>
                          {g.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {/* Assigned panelist avatars */}
                        <div className="flex items-center -space-x-1.5">
                          {g.slots.filter(s => s.name).map((s, i) => (
                            <AvatarCircle key={`${s.name}-${i}`} name={s.name} size={22} idx={i} />
                          ))}
                          {assigned === 0 && (
                            <span style={{ fontSize: 11, color: DT.textDis }}>No panelists</span>
                          )}
                        </div>
                        {assigned > 0 && (
                          <span style={{ fontSize: 11, color: DT.textTer }}>
                            {assigned}/{g.required}
                          </span>
                        )}
                        {/* Status badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ml-auto shrink-0"
                          style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                          {sc.icon}
                          <span className="hidden sm:inline">{sk === "partial" ? `${getMissing(g)} left` : sc.text}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${DT.borderDef}` }}>
                <Search size={24} style={{ color: DT.textDis, margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: DT.textTer }}>No groups match your criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Assignment editor panel */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-2xl overflow-hidden" style={{
            background: `linear-gradient(180deg, ${DT.elevated} 0%, ${DT.raised} 100%)`,
            border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowMd,
          }}>
            {activeGroup ? (
              <>
                {/* Panel header */}
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: DT.yellow, fontFamily: FT.h, fontSize: 13, fontWeight: 800, color: DT.base }}>
                      {activeGroup.number}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
                        {activeGroup.title}
                      </h2>
                      {activeGroup.type && (
                        <span style={{ fontSize: 11, color: DT.textTer }}>{activeGroup.type}</span>
                      )}
                    </div>
                  </div>
                  {/* Mini progress */}
                  <div className="flex items-center gap-2 mt-3">
                    {[0, 1, 2].map(i => {
                      const filled = !!activeGroup.slots[i]?.name;
                      return (
                        <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{
                          background: filled
                            ? `linear-gradient(90deg, ${DT.success}, rgba(74,222,128,0.6))`
                            : "rgba(255,255,255,0.06)",
                        }} />
                      );
                    })}
                    <span style={{ fontSize: 10, fontWeight: 600, color: DT.textTer, marginLeft: 4 }}>
                      {getAssigned(activeGroup)}/{activeGroup.required}
                    </span>
                  </div>
                </div>

                {/* Slot assignments */}
                <div className="px-5 py-4 space-y-3">
                  {activeGroup.slots.map((slot, idx) => {
                    const isEmpty = !slot.name;
                    const othersInGroup = activeGroup.slots.filter((_, i) => i !== idx && activeGroup.slots[i].name).map(s => s.name);
                    const availableForSlot = panelists.filter(p => !othersInGroup.includes(p.name));
                    const load = slot.name ? (panelistLoads[slot.name] || 0) : 0;
                    const isHeavy = load >= 4;

                    return (
                      <div key={idx} className="rounded-xl p-3 transition" style={{
                        background: isEmpty ? "rgba(248,113,113,0.03)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isEmpty ? "rgba(248,113,113,0.15)" : DT.borderHair}`,
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{
                              background: idx === 0 ? DT.yellowDim : DT.blueDim,
                              color: idx === 0 ? DT.yellow : DT.blue,
                              fontSize: 9, fontWeight: 700,
                            }}>
                              {idx === 0 ? "L" : idx}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>{SLOT_LABELS[idx]}</span>
                          </div>
                          {isEmpty && (
                            <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: DT.redDim, color: DT.red }}>
                              REQUIRED
                            </span>
                          )}
                          {slot.name && isHeavy && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: DT.warningDim, color: DT.warning }}>
                              <AlertTriangle size={9} /> {load} groups
                            </span>
                          )}
                          {slot.name && !isHeavy && (
                            <span style={{ fontSize: 10, color: DT.textDis }}>{load} group{load !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <div className="relative">
                          <select value={slot.name} onChange={(e) => updateSlot(activeGroup.id, idx, e.target.value)}
                            className="cursor-pointer"
                            style={{
                              ...inputStyle,
                              padding: "9px 32px 9px 12px",
                              appearance: "none",
                              border: `1px solid ${isEmpty ? "rgba(248,113,113,0.25)" : DT.borderDef}`,
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${DT.blueDim}`; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = isEmpty ? "rgba(248,113,113,0.25)" : DT.borderDef; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            <option value="">{isEmpty ? "Select panelist..." : "Remove panelist"}</option>
                            {availableForSlot.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name} ({panelistLoads[p.name] || 0} groups)
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: DT.textTer }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Panelist pool */}
                {panelists.length > 0 && (
                  <div className="px-5 pb-3">
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                      <p className="mb-2" style={{ fontSize: 10, fontWeight: 600, color: DT.textTer, letterSpacing: "0.04em" }}>
                        AVAILABLE PANELISTS
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {panelists.map((p, i) => {
                          const load = panelistLoads[p.name] || 0;
                          const isUsedHere = activeGroup.slots.some(s => s.name === p.name);
                          const isHeavy = load >= 4;
                          return (
                            <div key={p.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                              style={{
                                background: isUsedHere ? DT.blueDim : "rgba(255,255,255,0.03)",
                                border: `1px solid ${isUsedHere ? "rgba(77,143,255,0.20)" : DT.borderHair}`,
                                opacity: isUsedHere ? 1 : 0.75,
                              }}>
                              <AvatarCircle name={p.name} size={18} idx={i} />
                              <span style={{ fontSize: 10, fontWeight: 500, color: isUsedHere ? DT.blue : DT.textSec }}>
                                {p.name.split(" ")[0]}
                              </span>
                              <span className="px-1 py-px rounded" style={{
                                fontSize: 8, fontWeight: 700,
                                background: isHeavy ? DT.warningDim : "rgba(255,255,255,0.05)",
                                color: isHeavy ? DT.warning : DT.textDis,
                              }}>
                                {load}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* No panelists warning */}
                {panelists.length === 0 && (
                  <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: DT.redDim, border: `1px solid rgba(248,113,113,0.15)` }}>
                    <AlertTriangle size={14} style={{ color: DT.red }} className="shrink-0" />
                    <span style={{ fontSize: 11, color: DT.red, lineHeight: 1.3 }}>
                      No panelist accounts found. Add users with "Panelist" role first.
                    </span>
                  </div>
                )}

                {/* Save button */}
                <div className="px-5 pb-5">
                  <button onClick={() => handleSave(activeGroup.id)} disabled={saving === activeGroup.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50"
                    style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 13, fontWeight: 700, boxShadow: DT.shadowSm }}>
                    {saving === activeGroup.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving === activeGroup.id ? "Saving..." : "Save Panel"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: DT.blueDim }}>
                  <UserPlus size={24} style={{ color: DT.blue }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>Select a Group</p>
                <p className="mt-1 text-center" style={{ fontSize: 12, color: DT.textTer }}>
                  Click on a group from the list to assign panelists
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
