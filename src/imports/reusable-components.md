Build all reusable components for CapstonePH using the design system from Section A.
Show every component with all states and variants on a single organized frame.

━━━ B1. NAVIGATION BAR ━━━
Height 64px. White bg. Border-bottom #E2E8F0. Shadow-xs.
Left: "CapstonePH" wordmark — Inter Bold 18px, STI Blue #003087. Small "BMMA · STI SF" caption below in DM Sans 11px text-tertiary.
Center: Breadcrumb — DM Sans 13px text-tertiary "Dashboard" / ">" / Inter Bold 14px text-primary current page.
Right: search icon (20px, neutral-400) · notification bell (20px) with STI Blue dot badge count · avatar 36px rounded-full + role chip + chevron-down.

Role chip variants (show all 4):
Student: #EFF6FF bg, #2563EB text, "Student" DM Sans 12px Medium
Panelist: #F5F3FF bg, #7C3AED text
Adviser: #ECFDF5 bg, #059669 text
Coordinator: #FEF2F2 bg, #DC2626 text

━━━ B2. SIDEBAR ━━━
Width 256px. White bg. Border-right #E2E8F0. Full height.
Top 64px: CapstonePH logo + wordmark.

Nav item states (show all):
Default: icon 18px neutral-400 + DM Sans 14px text-secondary, 40px height, 12px 16px padding, rounded-10
Hover: bg #F8FAFC, icon neutral-600, text text-primary
Active: bg #EEF2FF, icon STI Blue, text STI Blue Inter Bold, 3px left border STI Blue, rounded-r-0 on left

Section labels: DM Sans 11px uppercase text-tertiary letter-spacing 0.08em, 24px top padding

Student sidebar items:
[house] Dashboard
[layout-grid] Overview
─── MY WORK ───
[clipboard-list] My Checklist
[calendar] Timeline
[file-text] Manuscript
[upload-cloud] Submissions
─── DEFENSE ───
[shield] Defense Info
[bar-chart] My Results (locked state variant)
─── ───
[settings] Settings
[log-out] Logout

Bottom user card: avatar 32px + name Inter Bold 13px + role DM Sans 11px text-tertiary + logout icon.

Coordinator sidebar items:
[layout-dashboard] Overview
─── MANAGEMENT ───
[users] User Accounts
[layers] Groups & Teams
[link] Assignments
─── CONTENT ───
[megaphone] Announcements
[file-text] Manuscript Review
─── DEFENSE ───
[shield-check] Defense Overview
[archive] Archive & Records
─── ───
[settings] Settings

━━━ B3. STAT CARD ━━━
White, rounded-20, shadow-sm, padding 24px, min-width 200px.
Top row: DM Sans 11px uppercase text-tertiary label (letter-spaced) LEFT + icon in 36px circle tinted bg RIGHT.
Middle: Inter Bold 36px text-primary value.
Bottom: trend chip + delta text + supporting sublabel DM Sans 12px text-tertiary.
Hover: translateY(-2px) shadow-md 200ms.

Icon circle color variants: STI Blue tint, success tint, warning tint, error tint, purple tint, neutral tint.
Show 6 card variants: Checklist Progress (ring inside) · Manuscript Status · Hours Logged · Defense Countdown · Files Uploaded · Grade Average.

━━━ B4. PROGRESS RING ━━━
SVG circle. Track neutral-200. Animated fill.
Color variants: STI Blue, STI Yellow, Success Green, Error Red.
Sizes: 48px (in-card compact) · 80px (standard) · 120px (hero).
Center: Inter Bold percentage + DM Sans 10px "complete" label.
Animation: stroke-dashoffset on mount, 1.2s ease-out, 400ms delay.

━━━ B5. TIMELINE ━━━
Vertical connector line: neutral-200 2px.
Node types:
  Complete: 12px circle STI Blue filled, white check icon 8px inside
  Current: 16px circle STI Yellow filled, white dot center, outer pulse-ring animation in STI Yellow opacity 0.3
  Upcoming: 12px circle neutral-200 border, white fill
  Locked: 12px circle neutral-100 fill, lock icon 8px neutral-300

Each item:
  Date chip: DM Sans 11px neutral-500, bg neutral-100, rounded-pill, padding 2px 8px
  Title: Inter Bold 14px text-primary, 4px below date
  Deliverable: DM Sans 12px text-secondary, 2px below title
  Phase label chip: right-aligned, colored per phase status

Stagger animation: nodes fade+translateX(-8px)→0 with 100ms sequential delay.

━━━ B6. CHECKLIST ITEM ━━━
Full-width row, 44px height, 12px 16px padding.
Left: 18px checkbox — unchecked: neutral-200 border rounded-6 bg white · checked: STI Blue bg, white checkmark SVG, check-pop animation.
Label: DM Sans 14px text-primary when unchecked; text-secondary + line-through opacity-60 when checked.
Right: optional badge chip + optional action icon.
Hover: bg #F8FAFC.

States: unchecked · checked · in-progress (amber badge) · required (red badge) · verified (green badge).

━━━ B7. FILE CARD ━━━
White, rounded-16, border #E2E8F0, padding 16px. Row layout.
Left: 40px rounded-10 icon with tinted bg per file type:
  PDF: #FEF2F2 bg, #DC2626 icon
  DOC/DOCX: #EFF6FF bg, #2563EB icon
  Google Docs: white bg, Google Docs color icon
  ZIP: #FFF7ED bg, #EA580C icon
  MP4/Video: #F5F3FF bg, #7C3AED icon
  IMG: #F0FDF4 bg, #16A34A icon
Middle: Inter Bold 13px filename (truncate overflow) + DM Sans 11px text-tertiary "size · date".
Right: status badge + icon action buttons (eye, download, trash). Actions appear on row hover.
Dashed upload state: neutral-300 dashed border, neutral-400 upload icon center, DM Sans 13px text-tertiary instruction, hover: STI Blue dashed border + #EEF2FF bg.

━━━ B8. BADGE / CHIP ━━━
Font: DM Sans Medium 11px uppercase letter-spacing 0.06em.
Padding: 3px 10px. Radius: pill.

Variants:
Status chips: Pre-Defense (blue) · Defense Ready (green) · Defense Day (yellow bg dark text) · Graded (neutral) · Archived (neutral-700)
Verdict: Passed (success) · Passed with Revisions (warning) · Failed (error)
Role: Student · Panelist · Adviser · Coordinator (per role colors)
Priority: High (red) · Medium (amber) · Low (neutral)
Phase: Research · Production · Implementation · Discussion · Defense (each unique color)

━━━ B9. ANNOUNCEMENT CARD ━━━
White, rounded-20, shadow-sm, left border 4px colored by type, padding 20px 24px.
Types: Urgent (red) · Deadline (amber) · Defense (STI Blue) · General (neutral-300).
Top row: type badge LEFT + date DM Sans 12px text-tertiary RIGHT.
Title: Inter Bold 17px text-primary, 6px margin-top.
Preview: DM Sans 14px text-secondary, 3-line clamp.
Unread state: bg #F8FAFC, blue 6px dot indicator top-right corner.
Expanded state: full text + deadline chip if applicable + "Open" link.

━━━ B10. BUTTONS ━━━
Primary: STI Blue bg, white Inter Bold 14px, rounded-12, 12px 24px. Hover: #1D4ED8 bg + shadow-md. Active: scale 0.97. Loading: spinner replaces text.
Secondary: white bg, #E2E8F0 border, text-primary Inter Medium. Hover: #F8FAFC bg.
Accent: STI Yellow bg, #0F172A text Inter Bold. Hover: darken 8%.
Ghost: transparent, text-secondary. Hover: #F1F5F9 bg.
Danger: #DC2626 bg, white Inter Bold. Hover: #B91C1C.
Disabled state (all): opacity 0.45, cursor not-allowed.
Icon button: square 36px or 40px, rounded-10, ghost default.

━━━ B11. FORM INPUTS ━━━
Text input: white bg, #E2E8F0 border, rounded-12, 12px 16px, DM Sans 14px.
Label: Inter Medium 13px text-secondary, above input, 6px gap.
Placeholder: text-tertiary.
Focus: #003087 border + glow-blue shadow.
Error: #DC2626 border + error message DM Sans 12px #DC2626 below.
Success: #16A34A border + checkmark icon right.

Variants: text · password (show/hide toggle) · textarea (min 100px) · select dropdown · search (magnifier icon left).

━━━ B12. MODAL ━━━
Backdrop: rgba(15,23,42,0.45) blur(4px).
Card: white, rounded-24, shadow-xl, max-w 480px, padding 32px.
Header: Inter Bold 20px text-primary + X close icon button (ghost, top-right).
Body: DM Sans 14px text-secondary, 20px margin-top.
Footer: right-aligned button row, 24px margin-top.
Animate: modal-in token on mount. Backdrop fade.

Show variants: confirmation · form · info · destructive (red header accent bar).

━━━ B13. COUNTDOWN TIMER BLOCKS ━━━
Three blocks: Days · Hours · Minutes.
Each block: neutral-800 bg, rounded-16, Inter Bold 40px white number, DM Sans 11px white/50 label below.
Block size: 80px wide, 88px tall.
Gap between blocks: 8px with ":" separator Inter Bold 28px neutral-400.
Flip animation on digit change: rotateX 90→0deg, 300ms ease.

━━━ B14. GRADE DISPLAY ━━━
Hero: 120px progress ring in STI Yellow track + STI Blue fill.
Center: Inter Bold 48px STI Blue score.
Below ring: "/ 100" DM Sans 14px text-tertiary.
Letter grade pill: Inter Bold 16px, colored bg (A=green, B=blue, C=yellow, D=orange, F=red).
Animate: count-up + ring-fill on mount.

Breakdown bars (below hero):
Each criterion: label DM Sans 13px + score Inter Bold 13px right + full-width bar (neutral-100 bg, STI Blue fill, rounded-pill, height 6px).
Bar fill animates left-to-right on mount, 0.8s ease-out, staggered 80ms.

━━━ B15. PANELIST FEEDBACK CARD ━━━
White, rounded-20, shadow-sm, padding 24px.
Top: avatar 48px rounded-full + name Inter Bold 15px + role badge. Right: star rating (5 stars, STI Yellow filled).
Divider #E2E8F0 16px margin vertical.
Comment: DM Sans 14px text-secondary, italic, 4-line clamp (expandable).
Revisions box: #FFFBEB bg, rounded-12, padding 12px 16px, STI Yellow left border 3px.
  Label: Inter Bold 13px "Required Revisions" + amber badge count.
  Items: DM Sans 13px text-secondary bullet list.
Tag pills: neutral-100 bg, DM Sans 11px text-secondary, rounded-pill, row flex-wrap.

━━━ B16. EMPTY STATE ━━━
Centered, max-w 360px, padding 64px 0.
Illustration: abstract geometric shape using neutral-100 + STI Blue/10 + STI Yellow/10.
Inter Bold 20px text-primary headline.
DM Sans 14px text-secondary subtext, centered.
CTA button (primary or ghost) below, 24px gap.

━━━ B17. SKELETON LOADERS ━━━
All cards have skeleton state: grey rounded shapes with shimmer animation.
Show skeleton versions of: stat card · file card · announcement card · checklist item · table row.