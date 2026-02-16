// SWR Cache Utilities for consistent cache invalidation
import { mutate } from 'swr';

/**
 * Utility functions for proper SWR cache invalidation
 * This ensures UI updates immediately after mutations
 */

/**
 * Invalidate all admin users cache
 */
export const invalidateUsersCache = () => {
  // Invalidate the main users list
  mutate(key => typeof key === 'string' && key.includes('/api/admin/users'));

  // Also invalidate user stats
  mutate(key => typeof key === 'string' && key.includes('/api/admin/users/stats'));
};

/**
 * Invalidate all mail items cache
 */
export const invalidateMailCache = () => {
  // Invalidate user mail items
  mutate('/api/mail-items');

  // Invalidate admin mail items
  mutate(key => typeof key === 'string' && key.includes('/api/admin/mail-items'));

  // Invalidate mail stats
  mutate(key => typeof key === 'string' && key.includes('/api/admin/mail-items/stats'));
};

/**
 * Invalidate forwarding requests cache
 */
export const invalidateForwardingCache = () => {
  mutate(key => typeof key === 'string' && key.includes('/api/admin/forwarding/requests'));
};

/**
 * Invalidate plans cache (both admin and public endpoints)
 */
export const invalidatePlansCache = () => {
  // Invalidate admin plans endpoint
  mutate(key => typeof key === 'string' && key.includes('/api/admin/plans'));
  // Invalidate public plans endpoint
  mutate('/api/plans');
  mutate(key => typeof key === 'string' && key.includes('/api/plans'));
};

/**
 * Invalidate blog posts cache
 */
export const invalidateBlogCache = () => {
  mutate(key => typeof key === 'string' && key.includes('/api/admin/blog'));
};

/**
 * Invalidate all admin caches (use sparingly)
 */
export const invalidateAllAdminCache = () => {
  invalidateUsersCache();
  invalidateMailCache();
  invalidateForwardingCache();
  invalidatePlansCache();
  invalidateBlogCache();
};

/**
 * Optimistic update helper for immediate UI feedback
 */
export const optimisticUpdate = <T>(
  cacheKey: string | string[],
  updateFn: (currentData: T | undefined) => T,
  rollbackFn?: () => void
) => {
  // Apply optimistic update (SWR mutate accepts key, mutator, options)
  mutate(
    cacheKey as Parameters<typeof mutate>[0],
    updateFn as (current: T | undefined) => T | undefined,
    { revalidate: false }
  );

  // Return rollback function
  return () => {
    if (rollbackFn) {
      rollbackFn();
    } else {
      // Revalidate to get fresh data
      mutate(cacheKey);
    }
  };
};

/**
 * Helper to create consistent mutation handlers
 */
export const createMutationHandler = <T>(
  mutationFn: () => Promise<T>,
  cacheKeys: string | string[],
  onSuccess?: (data: T) => void,
  onError?: (error: unknown) => void
) => {
  return async () => {
    try {
      const result = await mutationFn();

      // Invalidate cache after successful mutation
      mutate(cacheKeys);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  };
};
