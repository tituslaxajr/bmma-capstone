import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   Grade Distribution Chart (recharts)
   Bar chart / histogram of defense scores
   ═══════════════════════════════════════════ */

interface GradeDistributionProps {
  /** Array of numeric scores (0-100) */
  scores: number[];
  /** Optional title override */
  title?: string;
}

const RANGES = [
  { min: 92, max: 100, label: "92-100", verdict: "Pass", color: DT.success },
  { min: 82, max: 91, label: "82-91", verdict: "Minor Rev", color: DT.blue },
  { min: 60, max: 81, label: "60-81", verdict: "Major Rev/Re-Demo", color: DT.warning },
  { min: 0, max: 59, label: "<60", verdict: "Fail", color: DT.red },
];

export function GradeDistributionChart({ scores, title = "Grade Distribution" }: GradeDistributionProps) {
  const data = RANGES.map(r => ({
    range: r.label,
    verdict: r.verdict,
    count: scores.filter(s => s >= r.min && s <= r.max).length,
    color: r.color,
  }));

  const total = scores.length;
  const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : "—";

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
        boxShadow: DT.shadowSm,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>
          {title}
        </span>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 11, color: DT.textTer }}>
            Avg: <span style={{ fontFamily: FT.m, fontWeight: 700, color: DT.textPri }}>{avg}</span>
          </span>
          <span style={{ fontSize: 11, color: DT.textTer }}>
            n=<span style={{ fontFamily: FT.m, fontWeight: 700, color: DT.textPri }}>{total}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      {total > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DT.borderHair} vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fill: DT.textTer, fontSize: 11, fontFamily: FT.m }}
              axisLine={{ stroke: DT.borderSub }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: DT.textTer, fontSize: 10, fontFamily: FT.m }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: DT.elevated,
                border: `1px solid ${DT.borderDef}`,
                borderRadius: 10,
                boxShadow: DT.shadowMd,
                fontFamily: FT.b,
                fontSize: 12,
                color: DT.textPri,
              }}
              cursor={{ fill: withAlpha(DT.textPri, 0.03) }}
              formatter={(value: number, _name: string, entry: any) => [
                `${value} group${value !== 1 ? "s" : ""}`,
                entry.payload.verdict,
              ]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((entry, i) => (
                <Cell key={i} fill={withAlpha(entry.color, 0.7)} stroke={entry.color} strokeWidth={1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[180px]">
          <span style={{ fontSize: 12, color: DT.textTer }}>No grades available yet</span>
        </div>
      )}

      {/* Legend row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {RANGES.map(r => (
          <div key={r.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: r.color }} />
            <span style={{ fontSize: 10, color: DT.textSec }}>{r.verdict}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
