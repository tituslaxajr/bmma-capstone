import { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, CheckSquare, Settings, LogOut,
  ChevronLeft, ChevronRight, ShieldCheck, BarChart3,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   UNIFIED SIDEBAR — Cinematic Dark Premium
   Supports Panelist & Adviser via accentColor
   ═══════════════════════════════════════════ */

interface SidebarProps {
  activeIndex?: number;
  onNavigate?: (index: number) => void;
  onLogout?: () => void;
  userName?: string;
  avatarUrl?: string;
  badges?: Record<number, number>;
  roleLabel?: string;
  /** Override accent — defaults to DT.purple for Panelist */
  accentColor?: string;
  /** Darker variant for avatar gradient — auto-derived if omitted */
  accentDark?: string;
}

/* ── Nav items (null = divider) ── */
const NAV = [
  { idx: 0, icon: LayoutDashboard, label: "Dashboard" },
  null,
  { idx: 1, icon: FileText,       label: "Pre-Defense Files" },
  { idx: 2, icon: ShieldCheck,    label: "Defense Session" },
  { idx: 3, icon: CheckSquare,    label: "Post-Defense Review" },
  null,
  { idx: 4, icon: BarChart3,      label: "Grade Aggregator" },
  null,
  { idx: 5, icon: Settings,       label: "Settings" },
] as const;

type NavItem = { idx: number; icon: React.ComponentType<{ size: number }>; label: string };

export function Sidebar({
  activeIndex = 0, onNavigate, onLogout, userName = "Prof. Santos",
  avatarUrl, badges = {}, roleLabel = "Panelist",
  accentColor, accentDark,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);

  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  /* ── Accent derivation ── */
  const accent = accentColor || DT.purple;
  const accentDim = withAlpha(accent, 0.10);
  const accentGradEnd = accentDark || accent;
  const headerLetter = (roleLabel || "P")[0].toUpperCase();

  return (
    <div
      className={`flex flex-col shrink-0 ${collapsed ? "w-[66px]" : "w-[240px]"}`}
      style={{
        fontFamily: FT.b, background: DT.deep, borderRight: `1px solid ${DT.glassBorder}`,
        opacity: ready ? 1 : 0,
        transition: "width 280ms cubic-bezier(.4,0,.2,1), opacity 350ms ease",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${DT.glassBorder}` }}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accentDim}, ${withAlpha(accent, 0.18)})`,
            border: `1px solid ${withAlpha(accent, 0.20)}`,
          }}
        >
          <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 800, color: accent }}>{headerLetter}</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 800, color: DT.textPri, letterSpacing: "-0.01em" }}>
              Hue We Are
            </div>
            <div style={{ fontSize: 10, color: DT.textTer, fontWeight: 500 }}>{roleLabel}</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded-lg transition cursor-pointer"
          style={{ color: DT.textTer }}
          onMouseEnter={e => { (e.currentTarget.style.background = DT.hoverBg); }}
          onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2" aria-label={`${roleLabel} navigation`}>
        {NAV.map((entry, i) => {
          if (entry === null) {
            return <div key={`d${i}`} className="my-1.5 mx-2" style={{ height: 1, background: DT.borderHair }} />;
          }

          const item = entry as NavItem;
          const Icon = item.icon;
          const isActive = item.idx === activeIndex;
          const isHov = hovered === item.idx;
          const badge = badges[item.idx] || 0;

          return (
            <div key={item.idx} className="relative">
              <button
                onClick={() => onNavigate?.(item.idx)}
                onMouseEnter={() => setHovered(item.idx)}
                onMouseLeave={() => setHovered(null)}
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-xl text-left relative w-full overflow-hidden my-[1px] ${collapsed ? "justify-center px-0" : "px-3"} cursor-pointer`}
                style={{
                  height: 40,
                  background: isActive ? accentDim : isHov ? DT.hoverBg : "transparent",
                  transition: "background 180ms ease",
                }}
              >
                {/* Active bar */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  aria-hidden="true"
                  style={{
                    height: isActive ? 18 : 0, opacity: isActive ? 1 : 0,
                    background: `linear-gradient(180deg, ${accent}, ${withAlpha(accent, 0.4)})`,
                    boxShadow: isActive ? `0 0 8px ${withAlpha(accent, 0.2)}` : "none",
                    transition: "height 250ms cubic-bezier(.4,0,.2,1), opacity 250ms ease",
                  }}
                />

                <Icon
                  size={17}
                  aria-hidden="true"
                  style={{
                    color: isActive ? accent : isHov ? DT.textSec : DT.textTer,
                    transform: isHov && !isActive ? "scale(1.08)" : "scale(1)",
                    transition: "color 180ms, transform 180ms",
                    flexShrink: 0,
                  } as React.CSSProperties}
                />

                {!collapsed && (
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      fontFamily: isActive ? FT.h : FT.b,
                      color: isActive ? accent : isHov ? DT.textPri : DT.textSec,
                      transition: "color 180ms",
                    }}
                  >
                    {item.label}
                  </span>
                )}

                {badge > 0 && (
                  <span
                    className={`flex items-center justify-center rounded-full shrink-0 ${collapsed ? "absolute -top-0.5 -right-0.5" : ""}`}
                    style={{
                      minWidth: 18, height: 18, padding: "0 5px",
                      fontSize: 9, fontWeight: 700, fontFamily: FT.m,
                      background: DT.red, color: DT.base,
                      boxShadow: `0 0 6px ${withAlpha(DT.red, 0.25)}`,
                    }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>

              {/* Collapsed tooltip */}
              {collapsed && isHov && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none" style={{ animation: "tipIn 100ms ease-out" }}>
                  <div
                    className="px-2.5 py-1.5 rounded-lg whitespace-nowrap"
                    style={{ background: DT.elevated, border: `1px solid ${DT.borderDef}`, boxShadow: DT.shadowMd, fontSize: 12, fontWeight: 600, fontFamily: FT.h, color: DT.textPri }}
                  >
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2.5 pb-3 pt-1" style={{ borderTop: `1px solid ${DT.glassBorder}` }}>
        {/* User chip */}
        <div
          className={`flex items-center gap-2.5 rounded-xl mb-1 ${collapsed ? "justify-center py-2" : "px-3 py-2.5"}`}
          style={{ background: withAlpha("#fff", 0.02) }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accentGradEnd})`, boxShadow: `0 0 10px ${withAlpha(accent, 0.12)}` }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontFamily: FT.h, fontSize: 10, fontWeight: 700, color: DT.base }}>{initials}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.textPri, lineHeight: 1.3 }}>
                {userName}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: DT.success, boxShadow: `0 0 4px ${withAlpha(DT.success, 0.4)}` }} />
                <span style={{ fontSize: 10, color: DT.textTer }}>Online</span>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          aria-label="Sign out"
          className={`flex items-center gap-2.5 rounded-xl w-full cursor-pointer group ${collapsed ? "justify-center px-0" : "px-3"}`}
          style={{ height: 38, color: DT.textTer, transition: "background 180ms" }}
          onMouseEnter={e => { (e.currentTarget.style.background = withAlpha(DT.red, 0.06)); }}
          onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); }}
        >
          <LogOut size={16} aria-hidden="true" className="transition-colors group-hover:text-[#F87171]" />
          {!collapsed && <span className="transition-colors group-hover:text-[#F87171]" style={{ fontSize: 13, fontWeight: 500 }}>Sign Out</span>}
        </button>
      </div>

      <style>{`@keyframes tipIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}