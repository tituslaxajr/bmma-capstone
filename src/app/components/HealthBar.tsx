import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   Coordinator Health Bar
   Horizontal stacked bar of group statuses
   ═══════════════════════════════════════════ */

interface GroupStatus {
  status: string;
  count: number;
}

interface HealthBarProps {
  groups: GroupStatus[];
  total: number;
}

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  "on-track": { color: DT.success, label: "On Track" },
  "pending": { color: DT.warning, label: "Pending" },
  "overdue": { color: DT.red, label: "Overdue" },
  "Pre-Defense": { color: DT.blue, label: "Pre-Defense" },
  "Defense Ready": { color: DT.success, label: "Defense Ready" },
  "Graded": { color: DT.purple, label: "Graded" },
  "Revisions": { color: DT.warning, label: "Revisions" },
  "Archived": { color: DT.textTer, label: "Archived" },
};

export function HealthBar({ groups, total }: HealthBarProps) {
  if (total === 0) return null;

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
        boxShadow: DT.shadowSm,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>
          Group Health Overview
        </span>
        <span style={{ fontSize: 11, color: DT.textTer, fontFamily: FT.m }}>
          {total} group{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: DT.dark }}>
        {groups.map((g, i) => {
          const pct = (g.count / total) * 100;
          if (pct <= 0) return null;
          const cfg = STATUS_COLORS[g.status] || { color: DT.textTer, label: g.status };
          return (
            <div
              key={g.status}
              style={{
                width: `${pct}%`,
                background: cfg.color,
                minWidth: g.count > 0 ? 4 : 0,
                transition: "width 500ms cubic-bezier(.4,0,.2,1)",
                boxShadow: `0 0 6px ${withAlpha(cfg.color, 0.3)}`,
                borderRight: i < groups.length - 1 ? `1px solid ${DT.dark}` : undefined,
              }}
              title={`${cfg.label}: ${g.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {groups.filter(g => g.count > 0).map(g => {
          const cfg = STATUS_COLORS[g.status] || { color: DT.textTer, label: g.status };
          const pct = Math.round((g.count / total) * 100);
          return (
            <div key={g.status} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span style={{ fontSize: 11, color: DT.textSec }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: DT.textPri, fontFamily: FT.m }}>
                {g.count}
              </span>
              <span style={{ fontSize: 10, color: DT.textTer }}>
                ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
