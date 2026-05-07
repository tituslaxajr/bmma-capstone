import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   Manuscript Status Pipeline
   Horizontal funnel view for coordinator
   ═══════════════════════════════════════════ */

interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

interface ManuscriptPipelineProps {
  stages: PipelineStage[];
  total: number;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { label: "Draft", count: 0, color: DT.textTer },
  { label: "Submitted", count: 0, color: DT.blue },
  { label: "Under Review", count: 0, color: DT.warning },
  { label: "Approved", count: 0, color: DT.success },
];

export function ManuscriptPipeline({ stages = DEFAULT_STAGES, total }: ManuscriptPipelineProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
        boxShadow: DT.shadowSm,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>
          Manuscript Pipeline
        </span>
        <span style={{ fontSize: 11, color: DT.textTer, fontFamily: FT.m }}>
          {total} total
        </span>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-end gap-1">
        {stages.map((stage, i) => {
          const height = Math.max(20, (stage.count / maxCount) * 120);
          const isLast = i === stages.length - 1;

          return (
            <div key={stage.label} className="flex-1 flex flex-col items-center">
              {/* Count */}
              <span style={{
                fontFamily: FT.h, fontSize: 18, fontWeight: 800,
                color: stage.count > 0 ? stage.color : DT.textDis,
                marginBottom: 6,
              }}>
                {stage.count}
              </span>

              {/* Bar */}
              <div className="w-full relative" style={{ height: 120 }}>
                <div
                  className="absolute bottom-0 left-1 right-1 rounded-t-lg"
                  style={{
                    height,
                    background: `linear-gradient(180deg, ${withAlpha(stage.color, 0.35)}, ${withAlpha(stage.color, 0.12)})`,
                    border: `1px solid ${withAlpha(stage.color, 0.25)}`,
                    borderBottom: "none",
                    transition: "height 600ms cubic-bezier(.4,0,.2,1)",
                  }}
                />
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div className="absolute" style={{ display: "none" }} />
              )}

              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: 600, color: DT.textSec,
                marginTop: 6, textAlign: "center",
                lineHeight: 1.2,
              }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Flow arrows between stages */}
      <div className="flex items-center justify-between px-6 -mt-[76px] mb-[76px] pointer-events-none">
        {stages.slice(0, -1).map((_, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <svg width="20" height="12" viewBox="0 0 20 12" style={{ opacity: 0.25 }}>
              <path d="M0 6h16M12 1l5 5-5 5" stroke={DT.textTer} strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
