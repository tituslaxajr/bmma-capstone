Build the complete CapstonePH design system in Cinematic Dark Premium style.
This is for STI College San Fernando BMMA Capstone Project 2.
Think film festival meets academic portal. Moody, atmospheric, sophisticated.
STI Blue and Yellow are accent colors — used intentionally, not dominantly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPOGRAPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Headings:    Inter Bold (700, 800)
Body / UI:   DM Sans (400, 500, 600)
Mono:        JetBrains Mono (timestamps, codes, version numbers)

Scale:
Display   56px / line-height 1.00 / Inter Bold / letter-spacing -0.03em
H1        44px / 1.05 / Inter Bold / -0.025em
H2        34px / 1.10 / Inter Bold / -0.02em
H3        26px / 1.15 / Inter Bold / -0.015em
H4        20px / 1.20 / Inter Bold / -0.01em
H5        16px / 1.25 / Inter Bold
Body      16px / 1.70 / DM Sans Regular
Small     14px / 1.55 / DM Sans Regular
Caption   12px / 1.40 / DM Sans Medium
Label     11px / 1.20 / DM Sans Medium
  uppercase, letter-spacing 0.08em

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLOR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DARK BACKGROUNDS (page structure):
  Deepest:    #07090F   — page base, hero backgrounds
  Deep:       #0C0F1A   — primary section bg
  Dark:       #111527   — secondary section bg
  Raised:     #161B2E   — card backgrounds
  Elevated:   #1C2238   — elevated cards, active states
  Surface:    #212840   — highest surface, tooltips

BORDERS:
  Hairline:   rgba(255,255,255,0.04)
  Subtle:     rgba(255,255,255,0.07)
  Default:    rgba(255,255,255,0.11)
  Strong:     rgba(255,255,255,0.20)
  Focus:      rgba(77,143,255,0.50)

TEXT:
  Primary:    #EEF0F6   — headlines, key labels
  Secondary:  rgba(238,240,246,0.65)  — body text
  Tertiary:   rgba(238,240,246,0.38)  — captions, meta
  Disabled:   rgba(238,240,246,0.22)
  Inverse:    #07090F

STI ACCENTS (use sparingly — interactive, highlights, key moments):
  Blue:       #4D8FFF   — lightened for dark bg, links, active states, primary CTA
  Blue dim:   rgba(77,143,255,0.12)
  Blue glow:  rgba(77,143,255,0.22)
  Yellow:     #FFD100   — progress, achievements, spotlight moments, primary CTA alt
  Yellow dim: rgba(255,209,0,0.10)
  Yellow glow:rgba(255,209,0,0.25)

SEMANTIC (dark mode):
  Success:  #4ADE80 / bg rgba(74,222,128,0.10) / border rgba(74,222,128,0.20)
  Warning:  #FBBF24 / bg rgba(251,191,36,0.10) / border rgba(251,191,36,0.20)
  Error:    #F87171 / bg rgba(248,113,113,0.10) / border rgba(248,113,113,0.20)
  Info:     #60A5FA / bg rgba(96,165,250,0.10)  / border rgba(96,165,250,0.20)

ROLE COLORS (dark mode):
  Student:     #60A5FA / bg rgba(96,165,250,0.10)
  Panelist:    #A78BFA / bg rgba(167,139,250,0.10)
  Adviser:     #34D399 / bg rgba(52,211,153,0.10)
  Coordinator: #F87171 / bg rgba(248,113,113,0.10)

GRADIENT LIBRARY:
  hero-sweep:    linear-gradient(135deg, #0C0F1A 0%, #111527 100%)
  card-surface:  linear-gradient(145deg, #161B2E 0%, #1C2238 100%)
  blue-glow-bg:  radial-gradient(ellipse at center, rgba(77,143,255,0.12) 0%, transparent 70%)
  yellow-glow-bg:radial-gradient(ellipse at center, rgba(255,209,0,0.10) 0%, transparent 70%)
  text-gold:     linear-gradient(135deg, #FFD100 0%, #FFF5B0 50%, #FFD100 100%)
  text-blue:     linear-gradient(135deg, #4D8FFF 0%, #A0C4FF 100%)
  overlay-dark:  linear-gradient(to bottom, transparent 0%, rgba(7,9,15,0.95) 100%)
  cinematic:     linear-gradient(180deg, rgba(7,9,15,0) 0%, rgba(7,9,15,0.7) 60%, #07090F 100%)

GLASS (dark frosted):
  bg:     rgba(255,255,255,0.04)
  border: rgba(255,255,255,0.08)
  blur:   backdrop-filter blur(16px) saturate(1.8)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ELEVATION & SHADOWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

xs:      0 1px 2px rgba(0,0,0,0.3)
sm:      0 2px 8px rgba(0,0,0,0.35)
md:      0 4px 16px rgba(0,0,0,0.40)
lg:      0 8px 32px rgba(0,0,0,0.45)
xl:      0 16px 48px rgba(0,0,0,0.50)
2xl:     0 32px 64px rgba(0,0,0,0.55)
glow-blue:   0 0 0 1px rgba(77,143,255,0.30),
             0 0 20px rgba(77,143,255,0.15)
glow-yellow: 0 0 0 1px rgba(255,209,0,0.25),
             0 0 24px rgba(255,209,0,0.12)
glow-white:  0 0 0 1px rgba(255,255,255,0.08),
             0 0 16px rgba(255,255,255,0.04)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPACING & RADIUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spacing: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128px
Radius:  4 · 8 · 12 · 16 · 20 · 24px · pill(9999px)
Grid:    12-col · 24px gutter · 1280px max · 40px side padding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANIMATION TOKENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

page-in:       opacity 0→1 + translateY 16px→0, 350ms ease-out
section-in:    opacity 0→1 + translateY 24px→0, 500ms ease-out
card-in:       opacity 0→1 + translateY 12px→0, 400ms ease-out
stagger:       60ms delay per child
card-hover:    translateY -3px + shadow increase, 220ms ease
button-press:  scale 0.96, 100ms
ring-fill:     stroke-dashoffset, 1.4s ease-out, 500ms delay
bar-fill:      width 0→value, 1s ease-out, stagger 80ms
count-up:      0→value, 1.2s ease-out
modal-in:      scale 0.94→1 + opacity, 250ms cubic-bezier(0.34,1.1,0.64,1)
flip-digit:    rotateX 90→0deg, 320ms ease
shimmer:       gradient sweep, 1.8s infinite (skeleton)
fade-blur-in:  opacity 0→1 + blur 8px→0, 400ms ease-out
spotlight:     opacity 0→1, scale 0.8→1, 600ms ease-out (hero moments)
glow-pulse:    box-shadow intensity oscillates, 3s ease-in-out infinite

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT LIBRARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show all components on a single organized dark frame.

C1. NAVIGATION BAR
  Height 64px. bg #07090F on scroll, transparent at top.
  Border-bottom rgba(255,255,255,0.06) on scroll.
  backdrop-filter blur(20px) on scroll.
  Left: "CapstonePH" Inter Bold 18px #EEF0F6.
    + "BMMA · STI SF" DM Sans 10px rgba(255,255,255,0.35) below.
  Center: breadcrumb DM Sans 13px.
  Right: search · bell (dot badge) · avatar 36px + role chip + chevron.
  Role chips: all 4 role color variants, dark mode style.

C2. SIDEBAR
  Width 256px. bg #0C0F1A. border-right rgba(255,255,255,0.06). Full height.
  Nav item: icon 18px + DM Sans 14px, 40px height, 12px 16px padding, rounded-10.
  Default: icon rgba(255,255,255,0.38), text rgba(255,255,255,0.55).
  Hover: bg rgba(255,255,255,0.05), icon rgba(255,255,255,0.70), text #EEF0F6.
  Active: bg rgba(77,143,255,0.10), icon #4D8FFF, text #4D8FFF Inter Bold,
    left border 2px #4D8FFF.
  Section labels: DM Sans 11px rgba(255,255,255,0.30) uppercase letter-spacing 0.08em.
  Bottom: user card bg rgba(255,255,255,0.04) rounded-12.

C3. STAT CARD
  bg card-surface gradient. rounded-20. border subtle. shadow-md. padding 24px.
  hover: card-hover animation + border rgba(255,255,255,0.12).
  Top: label Caption text-tertiary LEFT + icon circle 36px dim bg RIGHT.
  Middle: Inter Bold 36px text-primary value.
  Bottom: trend + sublabel.
  Show 6 variants.

C4. PROGRESS RING
  SVG. Track rgba(255,255,255,0.08). Fill: Blue, Yellow, Success, Error variants.
  Center: Inter Bold percentage + DM Sans 10px label.
  Glow on fill: drop-shadow matching fill color.
  Sizes: 48 · 80 · 120px.
  Animation: ring-fill token.

C5. PROGRESS BAR
  Track: rgba(255,255,255,0.08), rounded-pill, height 6px.
  Fill: Blue default, Yellow achievement, Success complete.
  Glow on fill: box-shadow matching color at 0.3 opacity.
  Label row above: DM Sans 13px text-secondary left + value Inter Bold 13px right.
  Animation: bar-fill token.

C6. TIMELINE
  Vertical line rgba(255,255,255,0.08) 2px.
  Complete node: 12px #4D8FFF fill, white check 8px.
    Completed path segment: #4D8FFF fill animated.
  Current node: 14px #FFD100 fill, white dot center.
    Outer ring: rgba(255,209,0,0.25) scale + fade pulse, 2s loop.
  Upcoming node: 12px rgba(255,255,255,0.12) border.
  Locked node: 10px rgba(255,255,255,0.06), lock icon.
  Label: date chip JetBrains Mono 11px + title Inter Bold 14px + desc DM Sans 12px.
  Stagger animate on mount.

C7. CHECKLIST ITEM
  Row 44px, 12px 16px padding, rounded-10.
  Checkbox: unchecked rgba(255,255,255,0.10) border rounded-6.
    Checked: #4D8FFF bg, white check, check-pop animation.
  Label: text-primary unchecked. text-tertiary + line-through checked.
  Right: status badge + action icon.
  Hover: bg rgba(255,255,255,0.04).
  States: unchecked · checked · in-progress · required · verified.

C8. FILE CARD
  bg Raised. rounded-16. border subtle. padding 16px. Row layout.
  File type icon 40px tinted circle:
    PDF: rgba(248,113,113,0.15) bg, #F87171 icon.
    DOCX: rgba(96,165,250,0.15) bg, #60A5FA icon.
    Google Docs: rgba(66,133,244,0.15) bg, Docs color icon.
    Video: rgba(167,139,250,0.15) bg, #A78BFA icon.
    ZIP: rgba(251,146,60,0.15) bg, #FB923C icon.
    IMG: rgba(52,211,153,0.15) bg, #34D399 icon.
  Middle: Inter Bold 13px filename + DM Sans 11px text-tertiary meta.
  Right: status badge + icon actions (appear on row hover).
  Upload zone: dashed rgba(255,255,255,0.12) border, hover #4D8FFF border.

C9. BADGE / CHIP
  DM Sans Medium 11px uppercase letter-spacing 0.06em.
  Padding 3px 10px. Radius pill.
  All variants: status · verdict · role · priority · phase.
  Dark mode colors as defined above.

C10. ANNOUNCEMENT CARD
  bg Raised. rounded-20. left border 4px per type. padding 20px 24px.
  Types: Urgent #F87171 · Deadline #FBBF24 · Defense #4D8FFF · General rgba(255,255,255,0.20).
  Top: type badge + date text-tertiary.
  Title: Inter Bold 17px text-primary.
  Preview: DM Sans 14px text-secondary, 3-line clamp.
  Unread: bg rgba(77,143,255,0.06) + blue dot 6px.

C11. BUTTONS
  Primary Blue: #4D8FFF bg, #07090F text, Inter Bold 14px, rounded-12, 12px 24px.
    Hover: #6BA3FF bg + shadow glow-blue.
  Primary Yellow: #FFD100 bg, #07090F text, Inter Bold 14px.
    Hover: #FFE040 bg + shadow glow-yellow.
  Secondary: rgba(255,255,255,0.08) bg, rgba(255,255,255,0.14) border, text-primary.
    Hover: rgba(255,255,255,0.12) bg.
  Ghost: transparent, text-secondary. Hover: rgba(255,255,255,0.06) bg.
  Danger: rgba(248,113,113,0.12) bg, rgba(248,113,113,0.25) border, #F87171 text.
  Disabled: opacity 0.35, cursor-not-allowed.
  All: button-press animation. Loading: spinner replaces icon.

C12. INPUTS
  bg rgba(255,255,255,0.05). border rgba(255,255,255,0.10). rounded-12. 12px 16px.
  DM Sans 14px text-primary. Placeholder text-disabled.
  Label: Inter Medium 13px text-secondary above, 6px gap.
  Focus: border rgba(77,143,255,0.50) + glow-blue shadow.
  Error: border rgba(248,113,113,0.50) + error message #F87171 below.
  Success: border rgba(74,222,128,0.40) + check icon.

C13. MODAL
  Backdrop: rgba(4,6,12,0.85) blur(12px).
  Card: bg #161B2E, rounded-24, border rgba(255,255,255,0.08), shadow-2xl.
  Header: Inter Bold 20px text-primary + close X button.
  Body: DM Sans 14px text-secondary.
  Animation: modal-in token.

C14. COUNTDOWN BLOCKS
  Three/four blocks. bg #161B2E. border rgba(255,255,255,0.08). rounded-16.
  Width 80px height 88px. Inter Bold 40px #FFD100.
  Glow: text-shadow 0 0 20px rgba(255,209,0,0.40).
  Label: DM Sans 11px text-tertiary below.
  Separator: ":" Inter Bold 28px rgba(255,255,255,0.20).
  Flip animation per digit change.

C15. EMPTY STATE
  Centered. Abstract dark illustration placeholder.
  Inter Bold 20px text-primary headline.
  DM Sans 14px text-secondary subtext.
  CTA button below. 64px padding vertical.

C16. SKELETON LOADER
  bg rgba(255,255,255,0.06) shapes. Shimmer: lighter gradient sweep.
  Show variants: stat card · file card · table row · checklist item.