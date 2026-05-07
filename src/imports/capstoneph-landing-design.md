Design the CapstonePH public landing page in Cinematic Dark Premium style.
Full dark mode throughout. No light sections.
Think film festival opener meets academic showcase — sophisticated, atmospheric,
confident. The work of BMMA students should look like it belongs on a stage.

All design tokens from the Cinematic Dark Design System above.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL PAGE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Full dark mode. Page bg #07090F. No white or light sections anywhere.
2. Section rhythm: alternate #07090F and #0C0F1A — subtle depth shift only.
3. All section transitions: matching darks bleed together seamlessly.
   No visible dividers — cinematic vertical scroll.
4. Scroll progress bar: fixed top 0, 2px height, #4D8FFF fill, glow-blue shadow.
5. Smooth scroll: lerp-based custom JS, 0.08 factor.
6. Custom cursor (desktop):
   Inner dot: 5px #FFD100. Outer ring: 26px rgba(255,209,0,0.35) border 1.5px.
   Ring follows with lerp 0.09. On hover interactive: ring scale 44px.
   On CTA hover: ring fills rgba(255,209,0,0.06).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAV BAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Height 72px. Fixed top. z-index 100.
Transparent at page top.
On scroll: bg rgba(7,9,15,0.82) backdrop-blur(20px),
  border-bottom rgba(255,255,255,0.06). Transition 350ms.

Left: "CapstonePH" Inter Bold 20px #EEF0F6.
  "BMMA · STI San Fernando" DM Sans 10px text-tertiary, 3px below.

Center: DM Sans Medium 14px text-secondary, gap 36px.
  Hover: #EEF0F6, 150ms.
  Active scroll section: #4D8FFF.
  Links: "About" · "Groups" · "Outputs" · "Defense Day" · "Faculty"

Right: "Enter Portal →"
  bg #FFD100, #07090F text, Inter Bold 13px, rounded-pill, 8px 22px.
  Hover: scale(1.04) + shadow glow-yellow. 200ms.

Mobile: hamburger → overlay nav, bg #07090F, links centered large.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HERO SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Height 100vh min. bg #07090F. Overflow hidden.

THREE.JS HERO SCENE (full canvas, z-index 0):

  LAYER 1 — Starfield:
    450 particles. THREE.js r128 Points + BufferGeometry.
    PointsMaterial vertexColors: true.
    Per particle: size 0.5–3px, randomized.
    Colors: 65% white opacity 0.12–0.45, 20% #4D8FFF opacity 0.10–0.28,
      15% #FFD100 opacity 0.08–0.22.
    Motion: unique drift vector per particle, speed 0.006–0.020.
    Wrap at bounds.
    Mouse parallax: lerp 0.04, shift ±16px.

  LAYER 2 — Floating geometry (cinematic — NOT game-like):
    12 shapes. Spread throughout scene, not clustered.
    All MeshBasicMaterial wireframe=true, transparent=true.
    4× IcosahedronGeometry radius 10–35, #4D8FFF opacity 0.15
    4× OctahedronGeometry radius 8–22, #FFD100 opacity 0.08
    4× BoxGeometry 12–28, white opacity 0.04
    Each: unique rotation speed all axes (very slow, 0.0005–0.004 rad/frame).
    Position: sine wave oscillation, unique frequency + amplitude.
    Mouse: subtle repel within 150px, max 25px, lerp 0.03.
    No OrbitControls. THREE.js r128. No CapsuleGeometry.

  LAYER 3 — Ground plane:
    PlaneGeometry 1000×300, 80×20 segments. Rotation.x -0.25.
    Position y -200.
    MeshBasicMaterial wireframe=true, color #003087, opacity 0.03.
    Vertex y displacement: sin(time×0.4 + vertex.x×0.08) × 3.
    Slow forward roll: mesh.position.z += 0.05 per frame, reset at +150.

  CAMERA: PerspectiveCamera fov 72. Scene auto-rotation: 0.00010 rad/frame on y.

VIGNETTE OVERLAYS (z-index 1, pointer-events none):
  Full coverage: radial transparent center → rgba(7,9,15,0.65) edges.
  Bottom cinematic fade:
    linear-gradient bottom 40%: transparent → #07090F. Height 350px.
  Top thin fade: 80px linear #07090F → transparent.

HERO CONTENT (z-index 2, centered max-width 860px, padding 0 40px):
  Vertical center with slight upward offset (padding-top 60px).
  All stagger fade-up on load, 90ms between each:

  1. Program chip (delay 0ms):
    Frosted glass dark pill. bg rgba(255,255,255,0.04),
    border rgba(255,255,255,0.10), backdrop-blur(12px), rounded-pill, padding 8px 20px.
    STI shield icon 13px text-tertiary + "STI College San Fernando · BMMA Program"
    DM Sans Medium 12px text-tertiary. Centered.

  2. Main headline (delay 90ms):
    Inter Bold 82px, line-height 0.90, text-center.
    "Capstone" — color #EEF0F6.
    "Project 2" — gradient text-gold, -webkit-background-clip text.
    Glow: filter drop-shadow(0 0 40px rgba(255,209,0,0.18)).
    Responsive: 60px tablet, 44px mobile.

  3. Year/program tag (delay 180ms):
    "AY 2025–2026 · Bachelor of Multimedia Arts" DM Sans 16px text-tertiary. Centered.
    Letter-spacing 0.03em.

  4. Subheadline (delay 270ms):
    "Where research meets creative excellence.
    Eight groups. Twenty-four researchers. One defense day."
    DM Sans 20px rgba(238,240,246,0.52), text-center, max-width 560px, line-height 1.65.

  5. Three stat chips (delay 360ms–480ms stagger):
    Frosted glass. bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08).
    backdrop-blur, rounded-20, padding 16px 28px.
    Icon 22px text-tertiary + Inter Bold 34px #EEF0F6 + DM Sans 12px text-tertiary.
    Hover: bg rgba(255,255,255,0.07), border rgba(255,255,255,0.13), translateY(-2px).
    "8 Groups" · "24 Researchers" · "May 2, 2025"

  6. CTA buttons (delay 570ms):
    Row centered, gap 12px.
    Primary: "Explore Projects ↓" — #FFD100 bg, #07090F Inter Bold 15px,
      rounded-14, 14px 32px.
      Shadow: 0 4px 24px rgba(255,209,0,0.25).
      Hover: shadow 0 8px 32px rgba(255,209,0,0.40), scale(1.04).
    Secondary: "Enter Portal →" — glass style bg rgba(255,255,255,0.06),
      border rgba(255,255,255,0.12), #EEF0F6 Inter Bold 14px, rounded-14, 14px 28px.
      Hover: bg rgba(255,255,255,0.10).

  7. Scroll indicator (absolute bottom 32px, delay 800ms):
    chevron-down 20px text-disabled, bounce animation.
    "Scroll to explore" DM Sans 10px text-disabled, 6px below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABOUT SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #0C0F1A. Section padding 100px 40px.
Seamless from hero — both dark, subtle bg shift.

Two columns 50/50, align center, gap 80px.
Scroll-triggered: both fade-up on enter, 150ms stagger.

LEFT:
  Eyebrow: "About the Capstone" DM Sans Medium 12px uppercase #4D8FFF,
    letter-spacing 0.10em. 2px left border #4D8FFF. Padding-left 14px.
  Headline: "Where Research Meets Creative Excellence."
    Inter Bold 44px #EEF0F6, line-height 1.08, margin-top 16px.
  Body DM Sans 16px text-secondary line-height 1.80:
    Para 1: "The BMMA Capstone Project 2 is the culminating academic requirement
    for Bachelor of Multimedia Arts students at STI College San Fernando. Each
    group undertakes original research, develops a multimedia solution, deploys
    it in a real-world context, and defends their findings before a panel."
    Para 2: "Projects span short films, photo exhibits, social media campaigns,
    infographic series, and documentary productions — all grounded in research
    methodology and community impact."
  Four stat cards 2×2 grid (margin-top 32px):
    Each: bg rgba(255,255,255,0.03), border rgba(255,255,255,0.07), rounded-20,
    padding 20px 24px. Hover: bg rgba(255,255,255,0.06), translateY(-2px).
    Icon 26px #4D8FFF + Inter Bold 30px #EEF0F6 + DM Sans 13px text-secondary.
    "18 Weeks" · "4 Chapters" · "3 Panelists" · "1 Defense Day"

RIGHT:
  Visual card. bg #0C0F1A → #161B2E gradient. rounded-24.
  border rgba(255,255,255,0.07). overflow hidden. aspect 4/3.

  THREE.JS CONTAINED (z-index 0):
    8 shapes: IcosahedronGeometry + OctahedronGeometry only.
    4× #003087 wireframe opacity 0.22. 4× #FFD100 wireframe opacity 0.12.
    Autonomous slow rotation. No mouse interaction.
    THREE.js r128. No OrbitControls.

  Overlay content (z-index 1, padding 28px, absolute positioned):
    Bottom left corner:
      "BMMA · Bachelor of Multimedia Arts" Inter Bold 15px #EEF0F6.
      "STI College San Fernando · AY 2025–2026" DM Sans 12px text-secondary.
      Three program pills (margin-top 12px):
        bg rgba(77,143,255,0.10), border rgba(77,143,255,0.20), rounded-pill.
        DM Sans 11px #60A5FA: "Research-Based" · "Multimedia" · "Community"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROUP SHOWCASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #07090F. Section padding 100px 40px.
Background texture: 1px dot grid rgba(255,255,255,0.012), 32px spacing, CSS only.

Section header (text-center, margin-bottom 64px):
  Label chip: bg rgba(77,143,255,0.08), border rgba(77,143,255,0.20),
    #4D8FFF DM Sans Medium 12px, rounded-pill, padding 6px 16px.
  Headline: "The Research Groups" Inter Bold 52px #EEF0F6, margin-top 16px.
    Glow: radial blue-glow-bg behind headline, 300px.
  Subtext: "8 teams. 24 researchers. One shared defense."
    DM Sans 18px text-secondary.

FILTER BAR (centered, margin-bottom 44px):
  Pill group, single-select:
  Default: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08),
    DM Sans 13px text-secondary, rounded-pill, 8px 20px.
  Hover: bg rgba(255,255,255,0.07), text-primary.
  Active: bg #4D8FFF, #07090F text Inter Bold.
  Pills: "All" · "Short Film" · "Photo Exhibit" · "Social Media" · "Documentary" · "Infographic"

GROUP CARDS — 4 col desktop, 2 tablet, 1 mobile. Gap 20px.
Scroll stagger: 65ms per card.

Each GROUP CARD:
  bg card-surface gradient. rounded-24. border subtle. overflow hidden.
  Hover: translateY(-6px) shadow-xl, border rgba(255,255,255,0.12), 250ms.

  TOP VISUAL (height 200px):
    Background per type — all dark, atmospheric:
      Short Film:    #0A0010 → #150020 (deep indigo)
      Photo Exhibit: #001012 → #001C1E (dark teal)
      Social Media:  #0E0018 → #180028 (deep purple)
      Documentary:   #001008 → #001A10 (dark forest)
      Infographic:   #120800 → #201200 (dark amber)

    THREE.JS micro-scene (canvas covers panel, z-index 0):
      Activate on hover only. 6 particles per card. Matching type accent color.
      PointsMaterial size 2.5px. Slow drift. Fade in/out on hover/leave.
      THREE.js r128. No OrbitControls.

    Project type icon (z-index 1, centered):
      48px white opacity 0.10.

    META (z-index 2):
      Top-left: "Group N" DM Sans 10px rgba(255,255,255,0.35), padding 14px 16px.
      Top-right: type pill — bg rgba(0,0,0,0.50) border rgba(255,255,255,0.10)
        DM Sans 10px rgba(255,255,255,0.60), rounded-pill.
      Bottom-left: gradient overlay 80px + status badge.

  BOTTOM (padding 20px 24px):
    Project title Inter Bold 17px #EEF0F6, line-height 1.3, 3-line clamp.
    Research area DM Sans 13px text-secondary, 2-line clamp, margin-top 6px.
    Divider rgba(255,255,255,0.06), margin 14px 0.
    Members: 4 avatar circles 26px, border rgba(255,255,255,0.10).
    Bottom row: "View Project →" #4D8FFF DM Sans 13px +
      status badge right (green/amber/neutral dark style).

GROUP DETAIL MODAL:
  Backdrop rgba(4,6,12,0.88) blur(14px).
  Card bg #111527, rounded-28, border rgba(255,255,255,0.07), shadow-2xl. 940px max.
  Two columns 45/55.
  Left: project type bg + Three.js scene (20 particles, 3 shapes, always active).
    Project identity, members, title overlaid.
  Right: bg #161B2E, padding 36px.
    All labels: DM Sans 10px text-tertiary uppercase letter-spaced.
    Content: text-primary headlines, text-secondary body.
    Project title · Abstract · Team · Adviser · Output section · Status.
    Locked output: bg #0C0F1A rounded-16, lock icon #FFD100 dim,
      "Output available after defense · May 2, 2025" text-tertiary.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT OUTPUTS SHOWCASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #0C0F1A. Section padding 100px 40px. Overflow hidden.

THREE.JS SECTION AMBIENT (full section canvas, z-index 0):
  THREE.js r128. No OrbitControls.
  3 PlaneGeometry blobs, all vertex-displaced sine waves:
    #003087 opacity 0.10 · #FFD100 opacity 0.06 · #1E0040 opacity 0.05.
  80 micro-stars, white opacity 0.05, static.

Section header (text-center margin-bottom 60px):
  Label: "Project Outputs" chip #FFD100 style.
  Headline: "See What They Made" Inter Bold 52px #EEF0F6.
    Glow: yellow-glow-bg behind, 250px.
  Subtext DM Sans 18px text-secondary.

HORIZONTAL SCROLL: snap scroll, drag, arrows, dot pagination.
Cards 300px × 440px. Show 3.5 on desktop.

Each OUTPUT CARD:
  Dark type gradient bg. Rounded-22. border subtle.
  THREE.js 8 particles, always active. THREE.js r128. No OrbitControls.
  Top 55%: icon + overlay gradient.
  Bottom 45% bg #111527, padding 20px:
    "Guild N" text-tertiary caption.
    Title Inter Bold 15px #EEF0F6.
    Type pill + "View →" #4D8FFF link.

Arrows: circles bg rgba(255,255,255,0.05), border rgba(255,255,255,0.08).
  Chevron rgba(255,255,255,0.55). Hover: bg rgba(255,255,255,0.10) + white.
Dots: #4D8FFF active (glow), rgba(255,255,255,0.18) inactive.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEFENSE DAY SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #07090F. Section padding 100px 40px.

Section header text-center margin-bottom 64px:
  Label chip: bg rgba(248,113,113,0.08), border rgba(248,113,113,0.20),
    #F87171 DM Sans 12px, rounded-pill.
    "Final Defense · May 2, 2025"
    Glow: box-shadow 0 0 20px rgba(248,113,113,0.10).
  Headline: "The Final Presentation" Inter Bold 52px #EEF0F6, margin-top 16px.
  Subtext: "Every group presents their research, output, and findings
    before a panel of evaluators." DM Sans 18px text-secondary.

TWO COLUMNS 55/45, align center:

LEFT:
  "TIME REMAINING" Label text-tertiary uppercase, margin-bottom 14px.
  Countdown blocks row — 4 blocks Days/Hours/Min/Sec (C14).
  Numbers: #FFD100 Inter Bold 52px, glow.
  Block bg #161B2E. border rgba(255,209,0,0.10).
  "May 2, 2025 · 8:00 AM" Inter Bold 15px text-primary below, margin-top 20px.
  "Room 301 · STI College San Fernando" DM Sans 13px text-secondary.

  Info rows (4 rows, margin-top 32px):
    Each: bg rgba(255,255,255,0.03), border subtle, rounded-14, padding 14px 18px.
    Icon circle 32px dim bg + icon 14px text-secondary.
    Inter Bold 14px text-primary + DM Sans 13px text-secondary inline.
    📅 Date · 🕗 Time · 📍 Venue · 👔 Attire

RIGHT:
  Defense card: bg #0C0F1A, rounded-24, border subtle, overflow hidden, aspect 3/4.
  TOP 40%: bg #07090F.
    THREE.js 10 particles + 2 shapes. STI Blue + Yellow wireframe.
    THREE.js r128. No OrbitControls.
    Overlaid: "Final Defense" Inter Bold 22px #EEF0F6 center +
      "BMMA Capstone Project 2" DM Sans 13px text-tertiary.
  BOTTOM 60%: bg #111527, padding 28px.
    "DEFENSE SCHEDULE" Label text-tertiary.
    Timeline (6 items): JetBrains Mono 12px #4D8FFF time + DM Sans 13px text-primary event.
    Connector rgba(255,255,255,0.06) vertical line.
    "👔 Corporate Attire Required" warning chip bottom.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTAL CTA SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #0C0F1A. Section padding 80px 40px.

Center card: bg #111527, border rgba(255,255,255,0.07), rounded-28,
  padding 60px 80px, max-width 680px, margin auto.
  Box-shadow: 0 0 80px rgba(77,143,255,0.05).

THREE.JS inside card (contained, z-index 0):
  30 particles: STI Blue + STI Yellow + white, very slow upward drift.
  PointsMaterial. THREE.js r128. No OrbitControls.

Content (z-index 1, text-center):
  "Ready to Begin?" Inter Bold 48px #EEF0F6, line-height 1.1.
    Glow: radial blue-glow-bg behind headline.
  "Sign in to track your progress, submit your manuscript,
  and prepare for your final defense."
  DM Sans 18px text-secondary, margin-top 14px, max-width 460px, margin-x auto.

  Info chips row (margin-top 28px, 3 chips):
    bg rgba(255,255,255,0.04), border rgba(255,255,255,0.07), rounded-pill.
    DM Sans 12px text-secondary.
    "📋 Track Progress" · "📄 Submit Manuscript" · "🛡️ Defense Ready"

  CTA row (margin-top 32px, centered, gap 12px):
    Primary: "Enter Portal →" — #FFD100 bg #07090F text Inter Bold 15px,
      rounded-14, 14px 36px. Shadow glow-yellow. Hover scale(1.04).
    Secondary: "Learn More ↓" — glass style, secondary button spec.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACULTY SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #07090F. Section padding 100px 40px.

Header text-center margin-bottom 52px:
  Label chip neutral. Headline: "Program Faculty & Panel" Inter Bold 44px #EEF0F6.
  Subtext DM Sans 18px text-secondary.

ROW A — 3 faculty cards centered:
  bg rgba(255,255,255,0.03), border rgba(255,255,255,0.06), rounded-24, padding 36px, text-center.
  Hover: bg rgba(255,255,255,0.05), translateY(-3px), 200ms.
  Avatar 76px circle, role-color bg dim, Inter Bold 22px #EEF0F6, ring rgba(255,255,255,0.10).
  Name Inter Bold 17px #EEF0F6, 12px below.
  Title badge: role-color bg dim, DM Sans 12px role-color, rounded-pill.
  Dept DM Sans 12px text-tertiary.

ROW B — 5 panelist cards, margin-top 20px:
  Smaller: bg rgba(255,255,255,0.02), border rgba(255,255,255,0.05), rounded-20, padding 20px.
  Hover: bg rgba(255,255,255,0.04), translateY(-2px).
  Avatar 48px, Panelist purple ring.
  Name Inter Bold 14px #EEF0F6. "Panelist" badge. Dept text-tertiary.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOOTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bg #04060C (deepest grounding). Padding 80px 40px 36px.
Border-top rgba(255,255,255,0.04).

TOP ROW two columns 60/40, margin-bottom 56px:
  LEFT:
    "CapstonePH" Inter Bold 22px #EEF0F6.
    "BMMA Capstone Project 2 · AY 2025–2026" DM Sans 12px text-tertiary, margin-top 8px.
    "STI College San Fernando" DM Sans 13px text-secondary, margin-top 4px.
    Description DM Sans 14px text-tertiary, max-width 340px, margin-top 16px, line-height 1.7:
      "The official capstone portal for Bachelor of Multimedia Arts students.
      Where researchers become creators."
    Social icons row: 36px circles bg rgba(255,255,255,0.04),
      border rgba(255,255,255,0.07). Icon text-tertiary.
      Hover: bg rgba(255,255,255,0.09), icon #EEF0F6.

  RIGHT (two link columns, gap 48px):
    "THE PORTAL" label + Student · Panelist · Coordinator login links.
    "QUICK LINKS" label + About · Groups · Outputs · Defense Day.
    Labels: Inter Bold 11px text-tertiary uppercase letter-spacing 0.10em.
    Links: DM Sans 14px text-secondary. Hover: #EEF0F6 + #4D8FFF underline.

BOTTOM ROW (border-top rgba(255,255,255,0.04), padding-top 28px, space-between):
  "© 2025 STI College San Fernando. All rights reserved." DM Sans 12px text-tertiary.
  "BMMA Program · STI San Fernando" DM Sans 12px text-tertiary.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL PAGE ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scroll reveals (Intersection Observer 0.12):
  Section headers: section-in token.
  Group cards: stagger card-in, 65ms per card.
  Output cards: slide-in from right, 90ms stagger.
  Faculty cards: stagger card-in 55ms.
  Two-col layouts: 150ms stagger between columns.
  CTA card: scale 0.92→1 + opacity, 400ms.
  Countdown blocks: stagger 80ms per block.

Parallax (CSS, requestAnimationFrame):
  Hero headline: scrollY × 0.20.
  Hero stat chips: scrollY × 0.12.
  Section ambient Three.js: activate on scroll-enter, pause on exit.
  Hero Three.js: always active.

Three.js performance:
  Group card micro-scenes: hover only. Shared renderer per section.
  Output card scenes: always active (showpiece).
  Section ambients: scroll-activated.
  Visibility API: pause all when tab not visible.
  Max total particles on screen at once: ~600. Cap enforced.