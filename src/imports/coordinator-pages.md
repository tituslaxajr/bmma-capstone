Design all Coordinator-facing pages for CapstonePH using design system from Sections A–B.
Nav bar: "Coordinator" red role chip. Use coordinator sidebar from Section B.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F1. COORDINATOR DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Good morning, Ma'am Reyes 👋" Inter Bold 28px + "BMMA Capstone Project 2 · AY 2025–2026" DM Sans 15px text-secondary.

Five stat cards (stagger animate):
  1. 24 Total Students — users icon blue tint
  2. 8 Active Groups — layers icon neutral
  3. 5 Defense Ready — shield-check icon green tint (endorsed + fee paid)
  4. 6 Pending Submissions — clock icon amber tint
  5. 2 Fully Archived — archive icon neutral-700 tint

Two columns 60/40:
  LEFT "Group Progress Overview" — white rounded-20 shadow-sm:
    Header: "All Groups" Inter Bold 18px padding 24px + filter chips "All · Pre-Defense · Defense Ready · Graded" right.
    Table rows (8 groups), each row:
      Group badge (yellow circle) + project title (2-line clamp Inter Bold 14px) + type pill + adviser chip + status badge + "View →" ghost link.
      Hover: #F8FAFC row bg.
    Pagination or "View All →" below.

  RIGHT "Key Dates" — white rounded-20 shadow-sm padding 24px:
    "Deadlines" Inter Bold 18px.
    Date list:
      🔴 Today — Defense Fee Last Day
      🟡 Apr 25 (7d) — Manuscript Submission
      🔵 May 2 (14d) — Final Defense
      ⚫ May 9 — Revision Deadline
      ⚫ May 16 — Final Approval
      ⚫ May 23 — Archive Deadline
    Row: colored left border dot + date JetBrains Mono 12px STI Blue + task DM Sans 14px text-primary + days-remaining chip.
    "📢 Post Announcement" yellow accent button full-width bottom.

Three columns 33/33/33 below:
  Card "Activity Feed": avatar + action + timestamp, 5 items, STI Blue vertical left border accent.
  Card "Submission Donut": Submitted & Approved (14) / Pending (6) / Missing (4). Donut chart using three colors. Legend below. Animate segments on mount.
  Card "Quick Actions": 2x2 grid of icon action buttons:
    ➕ Add User · 👥 Create Group · 📋 Assign Panel · 📢 Announce
    Each: white bg border-subtle rounded-16 padding 20px centered icon (36px tinted) + Inter Bold 13px label. Hover: tinted bg + shadow-sm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F2. USER MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "User Accounts" Inter Bold 32px. "+ Add User" primary button right.

Tab bar: "All (24)" · "Students (16)" · "Panelists (5)" · "Advisers (3)"

Filter bar — white rounded-16 shadow-sm padding 16px 20px:
  Search input left (magnifier icon) + Role dropdown + Status dropdown + Group dropdown.
  "Export" ghost button + download icon right.

User table — white rounded-20 shadow-sm:
  Header row: #F8FAFC bg, DM Sans 11px uppercase text-tertiary letter-spaced.
  Columns: User (avatar+name+email) · Role · Group · Adviser · Status · Actions.
  Row height 56px, 20px 24px padding.
  Avatar: 32px circle with initials, bg tinted per role color.
  Name: Inter Bold 14px. Email: DM Sans 12px text-tertiary.
  Role badge: B8 component per role color.
  Status: green dot "Active" or grey dot "Inactive".
  Actions: pencil icon + toggle icon, appear on row hover.
  Row hover: #F8FAFC bg.
  Pagination: "Showing 1–10 of 24" + page buttons.

Add User Modal (B12 + form):
  Fields: Full Name · STI Email · Role (4 large radio cards with role colors) · Assign Group (if student) · Assign Adviser (if student) · Department (if panelist/adviser) · Password Setup radio.
  Role radio cards: icon + label + description, selected = role-color border + tint bg.

Edit User Modal: pre-filled form + role change warning banner + "Deactivate Account" danger button bottom-left.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F3. GROUPS & TEAMS + PANELIST ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRAME A — Groups & Teams:
Header: "Groups & Teams" Inter Bold 32px. "+ Create Group" primary right.
View toggle: grid/list icons top-right.

Group cards grid (4 columns):
  White rounded-20 shadow-sm border-subtle padding 24px hover:-2px shadow-md.
  Top row: "Group 3" yellow circle Inter Bold + status badge right.
  Project title Inter Bold 16px (2-line clamp), 8px margin.
  Project type pill + type icon.
  Divider.
  Members row: 4 avatar circles 28px + "+ Add" ghost chip. "Adviser: Prof. Reyes" DM Sans 12px text-tertiary below.
  Panel row: 3 avatar chips or "⚠️ No panelist assigned" red caption.
  Progress bar: "Overall Progress" DM Sans 11px + "67%" + yellow filled bar neutral-100 track.
  Two buttons full-width: "Manage" ghost · "Assign Panel →" secondary.

Manage Group Modal — three tabs:
  MEMBERS tab: member list + remove icon + "+ Add Student" search. Assign Adviser dropdown.
  PROJECT DETAILS tab: Group # · Project Title · Project Type dropdown (Short Film / Photo Exhibit / Social Media Campaign / Infographic / Documentary / Other) · Client Organization · Description.
  SUBMISSION SETTINGS tab:
    "Configure Project Output Submission" Inter Bold 18px.
    Submission type cards (6 options in 3x2 grid):
      🎬 Video Upload · 🔗 Video Link · 📸 Photo Gallery · 🌐 Website/Portfolio · 📦 ZIP Archive · 📝 Google Drive
      Each: rounded-16 border, icon 32px + label Inter Bold 14px + description DM Sans 12px text-secondary.
      Selected: STI Blue border 2px + #EEF2FF bg.
    Custom instructions textarea below.

FRAME B — Panelist Assignment:
Header: "Panelist Assignments" Inter Bold 32px + overall completion chip.

Two columns 50/50:
  LEFT "Groups Needing Assignment": card list sorted — incomplete first (red badge) then complete (green).
    Each row: group badge + title + "2/3 assigned" status + avatar chips + "Assign →" button.

  RIGHT "Assignment Panel" (active on row click):
    "Assigning to: Group 3" header + project title italic.
    Three role dropdowns: Lead Panelist · Panel Member 1 · Panel Member 2.
    Each dropdown: search-able, shows panelist name + "X groups assigned" workload chip.
    Overloaded warning: amber chip if panelist assigned to 4+ groups.
    "Save Assignments" primary button.

Assignment summary table below: all 8 groups with panelist columns and completion status.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F4. ANNOUNCEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRAME A — Coordinator View:
Header: "Announcements" Inter Bold 32px. "+ Post Announcement" primary right.
Filter: search + Type dropdown + Status dropdown.

Announcement list (white rounded-20 shadow-sm):
  Header row: #F8FAFC border-bottom.
  Each row: priority dot + type badge + title Inter Bold 15px + posted date DM Sans 12px + audience pill + status chip + actions (edit/archive/delete).
  Types: 🔴 Urgent / 🟡 Deadline / 🔵 Defense / ⚪ General.
  Hover: #F8FAFC bg, actions visible.
  Draft rows: slightly muted.

Create/Edit Announcement modal (B12 full width):
  Title input (large, 18px) · Type radio row · Message body (rich textarea) · Audience multi-select chips · Priority toggle · Pin toggle · Schedule radio (Now / Later → datetime picker).
  "Save Draft" ghost + "Publish Now" primary.

FRAME B — Student Announcement Feed:
Header: "Announcements" Inter Bold 32px.

Pinned card: #FFFBEB bg border STI Yellow, rounded-20, padding 20px 24px.
  "📌 Pinned" caption + "Defense Room Assignments Posted" Inter Bold 18px + preview text + "Read More →" STI Blue link.

Announcement list below (B9 cards, full width, stacked, 12px gap):
  Left border colored by type.
  Unread: #F8FAFC bg + blue dot.
  Read: white bg.
  Expanded state: full content + deadline chip.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F5. ARCHIVE & RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header: "Archive & Records" Inter Bold 32px.
Filter bar: search + Status + Group filters.

Archive status table — white rounded-20 shadow-sm:
  Columns: Group · Project Title · Revisions · Approval Sheet · Hardbound · Soft Copy · Peer Eval · Consult Forms · Status
  Cell states:
    ✅ green checkmark (verified)
    ⏳ amber clock (uploaded, awaiting verification)
    ⬜ grey empty (not submitted)
    🔴 red dot (overdue)
  Row status badge: "Complete" green / "In Progress" amber / "Overdue" red.
  Click row: expand to show detail panel below row.

Bulk action bar (bottom sticky, appears when rows selected):
  Left: "X groups selected" + "Clear" link.
  Right: "Release Final Grades" primary (disabled if incomplete) + "Send Reminder" ghost + "Export" ghost.