# Implementation Plan: User Activity Feed API

## Overview

Implement a new `ActivityModule` at `backend/src/modules/activity/`. Work proceeds: entity → DTOs → service (feed + event listeners) → controller → module wiring → app registration.

## Tasks

- [ ] 1. Create `ActivityItem` entity
  - [ ] 1.1 Create `entities/activity-item.entity.ts`
    - Columns: `id` (uuid PK), `userId` (uuid), `type` (enum: TRANSACTION/GOAL_PROGRESS/REWARD_EARNED/GOVERNANCE_VOTE), `title` (varchar 255), `description` (text), `metadata` (jsonb, nullable), `read` (boolean, default false), `createdAt` (CreateDateColumn)
    - Add indexes: `(userId, createdAt DESC)`, `(userId, type)`, `(userId, read)`
    - _Requirements: 2.5, 8.1_

- [ ] 2. Create DTOs
  - [ ] 2.1 Create `dto/activity-query.dto.ts`
    - Fields: `type?` (string, comma-separated), `page?` (`@Min(1)`, default 1), `pageSize?` (`@Min(1) @Max(100)`, default 20)
    - _Requirements: 3.1, 4.1_
  - [ ] 2.2 Create `dto/activity-item.dto.ts` and `dto/paginated-activity.dto.ts`
    - `ActivityItemDto`: `id`, `type`, `title`, `description`, `metadata`, `read`, `createdAt`
    - `PaginatedActivityDto`: `items`, `total`, `page`, `pageSize`, `totalPages`
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 2.5, 4.2_

- [ ] 3. Implement `ActivityService` — feed queries
  - [ ] 3.1 Create `activity.service.ts`
    - Inject `activityItemRepository`, `CACHE_MANAGER`
  - [ ] 3.2 Implement `getFeed(userId, query)` method
    - Filter: `userId`, `createdAt >= now - 90 days`, optional `type` filter
    - Order: `createdAt DESC`
    - Paginate; build `PaginatedActivityDto`
    - Cache key: `activity-feed:{userId}:{type}:{page}:{pageSize}`, TTL 60 s
    - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3, 4.1, 7.1, 7.2_
  - [ ]* 3.3 Write property test — Property 1: Feed only contains authenticated user's items
    - **Validates: Requirement 1.2**
    - Tag: `// Feature: user-activity-feed, Property 1: Feed only contains authenticated user's items`
  - [ ]* 3.4 Write property test — Property 2: 90-day window enforced
    - **Validates: Requirement 1.3**
    - Tag: `// Feature: user-activity-feed, Property 2: 90-day window enforced`
  - [ ]* 3.5 Write property test — Property 3: Type filter is exact
    - **Validates: Requirement 3.2**
    - Tag: `// Feature: user-activity-feed, Property 3: Type filter is exact`
  - [ ]* 3.6 Write property test — Property 4: Pagination metadata invariant
    - **Validates: Requirement 4.2**
    - Tag: `// Feature: user-activity-feed, Property 4: Pagination metadata invariant`
  - [ ] 3.7 Implement `getUnreadCount(userId)` method
    - Count `ActivityItem` where `userId` matches, `read = false`, `createdAt >= now - 90 days`
    - _Requirements: 6.1, 6.2_
  - [ ]* 3.8 Write property test — Property 6: unreadCount equals count of unread items
    - **Validates: Requirement 6.2**
    - Tag: `// Feature: user-activity-feed, Property 6: unreadCount equals count of unread items`
  - [ ] 3.9 Implement `markRead(itemId, userId)` and `markAllRead(userId)` methods
    - `markRead`: fetch item; throw `ForbiddenException` (403) if `userId` doesn't match; set `read = true`; invalidate cache
    - `markAllRead`: update all unread items for `userId`; invalidate cache
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.3_
  - [ ]* 3.10 Write property test — Property 5: Mark-read ownership enforced
    - **Validates: Requirement 5.3**
    - Tag: `// Feature: user-activity-feed, Property 5: Mark-read ownership enforced`

- [ ] 4. Implement `ActivityService` — event listeners
  - [ ] 4.1 Add `@OnEvent('transaction.created')` listener
    - Create `TRANSACTION` `ActivityItem` with title, description, and `{ txId, amount, type }` metadata
    - _Requirements: 8.1_
  - [ ] 4.2 Add `@OnEvent('goal.progress')` listener
    - Create `GOAL_PROGRESS` item only when percentage crosses 25/50/75/100 threshold
    - _Requirements: 2.2, 8.2_
  - [ ] 4.3 Add `@OnEvent('reward.earned')` listener
    - Create `REWARD_EARNED` item with badge/reward metadata
    - _Requirements: 2.3, 8.3_
  - [ ] 4.4 Add `@OnEvent('governance.voted')` listener
    - Create `GOVERNANCE_VOTE` item with `{ proposalId }` metadata
    - _Requirements: 2.4, 8.4_

- [ ] 5. Checkpoint — Ensure all service tests pass

- [ ] 6. Implement `ActivityController`
  - [ ] 6.1 Create `activity.controller.ts` with all four endpoints
    - `GET /users/activity` — `@UseGuards(JwtAuthGuard)`, `@Query()` `ActivityQueryDto`
    - `GET /users/activity/unread-count` — `@UseGuards(JwtAuthGuard)`
    - `PATCH /users/activity/read-all` — `@UseGuards(JwtAuthGuard)`, return 204
    - `PATCH /users/activity/:id/read` — `@UseGuards(JwtAuthGuard)`, return updated item
    - Declare `/unread-count` and `/read-all` before `/:id` to avoid routing ambiguity
    - Add `@ApiTags`, `@ApiBearerAuth`, `@ApiResponse` Swagger decorators
    - _Requirements: 1.1, 1.5, 4.3, 5.1, 5.2, 5.4, 6.1_

- [ ] 7. Create `ActivityModule` and register in `AppModule`
  - [ ] 7.1 Create `activity.module.ts`
    - Import `TypeOrmModule.forFeature([ActivityItem])`
    - Declare `ActivityController`; provide `ActivityService`
    - _Requirements: all_
  - [ ] 7.2 Add `ActivityModule` to `app.module.ts` imports
  - [ ]* 7.3 Write integration tests
    - No JWT → 401; type filter → correct items; mark-read by non-owner → 403; `pageSize > 100` → 400

- [ ] 8. Final checkpoint — Ensure all tests pass

## Notes

- Tasks marked `*` are optional for MVP
- Cache invalidation uses key-pattern scan: `activity-feed:{userId}:*` — same pattern as LeaderboardModule
- The `type` query param accepts comma-separated values; split and validate each against `ActivityType` enum in the service
- Event names (`transaction.created`, `goal.progress`, `reward.earned`, `governance.voted`) must be emitted by the respective modules for the listeners to fire — coordinate with those module owners
