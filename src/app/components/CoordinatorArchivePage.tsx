import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, CheckCircle2, Clock, Square, AlertCircle, Star,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Send,
  Eye, Loader2, Inbox, Archive, Users, ClipboardList, Shield,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut, PageSpinner } from "./ui/shared-ui";
import { PageShell } from "./PageShell";

type CellStatus = "done" | "pending" | "empty" | "locked";
function CellIcon({ s }: { s: CellStatus }) {
  if (s === "done") return <CheckCircle2 size={16} style={{ color: DT.success }} />;
  if (s === "pending") return <Clock size={16} style={{ color: DT.warning }} />;
  if (s === "locked") return <Square size={14} style={{ color: DT.textDis, opacity: 0.4 }} />;
  return <Square size={14} style={{ color: DT.textDis }} />;
}

type GroupStatus = "Complete" | "In Progress" | "Not Started" | "Locked";
function RowStatusBadge({ status }: { status: GroupStatus }) {
  const m: Record<GroupStatus, { c: string; bg: string; b: string }> = {
    Complete: { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)" },
    "In Progress": { c: DT.warning, bg: DT.warningDim, b: "rgba(251,191,36,0.15)" },
    "Not Started": { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
    Locked: { c: DT.textDis, bg: "rgba(255,255,255,0.02)", b: "rgba(255,255,255,0.06)" },
  };
  const s = m[status] || m["Not Started"];
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{status}</span>;
}

const ARCHIVE_ITEMS = [
  { id: 1, label: "REV", fullLabel: "Revisions" },
  { id: 2, label: "APPR", fullLabel: "Approval Sheet" },
  { id: 3, label: "MANU", fullLabel: "Final Manuscript" },
  { id: 4, label: "HARD", fullLabel: "Hardbound Copy" },
  { id: 5, label: "SOFT", fullLabel: "Soft Copy" },
  { id: 6, label: "PEER", fullLabel: "Peer Evaluation" },
];

function getArchiveStatus(items: any, id: number, peerEvalCount: number, defenseUnlocked: boolean): CellStatus {
  if (!defenseUnlocked) return "locked";
  if (id === 6) return peerEvalCount > 0 ? "done" : "empty";
  if (items?.[id]?.status === "complete") return "done";
  return "empty";
}

function computeGroupStatus(items: any, peerEvalCount: number, defenseUnlocked: boolean): GroupStatus {
  if (!defenseUnlocked) return "Locked";
  const statuses = ARCHIVE_ITEMS.map(a => getArchiveStatus(items, a.id, peerEvalCount, defenseUnlocked));
  if (statuses.every(s => s === "done")) return "Complete";
  if (statuses.some(s => s === "done")) return "In Progress";
  return "Not Started";
}

/* ═══════════════════════════════════════════
   TAB 1: Archive Checklist Table
   ═══════════════════════════════════════════ */
function ArchiveChecklistTab({ data }: { data: any[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const entries = data.map(d => {
    const gn = d.groupNumber;
    const items = d.archive?.items || {};
    const status = computeGroupStatus(items, d.peerEvalCount, d.defenseUnlocked);
    const cellStatuses = ARCHIVE_ITEMS.map(a => getArchiveStatus(items, a.id, d.peerEvalCount, d.defenseUnlocked));
    const doneCount = cellStatuses.filter(s => s === "done").length;
    return { ...d, status, cellStatuses, doneCount };
  });

  let filtered = [...entries];
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.group.name?.toLowerCase().includes(q) || e.group.title?.toLowerCase().includes(q) || `group ${e.groupNumber}`.includes(q));
  }
  if (statusFilter) filtered = filtered.filter(e => e.status === statusFilter);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const complete = entries.filter(e => e.status === "Complete").length;
  const inProgress = entries.filter(e => e.status === "In Progress").length;
  const locked = entries.filter(e => e.status === "Locked").length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <CheckCircle2 size={20} />, value: complete, label: "Complete", accent: DT.success },
          { icon: <Clock size={20} />, value: inProgress, label: "In Progress", accent: DT.warning },
          { icon: <Square size={20} />, value: locked, label: "Locked (No Defense)", accent: DT.textDis },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 flex items-center gap-4" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withAlpha(c.accent, 0.08), color: c.accent }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: DT.textPri, fontFamily: FT.h }}>{c.value}</p>
              <p style={{ fontSize: 12, color: DT.textTer }}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DT.textTer }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search groups..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg transition" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg transition cursor-pointer" style={inputStyle as any}>
          <option value="">All Status</option>
          <option value="Complete">Complete</option>
          <option value="In Progress">In Progress</option>
          <option value="Locked">Locked</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="text-left px-5 py-3" style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>GROUP</th>
                {ARCHIVE_ITEMS.map(a => (
                  <th key={a.id} className="text-center px-3 py-3" title={a.fullLabel}
                    style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>{a.label}</th>
                ))}
                <th className="text-center px-4 py-3" style={{ fontWeight: 600, fontSize: 11, color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>PROGRESS</th>
                <th className="text-center px-4 py-3" style={{ fontWeight: 600, fontSize: 11, color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(e => (
                <tr key={e.groupNumber} className="transition hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                  <td className="px-5 py-3">
                    <div style={{ fontWeight: 600, fontSize: 13, color: DT.textPri }}>Group {e.groupNumber}: {e.group.name}</div>
                    <div className="truncate max-w-[200px]" style={{ fontSize: 11, color: DT.textTer }}>{e.group.title}</div>
                  </td>
                  {e.cellStatuses.map((cs: CellStatus, i: number) => (
                    <td key={i} className="px-3 py-3 text-center"><CellIcon s={cs} /></td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: e.doneCount === 6 ? DT.success : e.doneCount > 0 ? DT.warning : DT.textDis }}>
                      {e.doneCount}/{ARCHIVE_ITEMS.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center"><RowStatusBadge status={e.status} /></td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={ARCHIVE_ITEMS.length + 3} className="text-center py-12" style={{ fontSize: 14, color: DT.textTer }}>No groups match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <span style={{ fontSize: 12, color: DT.textTer }}>Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg transition cursor-pointer disabled:opacity-30 hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg transition cursor-pointer"
                style={{ fontSize: 12, fontWeight: 600, background: p === page ? DT.blue : "transparent", color: p === page ? "white" : DT.textTer }}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg transition cursor-pointer disabled:opacity-30 hover:bg-white/[0.05]" style={{ color: DT.textTer }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 2: Peer Evaluation Results
   ═══════════════════════════════════════════ */
const CRITERIA = [
  { key: "cooperation", label: "Cooperation" },
  { key: "quality", label: "Quality" },
  { key: "timeliness", label: "Timeliness" },
  { key: "communication", label: "Communication" },
];

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={12} fill={value >= n ? DT.yellow : "transparent"} stroke={value >= n ? DT.yellow : "rgba(255,255,255,0.12)"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function PeerEvalResultsTab({ data }: { data: any[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const groupsWithEvals = data.filter(d => d.peerEvalCount > 0);
  const groupsWithoutEvals = data.filter(d => d.peerEvalCount === 0);
  const totalEvals = data.reduce((s, d) => s + d.peerEvalCount, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim, color: DT.blue }}><ClipboardList size={20} /></div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: DT.textPri, fontFamily: FT.h }}>{totalEvals}</p>
            <p style={{ fontSize: 12, color: DT.textTer }}>Total Evaluations</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.successDim, color: DT.success }}><Users size={20} /></div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: DT.textPri, fontFamily: FT.h }}>{groupsWithEvals.length}</p>
            <p style={{ fontSize: 12, color: DT.textTer }}>Groups with Evals</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.warningDim, color: DT.warning }}><Clock size={20} /></div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: DT.textPri, fontFamily: FT.h }}>{groupsWithoutEvals.length}</p>
            <p style={{ fontSize: 12, color: DT.textTer }}>Groups Pending</p>
          </div>
        </div>
      </div>

      {groupsWithEvals.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <Inbox size={40} style={{ color: DT.textDis, margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>No Peer Evaluations Submitted Yet</p>
          <p style={{ fontSize: 13, color: DT.textTer, marginTop: 4 }}>Evaluations will appear here after students submit them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(d => {
            const gn = d.groupNumber;
            const isExpanded = expandedGroup === gn;
            const evals = d.peerEvals || [];
            const members = (d.group.members || []).map((m: any) => m.name);

            return (
              <div key={gn} className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
                <button onClick={() => setExpandedGroup(isExpanded ? null : gn)}
                  className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer transition hover:bg-white/[0.02]">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{
                    background: evals.length > 0 ? DT.blueDim : "rgba(255,255,255,0.04)",
                  }}>
                    <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: evals.length > 0 ? DT.blue : DT.textDis }}>{gn}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>{d.group.name}</div>
                    <div style={{ fontSize: 11, color: DT.textTer }}>{members.length} members · {evals.length} evaluation{evals.length !== 1 ? "s" : ""} submitted</div>
                  </div>
                  {evals.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 10, fontWeight: 600, color: DT.success, background: DT.successDim }}>
                      {evals.length}/{members.length} submitted
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 10, fontWeight: 600, color: DT.textDis, background: "rgba(255,255,255,0.04)" }}>
                      No submissions
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={16} style={{ color: DT.textTer }} /> : <ChevronDown size={16} style={{ color: DT.textTer }} />}
                </button>

                {isExpanded && evals.length > 0 && (
                  <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                    {evals.map((pe: any, idx: number) => (
                      <div key={idx} className="rounded-xl p-4 mt-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: DT.blue, fontSize: 8, fontWeight: 700, color: "white" }}>
                            {pe.evaluatorName?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{pe.evaluatorName}</span>
                          <span style={{ fontSize: 10, color: DT.textTer }}>submitted {pe.submittedAt ? new Date(pe.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                        </div>

                        {/* Per-member evaluations from this evaluator */}
                        <div className="overflow-x-auto">
                          <table className="w-full" style={{ fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th className="text-left py-1.5 pr-3" style={{ color: DT.textTer, fontWeight: 600, fontSize: 10 }}>MEMBER</th>
                                {CRITERIA.map(c => (
                                  <th key={c.key} className="text-center py-1.5 px-2" style={{ color: DT.textTer, fontWeight: 600, fontSize: 10 }}>{c.label.toUpperCase()}</th>
                                ))}
                                <th className="text-center py-1.5 px-2" style={{ color: DT.yellow, fontWeight: 700, fontSize: 10 }}>AVG</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(pe.evaluations || {}).map(([memberName, scores]: [string, any]) => {
                                const avg = (scores.cooperation + scores.quality + scores.timeliness + scores.communication) / 4;
                                return (
                                  <tr key={memberName} style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                                    <td className="py-2 pr-3" style={{ fontWeight: 500, color: DT.textPri }}>{memberName}</td>
                                    {CRITERIA.map(c => (
                                      <td key={c.key} className="text-center py-2 px-2">
                                        <StarDisplay value={scores[c.key] || 0} />
                                      </td>
                                    ))}
                                    <td className="text-center py-2 px-2">
                                      <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: avg >= 4 ? DT.success : avg >= 3 ? DT.blue : avg >= 2 ? DT.warning : DT.red }}>
                                        {avg.toFixed(1)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Comments */}
                        {Object.entries(pe.evaluations || {}).some(([_, s]: [string, any]) => s.comment) && (
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                            <p style={{ fontSize: 10, fontWeight: 600, color: DT.textTer, marginBottom: 4 }}>COMMENTS</p>
                            {Object.entries(pe.evaluations || {}).filter(([_, s]: [string, any]) => s.comment).map(([name, s]: [string, any]) => (
                              <div key={name} className="flex gap-2 py-1">
                                <span style={{ fontSize: 11, fontWeight: 600, color: DT.textSec, minWidth: 80 }}>{name}:</span>
                                <span style={{ fontSize: 11, color: DT.textTer, fontStyle: "italic" }}>"{s.comment}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Aggregate summary per member */}
                    {evals.length >= 2 && (() => {
                      const memberAggs: Record<string, { cooperation: number[]; quality: number[]; timeliness: number[]; communication: number[] }> = {};
                      for (const pe of evals) {
                        for (const [name, scores] of Object.entries(pe.evaluations || {})) {
                          if (!memberAggs[name]) memberAggs[name] = { cooperation: [], quality: [], timeliness: [], communication: [] };
                          const s = scores as any;
                          memberAggs[name].cooperation.push(s.cooperation || 0);
                          memberAggs[name].quality.push(s.quality || 0);
                          memberAggs[name].timeliness.push(s.timeliness || 0);
                          memberAggs[name].communication.push(s.communication || 0);
                        }
                      }
                      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

                      return (
                        <div className="rounded-xl p-4" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.12)` }}>
                          <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, color: DT.blue }}>AGGREGATED PEER SCORES ({evals.length} evaluators)</p>
                          <div className="overflow-x-auto">
                            <table className="w-full" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th className="text-left py-1.5 pr-3" style={{ color: DT.textTer, fontWeight: 600, fontSize: 10 }}>MEMBER</th>
                                  {CRITERIA.map(c => (
                                    <th key={c.key} className="text-center py-1.5 px-2" style={{ color: DT.textTer, fontWeight: 600, fontSize: 10 }}>{c.label.toUpperCase()}</th>
                                  ))}
                                  <th className="text-center py-1.5 px-2" style={{ color: DT.yellow, fontWeight: 700, fontSize: 10 }}>OVERALL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(memberAggs).map(([name, aggs]) => {
                                  const cAvg = avg(aggs.cooperation);
                                  const qAvg = avg(aggs.quality);
                                  const tAvg = avg(aggs.timeliness);
                                  const cmAvg = avg(aggs.communication);
                                  const overall = (cAvg + qAvg + tAvg + cmAvg) / 4;
                                  return (
                                    <tr key={name} style={{ borderTop: `1px solid rgba(77,143,255,0.08)` }}>
                                      <td className="py-2 pr-3" style={{ fontWeight: 600, color: DT.textPri }}>{name}</td>
                                      <td className="text-center py-2 px-2" style={{ color: DT.textSec }}>{cAvg.toFixed(1)}</td>
                                      <td className="text-center py-2 px-2" style={{ color: DT.textSec }}>{qAvg.toFixed(1)}</td>
                                      <td className="text-center py-2 px-2" style={{ color: DT.textSec }}>{tAvg.toFixed(1)}</td>
                                      <td className="text-center py-2 px-2" style={{ color: DT.textSec }}>{cmAvg.toFixed(1)}</td>
                                      <td className="text-center py-2 px-2">
                                        <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: overall >= 4 ? DT.success : overall >= 3 ? DT.blue : DT.warning }}>
                                          {overall.toFixed(1)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isExpanded && evals.length === 0 && (
                  <div className="px-5 pb-5 pt-3 text-center" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                    <p style={{ fontSize: 13, color: DT.textTer }}>No peer evaluations submitted for this group yet.</p>
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

/* ═══ Main Export ═══ */
export function CoordinatorArchivePage() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/archive/all");
      setData(res.data || []);
    } catch (err) { console.error("Failed to fetch archive data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs = [
    { label: "Archive Checklist", icon: <Archive size={16} />, color: DT.blue },
    { label: "Peer Evaluation Results", icon: <ClipboardList size={16} />, color: DT.yellow },
  ];

  if (loading) {
    return <PageSpinner label="Loading archive data..." />;
  }

  return (
    <PageShell>
      <Fade delay={0}>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Archive & Records</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Track post-defense completion status and peer evaluation results for all groups</p>
      </Fade>

      {/* Tab bar */}
      <Fade delay={40}>
        <div className="flex gap-2">
          {tabs.map((t, i) => (
            <button key={t.label} onClick={() => setTab(i)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer"
              style={{
                fontSize: 13, fontWeight: tab === i ? 700 : 500, fontFamily: tab === i ? FT.h : FT.b,
                background: tab === i ? withAlpha(t.color, 0.07) : "transparent",
                border: `2px solid ${tab === i ? withAlpha(t.color, 0.18) : DT.borderDef}`,
                color: tab === i ? t.color : DT.textTer,
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </Fade>

      <Fade delay={80}>
        {tab === 0 && <ArchiveChecklistTab data={data} />}
        {tab === 1 && <PeerEvalResultsTab data={data} />}
      </Fade>
    </PageShell>
  );
}