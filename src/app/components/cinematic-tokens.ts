/* ═══════════════════════════════════════════
   CINEMATIC DARK PREMIUM — Shared Design Tokens
   Used across ALL portal pages for consistent theming
   ═══════════════════════════════════════════ */

export const DT = {
  /* Backgrounds (darkest → lightest) */
  base: "#07090F",
  deep: "#0C0F1A",
  dark: "#111527",
  raised: "#161B2E",
  elevated: "#1C2238",
  surface: "#212840",
  deepest: "#04060C",

  /* Text */
  textPri: "#EEF0F6",
  textSec: "rgba(238,240,246,0.65)",
  textTer: "rgba(238,240,246,0.45)",   /* bumped from 0.38 — WCAG AA compliant on dark bg */
  textDis: "rgba(238,240,246,0.30)",   /* bumped from 0.22 — WCAG AA compliant on dark bg */

  /* Accent — Blue */
  blue: "#4D8FFF",
  blueDim: "rgba(77,143,255,0.12)",
  blueGlow: "rgba(77,143,255,0.22)",
  stiBlue: "#003087",

  /* Accent — Yellow / Gold */
  yellow: "#FFD100",
  yellowDim: "rgba(255,209,0,0.10)",
  yellowGlow: "rgba(255,209,0,0.25)",

  /* Accent — Purple (Panelist) */
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.10)",

  /* Accent — Red (Coordinator) */
  red: "#F87171",
  redDim: "rgba(248,113,113,0.10)",

  /* Status */
  success: "#4ADE80",
  successDim: "rgba(74,222,128,0.10)",
  warning: "#FBBF24",
  warningDim: "rgba(251,191,36,0.10)",
  error: "#F87171",
  errorDim: "rgba(248,113,113,0.10)",

  /* Borders */
  borderHair: "rgba(255,255,255,0.04)",
  borderSub: "rgba(255,255,255,0.07)",
  borderDef: "rgba(255,255,255,0.11)",
  borderStrong: "rgba(255,255,255,0.20)",

  /* Hover */
  hoverBg: "rgba(255,255,255,0.05)",
  hoverBgStrong: "rgba(255,255,255,0.08)",

  /* Glass */
  glass: "rgba(22,27,46,0.80)",
  glassBorder: "rgba(255,255,255,0.06)",

  /* Shadows */
  shadowSm: "0 2px 8px rgba(0,0,0,0.25)",
  shadowMd: "0 4px 20px rgba(0,0,0,0.30)",
  shadowLg: "0 8px 40px rgba(0,0,0,0.40)",
  shadowXl: "0 20px 60px rgba(0,0,0,0.50)",

  /* Card glow on hover */
  glowBlue: "0 0 20px rgba(77,143,255,0.08)",
  glowYellow: "0 0 20px rgba(255,209,0,0.08)",
  glowPurple: "0 0 20px rgba(167,139,250,0.08)",
} as const;

/* Font families — same as landing page */
export const FT = {
  h: "Inter, sans-serif",
  b: "'DM Sans', sans-serif",
  m: "'JetBrains Mono', monospace",
} as const;

/** Adds alpha to a hex color: withAlpha("#FF0000", 0.1) → "rgba(255,0,0,0.1)" */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex || typeof hex !== "string") return `rgba(0,0,0,${alpha})`;
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex.replace(/[\d.]+\)$/, `${alpha})`);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}