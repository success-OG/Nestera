# Requirements Document

## Introduction

This feature adds an Activity Feed widget to the Nestera dashboard. It shows a chronological list of the user's recent actions and platform updates, grouped into four categories: recent transactions, goal updates, governance votes, and system notifications. The feed supports pagination and read/unread status marking.

## Glossary

- **ActivityFeed**: The dashboard widget displaying the user's recent activity.
- **ActivityItem**: A single entry in the feed with a type, title, description, timestamp, and read status.
- **ActivityType**: One of `transaction`, `goal`, `governance`, `notification`.
- **ReadStatus**: A boolean flag per `ActivityItem` indicating whether the user has seen it.
- **FilterTab**: A tab control allowing users to filter the feed by `ActivityType` or show `all`.
- **MockData**: Static placeholder activity items used until real API integration is implemented.

---

## Requirements

### Requirement 1: Display Activity Feed Widget

**User Story:** As a user, I want to see a feed of my recent activity on the dashboard, so that I can stay informed about what has happened on my account.

#### Acceptance Criteria

1. THE ActivityFeed SHALL be rendered as a dashboard card component matching the existing dark-teal card style.
2. THE ActivityFeed SHALL display a list of `ActivityItem` entries in reverse-chronological order (newest first).
3. Each `ActivityItem` SHALL display: an icon representing its `ActivityType`, a title, a short description, and a relative timestamp (e.g. "2 hours ago").
4. THE ActivityFeed SHALL show a maximum of 10 items per page.
5. WHEN there are no activity items, THE ActivityFeed SHALL display an empty state message: "No recent activity."

---

### Requirement 2: Activity Type Icons and Colors

**User Story:** As a user, I want each activity type to be visually distinct, so that I can quickly scan the feed and identify what happened.

#### Acceptance Criteria

1. `transaction` items SHALL use the `ArrowLeftRight` Lucide icon with color `#08c1c1`.
2. `goal` items SHALL use the `Target` Lucide icon with color `#a78bfa` (purple).
3. `governance` items SHALL use the `Vote` or `Scale` Lucide icon with color `#fbbf24` (amber).
4. `notification` items SHALL use the `Bell` Lucide icon with color `#9bb7b7`.
5. Unread items SHALL have a small filled dot indicator (`#08c1c1`, 8px) to the left of the icon.

---

### Requirement 3: Filter by Activity Type

**User Story:** As a user, I want to filter the activity feed by type, so that I can focus on a specific category of activity.

#### Acceptance Criteria

1. THE ActivityFeed SHALL display a row of `FilterTab` buttons: All, Transactions, Goals, Governance, Notifications.
2. WHEN a user clicks a `FilterTab`, THE ActivityFeed SHALL show only items matching that `ActivityType` (or all items for the "All" tab).
3. THE active `FilterTab` SHALL be visually highlighted using the accent color `#08c1c1`.
4. WHEN switching filters, THE ActivityFeed SHALL reset to page 1.

---

### Requirement 4: Pagination

**User Story:** As a user, I want to page through my activity history, so that I can see older items beyond the first 10.

#### Acceptance Criteria

1. THE ActivityFeed SHALL display "Previous" and "Next" pagination controls below the list.
2. WHEN on page 1, THE "Previous" button SHALL be disabled.
3. WHEN on the last page, THE "Next" button SHALL be disabled.
4. THE ActivityFeed SHALL display the current page and total pages (e.g. "Page 2 of 4").

---

### Requirement 5: Mark as Read

**User Story:** As a user, I want to mark activity items as read, so that I can track which updates I have already seen.

#### Acceptance Criteria

1. WHEN a user clicks on an `ActivityItem`, THE ActivityFeed SHALL mark that item as read (remove the unread dot indicator).
2. THE ActivityFeed SHALL include a "Mark all as read" button in the widget header.
3. WHEN "Mark all as read" is clicked, THE ActivityFeed SHALL mark all currently loaded items as read.
4. Read/unread state SHALL be stored in component state (no persistence required for the initial implementation).

---

### Requirement 6: Responsive Layout

**User Story:** As a user on mobile, I want the activity feed to be usable on small screens.

#### Acceptance Criteria

1. THE ActivityFeed SHALL be full-width on all viewport sizes.
2. THE `FilterTab` row SHALL scroll horizontally on mobile if tabs overflow the container.
3. Each `ActivityItem` row SHALL remain readable at 320px viewport width.
