# Design Document: User Activity Feed API

## Overview

A new `ActivityModule` at `backend/src/modules/activity/` stores and serves a personalized activity feed. Activity items are created via event listeners on `EventEmitterModule` events emitted by existing modules. The feed is paginated, filterable, cached in Redis, and supports read/unread tracking.

---

## Architecture

```
EventEmitter (transaction.created, goal.progress, reward.earned, governance.voted)
    → ActivityService.createItem()
    → activity_items table

Client → ActivityController
    → ActivityService.getFeed(userId, query)
        → Redis cache check
        → activityItemRepo query (90-day window, filter, paginate)
        → Redis cache set
    ← PaginatedActivityDto
```

---

## Module Structure

```
backend/src/modules/activity/
├── dto/
│   ├── activity-query.dto.ts
│   ├── activity-item.dto.ts
│   └── paginated-activity.dto.ts
├── entities/
│   └── activity-item.entity.ts
├── activity.controller.ts
├── activity.service.ts
└── activity.module.ts
```

## Modified Files

| File | Change |
|---|---|
| `app.module.ts` | Add `ActivityModule` |

---

## Data Models

### Entity: `ActivityItem`

```typescript
export enum ActivityType {
  TRANSACTION = 'TRANSACTION',
  GOAL_PROGRESS = 'GOAL_PROGRESS',
  REWARD_EARNED = 'REWARD_EARNED',
  GOVERNANCE_VOTE = 'GOVERNANCE_VOTE',
}

@Entity('activity_items')
export class ActivityItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ActivityType })
  type: ActivityType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

Indexes: `(userId, createdAt DESC)`, `(userId, type)`, `(userId, read)`.

### Query DTO

```typescript
class ActivityQueryDto {
  type?: string;        // comma-separated ActivityType values
  page?: number;        // @Min(1), default 1
  pageSize?: number;    // @Min(1) @Max(100), default 20
}
```

### Response DTO

```typescript
class PaginatedActivityDto {
  items: ActivityItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## Controller Endpoints

| Method | Path | Guard | Description |
|---|---|---|---|
| `GET` | `/users/activity` | `JwtAuthGuard` | Paginated feed |
| `GET` | `/users/activity/unread-count` | `JwtAuthGuard` | Unread count |
| `PATCH` | `/users/activity/:id/read` | `JwtAuthGuard` | Mark single as read |
| `PATCH` | `/users/activity/read-all` | `JwtAuthGuard` | Mark all as read |

Note: `/unread-count` and `/read-all` must be declared before `/:id` to avoid routing ambiguity.

---

## Event Listeners

```typescript
@OnEvent('transaction.created')
async handleTransaction(event: { userId: string; txId: string; amount: string; type: string }) {
  await this.createItem({ userId, type: TRANSACTION, title: 'Transaction', description: `${type} of ${amount}`, metadata: { txId } });
}

@OnEvent('goal.progress')
async handleGoalProgress(event: { userId: string; goalId: string; percentage: number }) {
  if ([25, 50, 75, 100].includes(Math.floor(event.percentage / 25) * 25)) {
    await this.createItem({ ... });
  }
}

@OnEvent('reward.earned')
async handleReward(event: { userId: string; badgeType: string; rankingType: string }) { ... }

@OnEvent('governance.voted')
async handleGovernanceVote(event: { userId: string; proposalId: string }) { ... }
```

---

## Cache Strategy

- Key: `activity-feed:{userId}:{type}:{page}:{pageSize}` — TTL 60 s
- Invalidate all `activity-feed:{userId}:*` keys on mark-read or read-all
- Unread count is NOT cached (always fresh)

---

## Correctness Properties

### Property 1: Feed only contains authenticated user's items
*For any* user, `GET /users/activity` returns only items where `userId` matches the authenticated user.
**Validates: Requirement 1.2**

### Property 2: 90-day window enforced
*For any* activity item with `createdAt < now - 90 days`, it should not appear in any feed response.
**Validates: Requirement 1.3**

### Property 3: Type filter is exact
*For any* request with `type=TRANSACTION`, all returned items should have `type === 'TRANSACTION'`.
**Validates: Requirement 3.2**

### Property 4: Pagination metadata invariant
*For any* query with N total items, page P, pageSize S: `totalPages = ceil(N/S)`, `items.length <= S`.
**Validates: Requirement 4.2**

### Property 5: Mark-read ownership enforced
*For any* item belonging to user A, a mark-read request from user B should return HTTP 403.
**Validates: Requirement 5.3**

### Property 6: unreadCount equals count of unread items
*For any* user, `unreadCount` should equal the number of `ActivityItem` records with `read = false` for that user within the 90-day window.
**Validates: Requirement 6.2**

---

## Error Handling

| Scenario | Status | Behavior |
|---|---|---|
| No JWT | 401 | JwtAuthGuard rejects |
| Invalid type value | 400 | service throws BadRequestException |
| pageSize > 100 | 400 | class-validator rejects |
| Item not found / wrong user on mark-read | 403 | ForbiddenException |
| Redis unavailable | 200 (degraded) | try/catch, proceeds without cache |

---

## Testing Strategy

- Unit tests: feed query (90-day filter, type filter, pagination), mark-read ownership, event listener item creation
- Property-based tests with `fast-check` for Properties 1–6 (min 100 iterations)
- Integration: `GET /users/activity` without JWT → 401; with type filter → correct items; mark-read by non-owner → 403
