Design the CapstonePH Student Dashboard in Cinematic Dark Premium style.
Core purpose: students feel motivated — they can clearly see their progress.
Everything that shows advancement is visually prominent.
Page background: #07090F. Content max-width 1280px, 40px side padding.

Use design system above. Nav bar + student sidebar from Component Library.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIDEBAR — Student Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
bg #0C0F1A. Logo area 64px top.
─── OVERVIEW ───
[home] Dashboard (active)
─── MY WORK ───
[list] My Checklist
[calendar] Timeline
[file-text] Manuscript
[upload-cloud] Submissions
─── DEFENSE ───
[shield] Defense Info
[bar-chart-2] My Results (locked pre-defense)
─── ───
[settings] Settings
[log-out] Logout

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B1. PAGE HEADER — CINEMATIC GREETING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full width. No card — just content on page bg. Padding 32px 0 24px.

Left block:
  "Good morning, Juan." Inter Bold 36px #EEF0F6.
  Subtle glow behind text: radial blue-glow-bg, 200px radius, opacity 0.6.
  "BMMA Capstone Project 2 · Group 3" DM Sans 14px text-tertiary, 6px below.

Right block:
  Defense countdown chip — cinematic style:
    bg #161B2E, border rgba(255,209,0,0.20), rounded-16, padding 12px 20px.
    Left: hourglass icon 16px #FFD100.
    Center: "27 days left" Inter Bold 16px #FFD100.
    Right divider + "May 2, 2025" DM Sans 13px text-secondary.
    Glow: box-shadow 0 0 20px rgba(255,209,0,0.10).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B2. PROGRESS HERO — FULL WIDTH CARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The most prominent element on the page. Full width. Rounded-24.
This card communicates overall progress at a glance — the
primary motivation driver.

BACKGROUND:
  bg card-surface gradient.
  THREE.JS CANVAS (contained, z-index 0):
    Scene: soft atmospheric depth — two large translucent planes,
    one in STI Blue rgba(0,48,135,0.08) and one STI Yellow rgba(255,209,0,0.05),
    positioned at depth, vertex-displaced with slow sine waves.
    PlaneGeometry 800×400, 60×30 segments. Vertex y += sin(time×0.3 + x×0.05) × 4.
    MeshBasicMaterial transparent. Rotate very slowly on y axis (0.0001 rad/frame).
    Additionally: 80 micro-stars, white Points, opacity 0.15–0.35, static.
    THREE.js r128. No OrbitControls. No CapsuleGeometry.
  Gradient overlay (z-index 0.5): left strong, right fades — creates depth.

CONTENT (z-index 1, padding 36px 40px):
  Three-column layout (45% / 30% / 25%):

  LEFT — Progress narrative:
    "PHASE 4 OF 5" Label text-tertiary + blue chip "In Progress" right of label.
    Gap 10px.
    "Discussion & Endorsement" Inter Bold 28px #EEF0F6, line-height 1.1.
    Gap 8px.
    "Finalize Chapter IV and obtain endorsement signatures."
    DM Sans 14px text-secondary.
    Gap 24px.
    Overall progress bar (full width of column):
      Label row: "Overall Progress" DM Sans 13px text-secondary + "61%" Inter Bold 13px #4D8FFF right.
      Bar: height 8px, track rgba(255,255,255,0.08), fill #4D8FFF, rounded-pill.
      Glow: box-shadow 0 0 10px rgba(77,143,255,0.40) on fill.
      Animated on mount: bar-fill token.
    Gap 20px.
    Three micro-progress rows:
      Each: icon 14px + label DM Sans 13px text-secondary + mini bar 80px + value Inter Bold 12px #EEF0F6.
      "Checklist"   61%  blue fill.
      "Manuscript"  75%  blue fill.
      "Submissions" 50%  yellow fill.

  CENTER — Three circular rings:
    Stacked vertically, centered, tight gap 16px.
    Large ring 80px: "Checklist" — 61% — #4D8FFF fill — glow.
    Medium ring 64px: "Manuscript" — 75% — #4D8FFF fill.
    Small ring 48px: "Submissions" — 50% — #FFD100 fill.
    All three animate on mount with ring-fill token, 200ms stagger.
    Labels below each ring: DM Sans 10px text-tertiary.

  RIGHT — Defense countdown:
    "DEFENSE DAY" Label text-tertiary uppercase.
    Gap 10px.
    Countdown blocks (3 blocks: Days/Hours/Minutes from C14).
    Below blocks: "May 2, 2025" DM Sans 12px text-tertiary.
    "Room 301 · STI SF" DM Sans 11px text-tertiary.
    Gap 16px.
    "View Details →" ghost button small.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B3. FOUR STAT CARDS ROW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4 equal columns. Stagger card-in animation on load.

Card 1 — Checklist:
  Icon: clipboard-check in rgba(96,165,250,0.15) circle.
  "11 / 18" Inter Bold 36px text-primary.
  "items complete" text-tertiary.
  Bottom: progress bar 61% blue, animated.

Card 2 — Manuscript:
  Icon: file-text in rgba(74,222,128,0.15) circle.
  "Submitted" Inter Bold 24px #4ADE80.
  "Pre-Defense PDF" text-tertiary Caption.
  Bottom: "Approved by Coordinator" success badge.

Card 3 — Working Doc:
  Icon: Google Docs color icon in rgba(66,133,244,0.12) circle.
  "Active" Inter Bold 24px text-primary.
  "Working Manuscript" text-tertiary.
  Bottom: "Adviser viewed 2d ago" DM Sans 12px text-tertiary.

Card 4 — Consultations:
  Icon: clock in rgba(52,211,153,0.15) circle.
  "12 hrs" Inter Bold 36px text-primary.
  "of 14 required" text-tertiary.
  Bottom: progress bar 86% success green + "On track" badge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B4. PHASE TIMELINE — FULL WIDTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full width card. bg card-surface. rounded-24. border subtle. padding 28px 36px.

Header row: "Your Journey" Inter Bold 20px text-primary LEFT.
"Phase 4 of 5 — Defense in 27 days" DM Sans 14px text-secondary RIGHT.

HORIZONTAL TIMELINE (desktop) — 5 nodes connected by progress line:
  Connector line: full width, height 2px, bg rgba(255,255,255,0.08).
    Filled portion (phases 1–3 complete, phase 4 in progress):
    #4D8FFF fill, animated width left→right on mount, 1.5s ease-out.
    Phase 4 partial fill: 60% of segment, pulsing edge glow.

  Each node above/below connector:
    Node circle 56px, centered on connector line.
    Complete: #4D8FFF bg, white check 20px.
    Current: #161B2E bg, #FFD100 border 2px, #FFD100 dot center 10px.
      Outer ring: rgba(255,209,0,0.20) scale+fade pulse, 2s loop.
      Glow: box-shadow 0 0 16px rgba(255,209,0,0.25).
    Upcoming: rgba(255,255,255,0.06) bg, rgba(255,255,255,0.12) border.
    Phase number inside circle: Inter Bold 16px.

  Labels alternating above/below to prevent overlap:
    Phase name: Inter Bold 13px text-primary.
    Date range: DM Sans 11px text-tertiary JetBrains Mono.
    Key deliverable: DM Sans 11px text-secondary.
    XP chip on complete phases: "Done" success badge.

  Phases:
    ✅ 1 Research Readiness — Jan 19–Feb 8 — "Baseline data collected"
    ✅ 2 Project Production — Feb 9–Mar 22 — "Prototype complete"
    ✅ 3 Implementation — Mar 23–Apr 12 — "Rollout executed"
    ⏳ 4 CURRENT: Discussion — Apr 13–25 — "Finish Ch.IV + endorsement"
    🔒 5 Defense & Final — Apr 27–May 18 — "Defense + archive"

  Nodes stagger animate on mount: 100ms per node.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B5. TWO-COLUMN SECTION — 60/40
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEFT — Submission Checklist card:
  bg card-surface. rounded-24. border subtle. padding 0. overflow hidden.

  Header: bg rgba(77,143,255,0.08), border-bottom rgba(255,255,255,0.06), padding 20px 24px.
    "Submission Checklist" Inter Bold 18px text-primary LEFT.
    "11 / 18" yellow pill RIGHT.
    Tab bar below header: "All" · "Documents" · "Manuscript" · "Admin"
    Underline style, #4D8FFF active. DM Sans 13px.

  Checklist items (C7 component, padding 0 8px):
    ✅ Endorsement Form · "Verified by Adviser" success badge
    ✅ Chapter I – Introduction · "Submitted"
    ✅ Chapter II – Methodology · "Submitted"
    ✅ Chapter III – Results · "Submitted"
    ⬜ Chapter IV – Discussion · "In Progress" warning badge
    ⬜ Originality Certificate · "Missing" error badge
    ⬜ Defense Fee Receipt · "Missing" error badge
    ✅ Peer Evaluation Form · "Submitted"
    ✅ Consultation Forms · "Up to date"

  Items stagger animate on mount.
  "View Full Checklist →" #4D8FFF DM Sans 13px link, padding 16px 24px.

RIGHT — Stack of three cards (gap 16px):

  Card A — Next Deadline (most urgent):
    bg rgba(251,191,36,0.06). border rgba(251,191,36,0.15). rounded-20. padding 20px.
    "NEXT DEADLINE" Label text-tertiary uppercase.
    "Chapter IV Discussion" Inter Bold 18px text-primary, 8px margin-top.
    "Due April 25, 2025 · 7 days remaining" DM Sans 13px #FBBF24.
    Progress bar 0% empty (not started). warning amber fill.

  Card B — Recent Files:
    bg Raised. rounded-20. border subtle. padding 20px.
    "Recent Files" Inter Bold 16px text-primary + "+ Upload" ghost right.
    Three file rows (C8 compact): icon + name + status badge.
      Manuscript Draft v3.pdf · green "Approved"
      Chapter III Data.xlsx · amber "Pending"
      Originality Report · dashed "Upload Now"

  Card C — From Coordinator:
    bg Raised. rounded-20. border subtle. padding 20px.
    "Announcements" Inter Bold 16px text-primary.
    Two announcement rows compact (C10 style, smaller):
      Type left border dot + title Inter Bold 14px + date text-tertiary.
      Unread dot.
    "View All →" #4D8FFF link bottom.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B6. UPCOMING DEFENSE CARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full width. bg #07090F (deepest — stands apart from other cards).
Border rgba(255,255,255,0.07). rounded-24. overflow hidden.

THREE.JS CONTAINED SCENE (z-index 0):
  Same atmospheric planes as B2 hero card but more intense:
    Blue plane opacity 0.12, yellow plane opacity 0.08.
    Vertex displacement amplitude slightly larger.
    Additionally: 6 slow-rotating geometric shapes at card edges.
      IcosahedronGeometry wireframe only, STI Blue opacity 0.12, far background.
    THREE.js r128. No OrbitControls. No CapsuleGeometry.

Gradient overlay over Three.js (z-index 0.5):
  Left 40%: #07090F → transparent (content area protection).
  Right 40%: transparent → #07090F (symmetry).

CONTENT (z-index 1, padding 32px 40px, flex row):
  Left 50%:
    "FINAL DEFENSE" Label DM Sans 11px rgba(255,255,255,0.40) uppercase letter-spaced.
    "May 2, 2025" Inter Bold 44px #EEF0F6, line-height 1.0, margin-top 10px.
    Glow behind date: yellow-glow-bg, 150px radius, z-index -1.
    "Friday · Oral Defense Presentation" DM Sans 15px text-secondary.
    "8:00 AM · Room 301 · STI College San Fernando" DM Sans 13px text-tertiary, 4px below.
    Gap 24px.
    "👔 Corporate/Business Attire Required" warning chip.
    Gap 16px.
    "View Defense Details →" secondary button.

  Right 50% center-justified:
    "TIME REMAINING" Label text-tertiary uppercase, text-center.
    Countdown blocks row (C14) — 3 blocks: Days 27 / Hours 14 / Min 32.
    Numbers glow: text-shadow 0 0 24px rgba(255,209,0,0.40).
    Block bg #161B2E, border rgba(255,209,0,0.12).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B7. GLOBAL PAGE ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On page load:
  All elements use stagger card-in animation.
  Section order: greeting (0ms) → progress hero (100ms) → stat cards stagger
  (200ms, 60ms each) → timeline (600ms) → two-col section (800ms) → defense card (1000ms).
  Progress rings and bars animate after their card appears.
  Count-up on stat numbers.

On scroll:
  Intersection Observer threshold 0.15.
  Elements below fold: fade-blur-in token.

Three.js performance:
  Hero card canvas: always active.
  Defense card canvas: activate on scroll-enter, pause on scroll-exit.
  Visibility API: pause all when tab not focused.