Design all Student-facing pages for CapstonePH using design system from Sections A–B.
All pages share the nav bar and student sidebar from Section B.
Page background: #F7F8FC. Content max-width 1280px, 40px side padding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D1. STUDENT DASHBOARD (Pre-Defense)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page greeting — no card, just text on bg:
  "Good morning, Juan 👋" Inter Bold 28px text-primary.
  "Here's your capstone snapshot." DM Sans 15px text-secondary, 4px below.
  Right: defense countdown chip "27 days left · May 2, 2025" STI Blue bg white Inter Bold 13px rounded-pill shadow-sm.
  Animate: fade-in 300ms on load.

ROW 1 — Four stat cards (stagger animate on load):
  1. Checklist — 48px progress ring (STI Blue, 61%) + "11/18" Inter Bold 32px + "items complete" text-tertiary.
  2. Manuscript — document icon (STI Blue, 36px tint bg) + "Submitted" Inter Bold 20px + green "Approved by Coordinator" badge.
  3. Working Doc — Google Docs icon + "Active" Inter Bold 20px + "Adviser commented 2d ago" DM Sans 12px text-tertiary.
  4. Consultation — clock icon (emerald) + "12 hrs logged" Inter Bold 20px + emerald progress bar 12/14 + "2 hrs remaining" caption.

ROW 2 — Full width defense countdown card:
  Background: #0F172A rounded-24 shadow-lg overflow hidden.
  THREE.JS canvas inside card (contained, z-index 0):
    Slow morphing mesh — two blobs, one STI Blue #003087 opacity 0.2, one STI Yellow #FFD100 opacity 0.15.
    Use THREE.js r128 PlaneGeometry with vertex displacement via sine waves.
    Animation: vertices oscillate slowly, unique frequency per vertex.
    NOT distracting — purely atmospheric depth.
  Overlaid content (z-index 1, padding 32px 40px):
    Left: "Final Defense" DM Sans 12px STI Yellow uppercase label + "May 2, 2025" Inter Bold 36px white + "Friday · 8:00 AM · Room 301 · STI San Fernando" DM Sans 14px white/60.
    Center: three countdown blocks from B13 (Days 27 / Hours 14 / Min 32). Flip animation active.
    Right: ghost white-border button "Defense Details →" + "👔 Corporate Attire Required" yellow chip below.

ROW 3 — Two columns 58/42:
  LEFT: Phase Timeline card — white, rounded-20, shadow-sm, padding 28px.
    Header: "Your Journey" Inter Bold 18px + "Phase 4 of 5" neutral chip right.
    Five timeline phases (B5 component):
      ✅ Phase 1: Research Readiness — Jan 19–Feb 8 — "Baseline data collected"
      ✅ Phase 2: Project Production — Feb 9–Mar 22 — "Prototype complete"
      ✅ Phase 3: Implementation — Mar 23–Apr 12 — "Rollout executed"
      ⏳ Phase 4 CURRENT: Discussion & Endorsement — Apr 13–25 — "Finalize Ch. IV + endorsement" — yellow pulse node
      🔒 Phase 5: Defense & Finalization — Apr 27–May 18 — locked node, muted text
    Nodes stagger animate on mount.

  RIGHT: Submission Checklist card — white, rounded-20, shadow-sm, padding 24px.
    Header: "Required Submissions" Inter Bold 18px + "11/18" STI Yellow bg Inter Bold 12px rounded-pill right.
    Tab bar: "Documents" | "Manuscript" | "Admin" — underline style, STI Blue active.
    Active tab content (Documents):
      Checklist items (B6) with status:
      ✅ Endorsement Form · green "Verified" badge
      ✅ Chapters I–III · green "Submitted"
      ⬜ Chapter IV · amber "In Progress"
      ⬜ Originality Certificate · red "Missing"
      ⬜ Defense Fee Receipt · red "Missing"
      ✅ Peer Evaluation · green "Submitted"
      ✅ Consultation Forms · green "Up to date"
    "View Full Checklist →" STI Blue 13px link right-aligned, 16px margin-top.

ROW 4 — Three columns 33/33/33:
  Card 1 "Recent Files": file list 3 items using B7 rows. "+ Upload" blue ghost button top-right.
  Card 2 "Deadlines": list with colored date chips (red=overdue, amber=soon, blue=upcoming). Today item highlighted.
  Card 3 "From Coordinator": 2 announcement previews (B9 compact). Unread dot. "View All →" link.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D2. MANUSCRIPT & SUBMISSIONS PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "Manuscript & Submissions" Inter Bold 32px. DM Sans 14px text-secondary subtitle.
Three-tab bar (pill style, larger): "📝 Working Manuscript" · "📄 Pre-Defense PDF" · "📦 Project Output"

TAB 1 — Working Manuscript (Google Docs):
  Info banner (Info color): Google Docs icon + "This is your in-progress draft. Your adviser and coordinator can view and comment. This is NOT your final submission." Dismiss X.

  Google Docs Link card — white rounded-24 shadow-sm padding 32px:
    Left: Google Docs logo 48px colored.
    Right: 
      "Link Your Working Manuscript" Inter Bold 20px.
      Three-step instruction (numbered, DM Sans 14px text-secondary):
        1. Open Google Doc → Share → "Anyone with link can comment"
        2. Paste the shareable link below
        3. Adviser and coordinator are notified automatically
      Input row: text input "Paste Google Docs link..." + "Submit Link" primary button inline.
    
    Submitted state variant (separate frame):
      Green "✅ Link Active" badge + "Last updated April 10, 2025".
      Document name: Inter Bold 15px.
      Two buttons: "Open in Google Docs ↗" (ghost) + "Update Link" (ghost).

  Comment Activity card — white rounded-20 shadow-sm padding 24px below:
    "Recent Comments" Inter Bold 18px.
    Three comment rows:
      Avatar (initials circle, role color) + name Inter Bold 14px + role badge + "2 days ago" caption right.
      Quoted snippet: STI Yellow left border 3px, italic DM Sans 13px text-secondary, #FFFBEB bg, rounded-8 padding 8px 12px.
      Comment: DM Sans 14px text-secondary below quote.
      "Open in Doc →" STI Blue 12px link.
    "View All in Google Docs →" STI Blue link bottom-right.

TAB 2 — Pre-Defense PDF:
  Deadline banner (Warning color if < 7 days): "⚠️ Submission Deadline: April 25, 2025 · 7 days remaining"

  Requirements card — white rounded-20 shadow-sm padding 28px:
    "Pre-Defense Submission Requirements" Inter Bold 20px.
    Subtext: "One complete PDF — all chapters (I–IV) + all appendices. Distributed to all panelists 1 week before defense."
    Divider.
    Checklist confirmation grid (2 columns):
      ✅ Chapter I — Introduction
      ✅ Chapter II — Methodology
      ✅ Chapter III — Results
      ⬜ Chapter IV — Discussion
      ✅ Appendices compiled
      ✅ Originality Check Certificate
      ✅ AI Declaration page
      ⬜ Professional Editing Certification
    Warning: "All items must be confirmed before upload activates." DM Sans 12px text-tertiary italic.

  Upload zone card — white rounded-20 shadow-sm padding 40px:
    Large dashed zone: neutral-200 dashed border 2px, rounded-20, padding 60px 40px, text-center.
    PDF icon 64px STI Blue/20 bg circle, #DC2626 icon.
    "Drop complete manuscript PDF here" Inter Bold 18px text-secondary.
    "or click to browse" DM Sans 13px text-tertiary STI Blue link.
    Requirement pills row: "PDF only" · "All chapters + appendices" · "Max 50MB".
    Disabled state (not all checklist checked): overlay opacity-50, cursor-not-allowed.

  Submitted state variant:
    File card: PDF icon + "Group3_FinalManuscript_Apr22.pdf" Inter Bold + "4.2 MB · 87 pages" caption.
    Status row: "Coordinator: ⏳ Under Review" amber · "Panel: Sent to 3 panelists Apr 23" green.
    Actions: Download icon + "Replace" ghost danger (with confirm modal).

TAB 3 — Project Output:
  Group context banner: "Group 3 · Short Film" Inter Bold 16px + project title DM Sans 14px text-secondary.
  Coordinator instructions card: STI Yellow left border 4px, #FFFBEB bg, rounded-16 padding 16px 20px.
    "Submission Instructions from Coordinator" Inter Bold 14px amber + instruction text below.

  Submission type shown (configured by coordinator — show 3 state variants):
  
  VARIANT A — Video Upload:
    Upload zone: video icon (purple), "Upload MP4 or MOV · Max 2GB" primary text + secondary "H.264 codec, minimum 1080p".
    Progress bar state: blue filled, filename + % + cancel icon.
    Metadata: Runtime · Resolution · Final Title inputs below.
    Optional: "YouTube/Vimeo backup link" text input.

  VARIANT B — Link Submission (website/portfolio):
    URL input full-width + "Validate Link" secondary button inline.
    Validation success state: green border + "✅ Link accessible" message.
    Screenshot upload: "Upload 3 project screenshots" — row of 3 dashed image slots (equal width).
    Backup link optional field.

  VARIANT C — Google Drive Folder:
    Google Drive logo 40px + instructions.
    Folder link input + submit.
    Shared access confirmation checkbox.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D3. DEFENSE INFO PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "Defense Details" Inter Bold 32px + "Pre-Defense" blue pill badge + "May 2, 2025" date chip right.

Defense overview card — #0F172A bg rounded-24 overflow-hidden:
  THREE.JS canvas inside: same morphing mesh from D1 countdown card, same specs.
  Three columns of info over dark bg, padding 32px 40px:
    Col 1: calendar icon (STI Yellow 32px) + "May 2, 2025" Inter Bold 36px white + "Friday" DM Sans 14px white/50 + "Oral Defense Presentation" DM Sans 14px white/70.
    Col 2: clock icon (STI Yellow) + "8:00 AM – 12:00 PM" Inter Bold 24px white + "Deliberation follows" DM Sans 13px white/50.
    Col 3: map-pin icon (STI Yellow) + "Room 301" Inter Bold 24px white + "STI College San Fernando" DM Sans 13px white/50.
  Bottom strip: #1E293B bg border-top border-white/10 padding 14px 40px: "👔 Corporate/Business Attire is mandatory" DM Sans 13px white/70 centered.

Row — Three columns 33/33/33:
  Card 1 "Assigned Panel": white rounded-20 shadow-sm.
    Three panelist rows (B15 avatar style, compact):
      Avatar 40px + name Inter Bold 14px + role badge (Lead Panelist / Panel Member) + department DM Sans 12px text-tertiary.
    Divider between rows.

  Card 2 "Defense Day Schedule": white rounded-20 shadow-sm.
    Title "Schedule" Inter Bold 18px.
    Timeline rows (icon node style, compact):
      8:00 AM | Report to Room 301
      8:15 AM | Manuscript Presentation (15 min)
      8:30 AM | Output/Demo Viewing (10 min)
      8:40 AM | Panel Q&A (20 min)
      9:00 AM | Deliberation (closed)
      9:20 AM | Verdict Announcement
      Time: JetBrains Mono 13px STI Blue. Event: DM Sans 14px text-primary. Duration: DM Sans 11px text-tertiary.

  Card 3 "Possible Verdicts": white rounded-20 shadow-sm.
    Three verdict rows, each with colored left border 4px:
      🟢 PASSED — "Proceed to final approval and archive."
      🟡 PASSED WITH REVISIONS — "Max 5 days for panel-listed revisions."
      🔴 FAILED — "Consult adviser for next steps."
      Icon + Inter Bold 14px label + DM Sans 13px text-secondary.

Defense Prep Guide card — white rounded-20 shadow-sm padding 28px:
  "How to Prepare" Inter Bold 20px.
  Six icon tiles in 3×2 grid:
    Each tile: white bg border #E2E8F0 rounded-16 padding 20px, icon 32px (tinted circle), Inter Bold 14px label, DM Sans 12px text-tertiary description.
    📄 3 Printed Copies · 💻 Slide Deck Ready · 🎭 Dry Run Done · 👔 Dress Code · ⏱️ Time Management · 📦 Output Ready
  Hover: translateY(-2px) shadow-md.
  Stagger animate on scroll-enter.

Important Deadlines card — full width white rounded-20 shadow-sm padding 28px:
  "Upcoming Deadlines" Inter Bold 20px.
  Timeline (B5 component, horizontal scroll on mobile):
    Apr 18 ⚠️ Defense Fee · Apr 25 ⚠️ Manuscript Submit · May 2 🎯 Defense Day · May 9 Revisions · May 16 Final Approval · May 23 Archive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D4. POST-DEFENSE: MY RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "Defense Results" Inter Bold 32px + "Defense Complete" green pill badge + "Defended May 2, 2025" DM Sans 14px text-secondary.

Verdict hero card — full width rounded-24 overflow-hidden:
  Left 60%: white bg padding 40px.
    Green checkmark 64px circle (success bg + success icon).
    "PASSED WITH REVISIONS" Inter Bold 36px success green, 12px margin-top.
    "Complete all panel revisions by May 9, 2025" DM Sans 16px text-secondary.
    Two metric chips in row: "87.5 / 100 Overall Score" · "Grade: B+" — Inter Bold, colored bg.
  Right 40%: #F0FDF4 bg (success tint), centered.
    THREE.JS contained canvas:
      Celebration particles — small circles and triangles in STI Blue, STI Yellow, success green.
      Float upward slowly with rotation, opacity fade out at top.
      Gentle, tasteful — not overdone.
      Use THREE.js r128 Points + custom ShaderMaterial or simple PointsMaterial.

Row — Two columns 50/50:
  LEFT "Score Breakdown": white rounded-20 shadow-sm padding 28px.
    120px grade display ring (B14 component): "87.5" STI Blue count-up + STI Yellow ring + "B+" letter grade.
    Criteria bars below (animated on mount, stagger 80ms each):
      Manuscript Quality   88 ━━━━━━━━━━━━━━━━━━░░
      Research Content     90 ━━━━━━━━━━━━━━━━━━━░
      Oral Presentation    85 ━━━━━━━━━━━━━━━━━░░░
      Q&A Performance      82 ━━━━━━━━━━━━━━━░░░░░
      Project Output       92 ━━━━━━━━━━━━━━━━━━━━

  RIGHT "Panel Decision": white rounded-20 shadow-sm padding 28px.
    "Panel Voting" Inter Bold 18px.
    Three panelist rows:
      Avatar + name + role + individual verdict badge + score chip.
      Prof. Tan · Lead Panelist · Passed with Revisions · 86/100
      Prof. Cruz · Panel Member · Passed · 89/100
      Prof. Reyes · Panel Member · Passed with Revisions · 88/100
    Divider.
    "Final Verdict: Majority Decision" DM Sans 12px text-tertiary italic.

Full width — Three feedback cards (B15 component, 3 columns):
  Each card shows unique panelist feedback + required revisions.

Revision checklist card — full width white rounded-20 shadow-sm STI Yellow top border 4px padding 28px:
  "Required Revisions" Inter Bold 20px + amber badge count "5 items".
  "Complete all items and submit to your adviser by May 9, 2025" DM Sans 14px text-secondary.
  Checklist items (B6), initially unchecked:
    ⬜ Strengthen Discussion section with literature comparison (Panelist: Prof. Tan) — High priority
    ⬜ Add statistical test justification in Chapter II (Prof. Tan) — High
    ⬜ Revise Conclusion to answer all Capstone Questions (Prof. Cruz) — Medium
    ⬜ Fix APA citation formatting throughout (Prof. Reyes) — Medium
    ⬜ Complete Appendix G — AI Declaration (Prof. Reyes) — Low
  Progress mini-bar as items get checked.
  "Submit to Adviser" primary button — disabled until all checked.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D5. POST-DEFENSE ARCHIVE CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "Post-Defense Archive" Inter Bold 32px + "Finalization Phase" neutral-700 pill badge.
Deadline: "Final deadline: May 23, 2025" DM Sans 14px text-secondary right.

Hero progress card — white rounded-24 shadow-sm padding 32px 40px:
  Left: archive box icon 64px (neutral-700 bg #F1F5F9 tint, 20px inside).
  Center: 80px progress ring (STI Blue, animated) "4/9" Inter Bold 28px center + "Complete" DM Sans 11px.
  Right: "Final step before you're done!" Inter Bold 18px text-primary + DM Sans 14px text-secondary + deadline chip.

Archive items list (white card rounded-20 shadow-sm padding 0 — items are rows):
  Each item row: 72px height, 24px 28px padding, border-bottom last:none.
  Left: status icon (checkmark circle green / clock amber / empty grey / lock grey).
  Content: Inter Bold 15px label + DM Sans 13px text-secondary description.
  Right: status badge + upload action or view icon.

Items:
  1. ✅ Revisions Completed — "Confirmed by adviser May 7" — green verified
  2. ✅ Approval Sheet Obtained — "Scanned copy uploaded" — green + view icon
  3. ✅ Final Manuscript Finalized — "v3 uploaded May 8" — green + download
  4. ⏳ Hardbound Copy Submitted — "Submit to library/coordinator" — amber "Pending" + upload proof button
  5. ⏳ Soft Copy to STI Library — "Upload to research outputs portal" — amber + link input
  6. ⬜ Peer Evaluation Form — "Upload signed form" — grey + dashed upload zone (expandable)
  7. ⬜ Consultation Forms Compiled — "All weekly forms bundled" — grey + upload
  8. 🔒 Final Grade Released — "Available after items 1–7 complete" — locked, muted
  9. 🔒 Certificate of Completion — "Download official certificate" — locked, certificate thumbnail blurred

Expand row on click to show upload zone or link input for pending items.
Progress ring updates as items complete.

Item 9 unlocked state (separate frame): certificate thumbnail unblurred, golden shimmer border animation, "Download Certificate" accent yellow button.