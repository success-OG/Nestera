import { useState, useCallback, useRef } from 'react';

interface OptimisticUpdateOptions<T> {
  optimisticUpdate: (current: T) => T;
  apiCall: () => Promise<void>;
  rollbackUpdate: (current: T) => T;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface OptimisticUpdateResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  executeUpdate: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for implementing optimistic UI updates with rollback on error
 * 
 * @template T - The type of data being updated
 * @param initialData - The initial data state
 * @returns Object containing data, loading state, error, and update function
 * 
 * @example
 * const { data, isLoading, error, executeUpdate } = useOptimisticUpdate(
 *   goals,
 *   {
 *     optimisticUpdate: (prev) => prev.map(g => 
 *       g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
 *     ),
 *     apiCall: () => api.addContribution(goalId, amount),
 *     rollbackUpdate: (prev) => prev.map(g => 
 *       g.id === goalId ? { ...g, currentAmount: g.currentAmount - amount } : g
 *     ),
 *     onError: (error) => toast.error('Failed to add contribution'),
 *   }
 * );
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T>
): OptimisticUpdateResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const previousDataRef = useRef<T | null>(null);
  const retryCountRef = useRef(0);
  const { retryCount = 3, retryDelay = 1000 } = options;

  const executeUpdate = useCallback(async () => {
    // Store previous data for rollback
    previousDataRef.current = data;
    
    // Apply optimistic update immediately
    const optimisticData = options.optimisticUpdate(data);
    setData(optimisticData);
    setIsLoading(true);
    setError(null);

    const attemptApiCall = async (attempt: number): Promise<void> => {
      try {
        await options.apiCall();
        retryCountRef.current = 0;
        setIsLoading(false);
        options.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        // Retry logic
        if (attempt < retryCount) {
          retryCountRef.current = attempt + 1;
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          return attemptApiCall(attempt + 1);
        }
        
        // Rollback on final error
        if (previousDataRef.current !== null) {
          const rolledBackData = options.rollbackUpdate(optimisticData);
          setData(rolledBackData);
        }
        
        setError(error);
        setIsLoading(false);
        options.onError?.(error);
      }
    };

    await attemptApiCall(0);
  }, [data, options, retryCount, retryDelay]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
    retryCountRef.current = 0;
  }, [initialData]);

  return {
    data,
    isLoading,
    error,
    executeUpdate,
    reset,
  };
}

/**
 * Hook for managing multiple optimistic updates with race condition handling
 */
export function useOptimisticUpdates<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const updateQueueRef = useRef<Array<{ id: string; update: (prev: T) => T }>>([]);

  const executeUpdate = useCallback(async (
    id: string,
    optimisticUpdate: (current: T) => T,
    apiCall: () => Promise<void>,
    rollbackUpdate: (current: T) => T
  ) => {
    // Check if this update is already pending (race condition prevention)
    if (pendingUpdates.has(id)) {
      return;
    }

    setPendingUpdates((prev: Set<string>) => new Set(prev).add(id));
    
    // Apply optimistic update
    const previousData = data;
    const optimisticData = optimisticUpdate(data);
    setData(optimisticData);

    try {
      await apiCall();
      setPendingUpdates((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      // Rollback on error
      const rolledBackData = rollbackUpdate(optimisticData);
      setData(rolledBackData);
      setPendingUpdates((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [data, pendingUpdates]);

  return {
    data,
    pendingUpdates,
    executeUpdate,
  };
}
