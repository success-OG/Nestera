# Optimistic UI Updates Pattern

This document describes the optimistic UI update pattern implemented in the Nestera frontend application.

## Overview

Optimistic UI updates improve user experience by updating the UI immediately after a user action, before waiting for server confirmation. This makes the app feel faster and more responsive. If the server operation fails, the UI rolls back to its previous state.

## Pattern Implementation

### 1. Reusable Hook: `useOptimisticUpdate`

Located at: `frontend/app/hooks/useOptimisticUpdate.ts`

This hook provides a generic way to implement optimistic updates with:
- Immediate UI updates
- Rollback on error
- Retry logic with exponential backoff
- Loading states
- Error handling

#### Usage Example

```typescript
const { data, isLoading, error, executeUpdate } = useOptimisticUpdate(
  goals,
  {
    optimisticUpdate: (prev) => prev.map(g => 
      g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
    ),
    apiCall: () => api.addContribution(goalId, amount),
    rollbackUpdate: (current) => current.map(g => 
      g.id === goalId ? { ...g, currentAmount: g.currentAmount - amount } : g
    ),
    onError: (error) => toast.error('Failed to add contribution'),
    retryCount: 3,
    retryDelay: 1000,
  }
);
```

### 2. Manual Implementation Pattern

For simpler cases, you can implement optimistic updates manually:

```typescript
const handleAction = async () => {
  // Store previous state for rollback
  const previousState = [...currentState];
  
  // Optimistically update UI
  setCurrentState(optimisticUpdate);
  
  try {
    // Make API call
    await api.updateData();
  } catch (error) {
    // Rollback on error
    setCurrentState(previousState);
    showError("Failed to update");
  }
};
```

## Implementations in Nestera

### 1. Wallet Balance Updates

**File:** `frontend/app/context/WalletContext.tsx`

The `WalletContext` now includes:
- `optimisticUpdateBalance(assetCode, newBalance)` - Immediately updates balance in UI
- `rollbackBalance(assetCode, originalBalance)` - Reverts balance on error

### 2. Goal Contributions

**File:** `frontend/app/savings/page.tsx`

The `handleAddFunds` function:
- Immediately updates goal progress in UI
- Calls API in background
- Rolls back on error
- Shows error message if update fails

### 3. Settings Changes

**File:** `frontend/app/dashboard/settings/SettingsClient.tsx`

Settings checkboxes use optimistic updates:
- `handleCheckboxChange` - Updates checkbox state immediately
- API call happens in background
- Rollback on error with error message

### 4. Profile Updates

**File:** `frontend/app/dashboard/profile/page.tsx`

Display name editing:
- `handleNameSave` - Updates name immediately on blur/enter
- API call in background
- Rollback on error with error message

### 5. Notifications

**File:** `frontend/app/dashboard/notifications/page.tsx`

Marking notifications as read:
- `markRead` - Immediately marks as read
- `markAllRead` - Immediately marks all as read
- API calls in background
- Rollback on error

## Key Features

### Rollback on Error

All optimistic updates store the previous state before making changes. If the API call fails, the UI reverts to the previous state automatically.

### Loading States

Components show loading indicators during API confirmation:
- Settings: "Saving..." button text
- Profile: Loading state during name update
- Goals: Can be extended to show loading indicators

### Error Handling

Errors are caught and displayed to users:
- Error messages appear near the affected UI element
- Original state is restored
- Users can retry the action

### Race Condition Handling

The `useOptimisticUpdates` hook (for multiple concurrent updates) includes:
- Pending update tracking
- Duplicate request prevention
- Update queue management

## Testing Recommendations

### Manual Testing

1. **Slow Network Testing**
   - Use Chrome DevTools to simulate slow network (3G, Offline)
   - Verify UI updates immediately
   - Verify rollback works when requests fail

2. **Error Scenarios**
   - Simulate API failures
   - Verify rollback works correctly
   - Verify error messages appear

3. **Rapid Actions**
   - Click actions rapidly
   - Verify race conditions are handled
   - Verify no data inconsistencies

### Automated Testing

```typescript
// Example test for optimistic updates
describe('Optistic Updates', () => {
  it('should update UI immediately and rollback on error', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData, options));
    
    act(() => {
      result.current.executeUpdate();
    });
    
    // UI should be updated immediately
    expect(result.current.data).toEqual(optimisticData);
    
    // Wait for API call to fail
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    
    // Should rollback
    expect(result.current.data).toEqual(initialData);
  });
});
```

## Best Practices

1. **Always Store Previous State** - Before optimistic update, store a copy of the current state for rollback
2. **Provide Clear Error Messages** - Users should understand what went wrong
3. **Show Loading Indicators** - Let users know when an operation is in progress
4. **Handle Race Conditions** - Prevent duplicate updates for the same resource
5. **Test with Slow Networks** - Verify the pattern works under poor network conditions
6. **Keep API Calls Simple** - The optimistic update pattern works best with simple, idempotent operations

## Future Enhancements

- Add toast notifications for successful updates
- Implement optimistic updates for transaction submissions
- Add optimistic updates for more complex forms
- Implement optimistic caching for frequently accessed data
- Add optimistic updates for pagination and list operations

## References

- Issue: #857 [Frontend] -- Implement Optimistic UI Updates
- Repository: https://github.com/Whiznificent/Nestera
