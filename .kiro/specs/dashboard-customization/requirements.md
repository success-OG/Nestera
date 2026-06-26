# Requirements Document

## Introduction

This feature allows users to customize their Nestera dashboard layout. Users can show or hide individual widgets, reorder them via drag-and-drop, and have their preferences persisted across sessions via `localStorage`. No backend changes are required.

## Glossary

- **DashboardCustomization**: The feature enabling users to personalize their dashboard widget layout.
- **Widget**: A named dashboard card component (e.g. NetWorthCard, QuickStatsWidget, ActivePoolList, RecentTransactionsWidget, WalletBalanceCard).
- **WidgetConfig**: A per-widget configuration object storing `id`, `visible`, and `order` fields.
- **LayoutConfig**: The full array of `WidgetConfig` objects representing the user's saved layout.
- **CustomizePanel**: A slide-in or modal UI panel where users manage widget visibility and order.
- **DragHandle**: A visual affordance on each widget allowing drag-to-reorder.
- **localStorage**: Browser storage used to persist `LayoutConfig` between sessions.
- **DefaultLayout**: The hardcoded fallback `LayoutConfig` used when no saved preference exists.

---

## Requirements

### Requirement 1: Show/Hide Widgets

**User Story:** As a user, I want to show or hide individual dashboard widgets, so that I can focus on the information most relevant to me.

#### Acceptance Criteria

1. THE CustomizePanel SHALL list all available widgets with a toggle (checkbox or switch) for each.
2. WHEN a user toggles a widget off, THE dashboard SHALL immediately hide that widget without a page reload.
3. WHEN a user toggles a widget on, THE dashboard SHALL immediately show that widget in its last known position.
4. THE dashboard SHALL always keep at least one widget visible; if a user attempts to hide the last visible widget, THE CustomizePanel SHALL prevent the action and display a brief inline error message.
5. THE available widgets SHALL be: `NetWorthCard`, `QuickStatsWidget`, `ActivePoolList`, `RecentTransactionsWidget`, `WalletBalanceCard`.

---

### Requirement 2: Drag-and-Drop Reordering

**User Story:** As a user, I want to drag and drop widgets to reorder them, so that I can arrange my dashboard to match my workflow.

#### Acceptance Criteria

1. THE dashboard SHALL render a `DragHandle` icon on each visible widget when customization mode is active.
2. WHEN a user drags a widget by its `DragHandle` and drops it in a new position, THE dashboard SHALL reorder the widgets to reflect the new position.
3. THE reorder operation SHALL use the HTML5 Drag and Drop API or a lightweight equivalent — no heavy third-party DnD library is required.
4. WHEN a widget is being dragged, THE dashboard SHALL show a visual placeholder in the drop target position.
5. Drag-and-drop SHALL work on both desktop and touch devices (touch events mapped to drag events).

---

### Requirement 3: Persist Layout Preferences

**User Story:** As a user, I want my layout preferences saved automatically, so that my customized dashboard is restored when I return.

#### Acceptance Criteria

1. WHEN a user changes widget visibility or order, THE DashboardCustomization feature SHALL save the updated `LayoutConfig` to `localStorage` under the key `nestera_dashboard_layout`.
2. WHEN the dashboard page loads, THE DashboardCustomization feature SHALL read `LayoutConfig` from `localStorage` and apply it before first render.
3. IF `localStorage` does not contain a valid `LayoutConfig`, THE dashboard SHALL use the `DefaultLayout` (all widgets visible, default order).
4. IF the stored `LayoutConfig` is malformed or missing widget entries, THE dashboard SHALL merge it with the `DefaultLayout`, adding any missing widgets as visible at the end.

---

### Requirement 4: Customize Panel UI

**User Story:** As a user, I want a clear UI to manage my dashboard layout, so that customization is intuitive and discoverable.

#### Acceptance Criteria

1. THE dashboard page SHALL include a "Customize" button in the top area (near `TopNav`) that opens the `CustomizePanel`.
2. THE `CustomizePanel` SHALL be a slide-in drawer from the right side on desktop and a bottom sheet on mobile.
3. THE `CustomizePanel` SHALL display each widget's name, a visibility toggle, and a drag handle for reordering.
4. THE `CustomizePanel` SHALL include a "Reset to Default" button that restores the `DefaultLayout` and clears `localStorage`.
5. THE `CustomizePanel` SHALL close when the user clicks outside it or presses the Escape key.
6. THE `CustomizePanel` SHALL match the existing dark-teal visual style of the dashboard.

---

### Requirement 5: Widget Size Adjustment

**User Story:** As a user, I want to adjust widget sizes, so that I can give more space to the widgets I use most.

#### Acceptance Criteria

1. THE CustomizePanel SHALL offer two size options per widget: `normal` (default, full width in its column) and `compact` (reduced height, approximately 60% of normal).
2. WHEN a user selects `compact` for a widget, THE dashboard SHALL render that widget with a `compact` prop set to `true`.
3. Each widget component SHALL accept an optional `compact?: boolean` prop and reduce its internal padding and font sizes when `compact` is `true`.
4. THE size preference SHALL be stored in `WidgetConfig` and persisted to `localStorage` alongside visibility and order.
