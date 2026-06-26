# Design Document: Dashboard Customization

## Overview

Dashboard customization is implemented entirely client-side using React state + `localStorage`. A `useDashboardLayout` hook manages the `LayoutConfig`, and a `CustomizePanel` drawer provides the UI. Drag-and-drop uses the native HTML5 DnD API to avoid adding a library dependency.

---

## Architecture

```
frontend/app/
├── components/dashboard/
│   ├── CustomizePanel.tsx          ← new: slide-in drawer
│   ├── DraggableDashboard.tsx      ← new: renders widgets in configured order
│   └── [existing widgets]          ← modified: accept compact?: boolean prop
├── hooks/
│   └── useDashboardLayout.ts       ← new: layout state + localStorage
└── dashboard/
    └── page.tsx                    ← modified: use DraggableDashboard + CustomizePanel
```

---

## Data Model

```ts
// frontend/app/hooks/useDashboardLayout.ts

export type WidgetId =
  | 'net-worth'
  | 'quick-stats'
  | 'active-pools'
  | 'recent-transactions'
  | 'wallet-balance';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  order: number;
  size: 'normal' | 'compact';
}

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'net-worth',           label: 'Net Worth',           visible: true, order: 0, size: 'normal' },
  { id: 'quick-stats',         label: 'Quick Stats',         visible: true, order: 1, size: 'normal' },
  { id: 'active-pools',        label: 'Active Pools',        visible: true, order: 2, size: 'normal' },
  { id: 'recent-transactions', label: 'Recent Transactions', visible: true, order: 3, size: 'normal' },
  { id: 'wallet-balance',      label: 'Wallet Balance',      visible: true, order: 4, size: 'normal' },
];

const STORAGE_KEY = 'nestera_dashboard_layout';
```

### `useDashboardLayout` hook

```ts
export function useDashboardLayout() {
  const [layout, setLayout] = useState<WidgetConfig[]>(() => loadLayout());

  function loadLayout(): WidgetConfig[] { /* read + merge with DEFAULT_LAYOUT */ }
  function saveLayout(l: WidgetConfig[]): void { /* write to localStorage */ }

  function toggleWidget(id: WidgetId): void { /* prevent hiding last visible */ }
  function reorderWidgets(fromIndex: number, toIndex: number): void { /* swap order */ }
  function setWidgetSize(id: WidgetId, size: 'normal' | 'compact'): void {}
  function resetLayout(): void { /* restore DEFAULT_LAYOUT, clear localStorage */ }

  return { layout, toggleWidget, reorderWidgets, setWidgetSize, resetLayout };
}
```

---

## Component Design

### `DraggableDashboard`

Renders widgets sorted by `order`, filtered to `visible: true`. Each widget is wrapped in a `div` with `draggable` attribute and `onDragStart` / `onDragOver` / `onDrop` handlers.

```tsx
// Drag state: track draggedId (string | null)
// onDrop: call reorderWidgets(fromIndex, toIndex)
// Drop placeholder: a dashed-border div shown at the current drop target position
```

Widget registry maps `WidgetId` → component:

```ts
const WIDGET_REGISTRY: Record<WidgetId, React.ComponentType<{ compact?: boolean }>> = {
  'net-worth':           NetWorthCard,
  'quick-stats':         QuickStatsWidget,
  'active-pools':        ActivePoolList,
  'recent-transactions': RecentTransactionsWidget,
  'wallet-balance':      WalletBalanceCard,
};
```

### `CustomizePanel`

- Right-side drawer on `md+`: `fixed right-0 top-0 h-full w-80 bg-[#061218] border-l border-[rgba(6,110,110,0.2)] z-50 transition-transform`
- Bottom sheet on mobile: `fixed bottom-0 left-0 right-0 rounded-t-2xl bg-[#061218] border-t border-[rgba(6,110,110,0.2)] z-50`
- Backdrop: `fixed inset-0 bg-black/50 z-40` — click closes panel
- Escape key listener via `useEffect`
- Each row: widget label + size toggle (Normal / Compact buttons) + visibility switch
- "Reset to Default" button at bottom: `text-[#ff9999]` color

### "Customize" Button

Added to `TopNav` or as a floating button in `dashboard/page.tsx`:

```tsx
<button onClick={() => setCustomizeOpen(true)}
  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(6,110,110,0.2)] text-[#9bb7b7] hover:text-[#8ef4ef] text-sm">
  <LayoutDashboard size={16} /> Customize
</button>
```

---

## Correctness Properties

### Property 1: At least one widget always visible
Toggling the last visible widget off should be blocked; the toggle should revert and an error message should appear.

### Property 2: Layout persists across remounts
After calling `saveLayout`, unmounting and remounting the hook should produce the same `layout` array.

### Property 3: Reorder is a pure swap
`reorderWidgets(i, j)` should produce a layout where the widget previously at index `i` is now at index `j` and vice versa, with all other widgets unchanged.

### Property 4: Reset restores DEFAULT_LAYOUT exactly
After `resetLayout()`, `layout` should deep-equal `DEFAULT_LAYOUT` and `localStorage` should not contain `nestera_dashboard_layout`.
