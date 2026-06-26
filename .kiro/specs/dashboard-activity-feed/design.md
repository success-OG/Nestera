# Design Document: Dashboard Activity Feed

## Overview

A new `ActivityFeedWidget` component is added to the dashboard. It is self-contained with local state for filter, pagination, and read status. Data is mocked. The component follows the existing dark-teal card pattern.

---

## Architecture

```
frontend/app/
├── components/dashboard/
│   └── ActivityFeedWidget.tsx   ← new
└── dashboard/
    └── page.tsx                 ← modified (add ActivityFeedWidget)
```

---

## Data Model

```ts
export type ActivityType = 'transaction' | 'goal' | 'governance' | 'notification';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}
```

### Mock data (20 items covering all types)

```ts
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'transaction', title: 'Deposit USDC', description: '+$500.00 to Flexible Pool', timestamp: new Date(Date.now() - 2 * 3600_000), read: false },
  { id: '2', type: 'goal',        title: 'Goal Updated',  description: '"Buy a Car" is 45% complete', timestamp: new Date(Date.now() - 5 * 3600_000), read: false },
  { id: '3', type: 'governance',  title: 'Vote Cast',     description: 'You voted YES on Proposal #12', timestamp: new Date(Date.now() - 24 * 3600_000), read: true },
  { id: '4', type: 'notification',title: 'Yield Earned',  description: '+$12.45 interest credited', timestamp: new Date(Date.now() - 26 * 3600_000), read: true },
  // ... 16 more items
];
```

---

## Component Design

### State

```ts
const [filter, setFilter] = useState<ActivityType | 'all'>('all');
const [page, setPage] = useState(1);
const [items, setItems] = useState<ActivityItem[]>(MOCK_ACTIVITIES);
const PAGE_SIZE = 10;
```

### Derived values

```ts
const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);
const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
```

### `markRead(id)` / `markAllRead()`

```ts
function markRead(id: string) {
  setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
}
function markAllRead() {
  setItems(prev => prev.map(i => ({ ...i, read: true })));
}
```

### Icon + color map

```ts
const TYPE_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string }> = {
  transaction: { icon: ArrowLeftRight, color: '#08c1c1' },
  goal:        { icon: Target,         color: '#a78bfa' },
  governance:  { icon: Scale,          color: '#fbbf24' },
  notification:{ icon: Bell,           color: '#9bb7b7' },
};
```

### Relative timestamp

```ts
function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
```

### Layout

```
[Widget card]
  [Header: "Activity Feed" title | "Mark all as read" button]
  [FilterTab row: All | Transactions | Goals | Governance | Notifications]
  [ActivityItem list]
    [ActivityItem row: unread-dot? | icon | title + description | timestamp]
  [Pagination: ← Prev | Page X of Y | Next →]
```

### FilterTab styling

- Inactive: `text-[#9bb7b7] bg-transparent border border-[rgba(6,110,110,0.15)] rounded-full px-3 py-1 text-xs`
- Active: `text-[#042525] bg-[#08c1c1] rounded-full px-3 py-1 text-xs font-bold`

### ActivityItem row

- Unread dot: `w-2 h-2 rounded-full bg-[#08c1c1] shrink-0` (hidden when `read: true`)
- Icon container: `w-9 h-9 rounded-lg flex items-center justify-center` with `bg-[color]/10`
- Title: `text-sm font-semibold text-[#dff]`
- Description: `text-xs text-[#9bb7b7]`
- Timestamp: `text-xs text-[#6a9fae] shrink-0`
- Click handler: calls `markRead(item.id)`

---

## Dashboard Page Integration

`ActivityFeedWidget` is added below `RecentTransactionsWidget`:

```tsx
<div className="mt-4 md:mt-5">
  <RecentTransactionsWidget />
</div>
<div className="mt-4 md:mt-5">
  <ActivityFeedWidget />
</div>
```

---

## Correctness Properties

### Property 1: Filter resets page to 1
Switching filter tab should always set `page` to `1`.

### Property 2: Page items count ≤ PAGE_SIZE
`pageItems.length` should always be ≤ 10.

### Property 3: Mark read removes unread dot
After `markRead(id)`, the item with that id should have `read: true` and no dot rendered.

### Property 4: Mark all read clears all dots
After `markAllRead()`, every item in `items` should have `read: true`.
