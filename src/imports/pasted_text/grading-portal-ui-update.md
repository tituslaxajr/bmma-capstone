Update the BMMA Capstone Project 2 grading portal UI with the following 
changes based on the updated guideline GU-CRD-032-04 (eff. July 30, 2025).

SCHOOL: STI College San Fernando | Program: Bachelor of Multimedia Arts (BMMA)

───────────────────────────────────────────
1. GRADE COMPOSITION BREAKDOWN CARD
───────────────────────────────────────────
Display a visual breakdown card showing three grade components with weights:

  • Defense Activity Grade      60%
      └ Group Grade             60% of defense
          - Capstone Project Paper/Proposal
          - Multimedia Output / Final Project
          - Oral Defense Presentation
      └ Individual Grade        40% of defense
          - Communication Skills
          - Work Organization
          - Effectiveness

  • Capstone Project Adviser's Grade   30%
      └ Attendance to weekly submission   15%
      └ Participation in discussion       25%
      └ Project involvement               60%

  • Capstone Project Coordinator's Grade   10%
      └ Performance of assigned tasks   20%
      └ Submission of requirements      80%

Use a horizontal stacked bar or donut chart. Color palette: 
deep navy (#1F3864) for Defense, steel blue (#2E75B6) for Adviser, 
light blue (#D6E4F0) for Coordinator.

───────────────────────────────────────────
2. FINAL DEFENSE VERDICT TABLE
───────────────────────────────────────────
Replace the old grade equivalent table with a new verdict table.
Display as a clear, color-coded status table:

  Score 92–100  →  PASS                     (green badge)
  Score 82–91   →  Pass with Minor Revision  (yellow/amber badge)
  Score 60–81   →  Re-demonstration          (orange badge)
  Below 60 / Not endorsed by Adviser → FAIL  (red badge)

Add a note below the table:
"After re-defense: Grade is either Passed (3.00) or Failed (5.00). 
Failure in the defense means failure in the course."

───────────────────────────────────────────
3. PANELIST SCORING FORM / INPUT SECTION
───────────────────────────────────────────
Update the defense scoring panel to reflect two sections:

SECTION A – Group Evaluation (out of 100 pts, determines verdict)
  Row inputs for each criterion:
    • Chapter III – Results                    Max: 25 pts
    • Chapter IV – Discussion                  Max: 20 pts
    • Project Prototype / Multimedia Output    Max: 25 pts
    • Oral Defense Presentation                Max: 15 pts
    • Response to Panel Questions (Q&A)        Max: 15 pts
  Show running total and auto-display the verdict badge based on total score.

SECTION B – Individual Evaluation (per student, rated 1–5)
  A repeatable student row with inputs for:
    • Student Name (text field)
    • Communication Skills (1–5 selector or star/number input)
    • Work Organization (1–5 selector)
    • Effectiveness (1–5 selector)
    • Auto-computed Average
  Support up to 5 student rows per group.
  Add a scoring guide chip row: 5=Outstanding, 4=Very Satisfactory, 
  3=Satisfactory, 2=Fair, 1=Needs Improvement

───────────────────────────────────────────
4. DEFENSE FORMAT TIMER / INFO BANNER
───────────────────────────────────────────
Add a compact info banner or timeline bar showing the defense flow:

  [60 min] Presentation  →  [30 min] Q&A  →  [20 min] Deliberation  →  [10 min] Announcement
  Total: 2 hours maximum

Style as a horizontal step indicator with time labels under each step.

───────────────────────────────────────────
5. VERDICT SELECTION & PANEL SIGN-OFF
───────────────────────────────────────────
Update the verdict selection UI at the bottom of the evaluation form 
with four mutually exclusive radio/button options:

  ☐ PASS            ☐ Pass with Minor Revision
  ☐ Re-demonstration  ☐ FAIL

Each option should auto-highlight based on the computed group score 
from Section A. The FAIL option should use a red outlined button.

Add a signature/sign-off row at the bottom:
  Lead Panelist: [Name field] [Signature pad or initials] [Date]
  Panel Member 1: [Name] [Role dropdown: Faculty / Industry] [Date]
  Panel Member 2: [Name] [Role dropdown: Faculty / Industry] [Date]

───────────────────────────────────────────
DESIGN TOKENS
───────────────────────────────────────────
Primary:   #1F3864  (navy)
Accent:    #2E75B6  (blue)
Surface:   #D6E4F0  (light blue)
Pass:      #1A7A4A  (green)
Warning:   #B45309  (amber)
Alert:     #C55A11  (orange)
Danger:    #C00000  (red)
Font:      Inter or Arial, 12pt base
Reference: GU-CRD-032-04 | STI College San Fernando | BMMA Program