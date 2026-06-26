# Design Document: Dashboard Quick Stats Widget

## Overview

A new `QuickStatsWidget` component is added to the dashboard. It renders four `StatTile` sub-components in a responsive grid. Data is mocked initially. The component consumes `WalletContext` for connection state and follows the existing dark-teal card pattern used by `NetWorthCard` and `WalletBalanceCard`.

---

## Architecture

```
frontend/app/
├── components/dashboard/
│   └── QuickStatsWidget.tsx   ← new
└── dashboard/
    └── page.tsx               ← modified (add QuickStatsWidget)
```

No new context, hooks, or API calls are introduced. All data is static mock values for now.

---

## Component Design

### `QuickStatsWidget`

```tsx
"use client";
// Location: frontend/app/components/dashboard/QuickStatsWidget.tsx

interface StatTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;   // true → value uses #8ef4ef color
  trend?: string;     // e.g. "+12.4%" shown as a badge
}
```

The four tiles are defined as a static array inside the component:

```ts
const stats: StatTileProps[] = [
  { label: "Total Savings",  value: "$12,450.00", icon: <PiggyBank />, accent: false },
  { label: "Active Goals",   value: "3",          icon: <Target />,    accent: false },
  { label: "This Month",     value: "$1,200.00",  icon: <CalendarDays />, trend: "+8.3%" },
  { label: "Total Yield",    value: "$342.18",    icon: <Sparkles />,  accent: true  },
];
```

When `!isConnected`, all values are replaced with `$0.00` / `0`.
When `isLoading`, skeleton tiles are rendered.

### Layout

```
Mobile  (< md):  grid-cols-2, gap-3
Desktop (≥ md):  grid-cols-4, gap-4
```

Each `StatTile`:
- Background: `rgba(6,110,110,0.08)` (slightly lighter than card bg)
- Border: `rgba(6,110,110,0.12)`
- Border-radius: `14px`
- Padding: `16px`
- Icon: `24px`, color `#08c1c1`
- Label: `text-xs text-[#9bb7b7] font-semibold tracking-wide uppercase`
- Value: `text-2xl font-extrabold text-white` (or `text-[#8ef4ef]` when `accent`)
- Trend badge: `text-xs font-bold text-[#8ef4ef] bg-[rgba(3,116,116,0.22)] px-2 py-0.5 rounded-full`

### Skeleton state

```tsx
<div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-2" />
<div className="h-8 w-28 bg-white/5 rounded animate-pulse" />
```

---

## Dashboard Page Integration

`QuickStatsWidget` is inserted between `NetWorthCard` and `ActivePoolList` in the left column:

```tsx
// frontend/app/dashboard/page.tsx
<div className="flex-1 w-full min-w-0">
  <NetWorthCard />
  <div className="mt-4 md:mt-[18px]">
    <QuickStatsWidget />          {/* ← new */}
  </div>
  <div className="mt-4 md:mt-[18px]">
    <ActivePoolList />
  </div>
</div>
```

---

## Correctness Properties

### Property 1: Four tiles always rendered
*For any* connection state, the widget should render exactly 4 `StatTile` elements.

### Property 2: Disconnected state shows zero values
*For any* render where `isConnected = false`, all monetary values should equal `$0.00` and goal count should equal `0`.

### Property 3: Accent tile uses teal color
*For any* render, the Total Yield tile value should use `#8ef4ef` text color.

### Property 4: Responsive grid breakpoint
*For any* viewport < `md`, the grid should have 2 columns; for ≥ `md`, 4 columns.
