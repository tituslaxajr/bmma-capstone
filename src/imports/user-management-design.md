Design the "User Management" page for the Coordinator in CapstonePH using the design system.

SAME NAV + SIDEBAR. Active: "User Management"

PAGE HEADER:
Title: "User Accounts" (Bitter Regular 32px)
Subtitle: "Manage student, panelist, and adviser accounts"
Right side: yellow primary button "+ Add User Account"

TAB BAR (underline style, yellow active):
All Users (24) | Students (16) | Panelists (5) | Advisers (3)

ACTIVE TAB: "All Users"

FILTER + SEARCH BAR (full width card, white):
Left: Search input — "Search by name or email..."
Middle filters: Role dropdown (All / Student / Panelist / Adviser), Status dropdown (Active / Inactive), Group dropdown (All / Group 1–8)
Right: "Export List" ghost button with download icon

USER TABLE (white card, full width):
Columns: Avatar+Name | Email | Role Badge | Group | Adviser | Status | Actions

Sample rows:
1. [Avatar] Juan dela Cruz | juan.delacruz@sti.edu.ph | Student (blue) | Group 3 | Prof. Reyes | ● Active | Edit · Deactivate
2. [Avatar] Maria Santos | maria.santos@sti.edu.ph | Student (blue) | Group 3 | Prof. Reyes | ● Active | Edit · Deactivate
3. [Avatar] Prof. Ana Reyes | a.reyes@sti.edu.ph | Adviser (green) | — | — | ● Active | Edit · Deactivate
4. [Avatar] Prof. Rico Tan | r.tan@sti.edu.ph | Panelist (grey) | — | — | ● Active | Edit · Deactivate
5. [Avatar] Prof. Coordinator | coord@sti.edu.ph | Coordinator (indigo) | — | — | ● Active | Edit

Role badges use distinct colors:
- Student: blue
- Panelist: slate grey
- Adviser: teal/green
- Coordinator: indigo/purple

Row hover: light yellow-tinted bg
Actions: pencil icon (edit), toggle icon (deactivate/activate)
Bottom: pagination — "Showing 1–10 of 24 users"

ADD USER MODAL (show as separate frame):
Title: "Add New User Account"
Fields:
- Full Name (text input)
- STI Email Address (text input, .edu.ph validation note)
- Role (large radio cards): Student · Panelist · Adviser · Coordinator
- (If Student) Assign to Group: dropdown
- (If Student) Assign Adviser: dropdown
- (If Panelist/Adviser) Department: text input
- Password Setup: radio — "Send email invite" (recommended) OR "Set temporary password"
- Temporary Password field (shown if second option)
Buttons: "Cancel" ghost / "Create Account" yellow primary

EDIT USER MODAL (separate frame):
Same fields but pre-filled. Includes:
- Role Change section with warning banner: "⚠️ Changing role will affect access permissions immediately."
- "Deactivate Account" danger button (red, bottom left)
- "Save Changes" yellow primary (bottom right)