Design the CapstonePH Login page using the design system from Sections A and B.

━━━ LAYOUT ━━━
Full viewport. Two-panel split: 55% LEFT / 45% RIGHT. No scrolling.

━━━ LEFT PANEL — Visual Hero ━━━
Background: #0F172A (neutral-900, NOT navy blue).

THREE.JS ANIMATION — full panel canvas, z-index 0:
  Scene: Floating particle constellation.
  Particles: 90 total. Sizes 1.5–4px randomized.
  Colors: 60% white opacity 0.5, 40% STI Yellow #FFD100 opacity 0.35.
  Motion: each particle drifts on unique slow vector, 0.15–0.4px per frame.
  Connections: white lines between particles within 110px, opacity 0.06.
  Mouse parallax: particles shift subtly toward cursor, max 15px offset, spring easing.
  Depth illusion: smaller particles move slower (faux z-depth).
  No Three.js OrbitControls. Pure Three.js r128 PointsMaterial + BufferGeometry.

Overlaid content (z-index 1, absolute positioned):
  Top-left: STI shield logo SVG white 32px + "STI College San Fernando" DM Sans 12px white/50, padding 32px.
  Center (vertical + horizontal center):
    Chip: "BMMA · Capstone Project 2 · AY 2025–2026" — frosted glass pill:
      bg rgba(255,255,255,0.08), border rgba(255,255,255,0.12), backdrop-blur 8px,
      DM Sans Medium 12px white, padding 6px 16px, rounded-pill.
    Gap 20px.
    "CapstonePH" — Inter Bold 56px white, line-height 1.0.
    "Your Defense. Your Story." — DM Sans 18px rgba(255,255,255,0.55), 8px margin-top.
    Gap 40px.
    Three frosted glass feature pills in a row:
      Each: bg rgba(255,255,255,0.07), border rgba(255,255,255,0.10), backdrop-blur, rounded-16, padding 10px 18px.
      Icon 16px (white) + DM Sans 13px white/80 label.
      Pills: "📋 Track Progress" · "🛡️ Defense Ready" · "🏆 View Results"
      Animate: slide-in-right staggered 100ms each, 600ms after load.
  Bottom-left: "Secure · Confidential · STI Official" DM Sans 11px white/30, padding 32px.

━━━ RIGHT PANEL — Login Form ━━━
Background: #F7F8FC.
Center: white card, rounded-24, shadow-xl, padding 48px, width 400px.
Card animates: slide-in-right + opacity 0→1, 400ms ease-out.

Inside card (top to bottom):

"Welcome back" — Inter Bold 30px text-primary.
"Sign in to continue to CapstonePH" — DM Sans 14px text-secondary, 4px margin-top.
Gap 28px.

Role selector label: Inter Medium 13px text-secondary "I am a..."
Three role cards in row (first two) + one below spanning full:
  Each card: white bg, #E2E8F0 border, rounded-16, padding 14px 16px, cursor pointer.
  Content: icon 22px (role color) + Inter Bold 14px label + DM Sans 11px text-tertiary description.
  Cards: [Student · "Track your defense"] [Panelist · "Review & grade"] [Coordinator/Adviser · "Manage & oversee"] (full width)
  Selected: role-color border 2px, role-color/10 bg, icon vivid, label role-color Inter Bold.
  Transition: border + bg, 150ms ease.
  Hover unselected: #F8FAFC bg.

Gap 20px.
Email input: label "STI Email", placeholder "yourname@sti.edu.ph".
Gap 12px.
Password input: label "Password", show/hide eye icon toggle, placeholder "••••••••".
Gap 10px.
Row: "Remember me" toggle (left) + "Forgot password?" STI Blue 13px link (right).
Gap 24px.
Primary button full-width: "Sign In" STI Blue, Inter Bold 15px, rounded-12, 14px vertical.
  Loading state: spinner icon replaces text, opacity 0.8.
Gap 16px.
Divider: #E2E8F0 line, "or" DM Sans 13px text-tertiary centered.
Gap 16px.
Google SSO button: white bg, #E2E8F0 border, Google G icon 18px, "Continue with Google" Inter Medium 14px, rounded-12.
Gap 28px.
Footer: "BMMA Program · STI San Fernando · 2025–2026" DM Sans 11px text-tertiary centered.