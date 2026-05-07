Design the "Grade & Feedback" submission form page for a Panelist in CapstonePH.

SAME NAV + SIDEBAR. Active: "Grade & Feedback"

PAGE HEADER:
Breadcrumb: Dashboard › Assigned Groups › Group 1
Title: "Grade Submission" (Bitter Regular 32px)
Group info bar: "Group 1 — The Impact of Visual Storytelling..." | Members: 4 | Defense Date: May 2, 2025

TOP BANNER: Yellow info banner — "⚠️ Grades can be submitted only once. Review carefully before submitting."

TWO COLUMN LAYOUT (55/45):

LEFT COLUMN — Grading Form:

Section 1 — "Scoring Criteria"
Five criteria score inputs, each row:
- Criteria name (DM Sans semibold)
- Description (small, neutral 500)
- Score input: horizontal slider (yellow) + number input box (0–100)
- Weight chip (e.g. "×20%")

Criteria:
1. Manuscript Quality — Completeness, formatting, academic writing — 20%
2. Research Content — Depth of analysis, literature review, methodology rigor — 25%
3. Oral Presentation — Clarity, structure, slide quality — 20%
4. Q&A Performance — Response quality, depth of knowledge — 20%
5. Project Output / Prototype — Technical execution, creativity, impact — 15%

Below sliders: computed "Weighted Score" = running total, large navy number updating dynamically.

Section 2 — "Overall Verdict"
Three large radio cards:
🟢 PASSED
🟡 PASSED WITH REVISIONS
🔴 FAILED
Selected state: colored border, icon filled, label bold.

Section 3 — "Written Feedback"
Textarea (large): "Overall Comments & Observations" — placeholder: "Provide constructive feedback on the group's research, presentation, and output..."
Below: tag-style quick labels to click and auto-append: [Methodology] [Citations] [Data Analysis] [Output Quality] [Presentation Skills]

Section 4 — "Required Revisions" (visible if Passed with Revisions selected):
Dynamic list — "Add Revision Item" button
Each item: text input + panelist-assigned priority (High/Medium/Low dropdown) + delete icon
Can add up to 10 items.

RIGHT COLUMN — Manuscript Preview Panel:
Title: "Manuscript Preview"
Embedded document viewer (grey placeholder with scroll lines indicating pages)
Navigation: "< Prev" / "Page 12 of 64" / "Next >"
Floating action: "Download Full PDF" button
Section bookmarks: Chapter I · II · III · IV (click to jump)

BOTTOM ACTION BAR (fixed/sticky):
Left: "Save as Draft" ghost button
Center: score summary chips showing all 5 criteria scores
Right: "Submit Grade →" primary yellow button (disabled state until all criteria filled and verdict selected)

Confirmation Modal (show as overlay state):
Title: "Confirm Grade Submission"
Summary table: all scores + weighted total + verdict
Warning: "This action cannot be undone."
Buttons: "Cancel" ghost / "Submit Final Grade" yellow primary