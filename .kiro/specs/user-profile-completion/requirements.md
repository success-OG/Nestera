# Requirements Document

## Introduction

This feature adds a profile completion tracking endpoint to the user module. It calculates a completion percentage based on which profile fields are populated, returns a checklist of missing fields with improvement suggestions, awards points at completion milestones, and exposes an admin analytics endpoint for platform-wide completion rate tracking.

## Glossary

- **ProfileCompletion_API**: The `GET /users/profile/completion` endpoint.
- **CompletionPercentage**: A 0–100 integer representing how complete the user's profile is.
- **ProfileField**: A specific user attribute checked for completeness (name, bio, avatarUrl, publicKey, kycStatus=APPROVED, walletAddress).
- **Suggestion**: A recommended action for a missing field, including the field name, points awarded on completion, and priority level.
- **MilestonePoints**: Points awarded to a user when their completion percentage crosses a defined threshold (50%, 75%, 100%).
- **ProfileCompletionPoints**: A new entity storing points earned by users for profile completion milestones.
- **CompletionAnalytics**: Aggregate statistics on profile completion rates across all users, accessible to admins.

---

## Requirements

### Requirement 1: Calculate Profile Completion Percentage

**User Story:** As an authenticated user, I want to see my profile completion percentage, so that I know how complete my profile is.

#### Acceptance Criteria

1. THE ProfileCompletion_API SHALL expose `GET /users/profile/completion` protected by `JwtAuthGuard`.
2. THE ProfileCompletion_API SHALL evaluate the following fields on the `User` entity: `name`, `bio`, `avatarUrl`, `publicKey`, `kycStatus` (complete when `APPROVED`), `walletAddress`.
3. THE ProfileCompletion_API SHALL compute `completionPercentage` as `(completedFieldCount / totalFieldCount) × 100`, rounded to the nearest integer.
4. THE ProfileCompletion_API SHALL return `completionPercentage` in the response.
5. THE ProfileCompletion_API SHALL be documented with Swagger/OpenAPI annotations.

---

### Requirement 2: Missing Fields Checklist

**User Story:** As a user, I want to see which fields are missing, so that I know exactly what to fill in.

#### Acceptance Criteria

1. THE ProfileCompletion_API SHALL return a `missingFields` array listing the names of all incomplete profile fields.
2. WHEN all fields are complete, THE ProfileCompletion_API SHALL return an empty `missingFields` array.
3. THE ProfileCompletion_API SHALL return a `completedFields` array listing the names of all complete profile fields.

---

### Requirement 3: Improvement Suggestions

**User Story:** As a user, I want actionable suggestions for improving my profile, so that I know what to do next.

#### Acceptance Criteria

1. THE ProfileCompletion_API SHALL return a `suggestions` array containing one entry per missing field.
2. EACH suggestion SHALL include: `field` (string), `points` (integer — points awarded on completion), `priority` (`"high"` | `"medium"` | `"low"`).
3. THE point values and priorities SHALL be: `kycStatus` → 200 pts, high; `publicKey` → 150 pts, high; `walletAddress` → 100 pts, medium; `avatarUrl` → 50 pts, medium; `name` → 30 pts, low; `bio` → 20 pts, low.
4. THE `suggestions` array SHALL be ordered by `points` descending (highest-value suggestions first).

---

### Requirement 4: Milestone Points

**User Story:** As a user, I want to earn points when I reach profile completion milestones, so that I am rewarded for improving my profile.

#### Acceptance Criteria

1. THE ProfileCompletion_API SHALL award milestone points when a user's `completionPercentage` first crosses 50%, 75%, or 100%.
2. THE milestone point values SHALL be: 50% → 100 pts, 75% → 150 pts, 100% → 300 pts.
3. THE ProfileCompletion_API SHALL store awarded milestone points in a `ProfileCompletionPoints` entity with fields: `id`, `userId`, `milestone` (50/75/100), `points`, `awardedAt`.
4. EACH milestone SHALL be awarded at most once per user (idempotent).
5. THE ProfileCompletion_API SHALL include a `totalPointsEarned` field in the response showing the sum of all milestone points earned by the user.
6. THE ProfileCompletion_API SHALL include a `nextMilestone` object in the response showing the next uncrossed milestone and its point value, or `null` if all milestones are achieved.

---

### Requirement 5: Admin Analytics

**User Story:** As an admin, I want to see platform-wide profile completion statistics, so that I can measure feature adoption.

#### Acceptance Criteria

1. THE ProfileCompletion_API SHALL expose `GET /users/profile/completion/analytics` restricted to users with the `ADMIN` role via `RolesGuard`.
2. THE analytics response SHALL include: `averageCompletionPercentage`, `totalUsers`, `usersAt100Percent`, `usersAt75Percent`, `usersAt50Percent`, `usersBelow50Percent`, `mostCommonMissingField`.
3. THE analytics endpoint SHALL be documented with Swagger/OpenAPI annotations.
