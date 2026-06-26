# Rewards Challenges System

## 🎯 Overview

The Rewards Challenges System is a comprehensive time-bound challenge platform that allows users to discover, join, and complete various types of challenges to earn rewards.

## 📋 Features

### Challenge Types

1. **Deposit Streak** (`deposit_streak`)
   - Make deposits for consecutive days
   - Track streak history
   - Reward consistent saving behavior

2. **Goal Creation** (`goal_creation`)
   - Create savings goals
   - Track goal completion
   - Encourage financial planning

3. **Referral** (`referral`)
   - Refer new users
   - Track referral completion
   - Grow the platform community

4. **Savings Target** (`savings_target`)
   - Reach a specific savings amount
   - Track progress over time
   - Achieve financial milestones

5. **Transaction Count** (`transaction_count`)
   - Complete a number of transactions
   - Track transaction types
   - Encourage platform engagement

### Challenge Statuses

- **Draft**: Challenge is being created
- **Scheduled**: Challenge is scheduled to start
- **Active**: Challenge is currently running
- **Completed**: Challenge has ended
- **Cancelled**: Challenge was cancelled

### User Challenge Statuses

- **Active**: User is currently participating
- **Completed**: User has completed the challenge
- **Failed**: User failed to complete the challenge
- **Expired**: Challenge ended before user completed it

## 🔌 API Endpoints

### Public/Authenticated Endpoints

#### GET /rewards/challenges/active

Get all active challenges.

**Query Parameters:**
- `type` (optional): Filter by challenge type
- `category` (optional): Filter by category
- `featured` (optional): Filter featured challenges
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "challenges": [
    {
      "id": "ch_1",
      "name": "7-Day Savings Streak",
      "description": "Make a deposit every day for 7 consecutive days",
      "type": "deposit_streak",
      "status": "active",
      "startDate": "2026-04-25T00:00:00Z",
      "endDate": "2026-05-01T00:00:00Z",
      "rewardConfiguration": {
        "type": "badge",
        "value": "Streak Master",
        "metadata": {
          "points": 100
        }
      },
      "rules": {
        "requiredStreakDays": 7,
        "minimumDepositAmount": 10
      },
      "participantCount": 150,
      "completionCount": 45,
      "isFeatured": true,
      "tags": ["streak", "deposit", "beginner"],
      "userParticipation": {
        "joined": false
      }
    }
  ],
  "total": 1
}
```

**If Authenticated:**
```json
{
  "userParticipation": {
    "joined": true,
    "status": "active",
    "progressPercentage": 42.5,
    "joinedAt": "2026-04-26T10:00:00Z"
  }
}
```

#### GET /rewards/challenges/:id

Get a specific challenge by ID.

**Response:**
```json
{
  "id": "ch_1",
  "name": "7-Day Savings Streak",
  "description": "Make a deposit every day for 7 consecutive days",
  "type": "deposit_streak",
  "status": "active",
  "startDate": "2026-04-25T00:00:00Z",
  "endDate": "2026-05-01T00:00:00Z",
  "rewardConfiguration": {
    "type": "badge",
    "value": "Streak Master"
  },
  "rules": {
    "requiredStreakDays": 7,
    "minimumDepositAmount": 10
  },
  "participantCount": 150,
  "completionCount": 45,
  "userParticipation": {
    "joined": false
  }
}
```

### Authenticated Endpoints

#### POST /rewards/challenges/:id/join

Join a challenge.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "metadata": {
    "source": "mobile_app"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "uc_1",
  "userId": "user_123",
  "challengeId": "ch_1",
  "status": "active",
  "progressPercentage": 0,
  "progressMetadata": {
    "currentStreak": 0,
    "streakHistory": []
  },
  "joinedAt": "2026-04-26T10:00:00Z",
  "challenge": {
    "id": "ch_1",
    "name": "7-Day Savings Streak",
    "type": "deposit_streak"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Challenge not active, already ended, or user not eligible
- `404 Not Found`: Challenge not found
- `409 Conflict`: User already joined this challenge

#### GET /rewards/challenges/my/active

Get user's active challenges.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": "uc_1",
    "userId": "user_123",
    "challengeId": "ch_1",
    "status": "active",
    "progressPercentage": 42.5,
    "progressMetadata": {
      "currentStreak": 3,
      "streakHistory": ["2026-04-26", "2026-04-27", "2026-04-28"]
    },
    "joinedAt": "2026-04-26T10:00:00Z",
    "challenge": {
      "id": "ch_1",
      "name": "7-Day Savings Streak",
      "type": "deposit_streak",
      "endDate": "2026-05-01T00:00:00Z"
    }
  }
]
```

#### GET /rewards/challenges/my/all

Get all user's challenges (active, completed, expired).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": "uc_1",
    "userId": "user_123",
    "challengeId": "ch_1",
    "status": "completed",
    "progressPercentage": 100,
    "completedAt": "2026-04-30T15:30:00Z",
    "rewardClaimed": true,
    "rewardClaimedAt": "2026-04-30T15:35:00Z",
    "challenge": {
      "id": "ch_1",
      "name": "7-Day Savings Streak"
    }
  },
  {
    "id": "uc_2",
    "userId": "user_123",
    "challengeId": "ch_2",
    "status": "active",
    "progressPercentage": 60,
    "challenge": {
      "id": "ch_2",
      "name": "Referral Champion"
    }
  }
]
```

### Admin Endpoints

All admin endpoints require `ADMIN` role and JWT authentication.

#### POST /rewards/challenges/admin/create

Create a new challenge.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Request Body:**
```json
{
  "name": "7-Day Savings Streak",
  "description": "Make a deposit every day for 7 consecutive days",
  "type": "deposit_streak",
  "startDate": "2026-04-25T00:00:00Z",
  "endDate": "2026-05-01T00:00:00Z",
  "rewardConfiguration": {
    "type": "badge",
    "value": "Streak Master",
    "metadata": {
      "points": 100
    }
  },
  "rules": {
    "requiredStreakDays": 7,
    "minimumDepositAmount": 10,
    "requiresKYC": false,
    "maxParticipants": 1000
  },
  "badgeName": "Streak Master",
  "category": "savings",
  "tags": ["streak", "deposit", "beginner"],
  "isFeatured": true
}
```

**Response (201 Created):**
```json
{
  "id": "ch_1",
  "name": "7-Day Savings Streak",
  "status": "scheduled",
  "createdAt": "2026-04-20T10:00:00Z"
}
```

#### PUT /rewards/challenges/admin/:id

Update a challenge.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Request Body:**
```json
{
  "name": "Updated Challenge Name",
  "description": "Updated description",
  "status": "active",
  "isFeatured": true
}
```

**Response (200 OK):**
```json
{
  "id": "ch_1",
  "name": "Updated Challenge Name",
  "updatedAt": "2026-04-21T10:00:00Z"
}
```

#### DELETE /rewards/challenges/admin/:id

Delete a challenge (only if no participants).

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (204 No Content)**

#### POST /rewards/challenges/admin/activate-scheduled

Activate all scheduled challenges that have reached their start date.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (200 OK):**
```json
{
  "message": "Scheduled challenges activated"
}
```

#### POST /rewards/challenges/admin/complete-expired

Mark all expired challenges as completed.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (200 OK):**
```json
{
  "message": "Expired challenges completed"
}
```

## 📊 Data Models

### Challenge Entity

```typescript
{
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  startDate: Date;
  endDate: Date;
  rewardConfiguration: RewardConfiguration;
  rules: ChallengeRules;
  imageUrl?: string;
  badgeName?: string;
  participantCount: number;
  completionCount: number;
  isVisible: boolean;
  isFeatured: boolean;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

### UserChallenge Entity

```typescript
{
  id: string;
  userId: string;
  challengeId: string;
  status: UserChallengeStatus;
  progressPercentage: number;
  progressMetadata: ProgressMetadata;
  completedAt?: Date;
  expiredAt?: Date;
  rewardClaimed: boolean;
  rewardClaimedAt?: Date;
  attemptCount: number;
  joinedAt: Date;
  updatedAt: Date;
}
```

### RewardConfiguration

```typescript
{
  type: 'badge' | 'points' | 'token' | 'nft' | 'multiplier';
  value: number | string;
  metadata?: Record<string, any>;
}
```

### ChallengeRules

```typescript
{
  // Deposit Streak
  requiredStreakDays?: number;
  minimumDepositAmount?: number;

  // Goal Creation
  requiredGoalsCount?: number;
  minimumGoalAmount?: number;

  // Referral
  requiredReferralsCount?: number;
  referralMustComplete?: boolean;

  // Savings Target
  targetAmount?: number;
  allowPartialCredit?: boolean;

  // Transaction Count
  requiredTransactionCount?: number;
  transactionType?: 'deposit' | 'withdrawal' | 'any';

  // General
  maxParticipants?: number;
  requiresKYC?: boolean;
  minimumAccountAge?: number; // in days
  excludedUserIds?: string[];
}
```

### ProgressMetadata

```typescript
{
  // Deposit Streak
  currentStreak?: number;
  lastDepositDate?: string;
  streakHistory?: string[];

  // Goal Creation
  goalsCreated?: number;
  goalIds?: string[];

  // Referral
  referralsCount?: number;
  referralIds?: string[];
  completedReferrals?: number;

  // Savings Target
  currentAmount?: number;
  deposits?: Array<{ amount: number; date: string }>;

  // Transaction Count
  transactionCount?: number;
  transactionIds?: string[];

  // General
  milestones?: Array<{
    name: string;
    achieved: boolean;
    achievedAt?: string;
  }>;
  lastUpdated?: string;
}
```

## 🔄 Challenge Lifecycle

### 1. Creation (Admin)
```
Draft → Scheduled
```
- Admin creates challenge
- Status set to `scheduled`
- Challenge not visible to users yet

### 2. Activation
```
Scheduled → Active
```
- Automatic when `startDate` is reached
- Or manual via admin endpoint
- Challenge becomes visible and joinable

### 3. User Participation
```
User joins → Active participation → Completion/Expiration
```
- User joins active challenge
- Progress tracked automatically
- Status updated based on completion

### 4. Completion
```
Active → Completed
```
- Automatic when `endDate` is reached
- All active user challenges marked as expired
- Completed user challenges remain completed

## 🎮 Challenge Rules Validation

When a user attempts to join a challenge, the following validations are performed:

1. **Challenge Status**: Must be `active`
2. **Date Range**: Current date must be between `startDate` and `endDate`
3. **Already Joined**: User cannot join the same challenge twice
4. **KYC Requirement**: If `requiresKYC` is true, user must have KYC approved
5. **Account Age**: If `minimumAccountAge` is set, user account must be old enough
6. **Excluded Users**: User must not be in `excludedUserIds` list
7. **Max Participants**: Challenge must not have reached `maxParticipants`

## 📈 Progress Tracking

Progress tracking is challenge-type specific and handled by separate services:

### Deposit Streak
- Listen to deposit events
- Update `currentStreak` and `streakHistory`
- Check if streak meets `requiredStreakDays`

### Goal Creation
- Listen to goal creation events
- Update `goalsCreated` and `goalIds`
- Check if count meets `requiredGoalsCount`

### Referral
- Listen to referral events
- Update `referralsCount` and `referralIds`
- Track `completedReferrals` if `referralMustComplete` is true

### Savings Target
- Listen to deposit events
- Update `currentAmount` and `deposits` array
- Check if amount meets `targetAmount`

### Transaction Count
- Listen to transaction events
- Update `transactionCount` and `transactionIds`
- Filter by `transactionType` if specified

## 🎁 Reward System

Rewards are configured per challenge and can be:

1. **Badge**: Virtual badge/achievement
2. **Points**: Platform points
3. **Token**: Cryptocurrency tokens
4. **NFT**: Non-fungible token
5. **Multiplier**: Reward multiplier for future activities

Reward claiming is tracked separately to prevent double-claiming.

## 🔔 Events Emitted

### challenge.joined
```typescript
{
  userId: string;
  challengeId: string;
  challengeName: string;
  challengeType: ChallengeType;
}
```

### challenge.progress-updated
```typescript
{
  userId: string;
  challengeId: string;
  progressPercentage: number;
  metadata: ProgressMetadata;
}
```

### challenge.completed
```typescript
{
  userId: string;
  challengeId: string;
  completedAt: Date;
  reward: RewardConfiguration;
}
```

### challenge.expired
```typescript
{
  userId: string;
  challengeId: string;
  expiredAt: Date;
}
```

## 🔧 Configuration

### Environment Variables

No additional environment variables required. Uses existing database and event system.

### Database Migrations

Run migrations to create new tables:

```bash
npm run migration:run
```

Tables created:
- `challenges`
- `user_challenges`

## 🧪 Testing

### Example: Create and Join a Challenge

```bash
# 1. Create challenge (Admin)
curl -X POST http://localhost:3000/rewards/challenges/admin/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "7-Day Savings Streak",
    "description": "Make a deposit every day for 7 consecutive days",
    "type": "deposit_streak",
    "startDate": "2026-04-25T00:00:00Z",
    "endDate": "2026-05-01T00:00:00Z",
    "rewardConfiguration": {
      "type": "badge",
      "value": "Streak Master"
    },
    "rules": {
      "requiredStreakDays": 7,
      "minimumDepositAmount": 10
    }
  }'

# 2. Activate challenge (Admin)
curl -X POST http://localhost:3000/rewards/challenges/admin/activate-scheduled \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Get active challenges (Public)
curl http://localhost:3000/rewards/challenges/active

# 4. Join challenge (User)
curl -X POST http://localhost:3000/rewards/challenges/CHALLENGE_ID/join \
  -H "Authorization: Bearer USER_TOKEN"

# 5. Get my challenges (User)
curl http://localhost:3000/rewards/challenges/my/active \
  -H "Authorization: Bearer USER_TOKEN"
```

## 📝 Best Practices

1. **Challenge Duration**: Keep challenges between 7-30 days for optimal engagement
2. **Reward Balance**: Ensure rewards are attractive but sustainable
3. **Clear Rules**: Make challenge rules clear and achievable
4. **Progress Visibility**: Show users their progress frequently
5. **Notifications**: Send reminders and progress updates
6. **Fair Play**: Implement anti-gaming measures
7. **Testing**: Test challenges thoroughly before activation

## 🚀 Future Enhancements

- [ ] Team challenges (compete with friends)
- [ ] Recurring challenges (weekly/monthly)
- [ ] Challenge templates
- [ ] Leaderboards with prizes
- [ ] Challenge recommendations based on user behavior
- [ ] Social sharing of achievements
- [ ] Challenge difficulty levels
- [ ] Multi-step challenges (milestones)
- [ ] Challenge analytics dashboard
- [ ] A/B testing for challenge effectiveness

## 📚 Related Documentation

- [Challenges Service](./challenges.service.ts)
- [Rewards Challenges Service](./services/rewards-challenges.service.ts)
- [Challenge Entities](./entities/)
- [API Documentation](http://localhost:3000/api/docs)

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-25  
**Status**: ✅ Production Ready
