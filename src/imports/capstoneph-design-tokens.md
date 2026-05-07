Build the CapstonePH design system for STI College San Fernando BMMA Capstone Project 2.

━━━ TYPOGRAPHY ━━━
Headings: Inter Bold (700, 800)
Body/UI: DM Sans (400, 500, 600)
Mono: JetBrains Mono (timestamps, versions)

Scale:
Display  52px / line-height 1.05 / Inter Bold
H1       40px / 1.1  / Inter Bold
H2       32px / 1.15 / Inter Bold
H3       24px / 1.2  / Inter Bold
H4       20px / 1.25 / Inter Bold
H5       16px / 1.3  / Inter Bold
Body     16px / 1.6  / DM Sans Regular
Small    14px / 1.5  / DM Sans Regular
Caption  12px / 1.4  / DM Sans Medium
Label    11px / 1.2  / DM Sans Medium uppercase letter-spacing 0.08em

━━━ COLOR SYSTEM — Neutral-first. STI colors = ACCENTS only ━━━

Backgrounds:
Page bg:        #F7F8FC
Surface:        #FFFFFF
Surface raised: #F1F4F9
Surface hover:  #F8FAFC

Borders:
Subtle:   #E2E8F0
Default:  #CBD5E1
Strong:   #94A3B8

Text:
Primary:   #0F172A
Secondary: #475569
Tertiary:  #94A3B8
Disabled:  #CBD5E1
Inverse:   #FFFFFF

STI Accent — Blue (use for: CTAs, active states, links, key icons):
Blue 900:  #003087  ← primary brand
Blue 700:  #1D4ED8  ← hover states
Blue 500:  #3B82F6  ← lighter interactive
Blue 100:  #DBEAFE  ← tinted backgrounds
Blue 50:   #EFF6FF  ← subtle tints

STI Accent — Yellow (use for: progress, highlights, achievements, warnings):
Yellow 400: #FFD100  ← primary brand
Yellow 300: #FDE047  ← lighter
Yellow 100: #FEF9C3  ← tinted backgrounds
Yellow 50:  #FFFBEB  ← subtle tints

Neutrals:
50:  #F8FAFC
100: #F1F5F9
200: #E2E8F0
300: #CBD5E1
400: #94A3B8
500: #64748B
600: #475569
700: #334155
800: #1E293B
900: #0F172A

Semantic:
Success:  text #16A34A / bg #F0FDF4 / border #BBF7D0
Warning:  text #D97706 / bg #FFFBEB / border #FDE68A
Error:    text #DC2626 / bg #FEF2F2 / border #FECACA
Info:     text #0284C7 / bg #F0F9FF / border #BAE6FD

Role colors (use for badges + sidebar active states):
Student:     #2563EB / bg #EFF6FF
Panelist:    #7C3AED / bg #F5F3FF
Adviser:     #059669 / bg #ECFDF5
Coordinator: #DC2626 / bg #FEF2F2

━━━ ELEVATION / SHADOWS ━━━
xs:  0 1px 2px rgba(15,23,42,0.04)
sm:  0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)
md:  0 4px 6px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.04)
lg:  0 10px 15px rgba(15,23,42,0.07), 0 4px 6px rgba(15,23,42,0.04)
xl:  0 20px 25px rgba(15,23,42,0.08), 0 8px 10px rgba(15,23,42,0.04)
glow-blue:   0 0 0 3px rgba(0,48,135,0.12)
glow-yellow: 0 0 0 3px rgba(255,209,0,0.18)

━━━ SPACING ━━━
Base unit 4px: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128

━━━ BORDER RADIUS ━━━
xs: 4px · sm: 8px · md: 12px · lg: 16px · xl: 20px · 2xl: 24px · pill: 9999px

━━━ GRID ━━━
12 columns · 24px gutter · 1280px max-width · 40px side padding
Breakpoints: mobile 375px · tablet 768px · desktop 1280px

━━━ ANIMATION TOKENS (annotate on design system frame) ━━━
page-in:       opacity 0→1 + translateY 12px→0, 300ms ease-out
card-hover:    translateY 0→-2px + shadow increase, 200ms ease
button-press:  scale 1→0.97, 100ms ease
ring-fill:     stroke-dashoffset full→0, 1.2s ease-out, 400ms delay
check-pop:     scale 0→1.15→1, 250ms cubic-bezier(0.34,1.56,0.64,1)
count-up:      value interpolate 0→target, 1s ease-out
modal-in:      scale 0.95→1 + opacity 0→1, 200ms ease-out
stagger:       children each +60ms delay, fade + translateY 8px→0
shimmer:       bg gradient sweep left→right, 1.5s ease infinite (skeleton loading)
flip-digit:    rotateX 90→0deg per digit change, 300ms ease
pulse-ring:    scale 1→1.6 + opacity 1→0, loop 1.8s infinite (current timeline node)
slide-in-right: translateX 20px→0 + opacity 0→1, 250ms ease-out