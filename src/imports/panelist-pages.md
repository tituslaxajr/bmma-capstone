Design all Panelist-facing pages for CapstonePH using design system from Sections A–B.
All pages use nav bar with "Panelist" purple role chip and panelist sidebar.

Panelist sidebar items:
[layout-dashboard] Dashboard
─── MY ASSIGNMENTS ───
[folder] Assigned Groups
[file-text] View Manuscripts
─── DEFENSE ───
[edit-3] Grade & Feedback
[check-square] Submitted Grades
─── ───
[settings] Settings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E1. PANELIST DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Greeting: "Good morning, Prof. Santos" Inter Bold 28px + "You have 3 groups to review for the May 2 defense." DM Sans 15px text-secondary.

Three stat cards:
  1. 3 Groups Assigned — folder icon purple tint
  2. 3/3 Manuscripts Received — file icon green tint
  3. 1/3 Grades Submitted — check icon amber tint

Two columns 65/35:
  LEFT "Assigned Groups" card — white rounded-20 shadow-sm padding 0:
    Header row: "Your Defense Groups" Inter Bold 18px padding 24px + "May 2, 2025" date chip.
    Three group rows (border-bottom):
      Padding 20px 24px each.
      Left: "Group 1" yellow circle badge Inter Bold 13px.
      Content: project title Inter Bold 15px (2-line clamp) + project type pill + "4 members" DM Sans 12px text-tertiary.
      Member avatars: row of 4 initials circles 28px.
      Status column: manuscript badge + grade badge.
      Actions: "View Manuscript" ghost + "Grade Group" primary — appear on row hover or always visible.

  RIGHT "Defense Schedule" card — white rounded-20 shadow-sm padding 24px:
    "May 2 Schedule" Inter Bold 18px.
    Three schedule blocks:
      8:00 AM · Group 1 · Room 301 — "Upcoming" blue pill
      9:30 AM · Group 2 · Room 301 — "Upcoming" blue pill
      11:00 AM · Group 3 · Room 301 — "Upcoming" blue pill
      Time JetBrains Mono 14px STI Blue, group Inter Bold 14px, room DM Sans 12px text-tertiary.

Manuscript Review Queue card — full width white rounded-20 shadow-sm:
  Header: "Manuscripts for Review" Inter Bold 18px padding 24px.
  Three manuscript cards in 3-col grid (inside card, padding 0 24px 24px):
    Each: #F8FAFC bg rounded-16 border #E2E8F0 padding 20px.
    STI Blue top accent bar 3px.
    File icon 40px (PDF, red tint).
    Group + project title Inter Bold 14px.
    "Submitted April 22 · 87 pages" DM Sans 12px text-tertiary.
    Two buttons: "Preview" ghost (eye icon) + "Download" ghost (download icon).
    Status badge: "Reviewed" green / "Unread" red.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2. GRADE & FEEDBACK FORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Breadcrumb + "Grade Submission — Group 1" Inter Bold 28px.
Context bar: project title DM Sans 14px text-secondary + "4 members" + "Defended May 2, 2025" — all chips.
Warning banner: amber "⚠️ Grades can only be submitted once. Review carefully."

Two columns 55/45 (sticky columns on scroll):

LEFT — Grading form:
  "Scoring Criteria" section — white rounded-20 shadow-sm padding 28px:
    Five criteria rows (generous spacing, 20px gap each):
      Criterion row: Inter Bold 14px label + DM Sans 12px text-secondary description.
      Weight chip right: "20%" neutral pill.
      Below: horizontal slider (STI Blue thumb + filled track, neutral-200 empty) + score input 64px right (Inter Bold 18px).
      Weighted contribution shown: "17.6 pts" DM Sans 11px text-tertiary below input.
      Criteria:
        Manuscript Quality (20%)
        Research Content (25%)
        Oral Presentation (20%)
        Q&A Performance (20%)
        Project Output / Prototype (15%)
    Divider.
    "Weighted Score" row: Inter Bold 20px text-primary "87.5 / 100" + updates live + animated count-up on change.
    Mini breakdown bar row (compact version of B14 bars).

  "Verdict" section — white rounded-20 shadow-sm padding 24px margin-top 16px:
    Three verdict radio cards (full width stacked):
      Each: rounded-16 border #E2E8F0 padding 16px 20px cursor pointer.
      Left: colored dot 12px + Inter Bold 15px label.
      Right: DM Sans 13px text-secondary description.
      Selected: colored border 2px + colored/10 bg.
      🟢 PASSED · 🟡 PASSED WITH REVISIONS · 🔴 FAILED

  "Written Feedback" section — white rounded-20 shadow-sm padding 24px margin-top 16px:
    Textarea: min 140px, all input specs from B11. Placeholder: "Provide constructive, specific feedback..."
    Quick-tag row: clickable chips auto-append topic. Chips: [Methodology] [Citations] [Data Analysis] [Output Quality] [Presentation] [Chapter IV] [Conclusion].
    Char count bottom-right DM Sans 11px text-tertiary.

  "Required Revisions" section (visible only if Passed with Revisions selected, slide-down animation):
    white rounded-20 shadow-sm padding 24px margin-top 16px:
    "List all required revisions" Inter Bold 16px.
    Dynamic list: each item = text input + priority dropdown (High/Medium/Low) + delete icon.
    "+ Add Revision Item" ghost button with plus icon.
    Max 10 items.

RIGHT — Manuscript preview (sticky):
  white rounded-20 shadow-sm.
  Header: "Manuscript Preview" Inter Bold 16px padding 20px + "Download PDF" ghost icon button right.
  Preview area: #F1F5F9 bg, dotted subtle, centered document viewer placeholder (shows page lines suggesting text).
  Page nav: "< Prev" · "Page 12 of 87" JetBrains Mono 13px · "Next >" centered.
  Chapter bookmarks: tab row at top of preview — "Ch. I" "Ch. II" "Ch. III" "Ch. IV" "Appendices" — click to jump, STI Blue active underline.
  Note below: DM Sans 12px text-tertiary "Open in full screen ↗" STI Blue link.

Sticky bottom action bar (white border-top #E2E8F0 shadow-xl 64px height):
  Left: "Save Draft" ghost button.
  Center: score summary chips — all 5 criterion scores shown as small colored chips.
  Right: "Submit Grade →" primary STI Blue — disabled until all criteria filled + verdict selected.

Confirmation modal (B12 component, destructive variant):
  Score summary table + verdict display + "This cannot be undone" warning + Cancel/Submit.