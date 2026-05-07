Design the Student Dashboard - Pre-Defense screen for CapstonePH using the established design system.

HEADER: Dark navy top nav — CapstonePH logo left, page title center "My Dashboard", right side: notification bell icon (with yellow dot badge), avatar with "Student" role chip.

LEFT SIDEBAR (240px, dark navy):
Icons + labels:
- 🏠 Dashboard (active — yellow left border)
- 📋 My Checklist
- 📅 Timeline
- 📄 My Manuscript
- 📁 Upload Files
- 🗓️ Defense Info
- 📊 My Grades (locked icon overlay — grayed out pre-defense)
- ↩️ Logout (bottom)

MAIN CONTENT AREA (light blue-grey background):

ROW 1 — Hero Banner (full width):
Dark navy card with yellow geometric accent. Left: "Defense Day" countdown timer component (large yellow digits: 27 Days 14 Hours 32 Min). Right side: yellow pill badge "PRE-DEFENSE", date "May 2, 2025 · 8:00 AM", room "Rm. 301, STI San Fernando". CTA button "View Defense Details →"

ROW 2 — Four Stat Cards (4 columns):
1. Icon: clipboard-check / "Checklist Progress" / "11 / 18 Items" / yellow progress bar
2. Icon: file-text / "Manuscript Status" / "Submitted" / green badge
3. Icon: calendar / "Weeks Remaining" / "3 Weeks" / neutral
4. Icon: users / "Panel Assigned" / "3 Panelists" / blue badge

ROW 3 — Two columns (60/40 split):

LEFT — "My Progress Timeline" card (white, rounded-xl):
Vertical timeline with 5 phases from the Capstone Project 2 schedule:
Phase 1: Research Readiness ✅ (Jan 19 – Feb 8) — complete, filled green node
Phase 2: Project Production ✅ (Feb 9 – Mar 22) — complete
Phase 3: Implementation ✅ (Mar 23 – Apr 12) — complete
Phase 4: Discussion & Endorsement ⏳ (Apr 13 – Apr 25) — current, yellow pulsing node
Phase 5: Defense & Finalization 🔒 (Apr 27 – May 18) — upcoming, outline node
Each item has phase name, date range, and key deliverable text in small DM Sans.

RIGHT — "Manuscript Checklist" card (white, rounded-xl):
Title: "Required Submissions" with count badge "11/18"
List of checklist items using the Checklist Item component:
✅ Chapter I – Introduction
✅ Chapter II – Methodology
✅ Chapter III – Results
⬜ Chapter IV – Discussion (badge: "In Progress")
✅ Endorsement Form (badge: "Required")
⬜ Originality Check Cert (badge: "Required")
⬜ Defense Fee Payment (badge: "Required")
⬜ Working Output/Prototype
Show 8 items then "View Full Checklist →" link in yellow

ROW 4 — Two columns (50/50):

LEFT — "Recent File Uploads" card:
File list with File Upload Card component:
- Manuscript Draft v3.pdf — Uploaded Apr 10 — green "Approved" badge
- Chapter III Data.xlsx — Uploaded Apr 8 — yellow "Pending Review" badge
- Originality Report.pdf — not yet uploaded — dashed "Upload Now" state
"+ Upload New File" button (secondary style)

RIGHT — "Defense Prep Checklist" card:
Quick visual checklist titled "Defense Day Prep":
✅ Corporate Attire ready
✅ Slide deck prepared
⬜ Dry run with adviser scheduled
⬜ Defense room confirmed
⬜ Printed manuscript copies ready (3 copies)
⬜ Signed endorsement form
Each item is a checklist component row with yellow checkbox.

Use generous spacing, 24px card padding, 16px gap between cards. All cards use white bg, rounded-xl, sm shadow.