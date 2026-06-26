# Implementation Plan: Dashboard Customization

## Tasks

- [ ] 1. Create `useDashboardLayout` hook
  - Create `frontend/app/hooks/useDashboardLayout.ts`
  - Define `WidgetId` union type and `WidgetConfig` interface
  - Define `DEFAULT_LAYOUT` array with all 5 widgets
  - Implement `loadLayout()`: read from `localStorage`, merge with `DEFAULT_LAYOUT` for missing entries, fall back to default on parse error
  - Implement `saveLayout()`: write to `localStorage` under `nestera_dashboard_layout`
  - Implement `toggleWidget(id)`: prevent hiding last visible widget (return early + set error state)
  - Implement `reorderWidgets(fromIndex, toIndex)`: swap `order` values
  - Implement `setWidgetSize(id, size)`: update size field
  - Implement `resetLayout()`: restore `DEFAULT_LAYOUT`, remove `localStorage` key
  - _Requirements: 1.1–1.5, 3.1–3.4_

- [ ] 2. Create `DraggableDashboard` component
  - Create `frontend/app/components/dashboard/DraggableDashboard.tsx`
  - Accept `layout`, `reorderWidgets`, `customizeOpen` props
  - Define `WIDGET_REGISTRY` mapping `WidgetId` → component
  - Render widgets sorted by `order`, filtered to `visible: true`
  - Wrap each widget in a `div` with `draggable`, `onDragStart`, `onDragOver`, `onDrop` handlers
  - Track `draggedId` in local state; show dashed-border placeholder at drop target
  - Pass `compact` prop to each widget based on `WidgetConfig.size`
  - Show `DragHandle` icon (Lucide `GripVertical`) on each widget when `customizeOpen` is true
  - _Requirements: 2.1–2.5_

- [ ] 3. Create `CustomizePanel` component
  - Create `frontend/app/components/dashboard/CustomizePanel.tsx`
  - Accept `layout`, `onToggle`, `onReorder`, `onSizeChange`, `onReset`, `onClose` props
  - Implement right-side drawer on `md+` and bottom sheet on mobile using Tailwind responsive classes
  - Render backdrop div that calls `onClose` on click
  - Add `useEffect` for Escape key listener
  - Render each widget row: label + Normal/Compact size buttons + visibility toggle switch
  - Show inline error when attempting to hide last visible widget
  - Add "Reset to Default" button styled with `text-[#ff9999]`
  - _Requirements: 1.4, 4.1–4.6, 5.1–5.4_

- [ ] 4. Add `compact` prop to existing widgets
  - Modify `NetWorthCard`, `ActivePoolList`, `RecentTransactionsWidget`, `WalletBalanceCard`
  - Add `compact?: boolean` prop to each component's props interface
  - When `compact` is `true`, reduce padding by ~40% and reduce heading font size by one step
  - `QuickStatsWidget` (from #625) should also accept `compact` prop
  - _Requirements: 5.2, 5.3_

- [ ] 5. Wire everything into the dashboard page
  - Modify `frontend/app/dashboard/page.tsx`
  - Add `"use client"` directive
  - Import and call `useDashboardLayout()`
  - Add `customizeOpen` state
  - Add "Customize" button (Lucide `LayoutDashboard` icon) near the top of the page
  - Replace manual widget rendering with `<DraggableDashboard />`
  - Render `<CustomizePanel />` conditionally when `customizeOpen` is true
  - _Requirements: 1.1–1.3, 4.1_

- [ ] 6. Visual QA
  - Verify drag-and-drop reorders widgets and persists on reload
  - Verify hiding a widget removes it from the dashboard immediately
  - Verify last-widget protection shows error message
  - Verify Reset to Default restores original layout
  - Verify compact mode reduces widget height
  - Verify panel closes on backdrop click and Escape key
  - Verify bottom sheet on mobile, drawer on desktop
