import { apiFetch } from "../lib/supabase";
import { useState, useEffect, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import { useOutletContext } from "react-router";
import {
  Users, Layers, ShieldCheck, Clock, Archive, ChevronRight,
  UserPlus, Inbox, Calendar, FolderKanban, Loader2,
  FileText,
} from "lucide-react";
import { DT, FT } from "./cinematic-tokens";
import { HealthBar } from "./HealthBar";
import { ManuscriptPipeline } from "./ManuscriptPipeline";
import { cardBg } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { KF_STANDARD } from "./animations";

/* ═══ Helpers ═══ */

function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`rounded-2xl overflow-hidden ${className}`} style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm, ...style }}>{children}</div>;
}

/* Status badge — intentionally different accent colors from GroupsTeamsPage for dashboard context */
const statusMap: Record<string, { c: string; bg: string; b: string }> = {
  "Pre-Defense": { c: DT.warning, bg: DT.warningDim, b: "rgba(251,191,36,0.15)" },
  "Defense Ready": { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)" },
  Graded: { c: DT.purple, bg: DT.purpleDim, b: "rgba(167,139,250,0.15)" },
  Archived: { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
};
function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef };
  return <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}>{status}</span>;
}

/* ═══ Stat Cards ═══ */
function StatCards({ stats }: { stats: any }) {
  const s = stats || { totalStudents: 0, activeGroups: 0, defenseReady: 0, pendingSubmissions: 0, fullyArchived: 0 };
  const cards = [
    { icon: <Users size={18} />, value: s.totalStudents, label: "Students", accent: DT.blue, bg: DT.blueDim },
    { icon: <Layers size={18} />, value: s.activeGroups, label: "Groups", accent: DT.purple, bg: DT.purpleDim },
    { icon: <ShieldCheck size={18} />, value: s.defenseReady, label: "Defense Ready", accent: DT.success, bg: DT.successDim },
    { icon: <Clock size={18} />, value: s.pendingSubmissions, label: "Pending", accent: DT.warning, bg: DT.warningDim },
    { icon: <Archive size={18} />, value: s.fullyArchived, label: "Archived", accent: DT.textTer, bg: "rgba(255,255,255,0.05)" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: c.bg, color: c.accent }}>{c.icon}</div>
          <div>
            <p style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri, lineHeight: 1 }}>{c.value}</p>
            <p style={{ fontSize: 11, color: DT.textTer, marginTop: 2 }}>{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Groups Table ═══ */
function GroupsTable({ groups: rawGroups, onNavigate }: { groups: any[]; onNavigate?: (idx: number) => void }) {
  const groups = rawGroups.map((g: any) => ({
    id: g.number ?? g.id, title: g.title, type: g.type,
    members: g.members?.length ?? 0, adviser: g.adviser, status: g.status,
  }));

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Groups Overview</h3>
        <button onClick={() => onNavigate?.(2)} className="inline-flex items-center gap-1 transition cursor-pointer hover:opacity-80"
          style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>
          View All <ChevronRight size={14} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
              {["#", "PROJECT TITLE", "ADVISER", "STATUS"].map(h => (
                <th key={h} className="text-left px-5 py-2.5" style={{ fontWeight: 600, fontSize: 10, letterSpacing: "0.06em", color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center">
                  <Inbox size={24} style={{ color: DT.textDis, margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 12, color: DT.textTer }}>No groups yet</div>
                </td>
              </tr>
            ) : groups.map((g: any) => (
              <tr key={g.id} className="transition hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                <td className="px-5 py-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: DT.yellowDim, fontFamily: FT.h, fontSize: 11, fontWeight: 700, color: DT.yellow }}>{g.id}</div>
                </td>
                <td className="px-5 py-3 max-w-[250px]">
                  <span className="line-clamp-1" style={{ fontWeight: 600, color: DT.textPri, fontSize: 13 }}>{g.title}</span>
                  {g.type && <span style={{ fontSize: 10, color: DT.textTer, display: "block", marginTop: 1 }}>{g.type}</span>}
                </td>
                <td className="px-5 py-3" style={{ fontSize: 12, color: DT.textSec }}>{g.adviser || "—"}</td>
                <td className="px-5 py-3"><StatusBadge status={g.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══ Quick Actions ═══ */
function QuickActions({ onNavigate }: { onNavigate?: (idx: number) => void }) {
  const actions = [
    { icon: <UserPlus size={20} />, label: "Add User", accent: DT.blue, bg: DT.blueDim, navIdx: 1 },
    { icon: <FolderKanban size={20} />, label: "Groups", accent: DT.purple, bg: DT.purpleDim, navIdx: 2 },
    { icon: <ShieldCheck size={20} />, label: "Defense", accent: DT.success, bg: DT.successDim, navIdx: 5 },
    { icon: <FileText size={20} />, label: "Manuscripts", accent: DT.warning, bg: DT.warningDim, navIdx: 4 },
  ];
  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Quick Actions</h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {actions.map(a => (
          <button key={a.label} onClick={() => onNavigate?.(a.navIdx)}
            className="flex items-center gap-3 p-3.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
            style={{ border: `1px solid ${DT.borderHair}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: a.bg, color: a.accent }}>{a.icon}</div>
            <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 600, color: DT.textPri }}>{a.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ═══ Activity Feed ═══ */
function RecentActivity({ groups }: { groups: any[] }) {
  const items: { label: string; detail: string; accent: string; icon: ReactNode }[] = [];
  for (const g of groups.slice(0, 5)) {
    if (g.status === "Defense Ready") items.push({ label: g.title || `Group ${g.number}`, detail: "Ready for defense", accent: DT.success, icon: <ShieldCheck size={13} /> });
    else if (g.status === "Pre-Defense") items.push({ label: g.title || `Group ${g.number}`, detail: "Preparing submissions", accent: DT.warning, icon: <Clock size={13} /> });
    else if (g.status === "Graded") items.push({ label: g.title || `Group ${g.number}`, detail: "Grading complete", accent: DT.purple, icon: <Archive size={13} /> });
  }
  return (
    <Card className="h-full flex flex-col">
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
        <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Recent Activity</h3>
      </div>
      <div className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-8">
            <Inbox size={24} style={{ color: DT.textDis, marginBottom: 6 }} />
            <span style={{ fontSize: 12, color: DT.textTer }}>Activity will appear here</span>
          </div>
        ) : (
          <div className="px-4 py-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < items.length - 1 ? `1px solid ${DT.borderHair}` : "none" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: item.accent === DT.success ? DT.successDim : item.accent === DT.warning ? DT.warningDim : DT.purpleDim, color: item.accent }}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: DT.textPri }}>{item.label}</p>
                  <p style={{ fontSize: 10, color: DT.textTer }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══ Skeleton ═══ */
function DashboardSkeleton() {
  const sh: CSSProperties = {
    background: `linear-gradient(90deg, ${DT.raised} 25%, ${DT.elevated} 50%, ${DT.raised} 75%)`,
    backgroundSize: "200% 100%", animation: "cpShimmer 1.5s ease-in-out infinite", borderRadius: 12,
  };
  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      <style>{KF_STANDARD}</style>
      <div><div style={{ ...sh, width: "40%", height: 30, marginBottom: 8 }} /><div style={{ ...sh, width: "25%", height: 16 }} /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} style={{ ...sh, height: 80 }} />)}</div>
      <div style={{ ...sh, height: 280 }} />
    </div>
  );
}

/* ═══ Main Export ═══ */
export function CoordinatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);

  let contextUser: any = null;
  let contextNavigate: any = null;
  try {
    const ctx = useOutletContext<any>();
    contextUser = ctx?.user;
    contextNavigate = ctx?.onNavigate;
  } catch { /* safe fallback */ }

  const fetchData = useCallback(async () => {
    try {
      const statsRes = await apiFetch<any>("/dashboard/stats");
      setStats(statsRes);
      setGroups(statsRes?.recentGroups || []);
    } catch (err) { console.error("Failed to fetch dashboard data:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <DashboardSkeleton />;

  const userName = contextUser?.name?.split(" ")[0] || "Coordinator";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Health Bar data
  const healthData = [
    { status: "Pre-Defense", count: stats?.preDefenseCount || 0 },
    { status: "Defense Ready", count: stats?.defenseReadyCount || 0 },
    { status: "Graded", count: stats?.gradedCount || 0 },
    { status: "Revisions", count: stats?.revisionsCount || 0 },
    { status: "Archived", count: stats?.archivedCount || 0 },
  ];

  // Manuscript Pipeline stages
  const pipelineStages = [
    { label: "Pre-Defense", count: stats?.preDefenseCount || 0, color: DT.warning },
    { label: "Defense Ready", count: stats?.defenseReadyCount || 0, color: DT.success },
    { label: "Graded", count: stats?.gradedCount || 0, color: DT.purple },
    { label: "Archived", count: stats?.archivedCount || 0, color: DT.textTer },
  ];

  return (
    <PageShell className="max-w-[1280px] mx-auto space-y-5" dashboard>
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
            {greeting}, {userName}
          </h1>
          <p className="mt-0.5" style={{ fontSize: 13, color: DT.textSec }}>BMMA Capstone · AY 2025–2026</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
          <Calendar size={13} style={{ color: DT.textTer }} />
          <span style={{ fontFamily: FT.m, fontSize: 11, color: DT.textTer }}>{today}</span>
        </div>
      </div>

      <StatCards stats={stats} />

      {/* Health Bar — group status breakdown */}
      {healthData.length > 0 && <HealthBar groups={healthData} total={groups.length} />}

      <GroupsTable groups={groups} onNavigate={contextNavigate} />

      {/* Pipeline + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ManuscriptPipeline stages={pipelineStages} total={groups.length} />
        <QuickActions onNavigate={contextNavigate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentActivity groups={groups} />
      </div>
    </PageShell>
  );
}