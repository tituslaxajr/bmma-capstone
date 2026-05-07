import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Loader2, Inbox, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Lock, Eye, BarChart3, BookOpen, ClipboardList, Clock,
  XCircle, Shield,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { useInView, Fade, cardBg } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { GradePDFExporter } from "./GradePDFExporter";

/* ═══ Helpers ═══ */

const cardStyle: CSSProperties = {
  background: cardBg,
  border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, borderRadius: 16,
};

function verdictColor(v: string) {
  if (v === "Pass") return DT.success;
  if (v?.includes("Minor")) return DT.blue;
  if (v?.includes("Major")) return DT.warning;
  return DT.error;
}

function GradeBar({ pct, color }: { pct: number; color: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
        width: visible ? `${Math.min(pct, 100)}%` : "0%", background: color,
        boxShadow: `0 0 8px ${withAlpha(color, 0.25)}`,
      }} />
    </div>
  );
}

/* ═══ Main Export ═══ */
export function PanelistGradeAggregatorPage() {
  const [loading, setLoading] = useState(true);
  const [aggregates, setAggregates] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<{ aggregates: any[] }>("/final-grades/aggregated");
      setAggregates(res.aggregates || []);
    } catch (err) { console.error("Failed to fetch aggregated grades:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const releasedCount = aggregates.filter(a => a.released).length;
  const pendingCount = aggregates.filter(a => !a.released).length;

  /* Build PDF-ready records from released aggregates */
  const pdfGrades = aggregates.filter(a => a.released).map(a => ({
    groupNumber: a.groupNumber,
    groupTitle: a.groupTitle || a.groupName || `Group ${a.groupNumber}`,
    members: a.members || [],
    groupScore: 0,
    groupPct: 0,
    individualAvg: 0,
    overallGrade: a.members?.length
      ? (a.members as string[]).reduce((sum: number, n: string) => sum + (a.memberFinalGrades?.[n]?.finalRaw || 0), 0) / a.members.length
      : 0,
    verdict: a.verdict || "pending",
    panelists: a.panelistNames || [],
    feedback: "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14 }}>Loading grade aggregator...</span>
      </div>
    );
  }

  return (
    <PageShell className="max-w-[1280px] mx-auto space-y-6">
      {/* Header */}
      <Fade>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
              Grade Aggregator
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
              Aggregated final grades for groups you evaluated. Released grades show full composite breakdowns.
            </p>
          </div>
          {pdfGrades.length > 0 && <GradePDFExporter grades={pdfGrades} title="Lead Panelist — Defense Grade Report" />}
        </div>
      </Fade>

      {/* Summary cards */}
      <Fade delay={60}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim }}>
              <BarChart3 size={18} style={{ color: DT.blue }} />
            </div>
            <div>
              <div style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: DT.textPri }}>{aggregates.length}</div>
              <div style={{ fontSize: 11, color: DT.textTer }}>Groups Graded</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.successDim }}>
              <Eye size={18} style={{ color: DT.success }} />
            </div>
            <div>
              <div style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: DT.success }}>{releasedCount}</div>
              <div style={{ fontSize: 11, color: DT.textTer }}>Released</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.yellowDim }}>
              <Clock size={18} style={{ color: DT.yellow }} />
            </div>
            <div>
              <div style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: DT.yellow }}>{pendingCount}</div>
              <div style={{ fontSize: 11, color: DT.textTer }}>Awaiting Release</div>
            </div>
          </div>
        </div>
      </Fade>

      {/* Info banner */}
      <Fade delay={100}>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: DT.blueDim, border: "1px solid rgba(77,143,255,0.15)" }}>
          <Shield size={18} style={{ color: DT.blue }} />
          <div style={{ fontSize: 13, color: DT.textSec }}>
            <strong style={{ color: DT.textPri }}>Final Grade = Defense (60%) + Adviser (30%) + Coordinator (10%)</strong> — Grades become visible once the coordinator aggregates and releases them.
          </div>
        </div>
      </Fade>

      {/* Group list */}
      {aggregates.length === 0 ? (
        <Fade delay={120}>
          <div className="flex flex-col items-center py-16 gap-3">
            <Inbox size={40} style={{ color: DT.textDis }} />
            <p style={{ fontSize: 14, color: DT.textTer }}>No aggregated grades available yet.</p>
            <p style={{ fontSize: 12, color: DT.textDis }}>Grades will appear here once the coordinator computes and releases them.</p>
          </div>
        </Fade>
      ) : (
        <div className="space-y-3">
          {aggregates.map((agg, i) => {
            const isExp = expanded === agg.groupNumber;
            const isReleased = agg.released;

            return (
              <Fade key={agg.groupNumber} delay={120 + i * 50}>
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  {/* Header row */}
                  <button
                    onClick={() => {
                      if (!isReleased) return;
                      setExpanded(isExp ? null : agg.groupNumber);
                    }}
                    className={`w-full flex items-center gap-3 p-4 text-left transition ${isReleased ? "hover:bg-white/[0.02] cursor-pointer" : "cursor-default"}`}
                  >
                    {/* Group number badge */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{
                      background: isReleased ? DT.successDim : DT.yellowDim,
                      border: `1px solid ${isReleased ? "rgba(74,222,128,0.15)" : "rgba(255,209,0,0.15)"}`,
                    }}>
                      <span style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 800, color: isReleased ? DT.success : DT.yellow }}>
                        {agg.groupNumber}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri }}>
                          {agg.groupName || `Group ${agg.groupNumber}`}
                        </span>
                        {isReleased ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                            fontSize: 10, fontWeight: 700, color: DT.success, background: DT.successDim, border: "1px solid rgba(74,222,128,0.20)",
                          }}>
                            <Eye size={10} /> Released
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                            fontSize: 10, fontWeight: 700, color: DT.yellow, background: DT.yellowDim, border: "1px solid rgba(255,209,0,0.20)",
                          }}>
                            <Lock size={10} /> Pending Release
                          </span>
                        )}
                      </div>
                      <div className="truncate mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>
                        {agg.groupTitle || "Untitled Project"}
                      </div>
                      {/* Completion indicators */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: agg.panelistGradesCount >= 3 ? DT.success : agg.panelistGradesCount > 0 ? DT.yellow : DT.textDis }}>
                          <BarChart3 size={11} /> Defense: {agg.panelistGradesCount}/3
                        </span>
                        <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: agg.hasAdviserGrade ? DT.success : DT.textDis }}>
                          <BookOpen size={11} /> Adviser: {agg.hasAdviserGrade ? "\u2713" : "\u2014"}
                        </span>
                        <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: agg.hasCoordGrade ? DT.success : DT.textDis }}>
                          <ClipboardList size={11} /> Coord: {agg.hasCoordGrade ? "\u2713" : "\u2014"}
                        </span>
                      </div>
                    </div>

                    {/* Expand icon */}
                    {isReleased ? (
                      isExp ? <ChevronUp size={18} style={{ color: DT.textTer }} /> : <ChevronDown size={18} style={{ color: DT.textTer }} />
                    ) : (
                      <Lock size={16} style={{ color: DT.textDis }} />
                    )}
                  </button>

                  {/* Expanded detail (released only) */}
                  {isExp && isReleased && agg.memberFinalGrades && (
                    <div className="px-4 pb-5" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                      {/* Aggregate metadata */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 mb-4">
                        {agg.aggregatedAt && (
                          <span style={{ fontSize: 11, color: DT.textTer }}>
                            Aggregated: {new Date(agg.aggregatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {agg.releasedAt && (
                          <span style={{ fontSize: 11, color: DT.success }}>
                            Released: {new Date(agg.releasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {agg.releasedBy ? ` by ${agg.releasedBy}` : ""}
                          </span>
                        )}
                        {agg.panelistNames?.length > 0 && (
                          <span style={{ fontSize: 11, color: DT.textTer }}>
                            Panelists: {agg.panelistNames.join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Per-student breakdown table */}
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                              <th className="text-left py-2 pr-4" style={{ color: DT.textTer, fontWeight: 600 }}>Student</th>
                              <th className="text-center py-2 px-2" style={{ color: DT.blue, fontWeight: 700, fontSize: 11 }}>
                                Defense<br /><span style={{ fontWeight: 400 }}>60%</span>
                              </th>
                              <th className="text-center py-2 px-2" style={{ color: DT.success, fontWeight: 700, fontSize: 11 }}>
                                Adviser<br /><span style={{ fontWeight: 400 }}>30%</span>
                              </th>
                              <th className="text-center py-2 px-2" style={{ color: DT.red, fontWeight: 700, fontSize: 11 }}>
                                Coord<br /><span style={{ fontWeight: 400 }}>10%</span>
                              </th>
                              <th className="text-center py-2 px-2" style={{ color: DT.yellow, fontWeight: 700, fontSize: 11 }}>
                                Final<br /><span style={{ fontWeight: 400 }}>Raw %</span>
                              </th>
                              <th className="text-center py-2 px-2" style={{ color: DT.textPri, fontWeight: 700, fontSize: 11 }}>Grade</th>
                              <th className="text-left py-2 pl-2" style={{ color: DT.textPri, fontWeight: 700, fontSize: 11 }}>Verdict</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(agg.members || []).map((name: string) => {
                              const mg = agg.memberFinalGrades?.[name];
                              if (!mg) return null;
                              const vc = verdictColor(mg.verdict);
                              return (
                                <tr key={name} style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: DT.blueDim, fontSize: 9, fontWeight: 700, color: DT.blue }}>
                                        {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                                      </div>
                                      <span style={{ fontWeight: 600, color: DT.textPri, fontSize: 13 }}>{name}</span>
                                    </div>
                                  </td>
                                  <td className="text-center py-3 px-2">
                                    <span style={{ color: DT.textSec }}>{mg.defenseScore.toFixed(1)}%</span>
                                    {mg.panelistCount < 3 && <span style={{ fontSize: 9, color: DT.warning }}> ({mg.panelistCount}/3)</span>}
                                  </td>
                                  <td className="text-center py-3 px-2" style={{ color: mg.hasAdviserGrade ? DT.textSec : DT.textDis }}>
                                    {mg.hasAdviserGrade ? `${mg.adviserScore.toFixed(1)}%` : "\u2014"}
                                  </td>
                                  <td className="text-center py-3 px-2" style={{ color: mg.hasCoordGrade ? DT.textSec : DT.textDis }}>
                                    {mg.hasCoordGrade ? `${mg.coordScore.toFixed(1)}%` : "\u2014"}
                                  </td>
                                  <td className="text-center py-3 px-2">
                                    <div style={{ fontFamily: FT.h, fontWeight: 800, color: DT.yellow }}>{mg.finalRaw.toFixed(1)}%</div>
                                    <GradeBar pct={mg.finalRaw} color={vc} />
                                  </td>
                                  <td className="text-center py-3 px-2" style={{ fontFamily: FT.h, fontWeight: 800, fontSize: 16, color: vc }}>
                                    {mg.numericalGrade}
                                  </td>
                                  <td className="py-3 pl-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                                      fontSize: 10, fontWeight: 700, color: vc,
                                      background: withAlpha(vc, 0.07), border: `1px solid ${withAlpha(vc, 0.12)}`,
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
                      </div>

                      {/* Incomplete warning */}
                      {(!agg.hasAdviserGrade || !agg.hasCoordGrade || agg.panelistGradesCount < 3) && (
                        <div className="mt-3 p-3 rounded-lg" style={{ background: DT.warningDim, border: "1px solid rgba(251,191,36,0.15)" }}>
                          <span style={{ fontSize: 12, color: DT.warning }}>
                            <AlertTriangle size={12} className="inline mr-1" />
                            Note: {agg.panelistGradesCount < 3 ? `Only ${agg.panelistGradesCount}/3 panelist grades submitted. ` : ""}
                            {!agg.hasAdviserGrade ? "Missing adviser grade. " : ""}
                            {!agg.hasCoordGrade ? "Missing coordinator grade. " : ""}
                            Final scores may be partial.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Locked state for unreleased */}
                  {isExp && !isReleased && (
                    <div className="px-4 pb-5 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
                      <div className="flex flex-col items-center py-6 gap-2">
                        <Lock size={28} style={{ color: DT.textDis }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: DT.textTer }}>Grades Not Yet Released</p>
                        <p style={{ fontSize: 12, color: DT.textDis, textAlign: "center", maxWidth: 360 }}>
                          The coordinator hasn't released the final grades for this group yet. You'll be notified when they're available.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Fade>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}