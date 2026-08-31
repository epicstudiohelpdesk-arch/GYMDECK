/**
 * GymDeck Member Mobile - Centralized QueryClient Instance
 * 
 * Optimized for mobile devices:
 * - 5-minute default stale time to reduce unnecessary network traffic
 * - 15-minute garbage collection time to preserve device RAM
 * - 2 automatic retries on transient network failures
 * - Disabled aggressive window-focus refetching
 */

import { QueryClient } from '@tanstack/react-query';
import { AppError } from '../errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15,    // 15 minutes
      retry: (failureCount, error) => {
        // Don't retry non-transient auth/validation errors
        if (error instanceof AppError && !error.isTransient) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevents battery drain on mobile tab switching
      refetchOnReconnect: true,    // Re-fetch stale queries when network returns
    },
    mutations: {
      retry: false, // Never auto-retry mutations to prevent double submission
    },
  },
});

export default queryClient;
