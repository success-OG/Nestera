# Requirements Document

## Introduction

This feature adds a Quick Stats widget to the Nestera dashboard. It provides users with an at-a-glance overview of four key savings metrics — total savings, active goals count, this month's contributions, and total yield earned — displayed in a compact, visually consistent card that fits the existing dashboard layout.

## Glossary

- **QuickStatsWidget**: The new dashboard component displaying four key metric tiles.
- **StatTile**: A single metric cell within the widget showing a label, value, and optional trend indicator.
- **TotalSavings**: The aggregate USD value of all active savings pool subscriptions.
- **ActiveGoalsCount**: The number of savings goals with status `IN_PROGRESS`.
- **MonthlyContributions**: The sum of deposits made in the current calendar month.
- **TotalYieldEarned**: The cumulative yield/interest earned across all subscriptions.
- **WalletContext**: The existing React context providing `isConnected`, `isLoading`, and `totalUsdValue`.
- **MockData**: Static placeholder values used until real API integration is implemented.

---

## Requirements

### Requirement 1: Render the Quick Stats Widget on the Dashboard

**User Story:** As a user, I want to see a quick stats overview on my dashboard, so that I can understand my savings performance at a glance without navigating to other pages.

#### Acceptance Criteria

1. THE QuickStatsWidget SHALL be rendered on the dashboard page (`frontend/app/dashboard/page.tsx`) in a position visible without scrolling on desktop viewports.
2. THE QuickStatsWidget SHALL display exactly four StatTiles: Total Savings, Active Goals, This Month's Contributions, and Total Yield Earned.
3. THE QuickStatsWidget SHALL match the existing dashboard card visual style: dark teal background (`rgba(4,20,22,0.85)`), border `rgba(6,110,110,0.15)`, border-radius `18px`, padding `24px`, box-shadow `0 10px 30px rgba(2,12,14,0.6)`, and `backdropFilter: blur(6px)`.
4. THE QuickStatsWidget SHALL be a `"use client"` component.

---

### Requirement 2: Display Total Savings

**User Story:** As a user, I want to see my total savings value, so that I know how much I have saved overall.

#### Acceptance Criteria

1. THE Total Savings StatTile SHALL display the label "Total Savings".
2. THE Total Savings StatTile SHALL display the value formatted as a USD currency string (e.g. `$12,450.00`).
3. WHEN `isConnected` is `false` in WalletContext, THE Total Savings StatTile SHALL display `$0.00` as the value.
4. THE Total Savings StatTile SHALL display a relevant Lucide icon (e.g. `PiggyBank` or `Wallet`).

---

### Requirement 3: Display Active Goals Count

**User Story:** As a user, I want to see how many savings goals I am actively working towards, so that I can track my goal engagement.

#### Acceptance Criteria

1. THE Active Goals StatTile SHALL display the label "Active Goals".
2. THE Active Goals StatTile SHALL display the count as a plain integer (e.g. `3`).
3. THE Active Goals StatTile SHALL display a relevant Lucide icon (e.g. `Target`).
4. WHEN mock data is used, THE Active Goals StatTile SHALL display a non-zero placeholder value.

---

### Requirement 4: Display This Month's Contributions

**User Story:** As a user, I want to see how much I have contributed this month, so that I can monitor my savings habit for the current period.

#### Acceptance Criteria

1. THE Monthly Contributions StatTile SHALL display the label "This Month".
2. THE Monthly Contributions StatTile SHALL display the value formatted as a USD currency string.
3. THE Monthly Contributions StatTile SHALL display a relevant Lucide icon (e.g. `CalendarDays` or `TrendingUp`).
4. THE Monthly Contributions StatTile SHALL display a positive trend indicator (e.g. a green upward arrow or percentage badge) when the mock value is positive.

---

### Requirement 5: Display Total Yield Earned

**User Story:** As a user, I want to see my total yield earned, so that I can understand the return on my savings.

#### Acceptance Criteria

1. THE Total Yield StatTile SHALL display the label "Total Yield".
2. THE Total Yield StatTile SHALL display the value formatted as a USD currency string.
3. THE Total Yield StatTile SHALL display a relevant Lucide icon (e.g. `Sparkles` or `Zap`).
4. THE Total Yield StatTile SHALL use the accent color `#08c1c1` / `#8ef4ef` to highlight the value, consistent with positive metric styling in existing components.

---

### Requirement 6: Loading and Disconnected States

**User Story:** As a user, I want the widget to handle loading and disconnected states gracefully, so that I do not see broken or misleading data.

#### Acceptance Criteria

1. WHEN `isLoading` is `true` in WalletContext, THE QuickStatsWidget SHALL render skeleton placeholder tiles using a pulse animation consistent with `WalletBalanceCard`'s loading state.
2. WHEN `isConnected` is `false`, THE QuickStatsWidget SHALL render all four tiles with `$0.00` or `0` values and a muted text color (`#6a9fae`).
3. THE QuickStatsWidget SHALL never throw a runtime error when WalletContext values are undefined or null.

---

### Requirement 7: Responsive Layout

**User Story:** As a user on a mobile device, I want the quick stats widget to be readable, so that I can check my metrics on any screen size.

#### Acceptance Criteria

1. THE QuickStatsWidget SHALL display the four StatTiles in a 2×2 grid on mobile viewports (< `md` breakpoint).
2. THE QuickStatsWidget SHALL display the four StatTiles in a single row (4 columns) on desktop viewports (≥ `md` breakpoint).
3. Each StatTile SHALL maintain a minimum height of `80px` to ensure touch-friendly sizing on mobile.
