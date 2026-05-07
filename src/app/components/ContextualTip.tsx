import { useState } from "react";
import { Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { useDismissedTips } from "../lib/useDismissedTips";

interface ContextualTipProps {
  /** Unique ID for persistence — if provided, dismiss state survives reloads */
  tipId?: string;
  category: string;
  tips: string[];
  accent?: string;
  accentDim?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function ContextualTip({
  tipId,
  category,
  tips,
  accent = DT.purple,
  accentDim = DT.purpleDim,
  collapsible = true,
  defaultOpen = false,
}: ContextualTipProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [localDismissed, setLocalDismissed] = useState(false);
  const { isDismissed, dismiss, loaded } = useDismissedTips();

  // If persistent tipId: use KV-backed state; otherwise fall back to session-only
  const dismissed = tipId ? isDismissed(tipId) : localDismissed;

  // Don't render while loading persistence (avoids flash)
  if (tipId && !loaded) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    if (tipId) {
      dismiss(tipId);
    } else {
      setLocalDismissed(true);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{
      background: accentDim,
      border: `1px solid ${withAlpha(accent, 0.12)}`,
    }}>
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 ${collapsible ? "cursor-pointer" : ""}`}
        onClick={() => collapsible && setOpen(!open)}
      >
        <Lightbulb size={14} className="shrink-0" style={{ color: accent }} />
        <span className="flex-1" style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: accent }}>
          {category}
        </span>
        {collapsible && (
          <span style={{ color: accent }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="w-5 h-5 rounded flex items-center justify-center transition cursor-pointer hover:bg-white/10"
          style={{ color: withAlpha(accent, 0.5) }}
        >
          <X size={12} />
        </button>
      </div>

      {(open || !collapsible) && (
        <div className="px-4 pb-3 pt-0.5">
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full shrink-0 mt-[7px]" style={{ background: accent }} />
                <span style={{ fontSize: 11, color: DT.textSec, lineHeight: 1.5 }}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Pre-built tip sets keyed by page context ─── */
export const TIPS = {
  formatting: {
    tipId: "tip_formatting",
    category: "Formatting Quick Ref",
    tips: [
      "TNR, 12pt, 1.5 spacing",
      "Margins: 1.5\" left, 1\" rest",
      "APA citations throughout",
      "Tables & charts need descriptive captions",
    ],
  },
  defense: {
    tipId: "tip_defense",
    category: "Defense Prep",
    tips: [
      "Submit output + manuscript 1 week before",
      "Corporate/business attire required",
      "Revisions due within 5–7 days",
      "Consultation Form signed & updated",
    ],
  },
  groupWork: {
    tipId: "tip_groupwork",
    category: "Group Tips",
    tips: [
      "Keep 4–5 members per group",
      "Document roles & responsibilities",
      "Peer evals = accountability",
      "Meet adviser 1hr/week minimum",
    ],
  },
  research: {
    tipId: "tip_research",
    category: "Research Tips",
    tips: [
      "Pre-project data gathering for baseline",
      "Informed consent + data privacy = required",
      "Be realistic about budget & timeline",
      "Use direct quotes from transcripts",
    ],
  },
  archive: {
    tipId: "tip_archive",
    category: "Final Submission",
    tips: [
      "1 hardbound copy → library",
      "Soft copy → STI Research Outputs",
      "All signatures on Approval Sheet",
      "13 appendices incl. AI Declaration",
    ],
  },
};