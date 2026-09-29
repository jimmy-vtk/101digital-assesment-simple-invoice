import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Client errors (404, 400, 401) won't fix themselves; only retry network/5xx.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
