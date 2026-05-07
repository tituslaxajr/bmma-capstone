Design the "Groups & Teams" management page AND "Panelist Assignment" page for the Coordinator in CapstonePH.

FRAME 1 — Groups & Teams Page:

SAME NAV + SIDEBAR. Active: "Groups & Teams"

PAGE HEADER:
Title: "Groups & Teams" (Bitter Regular 32px)
Right: yellow button "+ Create New Group"

LAYOUT: Card grid — 4 columns, groups as cards.

Each Group Card (white, rounded-xl, sm shadow):
- Top left: Group number badge (yellow circle, bold — "Group 3")
- Top right: status badge (Pre-Defense / Defense Ready / Graded / Archived)
- Project title (DM Sans semibold, 2 lines max): "The Impact of Visual Storytelling in Coastal Tourism Awareness"
- Project type pill: e.g. "Short Film" / "Social Media Campaign" / "Photo Exhibit"
- Divider
- Members section: row of 4 circular avatars with initials, "+ Add Member" ghost chip at end
- Adviser row: small avatar + "Adviser: Prof. Reyes"
- Panelists row: 3 small avatars or "No panelist assigned yet" in red warning
- Progress bar: labeled "Overall Progress" — yellow filled bar — "67%"
- Bottom: two buttons — "Manage →" ghost / "Assign Panelist →" yellow secondary

MANAGE GROUP MODAL (separate frame):
Title: "Manage Group 3"
Tabs: Members | Project Details | Submission Settings

MEMBERS TAB:
List of current members with avatar, name, email, remove icon.
"+ Add Student" search dropdown at bottom.
Assign Adviser dropdown.

PROJECT DETAILS TAB:
- Group Number (auto)
- Project Title (text input)
- Project Type (dropdown): Short Film · Photo Exhibit · Social Media Campaign · Infographic Series · Documentary · Other
- Project Description (textarea)
- Client/Partner Organization (text input)
- Adviser (dropdown)

SUBMISSION SETTINGS TAB (key feature):
Title: "Configure Project Submission Type"
Description: "Each group's final project output may be submitted differently based on their medium."
Submission Type selector — large radio cards:
🎬 Video Upload — "Upload MP4/MOV file directly (max 2GB)"
🔗 YouTube / Vimeo Link — "Submit a link to uploaded video"
📸 Photo Gallery Upload — "Upload ZIP of high-res photos or individual JPEGs"
🌐 Website / Portfolio Link — "Submit URL to live website or Behance/portfolio"
📦 ZIP Archive — "Upload a compressed folder of all project files"
📝 Google Drive Link — "Submit a shared Google Drive folder link"
🎮 Other / Custom — "Coordinator specifies instructions manually" → shows custom instruction textarea

Below selector: "Submission Instructions" textarea — coordinator can add specific notes per group.
Save button: "Save Configuration" yellow primary.

---

FRAME 2 — Panelist Assignment Page:

SAME NAV + SIDEBAR. Active: "Assignments"

PAGE HEADER:
Title: "Panelist Assignments" (Bitter Regular 32px)
Subtitle: "Assign panelists to defense groups"

TWO COLUMN LAYOUT (55/45):

LEFT — Groups Needing Assignment:
Card list of groups. Each row:
- Group # badge + project title
- Current panelists: "2 of 3 assigned" with avatar chips + "1 missing" red badge
- "Assign Panelist" yellow secondary button

Show groups sorted: incomplete assignments first (red badge), complete groups below (green).

RIGHT — "Assign Panelist" Panel (triggered by clicking button, shown as active state):
Title: "Assigning to: Group 3"
Project title shown (DM Sans, italic)
Current Panel:
  - Lead Panelist: dropdown (from list of panelists) — currently "Prof. Tan"
  - Panel Member 1: dropdown — currently "Prof. Cruz"
  - Panel Member 2: dropdown — empty, red "Required" label
Availability notes per panelist (small text): "Prof. Santos — already assigned to 3 groups"
Warning if a panelist is assigned to too many groups: yellow alert strip.
"Save Assignments" yellow primary button.

ASSIGNMENT SUMMARY TABLE below (full width, white card):
Columns: Group | Project Title | Lead Panelist | Member 1 | Member 2 | Status
All 8 groups listed.
Status: ✅ Complete / ⚠️ Incomplete (1 missing) / 🔴 Unassigned