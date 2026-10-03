import { createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import { ApiError, ErrorKind } from '@/services/apiError.js'
import { createAppRouter } from '@/router/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { fakeApi } from './fakeApi.js'

// What POST /api/sign-in and GET /api/me return (the backend persists "manager" for instructors).
export const identity = ({
  role = 'manager',
  accessStatus = 'ACTIVE',
  accessStartsAt = '2026-05-01T00:00:00.000Z',
  accessExpiresAt = '2026-06-01T00:00:00.000Z',
  name = 'Test User',
  email = 'user@test.dev',
  token = 'test-token',
} = {}) => ({ name, email, token, role, accessStatus, accessStartsAt, accessExpiresAt })

export const instructor = (accessStatus = 'ACTIVE', extra = {}) => identity({ role: 'manager', accessStatus, ...extra })
export const student = (accessStatus = 'ACTIVE', extra = {}) => identity({ role: 'student', accessStatus, ...extra })

export const apiError = (kind, extra = {}) => new ApiError({ kind, ...extra })
export const networkError = () => apiError(ErrorKind.NETWORK)
export const unauthorizedError = () => apiError(ErrorKind.AUTH, { status: 401, message: 'Invalid or expired token' })

// Fresh pinia + router (memory history) + auth store + query client + a fake backend
// (see tests/fakeApi.js; pass `routes` to define answers). `plugins` is what a component
// needs to be mounted like in the real app.
export const createTestApp = ({ routes } = {}) => {
  const pinia = createPinia()

  setActivePinia(pinia)

  const router = createAppRouter(createMemoryHistory())
  const auth = useAuthStore()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false }, mutations: { retry: false } },
  })
  const fake = fakeApi(routes)

  return { pinia, router, auth, queryClient, fake, plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] }
}

// Axios adapters for the HTTP client tests: no network, full control over the answer.
export const replyWith = (status, data = {}, calls = []) => async (config) => {
  calls.push(config)

  if (status >= 400) {
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
      status,
      data,
      headers: {},
      config,
      statusText: '',
    })
  }

  return { data, status, statusText: 'OK', headers: {}, config }
}

export const networkFailure = (calls = []) => async (config) => {
  calls.push(config)
  throw new AxiosError('Network Error', 'ERR_NETWORK', config)
}

// A promise that is settled from the outside (to observe the "pending" state).
export const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
