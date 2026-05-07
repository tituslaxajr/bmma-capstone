Design all shared overlay states and mobile-responsive layouts for CapstonePH.

━━━ G1. NOTIFICATION CENTER ━━━
Dropdown panel: white rounded-20 shadow-xl width 380px, from nav bell icon.
Header: "Notifications" Inter Bold 16px + "Mark all read" ghost link right.
Tabs: "All" · "Unread (4)" — underline style.
Notification rows (56px, border-bottom, 16px 20px padding):
  Left: colored icon circle 36px per notification type.
  Content: Inter Bold 13px action + DM Sans 12px text-secondary detail. Timestamp DM Sans 11px text-tertiary.
  Unread: blue dot 6px left edge + #F8FAFC bg.
  Types: 🔵 Announcement · 🟢 File Approved · 🟡 Revision Requested · 🔴 Deadline Alert · ⚫ Grade Released.
Empty state: B16 component, "All caught up!" message.
Animate: slide-in-right + opacity, 200ms.

━━━ G2. GLOBAL SEARCH ━━━
Full-width overlay modal: backdrop blur.
Search bar: large 18px DM Sans input, search icon STI Blue, 56px height, rounded-16.
Below: recent searches row (chips).
Results (appear after typing):
  Grouped: Pages · Files · Groups · Users
  Each result: icon + name Inter Bold + context DM Sans 12px text-tertiary + keyboard shortcut right.
  Active/hover: #EEF2FF bg + STI Blue icon.
Animate: modal-in, results fade-in staggered.

━━━ G3. TOAST NOTIFICATIONS ━━━
Bottom-right stack, max 3 visible.
Each toast: white rounded-16 shadow-lg border-left 4px per semantic color, padding 14px 18px, min-width 320px.
Left: colored icon 18px. Content: Inter Bold 14px title + DM Sans 13px text-secondary. Right: X close icon.
Animate: slide-in-right 300ms · hover pause auto-dismiss · exit slide-right + opacity.

━━━ G4. MOBILE RESPONSIVE (375px) ━━━

Mobile Nav: white, 56px height, shadow-sm.
  Left: hamburger (3-line icon) opens drawer.
  Center: "CapstonePH" wordmark 16px.
  Right: bell icon + avatar 32px.

Mobile Drawer (from hamburger):
  Full-height slide-in from left, white, 280px width, backdrop overlay.
  User card top + nav items full (same structure as sidebar).
  Close: swipe left or X icon.

Bottom nav bar (students and panelists only, fixed bottom):
  White, border-top, 56px, 5 tabs:
  Student: Home · Checklist · Manuscript · Defense · Profile
  Panelist: Home · Groups · Manuscripts · Grades · Profile
  Active: icon STI Blue + label STI Blue + dot above icon.

Mobile adaptations:
  Stat cards: 2-column grid → horizontal scroll snapping on very small screens.
  Sidebar → bottom nav (mobile) OR full-screen drawer.
  Tables → card list with key info per row, expand on tap.
  Two-column layouts → single column stacked.
  Grade form → criteria stacked, slider touch-optimized (thumb 24px), manuscript preview as bottom sheet.
  Countdown timer → centered full-width.
  File cards → compact row, actions in ... overflow menu.
  Touch targets: minimum 44px all interactive elements.
  Bottom sheet component: slides up from bottom, rounded-t-24, drag handle 32px bar top.
    Used for: mobile manuscript preview · mobile action menus · expanded checklist detail.