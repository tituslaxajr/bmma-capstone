import { useState, useEffect, useCallback } from "react";
import {
  Users, Calendar, FileText, ClipboardList, ChevronRight,
  Loader2, Inbox, Clock, CheckCircle2, AlertTriangle, Star,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { Fade, cardBg } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { AvatarCircle } from "./AvatarCircle";
import { PanelistCalendarMini } from "./PanelistCalendarMini";

/* ═══ Main Export ═══ */
export function PanelistDashboardPage({ onNavigate }: { onNavigate?: (idx: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [defenses, setDefenses] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [ctx, groupsRes, defRes] = await Promise.all([
        apiFetch<any>("/me/context"),
        apiFetch<{ groups: any[] }>("/groups"),
        apiFetch<{ defenses: any[] }>("/defenses"),
      ]);
      setProfile(ctx.profile);

      const myName = ctx.profile?.name || "";
      const myGroups = (groupsRes.groups || []).filter((g: any) =>
        (g.panelists || []).some((p: any) => p.name === myName)
      );
      setGroups(myGroups);

      const myDefs = (defRes.defenses || []).filter((d: any) =>
        myGroups.some((g: any) => g.id === d.groupId)
      );
      setDefenses(myDefs);
    } catch (err) {
      console.error("Failed to fetch panelist dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
        <Loader2 size={28} className="animate-spin" style={{ color: DT.purple }} />
        <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Loading dashboard...</span>
      </div>
    );
  }

  const firstName = (profile?.name || "Panelist").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const scheduledCount = defenses.filter(d => d.status === "scheduled" || d.status === "Scheduled").length;
  const completedCount = defenses.filter(d => d.status === "completed" || d.status === "Completed").length;
  const pendingGrades = defenses.filter(d => {
    const isComplete = d.status === "completed" || d.status === "Completed";
    const hasGraded = d.grades?.some((g: any) => g.panelistName === profile?.name);
    return isComplete && !hasGraded;
  }).length;

  const stats = [
    { label: "Assigned Groups", value: groups.length, icon: <Users size={18} />, accent: DT.purple, bg: withAlpha(DT.purple, 0.08) },
    { label: "Upcoming Defenses", value: scheduledCount, icon: <Calendar size={18} />, accent: DT.blue, bg: DT.blueDim },
    { label: "Completed", value: completedCount, icon: <CheckCircle2 size={18} />, accent: DT.success, bg: DT.successDim },
    { label: "Pending Grades", value: pendingGrades, icon: <ClipboardList size={18} />, accent: pendingGrades > 0 ? DT.warning : DT.textTer, bg: pendingGrades > 0 ? DT.warningDim : "rgba(255,255,255,0.04)" },
  ];

  return (
    <PageShell className="max-w-[1280px] mx-auto space-y-6" dashboard>
      {/* Header */}
      <Fade delay={0}>
        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
            {greeting}, <span style={{ color: DT.purple }}>{firstName}</span>
          </h1>
          <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>
            Here's your defense panel overview
          </p>
        </div>
      </Fade>

      {/* Stats */}
      <Fade delay={60}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.accent }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: FT.h, color: DT.textPri, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Fade>

      {/* Assigned Groups */}
      <Fade delay={120}>
        <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
            <h2 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Your Assigned Groups</h2>
            <button onClick={() => onNavigate?.(1)} className="flex items-center gap-1 cursor-pointer transition hover:opacity-80" style={{ fontSize: 12, fontWeight: 600, color: DT.purple }}>
              View Files <ChevronRight size={14} />
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Inbox size={36} style={{ color: DT.textDis, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>No Groups Assigned</p>
              <p className="mt-1" style={{ fontSize: 12, color: DT.textTer }}>Contact the coordinator to be assigned to defense panels.</p>
            </div>
          ) : (
            <div>
              {groups.map((g, idx) => {
                const gn = g.number ?? g.id;
                const defense = defenses.find((d: any) => d.groupId === g.id);
                const mySlot = (g.panelists || []).findIndex((p: any) => p.name === profile?.name);
                const isLead = mySlot === 0;

                return (
                  <div key={g.id} className="px-5 py-4 flex items-center gap-4 transition hover:bg-white/[0.02]"
                    style={{ borderBottom: idx < groups.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple, fontFamily: FT.h, fontSize: 14, fontWeight: 800 }}>
                      {gn}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{g.name || `Group ${gn}`}</span>
                        {isLead && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 9, fontWeight: 700, background: DT.yellowDim, color: DT.yellow, border: `1px solid ${withAlpha(DT.yellow, 0.2)}` }}>
                            <Star size={8} /> LEAD
                          </span>
                        )}
                      </div>
                      <p className="truncate mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>{g.title || "Untitled Project"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {defense ? (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>
                            {new Date(defense.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                          </p>
                          <p style={{ fontSize: 10, color: DT.textTer }}>{defense.time || defense.startTime || "TBA"}</p>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ fontSize: 10, fontWeight: 600, color: DT.textDis, background: "rgba(255,255,255,0.04)", border: `1px solid ${DT.borderDef}` }}>
                          <Clock size={10} /> No schedule
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Fade>

      {/* Defense Calendar */}
      {defenses.length > 0 && (
        <Fade delay={150}>
          <PanelistCalendarMini
            events={defenses.map(d => ({
              id: d.id,
              date: d.date,
              time: d.time || d.startTime,
              group: groups.find(g => g.id === d.groupId)?.name || `Group ${d.groupNumber || "?"}`,
              room: d.room || d.venue,
            }))}
            onEventClick={(ev) => onNavigate?.(2)}
          />
        </Fade>
      )}

      {/* Quick Actions */}
      <Fade delay={180}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Review Files", desc: "View pre-defense submissions", icon: <FileText size={18} />, accent: DT.blue, idx: 1 },
            { label: "Grade Groups", desc: "Submit defense grades", icon: <ClipboardList size={18} />, accent: DT.purple, idx: 3 },
            { label: "Defense Sessions", desc: "Start or join a session", icon: <Calendar size={18} />, accent: DT.success, idx: 2 },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate?.(a.idx)}
              className="rounded-xl p-4 text-left transition cursor-pointer hover:bg-white/[0.02] group"
              style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: withAlpha(a.accent, 0.08), color: a.accent }}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{a.label}</p>
                  <p style={{ fontSize: 11, color: DT.textTer }}>{a.desc}</p>
                </div>
                <ChevronRight size={16} style={{ color: DT.textDis }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </Fade>

      {/* Pending Grades Alert */}
      {pendingGrades > 0 && (
        <Fade delay={240}>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: DT.warningDim, border: `1px solid ${withAlpha(DT.warning, 0.2)}` }}>
            <AlertTriangle size={18} style={{ color: DT.warning }} className="shrink-0" />
            <div className="flex-1">
              <p style={{ fontSize: 13, fontWeight: 600, color: DT.warning }}>
                You have {pendingGrades} defense{pendingGrades > 1 ? "s" : ""} awaiting grades
              </p>
              <p style={{ fontSize: 11, color: withAlpha(DT.warning, 0.7) }}>
                Submit your evaluations to help finalize group results.
              </p>
            </div>
            <button onClick={() => onNavigate?.(3)}
              className="px-3 py-1.5 rounded-lg transition cursor-pointer hover:opacity-90 shrink-0"
              style={{ background: DT.warning, color: DT.base, fontSize: 12, fontWeight: 700 }}>
              Grade Now
            </button>
          </div>
        </Fade>
      )}
    </PageShell>
  );
}