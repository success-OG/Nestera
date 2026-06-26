# Implementation Plan: Dashboard Quick Stats Widget

## Tasks

- [ ] 1. Create `QuickStatsWidget` component
  - Create `frontend/app/components/dashboard/QuickStatsWidget.tsx`
  - Add `"use client"` directive
  - Import `useWallet` from `../../context/WalletContext`
  - Import Lucide icons: `PiggyBank`, `Target`, `CalendarDays`, `Sparkles`
  - Define `StatTileProps` interface with `label`, `value`, `icon`, `accent?`, `trend?`
  - Define static mock `stats` array with four entries
  - Implement `StatTile` sub-component with card styling matching existing dashboard cards
  - Implement loading skeleton (pulse animation) when `isLoading && !isConnected`
  - Implement disconnected state (zero values, muted color) when `!isConnected`
  - Implement responsive grid: `grid-cols-2 md:grid-cols-4 gap-3 md:gap-4`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1–2.4, 3.1–3.4, 4.1–4.4, 5.1–5.4, 6.1–6.3, 7.1–7.3_

- [ ] 2. Add `QuickStatsWidget` to the dashboard page
  - Modify `frontend/app/dashboard/page.tsx`
  - Import `QuickStatsWidget`
  - Insert between `NetWorthCard` and `ActivePoolList` in the left column with `mt-4 md:mt-[18px]` spacing
  - _Requirements: 1.1_

- [ ] 3. Visual QA
  - Verify 2-column layout on mobile viewport
  - Verify 4-column layout on desktop viewport
  - Verify skeleton renders when `isLoading = true`
  - Verify zero values when wallet disconnected
  - Verify Total Yield tile uses `#8ef4ef` accent color
  - Verify trend badge renders on "This Month" tile
