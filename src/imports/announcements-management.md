Design the "Announcements" management page for the Coordinator AND the student-facing announcement view in CapstonePH.

FRAME 1 — Coordinator: Manage Announcements

SAME NAV + SIDEBAR. Active: "Announcements"

PAGE HEADER:
Title: "Announcements" (Bitter Regular 32px)
Right: yellow button "+ Post Announcement"

FILTER BAR: Search input + Type dropdown (All / Deadline / General / Urgent / Defense) + Status (All / Published / Draft / Archived)

ANNOUNCEMENT LIST (white card, full width):
Each announcement row:

[Priority pill] [Type badge] | Title (DM Sans semibold 16px) | Posted date | Audience pill | Status | Actions

Row examples:
🔴 URGENT · Deadline | "Defense Fee Payment — Last Day Today" | Apr 18 | All Students | ● Published | Edit · Archive
🟡 Deadline | "Final Manuscript Submission Due April 25" | Apr 15 | All Students | ● Published | Edit · Archive
🔵 General | "Defense Room Assignments Posted" | Apr 20 | All Students | ● Published | Edit · Archive
⚪ General | "Reminder: Corporate Attire Required" | Apr 22 | All Students | Draft | Edit · Publish · Delete

Type badge colors:
- URGENT: red
- Deadline: amber
- Defense: navy
- General: blue-grey

Audience pills: All Students / Specific Group / Panelists / Advisers / All Users

Row hover: light yellow tint. Actions: pencil (edit), archive icon, trash (draft only).

CREATE/EDIT ANNOUNCEMENT MODAL:
Title: "Post New Announcement"
Fields:
- Announcement Title (text input, required)
- Message Body (rich text area — support bold, bullet list, link)
- Type (radio row): General · Deadline · Urgent · Defense Info
- Priority (toggle): Normal / High — if High, shows red banner on announcement
- Audience (multi-select chips): All Students · All Panelists · All Advisers · Specific Groups...
  If "Specific Groups" checked: show multi-select dropdown of all groups
- Pin to top toggle (keeps it at top of student feed)
- Schedule: "Post Now" OR "Schedule for later" (date-time picker shown if scheduled)
Buttons: "Save as Draft" ghost / "Publish Now" yellow primary

---

FRAME 2 — Student View: Announcements Feed

SAME STUDENT NAV + SIDEBAR. Active nav item: 📢 Announcements (add this to student sidebar).

PAGE HEADER:
Title: "Announcements" (Bitter Regular 32px)
Subtitle: "From your Capstone Coordinator"

PINNED SECTION (yellow bg strip at top, full width):
Pinned announcement card:
📌 Pin icon + "PINNED" label
Title: "Defense Room Assignments — May 2, 2025"
Body preview (2 lines)
"Read More →" link
Date + "Posted by Coordinator"

ANNOUNCEMENT CARDS list below:
Each card (white, rounded-xl, left colored border):
- Top: type badge + date (right aligned)
- Title: Bitter Regular 18px
- Body: 3-line preview in DM Sans 14px
- "Read More" expand chevron
- Unread cards: slight yellow-tinted bg + blue dot indicator top-right

Expanded state (same card, expanded):
Full message body shown.
If has deadline: "⏰ Deadline: April 25, 2025" yellow chip appears.
Mark as read button disappears once opened.