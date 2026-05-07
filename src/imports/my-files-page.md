Design the "My Manuscript & Files" page for CapstonePH student portal using the design system.

SAME NAV + SIDEBAR as dashboard. Active sidebar item: "Upload Files"

PAGE HEADER (inside content area):
Breadcrumb: Dashboard › My Files
Title in Bitter Regular 32px: "Manuscript & Project Files"
Subtitle DM Sans 14px neutral 500: "Upload and manage your capstone project documents"
Right side: yellow primary button "+ Upload File"

SECTION 1 — Manuscript Chapters (full width card, white):
Title: "Manuscript Chapters" with info icon tooltip: "Submit each chapter as individual PDF files"
Grid of 4 chapter cards (2x2):

Each Chapter Card:
- Yellow top accent bar (4px)
- Icon: file-text (blue)
- Label: "Chapter I" large, "Introduction" subtitle
- Upload status: green pill "Uploaded" OR dashed upload zone
- File name when uploaded: "Capstone_Ch1_Final.pdf"
- Date uploaded
- Actions: eye icon (view), download icon, trash icon
- For missing: dashed border, upload icon, "Drop PDF here or click to upload" text

Show: Ch I ✅, Ch II ✅, Ch III ✅, Ch IV ⬜ (upload state)

SECTION 2 — Required Documents (full width card, white):
Title: "Required Documents"
Table-style list layout, each row:
| Document Name | Status | Uploaded Date | File | Actions |
Rows:
- Endorsement Form | ✅ Approved | Apr 11 | endorsement_form.pdf | view/download
- Originality Check Certificate | ⏳ Pending | Apr 18 | originality_cert.pdf | view/download
- Defense Fee Receipt | ⚠️ Missing | — | — | Upload button
- Peer Evaluation Form | ✅ Approved | Mar 15 | peer_eval.pdf | view/download
- Consultation Form | ✅ Approved | ongoing | consult_log.pdf | view/download
- Project Brief | ✅ Approved | Feb 3 | project_brief.pdf | view/download

Status badges use color system: green=Approved, yellow=Pending, red=Missing

SECTION 3 — Project Output Files (full width card):
Title: "Final Project Output"
Large upload zone (dashed border, rounded-xl):
Upload icon (yellow, 48px), "Upload your final multimedia output"
Subtext: "Accepted formats: MP4, MOV, ZIP, PDF — Max 500MB"
OR if uploaded: file card with thumbnail placeholder, file name, size, upload date

SECTION 4 — Upload History (collapsible card):
Timeline of all upload activity, newest first:
Apr 18 · 2:34 PM — originality_cert.pdf uploaded
Apr 11 · 10:15 AM — endorsement_form.pdf approved by Adviser
Apr 10 · 8:00 PM — Capstone_Ch3_Final.pdf uploaded

Use clean table-like rows, alternating row bg (white / neutral-50), icons left, actions right.