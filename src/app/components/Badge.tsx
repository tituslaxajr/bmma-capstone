import { DT, FT, withAlpha } from "./cinematic-tokens";

interface BadgeProps {
  label: string;
  variant?: string;
}

/**
 * Domain-specific badge with Cinematic Dark Premium palette.
 *
 * Each variant maps to a { text, bg, border } triplet derived from DT tokens.
 * Accepts any string as `variant`; falls back to "info" for unknowns.
 */

type Swatch = { c: string; bg: string; b: string };

const variants: Record<string, Swatch> = {
  /* ── Status chips ── */
  "pre-defense":   { c: DT.blue,    bg: withAlpha(DT.blue, 0.10),    b: withAlpha(DT.blue, 0.18) },
  "defense-ready": { c: DT.success,  bg: withAlpha(DT.success, 0.10), b: withAlpha(DT.success, 0.18) },
  "defense-day":   { c: DT.yellow,   bg: withAlpha(DT.yellow, 0.12),  b: withAlpha(DT.yellow, 0.22) },
  "post-defense":  { c: DT.success,  bg: withAlpha(DT.success, 0.10), b: withAlpha(DT.success, 0.18) },
  graded:          { c: DT.textSec,  bg: withAlpha(DT.textPri, 0.06), b: DT.borderDef },
  archived:        { c: DT.textTer,  bg: withAlpha(DT.textPri, 0.04), b: DT.borderSub },

  /* ── Verdict ── */
  passed:             { c: DT.success, bg: withAlpha(DT.success, 0.10), b: withAlpha(DT.success, 0.18) },
  "passed-revisions": { c: DT.warning, bg: withAlpha(DT.warning, 0.10), b: withAlpha(DT.warning, 0.18) },
  failed:             { c: DT.red,     bg: withAlpha(DT.red, 0.10),     b: withAlpha(DT.red, 0.18) },
  pending:            { c: DT.warning, bg: withAlpha(DT.warning, 0.10), b: withAlpha(DT.warning, 0.18) },

  /* ── Role ── */
  student:     { c: DT.blue,    bg: withAlpha(DT.blue, 0.10),    b: withAlpha(DT.blue, 0.18) },
  panelist:    { c: DT.purple,  bg: withAlpha(DT.purple, 0.10),  b: withAlpha(DT.purple, 0.18) },
  adviser:     { c: DT.success, bg: withAlpha(DT.success, 0.10), b: withAlpha(DT.success, 0.18) },
  coordinator: { c: DT.red,     bg: withAlpha(DT.red, 0.10),     b: withAlpha(DT.red, 0.18) },

  /* ── Priority ── */
  high:   { c: DT.red,     bg: withAlpha(DT.red, 0.10),     b: withAlpha(DT.red, 0.18) },
  medium: { c: DT.warning, bg: withAlpha(DT.warning, 0.10), b: withAlpha(DT.warning, 0.18) },
  low:    { c: DT.textSec, bg: withAlpha(DT.textPri, 0.06), b: DT.borderDef },

  /* ── Phase ── */
  research:       { c: DT.blue,    bg: withAlpha(DT.blue, 0.10),    b: withAlpha(DT.blue, 0.18) },
  production:     { c: DT.purple,  bg: withAlpha(DT.purple, 0.10),  b: withAlpha(DT.purple, 0.18) },
  implementation: { c: DT.success, bg: withAlpha(DT.success, 0.10), b: withAlpha(DT.success, 0.18) },
  discussion:     { c: DT.warning, bg: withAlpha(DT.warning, 0.10), b: withAlpha(DT.warning, 0.18) },
  defense:        { c: DT.red,     bg: withAlpha(DT.red, 0.10),     b: withAlpha(DT.red, 0.18) },

  /* ── Neutral default ── */
  info: { c: DT.textSec, bg: withAlpha(DT.textPri, 0.06), b: DT.borderDef },
};

export function Badge({ label, variant = "info" }: BadgeProps) {
  const sw = variants[variant] || variants.info;
  return (
    <span
      className="inline-flex items-center px-2.5 py-[3px] rounded-full"
      style={{
        fontSize: 11,
        fontWeight: 600,
        fontFamily: FT.h,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: sw.c,
        background: sw.bg,
        border: `1px solid ${sw.b}`,
      }}
    >
      {label}
    </span>
  );
}
