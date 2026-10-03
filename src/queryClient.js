import { QueryClient } from '@tanstack/vue-query'
import { watch } from 'vue'
import { ErrorKind } from '@/services/apiError.js'

// Server state (courses, students, progress...) lives in the Vue Query cache; Pinia only
// holds the session. Defaults:
//  - retry once, and only for failures that can pass by themselves (network, 5xx). A 4xx
//    (validation, 403 entitlement, 404) is an answer, not a glitch, so it is never retried.
//  - data is considered fresh for 30 seconds so moving between tabs does not refetch;
//    consistency after a change comes from targeted invalidation in the mutations.
//  - no refetch on window focus: an editor must not have its data swapped under it.
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 && [ErrorKind.NETWORK, ErrorKind.SERVER].includes(error?.kind),
      },
      mutations: { retry: false },
    },
  })

// A different person must never see the previous user's cached data: when the session
// ends (sign out, 401) the whole cache is dropped. Entitlement loss keeps the session and
// therefore the cache.
export const bindCacheToSession = (auth, queryClient) =>
  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (!authenticated) queryClient.clear()
    }
  )
