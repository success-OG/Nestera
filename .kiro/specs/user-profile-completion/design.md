# Design Document: User Profile Completion API

## Overview

Adds `GET /users/profile/completion` to the existing `UserModule`. A new `ProfileCompletionService` handles percentage calculation, suggestion generation, and milestone point awards. A new `ProfileCompletionPoints` entity stores awarded milestones. An admin analytics endpoint aggregates platform-wide completion data.

---

## Architecture

```
Client → UserController.getProfileCompletion()
           → ProfileCompletionService.compute(userId)
               → userRepo.findOne(userId)
               → calculate fields, percentage, suggestions
               → check + award milestones (idempotent)
           ← ProfileCompletionResponseDto
```

---

## New Files

| File | Purpose |
|---|---|
| `dto/profile-completion-response.dto.ts` | Response DTO |
| `dto/completion-analytics-response.dto.ts` | Admin analytics DTO |
| `entities/profile-completion-points.entity.ts` | Milestone points entity |
| `services/profile-completion.service.ts` | Calculation + milestone logic |

## Modified Files

| File | Change |
|---|---|
| `user.controller.ts` | Add `GET /users/profile/completion` and `GET /users/profile/completion/analytics` |
| `user.module.ts` | Register `ProfileCompletionService`, `ProfileCompletionPoints` entity |

---

## Data Models

### Entity: `ProfileCompletionPoints`

```typescript
@Entity('profile_completion_points')
export class ProfileCompletionPoints {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int' })
  milestone: 50 | 75 | 100;

  @Column({ type: 'int' })
  points: number;

  @CreateDateColumn()
  awardedAt: Date;

  // Unique constraint: (userId, milestone) — each milestone awarded once
}
```

### Field Configuration

```typescript
const FIELD_CONFIG = [
  { field: 'name',          points: 30,  priority: 'low',    check: (u) => !!u.name },
  { field: 'bio',           points: 20,  priority: 'low',    check: (u) => !!u.bio },
  { field: 'avatarUrl',     points: 50,  priority: 'medium', check: (u) => !!u.avatarUrl },
  { field: 'publicKey',     points: 150, priority: 'high',   check: (u) => !!u.publicKey },
  { field: 'kycStatus',     points: 200, priority: 'high',   check: (u) => u.kycStatus === 'APPROVED' },
  { field: 'walletAddress', points: 100, priority: 'medium', check: (u) => !!u.walletAddress },
];
```

### Milestone Configuration

```typescript
const MILESTONES = [
  { threshold: 50,  points: 100 },
  { threshold: 75,  points: 150 },
  { threshold: 100, points: 300 },
];
```

### Response DTO

```typescript
class ProfileCompletionResponseDto {
  completionPercentage: number;          // 0–100 integer
  completedFields: string[];
  missingFields: string[];
  suggestions: SuggestionDto[];          // ordered by points desc
  totalPointsEarned: number;
  nextMilestone: { threshold: number; points: number } | null;
}

class SuggestionDto {
  field: string;
  points: number;
  priority: 'high' | 'medium' | 'low';
}
```

### Analytics Response DTO

```typescript
class CompletionAnalyticsResponseDto {
  averageCompletionPercentage: number;
  totalUsers: number;
  usersAt100Percent: number;
  usersAt75Percent: number;
  usersAt50Percent: number;
  usersBelow50Percent: number;
  mostCommonMissingField: string;
}
```

---

## Calculation Logic

```typescript
const completed = FIELD_CONFIG.filter(f => f.check(user));
const missing = FIELD_CONFIG.filter(f => !f.check(user));
const percentage = Math.round((completed.length / FIELD_CONFIG.length) * 100);
const suggestions = missing.map(f => ({ field: f.field, points: f.points, priority: f.priority }))
                           .sort((a, b) => b.points - a.points);
```

### Milestone Award (idempotent)

```typescript
for (const m of MILESTONES) {
  if (percentage >= m.threshold) {
    await this.pointsRepo.upsert({ userId, milestone: m.threshold, points: m.points }, ['userId', 'milestone']);
  }
}
const totalPointsEarned = await this.pointsRepo.sum('points', { userId });
const nextMilestone = MILESTONES.find(m => percentage < m.threshold) ?? null;
```

---

## Correctness Properties

### Property 1: completionPercentage formula
*For any* user, `completionPercentage = round((completedCount / 6) * 100)`.
**Validates: Requirement 1.3**

### Property 2: missingFields + completedFields = all fields
*For any* user, `missingFields.length + completedFields.length === 6`.
**Validates: Requirements 2.1, 2.3**

### Property 3: suggestions ordered by points descending
*For any* response, `suggestions[i].points >= suggestions[i+1].points` for all i.
**Validates: Requirement 3.4**

### Property 4: Milestone idempotency
*For any* user, calling the endpoint multiple times when percentage is unchanged should not create duplicate `ProfileCompletionPoints` records.
**Validates: Requirement 4.4**

### Property 5: totalPointsEarned equals sum of awarded milestone points
*For any* user, `totalPointsEarned === sum of ProfileCompletionPoints.points for that user`.
**Validates: Requirement 4.5**

### Property 6: nextMilestone is null when all milestones achieved
*For any* user with `completionPercentage === 100`, `nextMilestone === null`.
**Validates: Requirement 4.6**

---

## Error Handling

| Scenario | Status | Behavior |
|---|---|---|
| No JWT | 401 | JwtAuthGuard rejects |
| Non-admin on analytics | 403 | RolesGuard rejects |
| User not found (edge case) | 404 | NotFoundException |

---

## Testing Strategy

- Unit tests for percentage calculation, suggestion ordering, milestone award logic
- Property-based tests with `fast-check` for Properties 1–6 (min 100 iterations)
- Integration: `GET /users/profile/completion` without JWT → 401; with partial profile → correct percentage and suggestions
- Integration: `GET /users/profile/completion/analytics` as non-admin → 403
