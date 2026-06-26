# Savings Milestone Badges System

## Overview

This module implements a comprehensive badge system for savings milestones to encourage user engagement. Badges are awarded based on user achievements such as first deposits, goal completions, and streak maintenance.

## Badge Taxonomy

### Categories
- **SAVINGS**: General savings achievements (first deposit, multi-goal)
- **STREAK**: Consistent deposit streaks (7, 30, 90 days)
- **GOAL**: Goal-related milestones (25%, 50%, 75%, 100%)
- **SOCIAL**: Social sharing achievements (future expansion)

### Tiers
- **BRONZE**: Basic achievements (50 points)
- **SILVER**: Intermediate achievements (50-75 points)
- **GOLD**: Advanced achievements (100-200 points)
- **PLATINUM**: Elite achievements (500+ points)

## Default Badges

| Code | Name | Category | Tier | Points | Criteria |
|------|------|-----------|------|--------|----------|
| first_deposit | First Saver | SAVINGS | BRONZE | 50 | First deposit made |
| goal_25 | Quarter Way | GOAL | BRONZE | 25 | 25% of goal reached |
| goal_50 | Halfway There | GOAL | SILVER | 50 | 50% of goal reached |
| goal_75 | Almost There | GOAL | SILVER | 75 | 75% of goal reached |
| goal_complete | Goal Achiever | GOAL | GOLD | 100 | Goal completed |
| streak_7 | Week Warrior | STREAK | BRONZE | 35 | 7-day deposit streak |
| streak_30 | Monthly Master | STREAK | SILVER | 75 | 30-day deposit streak |
| streak_90 | Quarter Champion | STREAK | GOLD | 150 | 90-day deposit streak |
| multi_goal | Savings Champion | SAVINGS | GOLD | 200 | 3+ goals completed |
| early_bird | Early Bird | GOAL | SILVER | 60 | Goal completed early |
| platinum_saver | Platinum Saver | SAVINGS | PLATINUM | 500 | 10+ badges earned |

## API Endpoints

### GET /badges
Get all available badges with earning status for the current user.

**Response:**
```json
[
  {
    "id": "badge-1",
    "code": "first_deposit",
    "name": "First Saver",
    "description": "Made your first deposit",
    "category": "SAVINGS",
    "tier": "BRONZE",
    "icon": "first-deposit",
    "color": "#CD7F32",
    "points": 50,
    "active": true,
    "earned": true
  }
]
```

### GET /badges/my
Get the current user's earned badges.

**Response:**
```json
[
  {
    "id": "user-badge-1",
    "badge": { ... },
    "earnedAt": "2024-01-15T10:30:00Z",
    "shared": false,
    "shareToken": null
  }
]
```

### GET /badges/stats
Get badge statistics for the current user.

**Response:**
```json
{
  "totalBadges": 11,
  "earnedBadges": 5,
  "totalPoints": 275,
  "recentBadges": [ ... ],
  "categoryBreakdown": {
    "SAVINGS": 2,
    "STREAK": 1,
    "GOAL": 2,
    "SOCIAL": 0
  }
}
```

### POST /badges/:id/share
Generate a share token for a badge.

**Response:**
```json
{
  "shareToken": "abc123...",
  "shareUrl": "/badges/shared/abc123..."
}
```

### GET /badges/shared/:token
Get a shared badge by token (public endpoint).

## Event Integration

The badge system integrates with existing savings events:

### goal.milestone
Emitted when a savings goal milestone is reached. The badge service listens for this event and awards milestone badges.

**Event Payload:**
```typescript
{
  userId: string;
  goalId: string;
  percentage: number;
  goalName: string;
}
```

### deposit.completed
Emitted when a deposit is completed. The badge service listens for this event and awards the first deposit badge.

**Event Payload:**
```typescript
{
  userId: string;
  amount: number;
}
```

### badge.earned
Emitted when a badge is awarded. The notification service listens for this event to create in-app and email notifications.

**Event Payload:**
```typescript
{
  userId: string;
  badgeId: string;
  badgeCode: string;
  badgeName: string;
  points: number;
  earnedAt: Date;
  metadata?: Record<string, any>;
}
```

## Notification Integration

Badge awards trigger notifications:

1. **In-app notification**: Created automatically when a badge is earned
2. **Email notification**: Sent if user has badge notifications enabled

Notification type: `BADGE_EARNED`

## Database Schema

### badges table
- `id`: UUID primary key
- `code`: Unique badge identifier
- `name`: Human-readable name
- `description`: Badge description
- `category`: Badge category (enum)
- `tier`: Badge tier (enum)
- `icon`: Icon identifier
- `color`: Display color
- `points`: Points awarded
- `active`: Whether badge is earnable
- `criteria`: JSON criteria metadata
- `createdAt`, `updatedAt`: Timestamps

### user_badges table
- `id`: UUID primary key
- `userId`: User UUID
- `badgeId`: Badge UUID
- `earnedAt`: When badge was earned
- `progress`: Progress tracking (JSON)
- `shared`: Whether badge has been shared
- `sharedAt`: When badge was shared
- `shareToken`: Share token for public sharing
- `metadata`: Additional metadata (JSON)
- `createdAt`, `updatedAt`: Timestamps

## Initialization

Default badges are initialized automatically on application startup via the `initializeDefaultBadges()` method. This can be called manually if needed:

```typescript
await badgesService.initializeDefaultBadges();
```

## Badge Sharing

Badges can be shared publicly via share tokens:

1. User generates a share token for a badge
2. Share token is stored with the user badge
3. Public endpoint allows viewing shared badges via token
4. Share tokens are unique and persistent

## Testing

Unit tests are provided for the badge service and controller:

```bash
# Run badge service tests
npm test -- badges.service.spec.ts

# Run badge controller tests
npm test -- badges.controller.spec.ts
```

## Future Enhancements

Potential future badge types:
- Social sharing badges
- Referral badges
- Investment milestone badges
- Governance participation badges
- Challenge completion badges
- Seasonal/event badges
