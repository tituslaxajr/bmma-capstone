/**
 * Shared CSS @keyframes for CapstonePH.
 *
 * Pages previously defined their own prefixed copies (umFade, gtFade, sdFadeUp, etc.).
 * This module provides canonical versions that any component can inject via <style>{KF_*}</style>.
 *
 * Usage:
 *   import { KF_PAGE, KF_FADE_UP, ANIM } from "./animations";
 *   <style>{KF_PAGE}</style>
 *   <div style={{ animation: ANIM.pageIn }}>...</div>
 */

/* ═══ Primitive keyframe strings ═══ */

/** Simple opacity fade-in (0 → 1). Used by almost every page wrapper. */
export const KF_PAGE = `@keyframes cpPageIn{from{opacity:0}to{opacity:1}}`;

/** Fade-in + slide-up from 12px. Cards and stat blocks. */
export const KF_FADE_UP = `@keyframes cpFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`;

/** Fade-in + slide-up with blur dissolve. Used by archive pages. */
export const KF_FADE_UP_BLUR = `@keyframes cpFadeUpBlur{from{opacity:0;transform:translateY(12px);filter:blur(4px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}`;

/** Background-position shimmer for loading states and decorative bars. */
export const KF_SHIMMER = `@keyframes cpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`;

/** Gentle scale pulse (subtle "breathing"). */
export const KF_PULSE = `@keyframes cpPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}`;

/** Subtle vertical float (3px). For floating icons/badges. */
export const KF_FLOAT = `@keyframes cpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`;

/** Spinner rotation. */
export const KF_SPIN = `@keyframes cpSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`;

/** Card entrance: opacity + translateY + scale. */
export const KF_CARD_IN = `@keyframes cpCardIn{from{opacity:0;transform:translateY(24px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`;

/** Cursor blink for typing animations. */
export const KF_CURSOR_BLINK = `@keyframes cpCursorBlink{0%,100%{opacity:1}50%{opacity:0}}`;

/* ═══ Combo bundles ═══ */

/** Standard page bundle: pageIn + fadeUp + fadeUpBlur + shimmer. Covers ~90% of pages. */
export const KF_STANDARD = [KF_PAGE, KF_FADE_UP, KF_FADE_UP_BLUR, KF_SHIMMER].join("\n");

/** Extended bundle: standard + pulse + float. For dashboards. */
export const KF_DASHBOARD = [KF_STANDARD, KF_PULSE, KF_FLOAT].join("\n");

/* ═══ Ready-made animation shorthand values ═══ */

export const ANIM = {
  /** Page wrapper fade-in, 400ms. */
  pageIn: "cpPageIn 400ms ease-out",
  /** Card/row staggered fade-up. Append ` Xms both` for delay. */
  fadeUp: "cpFadeUp 400ms ease-out",
  /** Fade-up with blur. */
  fadeUpBlur: "cpFadeUpBlur 500ms ease-out",
  /** Shimmer loop. */
  shimmer: "cpShimmer 2s linear infinite",
  /** Pulse loop. */
  pulse: "cpPulse 2s ease-in-out infinite",
  /** Float loop. */
  float: "cpFloat 3s ease-in-out infinite",
  /** Spinner. */
  spin: "cpSpin 1s linear infinite",
  /** Card entrance, 500ms. */
  cardIn: "cpCardIn 500ms ease-out",
} as const;