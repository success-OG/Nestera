# Requirements Document

## Introduction

This feature creates a personalized activity feed for users, aggregating recent actions across transactions, savings goal progress, rewards earned, and governance votes into a single paginated endpoint. The feed is limited to the last 90 days, supports filtering by activity type, read/unread status tracking, and Redis caching.

## Glossary

- **ActivityFeed_API**: The `GET /users/activity` endpoint.
- **ActivityItem**: A single feed entry representing one user action or event.
- **ActivityType**: The category of an activity — one of `TRANSACTION`, `GOAL_PROGRESS`, `REWARD_EARNED`, `GOVERNANCE_VOTE`.
- **ReadStatus**: Whether an `ActivityItem` has been marked as read by the user.
- **90DayWindow**: The rolling period from 90 days ago to now; activities older than this are excluded.
- **UserActivity**: A new entity storing activity feed items per user.
- **Cache**: Redis-backed cache via `CACHE_MANAGER`.
- **Pagination**: Page-based navigation using `page` and `pageSize` query parameters.

---

## Requirements

### Requirement 1: Retrieve Activity Feed

**User Story:** As an authenticated user, I want to view my recent activity feed, so that I can see a summary of my actions and updates in one place.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL expose `GET /users/activity` protected by `JwtAuthGuard`.
2. THE ActivityFeed_API SHALL return only `ActivityItem` records belonging to the authenticated user.
3. THE ActivityFeed_API SHALL exclude activities older than 90 days from the current UTC date.
4. THE ActivityFeed_API SHALL return activities ordered by `createdAt` descending (most recent first).
5. THE ActivityFeed_API SHALL be documented with Swagger/OpenAPI annotations.

---

### Requirement 2: Activity Types

**User Story:** As a user, I want my feed to include transactions, goal progress, rewards, and governance votes, so that I have a complete picture of my activity.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL include `ActivityItem` records of type `TRANSACTION` sourced from the TransactionsModule.
2. THE ActivityFeed_API SHALL include `ActivityItem` records of type `GOAL_PROGRESS` when a savings goal's status changes or percentage completion crosses a 25% threshold (25%, 50%, 75%, 100%).
3. THE ActivityFeed_API SHALL include `ActivityItem` records of type `REWARD_EARNED` when a user earns a badge or reward marker.
4. THE ActivityFeed_API SHALL include `ActivityItem` records of type `GOVERNANCE_VOTE` when a user casts a governance vote.
5. EACH `ActivityItem` SHALL include: `id`, `type`, `title`, `description`, `metadata` (JSON), `read`, `createdAt`.

---

### Requirement 3: Filter by Activity Type

**User Story:** As a user, I want to filter my feed by activity type, so that I can focus on specific categories.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL accept an optional `type` query parameter accepting one or more `ActivityType` values (comma-separated).
2. WHEN `type` is provided, THE ActivityFeed_API SHALL return only `ActivityItem` records matching the specified types.
3. WHEN `type` is omitted, THE ActivityFeed_API SHALL return all activity types.
4. IF an invalid `type` value is provided, THE ActivityFeed_API SHALL return HTTP 400 with a descriptive error.

---

### Requirement 4: Pagination

**User Story:** As a user, I want to page through my activity feed, so that I can navigate large histories efficiently.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL accept `page` (default `1`) and `pageSize` (default `20`, max `100`) query parameters.
2. THE ActivityFeed_API SHALL return `total`, `page`, `pageSize`, and `totalPages` in the response alongside the `items` array.
3. IF `pageSize` exceeds `100`, THE ActivityFeed_API SHALL return HTTP 400.

---

### Requirement 5: Mark Activities as Read

**User Story:** As a user, I want to mark activities as read, so that I can track which updates I have already seen.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL expose `PATCH /users/activity/:id/read` protected by `JwtAuthGuard` to mark a single `ActivityItem` as read.
2. THE ActivityFeed_API SHALL expose `PATCH /users/activity/read-all` protected by `JwtAuthGuard` to mark all of the authenticated user's unread activities as read.
3. IF the `ActivityItem` identified by `:id` does not belong to the authenticated user, THE ActivityFeed_API SHALL return HTTP 403.
4. THE ActivityFeed_API SHALL return the updated `ActivityItem` from `PATCH /users/activity/:id/read`.

---

### Requirement 6: Unread Count

**User Story:** As a user, I want to see how many unread activities I have, so that I know when there are new updates.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL expose `GET /users/activity/unread-count` protected by `JwtAuthGuard`.
2. THE response SHALL include an `unreadCount` integer field.

---

### Requirement 7: Redis Caching

**User Story:** As a platform operator, I want the activity feed cached, so that repeated requests do not overload the database.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL cache paginated feed responses in Redis keyed by `activity-feed:{userId}:{type}:{page}:{pageSize}`.
2. THE ActivityFeed_API SHALL set a TTL of 60 seconds on cached entries.
3. WHEN a user marks an activity as read or read-all, THE ActivityFeed_API SHALL invalidate all cache entries for that user.
4. Cache operations SHALL degrade gracefully if Redis is unavailable.

---

### Requirement 8: Activity Item Creation (Internal)

**User Story:** As a platform developer, I want activity items created automatically when relevant events occur, so that the feed is populated without manual intervention.

#### Acceptance Criteria

1. THE ActivityFeed_API SHALL listen to `transaction.created` events via `EventEmitterModule` and create a `TRANSACTION` `ActivityItem`.
2. THE ActivityFeed_API SHALL listen to `goal.progress` events and create a `GOAL_PROGRESS` `ActivityItem` when a goal crosses a 25% threshold.
3. THE ActivityFeed_API SHALL listen to `reward.earned` events and create a `REWARD_EARNED` `ActivityItem`.
4. THE ActivityFeed_API SHALL listen to `governance.voted` events and create a `GOVERNANCE_VOTE` `ActivityItem`.
