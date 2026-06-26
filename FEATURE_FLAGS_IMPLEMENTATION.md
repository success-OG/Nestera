# Feature Flags Implementation

## Overview

Lightweight custom feature flag system with runtime toggles, user targeting, A/B testing, and admin UI.

## Architecture

**Core Library**: `app/lib/feature-flags.ts`
- Flag evaluation logic with targeting rules
- LocalStorage cache + optional API sync
- Privacy-safe hashing for consistent A/B bucketing
- Tracks flag usage via monitoring breadcrumbs

**Configuration**: `app/lib/flags.config.ts`
- Default flags seeded on first load
- Production overrides via API (`NEXT_PUBLIC_API_URL/feature-flags`)

**Context Provider**: `app/context/FeatureFlagContext.tsx`
- React Context for flag state
- Syncs user context (wallet address, network) for targeting
- Admin functions: toggle, update, create, delete flags

**Hooks**: `app/hooks/useFeatureFlag.ts`
- `useFeatureFlag(key)` — boolean flags
- `useFeatureFlagValue<T>(key)` — multivariate flags
- `useFeatureFlagMany(keys)` — batch check

**Admin UI**: `app/components/FeatureFlagAdmin.tsx`
- Slide-in panel accessible via TopNav flag icon (dev only)
- Search, filter (all/enabled/disabled/kill_switch/experiment/beta)
- Live toggle, rollout percentage slider, kill switch controls
- Create/delete flags at runtime

## Flag Types

1. **boolean** — simple on/off
2. **rollout** — gradual percentage-based rollout (0-100%)
3. **string** — multivariate (e.g., A/B button color)
4. **number** — numeric config values

## Targeting Rules

Flags can target:
- **Specific users** — by wallet address (truncated for privacy)
- **Networks** — public vs testnet
- **Segments** — user groups (beta_tester, internal, etc.)
- **Percentage rollout** — consistent bucketing via hash of `flagKey:userId`

Kill switches override all targeting and force-disable.

## Usage Example

```tsx
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

export default function Dashboard() {
  const { isEnabled, isLoading } = useFeatureFlag("new-dashboard-layout");

  if (isLoading) return <Skeleton />;
  if (isEnabled) return <NewDashboard />;
  return <OldDashboard />;
}
```

## Adding a New Flag

**Option 1: Via Admin UI**
1. Open dashboard
2. Click flag icon in TopNav (dev mode)
3. Click "New Flag"
4. Fill in key, name, description, type
5. Click "Create"

**Option 2: In Code**
Add to `app/lib/flags.config.ts`:

```ts
{
  key: "my-new-feature",
  name: "My New Feature",
  description: "Description of what this controls.",
  defaultValue: false,
  type: "boolean",
  enabled: false,
  tags: { team: "frontend", area: "dashboard" },
}
```

## API Endpoints (Optional)

If `NEXT_PUBLIC_API_URL` is set, flags sync with backend:

- `GET /feature-flags` — load all flags
- `PUT /feature-flags/:key` — update flag
- `POST /feature-flags` — create flag
- `DELETE /feature-flags/:key` — delete flag

**Without API**: Flags persist in localStorage only (client-side).

## Analytics Integration

Every flag evaluation tracks a breadcrumb:
```json
{
  "message": "feature_flag_evaluated",
  "category": "user_action",
  "data": {
    "flag": "new-dashboard-layout",
    "value": "true",
    "reason": "rollout_included_42",
    "targeted": true
  }
}
```

View in Sentry's breadcrumb trail for debugging.

## Default Flags

See `app/lib/flags.config.ts` for all configured flags:

- **new-dashboard-layout** — redesigned dashboard (rollout)
- **enhanced-charts** — new chart library
- **wallet-staking** — staking UI
- **ab-new-onboarding** — A/B test 50% rollout
- **ab-cta-button-color** — string flag (teal vs green)
- **disable-referral-system** — kill switch
- **disable-governance** — kill switch
- **beta-analytics-v2** — beta testers only
- **testnet-only-features** — testnet network targeting
- **websocket-balances** — performance toggle

## Files Created

```
Nestera/frontend/app/
├── lib/
│   ├── feature-flags.ts        # Core engine
│   └── flags.config.ts         # Default flags
├── context/
│   └── FeatureFlagContext.tsx  # Provider
├── hooks/
│   └── useFeatureFlag.ts       # React hooks
├── components/
│   └── FeatureFlagAdmin.tsx    # Admin UI
└── dashboard/
    ├── DashboardProviders.tsx  # Wraps layout
    └── layout.tsx              # Updated to use provider
```

## Integration

`FeatureFlagProvider` is wired into `/dashboard` layout to bridge server layout → client context, with wallet user context passed automatically.

## Security

- **Privacy-safe**: Wallet addresses truncated to first 10 chars
- **No sensitive data**: Keys/values never contain secrets
- **Admin UI**: Dev mode only (`process.env.NODE_ENV !== 'production'`)
- **API auth**: Backend endpoints should require authentication

## Performance

- Flags cached in LocalStorage (instant load)
- API fetch in background (non-blocking)
- Evaluation is synchronous (no async waterfall)
- No re-renders unless flag values change

## Troubleshooting

**Flag not showing in UI?**
- Check `flags.config.ts` is imported
- Verify `initFeatureFlags()` called in provider
- Check browser console for errors

**Admin UI not visible?**
- Only visible in dev mode (`NODE_ENV !== 'production'`)
- Check TopNav for flag icon

**User targeting not working?**
- Ensure `WalletContext` provides address/network
- Check `DashboardProviders` passes `userContext` prop

## Future Enhancements

- Server-side flag evaluation (SSR)
- Redis cache for production flags
- Flag scheduling (enable at specific date/time)
- Segment management UI
- Flag dependency graph (flag X requires flag Y)
- Metrics dashboard (flag adoption rates)
