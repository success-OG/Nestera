# Implementation Plan: Dashboard Activity Feed

## Tasks

- [ ] 1. Create `ActivityFeedWidget` component
  - Create `frontend/app/components/dashboard/ActivityFeedWidget.tsx`
  - Add `"use client"` directive
  - Define `ActivityType` type and `ActivityItem` interface
  - Define `TYPE_CONFIG` map (icon + color per type)
  - Define `MOCK_ACTIVITIES` array with 20 items covering all four types
  - Implement `relativeTime(date)` helper
  - Add state: `filter`, `page`, `items`
  - Implement `markRead(id)` and `markAllRead()` functions
  - Derive `filtered`, `totalPages`, `pageItems` from state
  - _Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.4, 4.1–4.4, 5.1–5.4_

- [ ] 2. Implement widget header
  - Render "Activity Feed" title (left) and "Mark all as read" button (right)
  - "Mark all as read" button: `text-[#7fbfbf] hover:text-[#8ef4ef] text-xs font-semibold`
  - _Requirements: 5.2, 5.3_

- [ ] 3. Implement FilterTab row
  - Render 5 tabs: All, Transactions, Goals, Governance, Notifications
  - Apply active/inactive styles based on current `filter` state
  - On click: set filter + reset page to 1
  - Wrap in `overflow-x-auto` container for mobile scroll
  - _Requirements: 3.1–3.4, 6.2_

- [ ] 4. Implement ActivityItem rows
  - Render `pageItems` as a list
  - Each row: unread dot (conditional) + icon container + text block + timestamp
  - Apply `cursor-pointer` and `onClick={() => markRead(item.id)}`
  - Separate rows with `border-b border-white/5 last:border-0`
  - _Requirements: 1.2, 1.3, 2.1–2.5, 5.1_

- [ ] 5. Implement pagination controls
  - Render "← Prev" and "Next →" buttons + "Page X of Y" label
  - Disable Prev on page 1, disable Next on last page
  - Style: `text-[#7fbfbf] disabled:opacity-30 disabled:cursor-not-allowed text-sm`
  - _Requirements: 4.1–4.4_

- [ ] 6. Add `ActivityFeedWidget` to the dashboard page
  - Modify `frontend/app/dashboard/page.tsx`
  - Import `ActivityFeedWidget`
  - Add below `RecentTransactionsWidget` with `mt-4 md:mt-5` spacing
  - _Requirements: 1.1_

- [ ] 7. Visual QA
  - Verify filter tabs switch content and reset to page 1
  - Verify unread dot appears on unread items and disappears on click
  - Verify "Mark all as read" clears all dots
  - Verify pagination disables correctly at boundaries
  - Verify horizontal scroll on filter tabs at 320px width
  - Verify empty state message when all items filtered out
