# Rewards Challenges System - Quick Start Guide

## 🚀 Quick Setup

### 1. Run Database Migration

```bash
npm run migration:run
```

This creates the `challenges` and `user_challenges` tables.

### 2. Verify API Endpoints

The following endpoints are now available:

**Public:**
- `GET /rewards/challenges/active` - List active challenges

**Authenticated:**
- `POST /rewards/challenges/:id/join` - Join a challenge
- `GET /rewards/challenges/my/active` - Get my active challenges
- `GET /rewards/challenges/my/all` - Get all my challenges

**Admin:**
- `POST /rewards/challenges/admin/create` - Create challenge
- `PUT /rewards/challenges/admin/:id` - Update challenge
- `DELETE /rewards/challenges/admin/:id` - Delete challenge

## 📝 Quick Examples

### Create a Deposit Streak Challenge (Admin)

```bash
curl -X POST http://localhost:3000/rewards/challenges/admin/create \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
      "minimumDepositAmount": 10
    },
    "badgeName": "Streak Master",
    "category": "savings",
    "tags": ["streak", "deposit", "beginner"],
    "isFeatured": true
  }'
```

### Activate Scheduled Challenges (Admin)

```bash
curl -X POST http://localhost:3000/rewards/challenges/admin/activate-scheduled \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Active Challenges (Public)

```bash
curl http://localhost:3000/rewards/challenges/active
```

### Get Active Challenges with Filters

```bash
# Filter by type
curl "http://localhost:3000/rewards/challenges/active?type=deposit_streak"

# Filter featured challenges
curl "http://localhost:3000/rewards/challenges/active?featured=true"

# Pagination
curl "http://localhost:3000/rewards/challenges/active?limit=10&offset=0"
```

### Join a Challenge (User)

```bash
curl -X POST http://localhost:3000/rewards/challenges/CHALLENGE_ID/join \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Get My Active Challenges (User)

```bash
curl http://localhost:3000/rewards/challenges/my/active \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Get All My Challenges (User)

```bash
curl http://localhost:3000/rewards/challenges/my/all \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

## 🎯 Challenge Types

### 1. Deposit Streak

```json
{
  "type": "deposit_streak",
  "rules": {
    "requiredStreakDays": 7,
    "minimumDepositAmount": 10
  }
}
```

### 2. Goal Creation

```json
{
  "type": "goal_creation",
  "rules": {
    "requiredGoalsCount": 3,
    "minimumGoalAmount": 100
  }
}
```

### 3. Referral

```json
{
  "type": "referral",
  "rules": {
    "requiredReferralsCount": 5,
    "referralMustComplete": true
  }
}
```

### 4. Savings Target

```json
{
  "type": "savings_target",
  "rules": {
    "targetAmount": 1000,
    "allowPartialCredit": true
  }
}
```

### 5. Transaction Count

```json
{
  "type": "transaction_count",
  "rules": {
    "requiredTransactionCount": 10,
    "transactionType": "deposit"
  }
}
```

## 🎁 Reward Types

### Badge

```json
{
  "rewardConfiguration": {
    "type": "badge",
    "value": "Streak Master",
    "metadata": {
      "points": 100,
      "imageUrl": "https://example.com/badge.png"
    }
  }
}
```

### Points

```json
{
  "rewardConfiguration": {
    "type": "points",
    "value": 500,
    "metadata": {
      "description": "Platform points"
    }
  }
}
```

### Token

```json
{
  "rewardConfiguration": {
    "type": "token",
    "value": 10,
    "metadata": {
      "tokenSymbol": "NEST",
      "tokenAddress": "0x..."
    }
  }
}
```

### NFT

```json
{
  "rewardConfiguration": {
    "type": "nft",
    "value": "unique-nft-id",
    "metadata": {
      "nftName": "Savings Champion",
      "nftImage": "https://example.com/nft.png"
    }
  }
}
```

### Multiplier

```json
{
  "rewardConfiguration": {
    "type": "multiplier",
    "value": 1.5,
    "metadata": {
      "duration": "30 days",
      "appliesTo": "savings_interest"
    }
  }
}
```

## 🔒 Challenge Rules

### Basic Rules

```json
{
  "rules": {
    "maxParticipants": 1000,
    "requiresKYC": false,
    "minimumAccountAge": 7
  }
}
```

### Exclude Specific Users

```json
{
  "rules": {
    "excludedUserIds": ["user_123", "user_456"]
  }
}
```

## 📊 Response Examples

### Active Challenges Response

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
        "value": "Streak Master"
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

### Join Challenge Response

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
    "type": "deposit_streak",
    "endDate": "2026-05-01T00:00:00Z"
  }
}
```

### My Challenges Response

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
      "streakHistory": ["2026-04-26", "2026-04-27", "2026-04-28"],
      "lastDepositDate": "2026-04-28"
    },
    "joinedAt": "2026-04-26T10:00:00Z",
    "challenge": {
      "id": "ch_1",
      "name": "7-Day Savings Streak",
      "type": "deposit_streak",
      "endDate": "2026-05-01T00:00:00Z",
      "rewardConfiguration": {
        "type": "badge",
        "value": "Streak Master"
      }
    }
  }
]
```

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Challenge has not started yet",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Challenge not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "You have already joined this challenge",
  "error": "Conflict"
}
```

## 🧪 Testing Workflow

### 1. Create Challenge (Admin)
```bash
# Create a deposit streak challenge
curl -X POST http://localhost:3000/rewards/challenges/admin/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @challenge.json
```

### 2. Activate Challenge (Admin)
```bash
# Activate scheduled challenges
curl -X POST http://localhost:3000/rewards/challenges/admin/activate-scheduled \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. List Active Challenges (Public)
```bash
# Get all active challenges
curl http://localhost:3000/rewards/challenges/active
```

### 4. Join Challenge (User)
```bash
# Join the challenge
curl -X POST http://localhost:3000/rewards/challenges/CHALLENGE_ID/join \
  -H "Authorization: Bearer USER_TOKEN"
```

### 5. Check Progress (User)
```bash
# Get my active challenges
curl http://localhost:3000/rewards/challenges/my/active \
  -H "Authorization: Bearer USER_TOKEN"
```

## 📚 Additional Resources

- [Full Documentation](./REWARDS_CHALLENGES_SYSTEM.md)
- [API Documentation](http://localhost:3000/api/docs)
- [Challenge Entities](./entities/)
- [Services](./services/)

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-25
