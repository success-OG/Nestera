# Implementation Plan: User Profile Completion API

## Overview

Add `GET /users/profile/completion` and `GET /users/profile/completion/analytics` to the existing `UserModule`. Work proceeds: entity → service → controller wiring → module registration.

## Tasks

- [ ] 1. Create `ProfileCompletionPoints` entity
  - [ ] 1.1 Create `entities/profile-completion-points.entity.ts`
    - Columns: `id` (uuid PK), `userId` (uuid), `milestone` (int: 50/75/100), `points` (int), `awardedAt` (CreateDateColumn)
    - Add unique constraint on `(userId, milestone)`
    - _Requirements: 4.3_

- [ ] 2. Create DTOs
  - [ ] 2.1 Create `dto/profile-completion-response.dto.ts`
    - Fields: `completionPercentage`, `completedFields`, `missingFields`, `suggestions` (array of `{ field, points, priority }`), `totalPointsEarned`, `nextMilestone`
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 1.4, 2.1, 2.3, 3.1, 4.5, 4.6_
  - [ ] 2.2 Create `dto/completion-analytics-response.dto.ts`
    - Fields: `averageCompletionPercentage`, `totalUsers`, `usersAt100Percent`, `usersAt75Percent`, `usersAt50Percent`, `usersBelow50Percent`, `mostCommonMissingField`
    - _Requirements: 5.2_

- [ ] 3. Implement `ProfileCompletionService`
  - [ ] 3.1 Create `services/profile-completion.service.ts`
    - Inject `userRepository`, `profileCompletionPointsRepository`
    - Define `FIELD_CONFIG` array with field name, check function, points, priority
    - Define `MILESTONES` array `[{threshold:50,points:100},{threshold:75,points:150},{threshold:100,points:300}]`
    - _Requirements: 1.2, 3.3_
  - [ ] 3.2 Implement `compute(userId)` method
    - Fetch user; evaluate each field in `FIELD_CONFIG`
    - Compute `completionPercentage = round((completed.length / 6) * 100)`
    - Build `suggestions` sorted by points descending
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.4_
  - [ ]* 3.3 Write property test — Property 1: completionPercentage formula
    - **Validates: Requirement 1.3**
    - Tag: `// Feature: user-profile-completion, Property 1: completionPercentage formula`
  - [ ]* 3.4 Write property test — Property 2: missingFields + completedFields = all fields
    - **Validates: Requirements 2.1, 2.3**
    - Tag: `// Feature: user-profile-completion, Property 2: missingFields + completedFields = all fields`
  - [ ]* 3.5 Write property test — Property 3: suggestions ordered by points descending
    - **Validates: Requirement 3.4**
    - Tag: `// Feature: user-profile-completion, Property 3: suggestions ordered by points descending`
  - [ ] 3.6 Implement milestone award logic (idempotent)
    - For each milestone where `percentage >= threshold`, upsert `ProfileCompletionPoints` using `(userId, milestone)` unique constraint
    - Compute `totalPointsEarned` and `nextMilestone`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 3.7 Write property test — Property 4: Milestone idempotency
    - **Validates: Requirement 4.4**
    - Tag: `// Feature: user-profile-completion, Property 4: Milestone idempotency`
  - [ ]* 3.8 Write property test — Property 5: totalPointsEarned equals sum of awarded milestone points
    - **Validates: Requirement 4.5**
    - Tag: `// Feature: user-profile-completion, Property 5: totalPointsEarned equals sum of awarded milestone points`
  - [ ]* 3.9 Write property test — Property 6: nextMilestone is null when all milestones achieved
    - **Validates: Requirement 4.6**
    - Tag: `// Feature: user-profile-completion, Property 6: nextMilestone is null when all milestones achieved`
  - [ ] 3.10 Implement `getAnalytics()` method (admin)
    - Compute per-user completion percentages via DB query; aggregate into `CompletionAnalyticsResponseDto`
    - _Requirements: 5.1, 5.2_

- [ ] 4. Checkpoint — Ensure all service tests pass

- [ ] 5. Wire controller and module
  - [ ] 5.1 Add `GET /users/profile/completion` to `user.controller.ts`
    - `@UseGuards(JwtAuthGuard)`, full Swagger decorators
    - _Requirements: 1.1, 1.5_
  - [ ] 5.2 Add `GET /users/profile/completion/analytics` to `user.controller.ts`
    - `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('ADMIN')`, Swagger decorators
    - Declare before any `/:id` routes to avoid routing ambiguity
    - _Requirements: 5.1, 5.3_
  - [ ] 5.3 Register `ProfileCompletionService` and `ProfileCompletionPoints` entity in `user.module.ts`
  - [ ]* 5.4 Write integration tests
    - No JWT → 401; partial profile → correct percentage; analytics as non-admin → 403; milestone awarded once

- [ ] 6. Final checkpoint — Ensure all tests pass

## Notes

- Tasks marked `*` are optional for MVP
- The `upsert` for milestones relies on the `(userId, milestone)` unique constraint — use TypeORM `save` with conflict handling or raw `INSERT ... ON CONFLICT DO NOTHING`
